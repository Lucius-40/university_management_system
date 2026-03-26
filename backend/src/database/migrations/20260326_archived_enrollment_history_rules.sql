-- Ensure archived status exists for historical enrollments.
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

-- Only completed historical rows should be used for term result compilation.
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
