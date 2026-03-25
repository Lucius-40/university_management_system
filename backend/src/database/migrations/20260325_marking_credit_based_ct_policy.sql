-- Credit-based CT policy update:
-- 1) CT published component limit per enrollment becomes (ceil(course_credit_hours) + 1)
-- 2) compile_student_term_result uses best N CTs where N = ceil(course_credit_hours)

CREATE OR REPLACE FUNCTION trg_marking_components_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  existing_ct_count INT;
  existing_att_count INT;
  existing_final_count INT;
  exclude_id INT := NULL;
  v_credit_count INT := 1;
  v_ct_limit INT := 2;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    exclude_id := OLD.id;
  END IF;

  SELECT GREATEST(1, CEIL(COALESCE(c.credit_hours, 1))::INT)
  INTO v_credit_count
  FROM student_enrollments se
  JOIN course_offerings co ON co.id = se.course_offering_id
  JOIN courses c ON c.id = co.course_id
  WHERE se.id = NEW.enrollment_id
  LIMIT 1;

  v_ct_limit := v_credit_count + 1;

  SELECT COUNT(*) INTO existing_ct_count
  FROM marking_components
  WHERE enrollment_id = NEW.enrollment_id
    AND status = 'Published'
    AND type = 'CT'
    AND (id IS DISTINCT FROM exclude_id);

  SELECT COUNT(*) INTO existing_att_count
  FROM marking_components
  WHERE enrollment_id = NEW.enrollment_id
    AND status = 'Published'
    AND type = 'Attendance'
    AND (id IS DISTINCT FROM exclude_id);

  SELECT COUNT(*) INTO existing_final_count
  FROM marking_components
  WHERE enrollment_id = NEW.enrollment_id
    AND status = 'Published'
    AND type = 'Final'
    AND (id IS DISTINCT FROM exclude_id);

  IF NEW.status = 'Published' THEN
    IF NEW.type = 'CT' THEN
      IF existing_ct_count + 1 > v_ct_limit THEN
        RAISE EXCEPTION 'Limit exceeded: enrollment_id=% already has % Published CT components; max allowed is % for % credit(s).',
          NEW.enrollment_id, existing_ct_count, v_ct_limit, v_credit_count;
      END IF;
    ELSIF NEW.type = 'Attendance' THEN
      IF existing_att_count + 1 > 1 THEN
        RAISE EXCEPTION 'Limit exceeded: enrollment_id=% already has % Published Attendance components; max allowed is 1.',
          NEW.enrollment_id, existing_att_count;
      END IF;
    ELSIF NEW.type = 'Final' THEN
      IF existing_final_count + 1 > 1 THEN
        RAISE EXCEPTION 'Limit exceeded: enrollment_id=% already has % Published Final components; max allowed is 1.',
          NEW.enrollment_id, existing_final_count;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION compile_student_term_result(p_student_id INT, p_term_id INT)
RETURNS TABLE (
  enrollment_id INT,
  course_offering_id INT,
  course_id INT,
  course_code VARCHAR,
  course_name VARCHAR,
  ct_best3_score NUMERIC(8,2),
  attendance_score NUMERIC(8,2),
  final_score NUMERIC(8,2),
  total_score NUMERIC(8,2),
  percentage NUMERIC(5,2),
  grade VARCHAR
)
LANGUAGE sql
AS $$
WITH enrolls AS (
  SELECT
    se.id AS enrollment_id,
    se.course_offering_id,
    GREATEST(1, CEIL(COALESCE(c.credit_hours, 1))::INT) AS ct_best_count,
    c.id AS course_id,
    c.course_code,
    c.name AS course_name
  FROM student_enrollments se
  JOIN course_offerings co ON se.course_offering_id = co.id
  JOIN courses c ON c.id = co.course_id
  WHERE se.student_id = p_student_id
    AND co.term_id = p_term_id
),
published_marks AS (
  SELECT
    mc.id,
    mc.enrollment_id,
    mc.type,
    COALESCE(mc.total_marks, 0) AS total_marks,
    COALESCE(mc.marks_obtained, 0) AS marks_obtained,
    CASE
      WHEN mc.type = 'CT' THEN
        CASE
          WHEN COALESCE(mc.total_marks,0) = 0 THEN 0
          ELSE (COALESCE(mc.marks_obtained,0)::numeric / COALESCE(mc.total_marks,0)::numeric) * 20.0
        END
      WHEN mc.type = 'Attendance' THEN
        CASE
          WHEN COALESCE(mc.total_marks,0) = 0 THEN 0
          ELSE (COALESCE(mc.marks_obtained,0)::numeric / COALESCE(mc.total_marks,0)::numeric) * 30.0
        END
      WHEN mc.type = 'Final' THEN
        CASE
          WHEN COALESCE(mc.total_marks,0) = 0 THEN 0
          ELSE (COALESCE(mc.marks_obtained,0)::numeric / COALESCE(mc.total_marks,0)::numeric) * 210.0
        END
      ELSE 0
    END AS normalized_score
  FROM marking_components mc
  JOIN enrolls e ON e.enrollment_id = mc.enrollment_id
  WHERE mc.status = 'Published'
),
ct_ranked AS (
  SELECT
    pm.*,
    ROW_NUMBER() OVER (PARTITION BY pm.enrollment_id ORDER BY pm.normalized_score DESC, pm.id) AS rn
  FROM published_marks pm
  WHERE pm.type = 'CT'
),
ct_bestn AS (
  SELECT
    e.enrollment_id,
    COALESCE(SUM(cr.normalized_score),0)::numeric(8,2) AS ct_bestn_score
  FROM enrolls e
  LEFT JOIN ct_ranked cr
    ON cr.enrollment_id = e.enrollment_id
   AND cr.rn <= e.ct_best_count
  GROUP BY e.enrollment_id
),
attendance_sum AS (
  SELECT
    enrollment_id,
    COALESCE(SUM(normalized_score),0)::numeric(8,2) AS attendance_score
  FROM published_marks
  WHERE type = 'Attendance'
  GROUP BY enrollment_id
),
final_sum AS (
  SELECT
    enrollment_id,
    COALESCE(SUM(normalized_score),0)::numeric(8,2) AS final_score
  FROM published_marks
  WHERE type = 'Final'
  GROUP BY enrollment_id
)
SELECT
  e.enrollment_id,
  e.course_offering_id,
  e.course_id,
  e.course_code,
  e.course_name,
  COALESCE(ct.ct_bestn_score, 0) AS ct_best_n_score,
  COALESCE(att.attendance_score, 0) AS attendance_score,
  COALESCE(fin.final_score, 0) AS final_score,
  (COALESCE(ct.ct_bestn_score,0) + COALESCE(att.attendance_score,0) + COALESCE(fin.final_score,0))::numeric(8,2) AS total_score,
  ROUND(((COALESCE(ct.ct_bestn_score,0) + COALESCE(att.attendance_score,0) + COALESCE(fin.final_score,0)) / 300.0) * 100.0, 2) AS percentage,
  CASE
    WHEN ((COALESCE(ct.ct_bestn_score,0) + COALESCE(att.attendance_score,0) + COALESCE(fin.final_score,0)) / 300.0) * 100.0 >= 80 THEN 'A+'
    WHEN ((COALESCE(ct.ct_bestn_score,0) + COALESCE(att.attendance_score,0) + COALESCE(fin.final_score,0)) / 300.0) * 100.0 >= 75 THEN 'A'
    WHEN ((COALESCE(ct.ct_bestn_score,0) + COALESCE(att.attendance_score,0) + COALESCE(fin.final_score,0)) / 300.0) * 100.0 >= 70 THEN 'A-'
    WHEN ((COALESCE(ct.ct_bestn_score,0) + COALESCE(att.attendance_score,0) + COALESCE(fin.final_score,0)) / 300.0) * 100.0 >= 65 THEN 'B'
    WHEN ((COALESCE(ct.ct_bestn_score,0) + COALESCE(att.attendance_score,0) + COALESCE(fin.final_score,0)) / 300.0) * 100.0 >= 60 THEN 'C'
    WHEN ((COALESCE(ct.ct_bestn_score,0) + COALESCE(att.attendance_score,0) + COALESCE(fin.final_score,0)) / 300.0) * 100.0 >= 55 THEN 'D'
    ELSE 'F'
  END AS grade
FROM enrolls e
LEFT JOIN ct_bestn ct ON ct.enrollment_id = e.enrollment_id
LEFT JOIN attendance_sum att ON att.enrollment_id = e.enrollment_id
LEFT JOIN final_sum fin ON fin.enrollment_id = e.enrollment_id
ORDER BY e.course_code;
$$;
