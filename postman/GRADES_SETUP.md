# Grade Setup for View Grades (Synthetic Data)

This guide explains exactly what data is needed to show student results for all completed terms in the View Grades subtab.

Target scenario:
- Student is currently in term number 4.
- View Grades should show historical results for terms 1, 2, and 3.
- Synthetic marks should produce grade A for each enrolled historical course.

## Data Dependency Order

Insert data in this order so foreign keys are satisfied:
1. users
2. departments
3. terms (at least term 1 to term 4 in the same department)
4. students (current_term must point to term 4)
5. courses
6. course_offerings (for terms 1, 2, 3)
7. student_enrollments (historical enrollments with status = 'Enrolled')
8. marking_components (Published rows for each enrollment)

## Why These Tables Are Required

- users: Student identity row.
- departments: Parent for terms and courses.
- terms: Needed for term_number grouping and historical/current-term separation.
- students: current_term defines the student is now in term 4.
- courses: Course metadata (code/name/credit/type).
- course_offerings: Connects courses to specific terms.
- student_enrollments: The result is attached to enrollment_id.
- marking_components: Raw marks used by compile_student_term_result.

## Required Marking Pattern Per Enrollment

The grading function uses only Published components and computes:
- CT = top 3 CT components, each normalized to 20
- Attendance normalized to 30
- Final normalized to 210
- Total = CT + Attendance + Final (out of 300)
- Grade bands: A+ >= 80, A >= 75, A- >= 70, B >= 65, C >= 60, D >= 55, F < 55

Recommended synthetic pattern for grade A:
- CT rows (4 rows): (19/20), (18/20), (17/20), (16/20)
- Attendance row (1 row): (8/10)
- Final row (1 row): (70/100)

Computed:
- CT best3 = 19 + 18 + 17 = 54
- Attendance = 8/10 * 30 = 24
- Final = 70/100 * 210 = 147
- Total = 225, Percentage = 75.00, Grade = A

## SQL Template (Adjust IDs to Your Database)

```sql
-- 1) Ensure student exists and is in term 4
-- Example assumptions:
-- student_id = 16, department_id = 1, term ids 33..36 map to term numbers 1..4

-- 2) Ensure historical enrollments (terms 1-3) exist with Enrolled status
-- Pick offering ids from terms 1-3 for the same department
INSERT INTO student_enrollments (student_id, course_offering_id, credit_when_taking, status, is_retake)
SELECT 16, co.id, c.credit_hours, 'Enrolled', FALSE
FROM course_offerings co
JOIN courses c ON c.id = co.course_id
JOIN terms t ON t.id = co.term_id
WHERE t.department_id = 1
  AND t.term_number IN (1, 2, 3)
  AND NOT EXISTS (
    SELECT 1
    FROM student_enrollments se
    WHERE se.student_id = 16
      AND se.course_offering_id = co.id
      AND se.status = 'Enrolled'
  );

-- 3) Clear old synthetic markings for these enrollments (optional reset)
DELETE FROM marking_components mc
USING student_enrollments se, course_offerings co, terms t
WHERE mc.enrollment_id = se.id
  AND co.id = se.course_offering_id
  AND t.id = co.term_id
  AND se.student_id = 16
  AND t.department_id = 1
  AND t.term_number IN (1, 2, 3);

-- 4) Insert synthetic Published components for each historical enrollment
WITH target_enrollments AS (
  SELECT se.id AS enrollment_id
  FROM student_enrollments se
  JOIN course_offerings co ON co.id = se.course_offering_id
  JOIN terms t ON t.id = co.term_id
  WHERE se.student_id = 16
    AND se.status = 'Enrolled'
    AND t.department_id = 1
    AND t.term_number IN (1, 2, 3)
)
INSERT INTO marking_components (enrollment_id, type, total_marks, marks_obtained, status)
SELECT enrollment_id, 'CT', 20, 19, 'Published' FROM target_enrollments
UNION ALL
SELECT enrollment_id, 'CT', 20, 18, 'Published' FROM target_enrollments
UNION ALL
SELECT enrollment_id, 'CT', 20, 17, 'Published' FROM target_enrollments
UNION ALL
SELECT enrollment_id, 'CT', 20, 16, 'Published' FROM target_enrollments
UNION ALL
SELECT enrollment_id, 'Attendance', 10, 8, 'Published' FROM target_enrollments
UNION ALL
SELECT enrollment_id, 'Final', 100, 70, 'Published' FROM target_enrollments;
```

Note:
- Keep exactly 4 CT, 1 Attendance, and 1 Final per enrollment for Published rows.
- The existing limits trigger will reject invalid counts.

## Verification Queries

```sql
-- A) Confirm student is currently in term number 4
SELECT s.user_id, s.roll_number, s.current_term, t.term_number
FROM students s
JOIN terms t ON t.id = s.current_term
WHERE s.user_id = 16;

-- B) See computed results per historical term
SELECT * FROM compile_student_term_result(16, 33); -- term 1 id
SELECT * FROM compile_student_term_result(16, 34); -- term 2 id
SELECT * FROM compile_student_term_result(16, 35); -- term 3 id

-- C) Check stored vs computed grade consistency
WITH computed AS (
  SELECT csr.enrollment_id, csr.grade AS computed_grade
  FROM compile_student_term_result(16, 33) csr
  UNION ALL
  SELECT csr.enrollment_id, csr.grade AS computed_grade
  FROM compile_student_term_result(16, 34) csr
  UNION ALL
  SELECT csr.enrollment_id, csr.grade AS computed_grade
  FROM compile_student_term_result(16, 35) csr
)
SELECT se.id AS enrollment_id, se.grade AS stored_grade, c.computed_grade
FROM student_enrollments se
JOIN computed c ON c.enrollment_id = se.id
ORDER BY se.id;
```

## API for View Grades

After backend implementation, expected endpoint for student grade view:
- GET /api/students/:user_id/results

Optional:
- GET /api/students/:user_id/results/:term_number

## Troubleshooting

- Empty result rows:
  - Ensure enrollments are status 'Enrolled'.
  - Ensure marking_components status is 'Published'.
  - Ensure enrollment belongs to terms 1-3 for the student department.
- Grades not synchronized in student_enrollments.grade:
  - Apply migration backend/src/database/migrations/20260321_marking_grade_sync_trigger.sql.
  - Re-run verification query C.
