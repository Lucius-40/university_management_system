# Database Routines Reference

This file documents the SQL functions, procedures, and triggers currently present in schema.txt, with descriptions and schema code.

## Functions

### archived_enrollment_history_rules (migration routine)
Adds the `Archived` enum value to `enrollment_status_enum` when missing, and updates result compilation rules so historical archived enrollments are included in transcript generation.

~~~sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'enrollment_status_enum'
      AND e.enumlabel = 'Archived'
  ) THEN
    ALTER TYPE enrollment_status_enum ADD VALUE 'Archived';
  END IF;
END
$$;
~~~

### trg_marking_components_limits()
Trigger function that enforces published marking limits per enrollment (CT <= 4, Attendance <= 1, Final <= 1). It raises exceptions when limits are exceeded.

~~~sql
CREATE OR REPLACE FUNCTION trg_marking_components_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  existing_ct_count INT;
  existing_att_count INT;
  existing_final_count INT;
  exclude_id INT := NULL;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    exclude_id := OLD.id;
  END IF;

  -- Count existing Published components for the same enrollment, excluding the current row if updating
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

  -- If NEW will be Published, check the incremented counts
  IF NEW.status = 'Published' THEN
    IF NEW.type = 'CT' THEN
      IF existing_ct_count + 1 > 4 THEN
        RAISE EXCEPTION 'Limit exceeded: enrollment_id=% already has % Published CT components; max allowed is 4.',
          NEW.enrollment_id, existing_ct_count;
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
    ELSE
      -- For other types, still ensure existing data is not already violating limits
      IF existing_ct_count > 4 THEN
        RAISE EXCEPTION 'Existing data violation: enrollment_id=% has % Published CT components (>4).', NEW.enrollment_id, existing_ct_count;
      END IF;
      IF existing_att_count > 1 THEN
        RAISE EXCEPTION 'Existing data violation: enrollment_id=% has % Published Attendance components (>1).', NEW.enrollment_id, existing_att_count;
      END IF;
      IF existing_final_count > 1 THEN
        RAISE EXCEPTION 'Existing data violation: enrollment_id=% has % Published Final components (>1).', NEW.enrollment_id, existing_final_count;
      END IF;
    END IF;
  ELSE
    -- NEW is not Published: still block if existing published rows already violate limits
    IF existing_ct_count > 4 THEN
      RAISE EXCEPTION 'Existing data violation: enrollment_id=% has % Published CT components (>4).', NEW.enrollment_id, existing_ct_count;
    END IF;
    IF existing_att_count > 1 THEN
      RAISE EXCEPTION 'Existing data violation: enrollment_id=% has % Published Attendance components (>1).', NEW.enrollment_id, existing_att_count;
    END IF;
    IF existing_final_count > 1 THEN
      RAISE EXCEPTION 'Existing data violation: enrollment_id=% has % Published Final components (>1).', NEW.enrollment_id, existing_final_count;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
~~~

### compile_student_term_result(p_student_id INT, p_term_id INT)
Computes per-course term results for a student by normalizing published CT, attendance, and final marks. Returns a detailed score breakdown with percentage and grade. Only completed historical rows are included (`Enrolled`, `Archived`), while non-completed rows (`Pending`, `Withdrawn`) are excluded.

~~~sql
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
  SELECT se.id AS enrollment_id,
       se.course_offering_id
  FROM student_enrollments se
  JOIN course_offerings co ON se.course_offering_id = co.id
  WHERE se.student_id = p_student_id
    AND co.term_id = p_term_id
    AND se.status IN ('Enrolled', 'Archived')
),
published_marks AS (
  SELECT mc.id,
       mc.enrollment_id,
       mc.type,
       COALESCE(mc.total_marks, 0) AS total_marks,
       COALESCE(mc.marks_obtained, 0) AS marks_obtained,
       CASE
       WHEN mc.type = 'CT' THEN
         CASE WHEN COALESCE(mc.total_marks,0) = 0 THEN 0
          ELSE (COALESCE(mc.marks_obtained,0)::numeric / COALESCE(mc.total_marks,0)::numeric) * 20.0
         END
       WHEN mc.type = 'Attendance' THEN
         CASE WHEN COALESCE(mc.total_marks,0) = 0 THEN 0
          ELSE (COALESCE(mc.marks_obtained,0)::numeric / COALESCE(mc.total_marks,0)::numeric) * 30.0
         END
       WHEN mc.type = 'Final' THEN
         CASE WHEN COALESCE(mc.total_marks,0) = 0 THEN 0
          ELSE (COALESCE(mc.marks_obtained,0)::numeric / COALESCE(mc.total_marks,0)::numeric) * 210.0
         END
       ELSE 0
       END AS normalized_score
  FROM marking_components mc
  JOIN enrolls e ON mc.enrollment_id = e.enrollment_id
  WHERE mc.status = 'Published'
),
ct_ranked AS (
  SELECT pm.*, 
       ROW_NUMBER() OVER (PARTITION BY pm.enrollment_id ORDER BY pm.normalized_score DESC, pm.id) AS rn
  FROM published_marks pm
  WHERE pm.type = 'CT'
),
ct_best3 AS (
  SELECT enrollment_id,
       COALESCE(SUM(normalized_score),0)::numeric(8,2) AS ct_best3_score
  FROM ct_ranked
  WHERE rn <= 3
  GROUP BY enrollment_id
),
attendance_sum AS (
  SELECT enrollment_id,
       COALESCE(SUM(normalized_score),0)::numeric(8,2) AS attendance_score
  FROM published_marks
  WHERE type = 'Attendance'
  GROUP BY enrollment_id
),
final_sum AS (
  SELECT enrollment_id,
       COALESCE(SUM(normalized_score),0)::numeric(8,2) AS final_score
  FROM published_marks
  WHERE type = 'Final'
  GROUP BY enrollment_id
)
SELECT
  e.enrollment_id,
  e.course_offering_id,
  c.id AS course_id,
  c.course_code,
  c.name AS course_name,
  COALESCE(ct.ct_best3_score, 0) AS ct_best3_score,
  COALESCE(att.attendance_score, 0) AS attendance_score,
  COALESCE(fin.final_score, 0) AS final_score,
  (COALESCE(ct.ct_best3_score,0) + COALESCE(att.attendance_score,0) + COALESCE(fin.final_score,0))::numeric(8,2) AS total_score,
  ROUND( ( (COALESCE(ct.ct_best3_score,0) + COALESCE(att.attendance_score,0) + COALESCE(fin.final_score,0)) / 300.0 ) * 100.0, 2) AS percentage,
  CASE
    WHEN ( (COALESCE(ct.ct_best3_score,0) + COALESCE(att.attendance_score,0) + COALESCE(fin.final_score,0)) / 300.0 ) * 100.0 >= 80 THEN 'A+'
    WHEN ( (COALESCE(ct.ct_best3_score,0) + COALESCE(att.attendance_score,0) + COALESCE(fin.final_score,0)) / 300.0 ) * 100.0 >= 75 THEN 'A'
    WHEN ( (COALESCE(ct.ct_best3_score,0) + COALESCE(att.attendance_score,0) + COALESCE(fin.final_score,0)) / 300.0 ) * 100.0 >= 70 THEN 'A-'
    WHEN ( (COALESCE(ct.ct_best3_score,0) + COALESCE(att.attendance_score,0) + COALESCE(fin.final_score,0)) / 300.0 ) * 100.0 >= 65 THEN 'B'
    WHEN ( (COALESCE(ct.ct_best3_score,0) + COALESCE(att.attendance_score,0) + COALESCE(fin.final_score,0)) / 300.0 ) * 100.0 >= 60 THEN 'C'
    WHEN ( (COALESCE(ct.ct_best3_score,0) + COALESCE(att.attendance_score,0) + COALESCE(fin.final_score,0)) / 300.0 ) * 100.0 >= 55 THEN 'D'
    ELSE 'F'
  END AS grade
FROM enrolls e
LEFT JOIN courses c ON c.id = (SELECT co.course_id FROM course_offerings co WHERE co.id = e.course_offering_id)
LEFT JOIN ct_best3 ct ON ct.enrollment_id = e.enrollment_id
LEFT JOIN attendance_sum att ON att.enrollment_id = e.enrollment_id
LEFT JOIN final_sum fin ON fin.enrollment_id = e.enrollment_id
ORDER BY c.course_code;
$$;
~~~

### refresh_enrollment_grade_from_markings(p_enrollment_id INT)
Synchronizes one row in student_enrollments.grade with the grade derived by compile_student_term_result for that enrollment's student and term.

~~~sql
CREATE OR REPLACE FUNCTION refresh_enrollment_grade_from_markings(p_enrollment_id INT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_student_id INT;
  v_term_id INT;
  v_grade VARCHAR;
BEGIN
  SELECT se.student_id, co.term_id
  INTO v_student_id, v_term_id
  FROM student_enrollments se
  JOIN course_offerings co ON co.id = se.course_offering_id
  WHERE se.id = p_enrollment_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT csr.grade
  INTO v_grade
  FROM compile_student_term_result(v_student_id, v_term_id) csr
  WHERE csr.enrollment_id = p_enrollment_id
  LIMIT 1;

  UPDATE student_enrollments
  SET grade = v_grade
  WHERE id = p_enrollment_id;
END;
$$;
~~~

### trg_sync_enrollment_grade_from_markings()
AFTER trigger function on marking_components that refreshes enrollment grade on INSERT/UPDATE/DELETE, including enrollment_id changes.

~~~sql
CREATE OR REPLACE FUNCTION trg_sync_enrollment_grade_from_markings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.enrollment_id IS DISTINCT FROM NEW.enrollment_id THEN
    PERFORM refresh_enrollment_grade_from_markings(OLD.enrollment_id);
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM refresh_enrollment_grade_from_markings(OLD.enrollment_id);
    RETURN OLD;
  END IF;

  PERFORM refresh_enrollment_grade_from_markings(NEW.enrollment_id);
  RETURN NEW;
END;
$$;
~~~

### get_teacher_sections(p_teacher_id INT)
Returns sections taught by a teacher in current terms, including department and term context for academic workflows.

~~~sql
CREATE OR REPLACE FUNCTION get_teacher_sections(p_teacher_id INT)
RETURNS TABLE (
  section_name VARCHAR,
  department_id INT,
  department_code VARCHAR,
  department_name VARCHAR,
  course_code VARCHAR,
  course_name VARCHAR,
  term_id INT,
  term_number INT
)
LANGUAGE sql
AS $$
WITH current_term_date AS (
  SELECT newest_term_start FROM current_state LIMIT 1
),
current_terms AS (
  SELECT t.id, t.term_number, t.department_id
  FROM terms t, current_term_date ctd
  WHERE t.start_date = ctd.newest_term_start
)
SELECT DISTINCT
  te.section_name,
  c.department_id,
  d.code AS department_code,
  d.name AS department_name,
  c.course_code,
  c.name AS course_name,
  ct.id AS term_id,
  ct.term_number
FROM teaches te
JOIN course_offerings co ON te.course_offering_id = co.id
JOIN courses c ON co.course_id = c.id
JOIN departments d ON c.department_id = d.id
JOIN current_terms ct ON co.term_id = ct.id
WHERE te.teacher_id = p_teacher_id
ORDER BY d.code, c.course_code, te.section_name;
$$;
~~~

### get_students_in_teacher_section(p_teacher_id INT, p_section_name VARCHAR, p_department_id INT)
Returns enrolled students in a specific teacher section for the current term, with course and identity details.

~~~sql
CREATE OR REPLACE FUNCTION get_students_in_teacher_section(
  p_teacher_id INT,
  p_section_name VARCHAR,
  p_department_id INT
)
RETURNS TABLE (
  user_id INT,
  name VARCHAR,
  roll_number VARCHAR,
  email VARCHAR,
  course_code VARCHAR,
  course_name VARCHAR
)
LANGUAGE sql
AS $$
WITH current_term_date AS (
  SELECT newest_term_start FROM current_state LIMIT 1
),
current_terms AS (
  SELECT t.id
  FROM terms t, current_term_date ctd
  WHERE t.start_date = ctd.newest_term_start
)
SELECT DISTINCT
  s.user_id,
  u.name,
  s.roll_number,
  u.email,
  c.course_code,
  c.name AS course_name
FROM teaches te
JOIN course_offerings co ON te.course_offering_id = co.id
JOIN courses c ON co.course_id = c.id
JOIN student_enrollments se ON se.course_offering_id = co.id
JOIN students s ON se.student_id = s.user_id
JOIN users u ON s.user_id = u.id
JOIN student_sections ss ON ss.student_id = s.user_id AND ss.section_name = te.section_name
JOIN current_terms ct ON co.term_id = ct.id
WHERE te.teacher_id = p_teacher_id
  AND te.section_name = p_section_name
  AND c.department_id = p_department_id
  AND se.status = 'Enrolled'
ORDER BY s.roll_number;
$$;
~~~

## Procedures

### reset_user_password(p_user_id INT, p_new_password_hash VARCHAR(255))
Resets a user password hash and invalidates refresh token in one routine. Raises P0002 if the user id does not exist.

~~~sql
CREATE OR REPLACE PROCEDURE reset_user_password(
  p_user_id INT,
  p_new_password_hash VARCHAR(255)
)
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE users
  SET password_hash = p_new_password_hash,
    refresh_token = NULL
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found for id %', p_user_id
      USING ERRCODE = 'P0002';
  END IF;
END;
$$;
~~~

## Triggers

### marking_components_limits_trg on marking_components
Before-insert/update trigger that executes the marking limit validation function to protect marking consistency.

~~~sql
DROP TRIGGER IF EXISTS marking_components_limits_trg ON marking_components;

CREATE TRIGGER marking_components_limits_trg
BEFORE INSERT OR UPDATE ON marking_components
FOR EACH ROW
EXECUTE FUNCTION trg_marking_components_limits();
~~~

### sync_enrollment_grade_from_markings_trg on marking_components
After-insert/update/delete trigger that keeps student_enrollments.grade in sync with published marking components.

~~~sql
DROP TRIGGER IF EXISTS sync_enrollment_grade_from_markings_trg ON marking_components;

CREATE TRIGGER sync_enrollment_grade_from_markings_trg
AFTER INSERT OR UPDATE OR DELETE ON marking_components
FOR EACH ROW
EXECUTE FUNCTION trg_sync_enrollment_grade_from_markings();
~~~

## Missing Definitions Check

Functions and triggers listed here are implemented in backend table setup SQL and/or migration files.
