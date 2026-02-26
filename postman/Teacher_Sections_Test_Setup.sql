-- ============================================
-- Teacher Sections Test Data Setup Script
-- ============================================
-- This script sets up test data for teacher sections functionality:
-- - 2 departments (CSE, BME)
-- - 2 current terms (one per department, same start date)
-- - 1 teacher teaching in both departments
-- - 4 courses (2 per department)
-- - 4 course offerings
-- - 2 sections (A, B)
-- - 10 students (5 in section A, 5 in section B, distributed across departments)
-- - Student enrollments
-- ============================================

-- Clear existing test data (optional - comment out if you want to keep existing data)
TRUNCATE TABLE student_sections CASCADE;
TRUNCATE TABLE student_enrollments CASCADE;
TRUNCATE TABLE teaches CASCADE;
TRUNCATE TABLE course_offerings CASCADE;
TRUNCATE TABLE sections CASCADE;
TRUNCATE TABLE students CASCADE;
TRUNCATE TABLE teachers CASCADE;
TRUNCATE TABLE courses CASCADE;
TRUNCATE TABLE terms CASCADE;
TRUNCATE TABLE departments CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE current_state CASCADE;

-- Reset sequences
ALTER SEQUENCE users_id_seq RESTART WITH 1;
ALTER SEQUENCE departments_id_seq RESTART WITH 1;
ALTER SEQUENCE terms_id_seq RESTART WITH 1;
ALTER SEQUENCE courses_id_seq RESTART WITH 1;
ALTER SEQUENCE course_offerings_id_seq RESTART WITH 1;
ALTER SEQUENCE student_enrollments_id_seq RESTART WITH 1;

-- ============================================
-- 1. Create Departments
-- ============================================
INSERT INTO departments (code, name) VALUES
('CSE', 'Computer Science and Engineering'),
('BME', 'Biomedical Engineering');

-- Department IDs: CSE=1, BME=2

-- ============================================
-- 2. Create Current Terms (same start date for both departments)
-- ============================================
INSERT INTO terms (term_number, start_date, end_date, department_id) VALUES
(3, '2026-01-15', '2026-06-15', 1),  -- CSE Term 3
(3, '2026-01-15', '2026-06-15', 2);  -- BME Term 3

-- Term IDs: CSE Term=1, BME Term=2

-- ============================================
-- 3. Set Current State (defines which terms are "current")
-- ============================================
INSERT INTO current_state (reg_start, reg_end, newest_term_start) VALUES
('2026-01-01', '2026-01-20', '2026-01-15');

-- ============================================
-- 4. Create Teacher User
-- ============================================
INSERT INTO users (name, email, password_hash, role, mobile_number, mobile_banking_number, present_address, birth_reg_number, birth_date, nid_number, emergency_contact_number) VALUES
('Dr. Sarah Johnson', 'sarah.johnson@university.com', '$2b$10$abcdefghijklmnopqrstuvwxyz123456789', 'Teacher', '01712345678', '01812345678', '123 University Road, Dhaka', 'BR123456', '1985-05-15', 'NID987654321', '01812345678');

-- Teacher user_id = 1

-- ============================================
-- 5. Create Teacher Record
-- ============================================
INSERT INTO teachers (user_id, appointment, official_mail, department_id) VALUES
(1, 'Assistant Professor', 'sarah.johnson@university.edu', 1);  -- Primary department: CSE

-- ============================================
-- 6. Create Courses
-- ============================================
INSERT INTO courses (course_code, name, credit_hours, type, department_id) VALUES
('CSE105', 'Introduction to Programming', 3.0, 'Theory', 1),
('CSE106', 'Programming Lab', 1.5, 'Lab', 1),
('BME201', 'Biomedical Instrumentation', 3.0, 'Theory', 2),
('BME202', 'Instrumentation Lab', 1.5, 'Lab', 2);

-- Course IDs: CSE105=1, CSE106=2, BME201=3, BME202=4

-- ============================================
-- 7. Create Course Offerings for Current Terms
-- ============================================
INSERT INTO course_offerings (term_id, course_id, max_capacity) VALUES
(1, 1, 40),  -- CSE105 in CSE Term 3
(1, 2, 40),  -- CSE106 in CSE Term 3
(2, 3, 30),  -- BME201 in BME Term 3
(2, 4, 30);  -- BME202 in BME Term 3

-- Course Offering IDs: 1, 2, 3, 4

-- ============================================
-- 8. Create Sections
-- ============================================
INSERT INTO sections (term_id, name) VALUES
(1, 'A'),  -- Section A for CSE
(1, 'B'),  -- Section B for CSE
(2, 'A'),  -- Section A for BME
(2, 'B');  -- Section B for BME

-- ============================================
-- 9. Assign Teacher to Sections (teaches table)
-- ============================================
INSERT INTO teaches (course_offering_id, teacher_id, section_name) VALUES
-- CSE courses
(1, 1, 'A'),  -- Dr. Johnson teaches CSE105 Section A
(2, 1, 'A'),  -- Dr. Johnson teaches CSE106 Section A
-- BME courses
(3, 1, 'B'),  -- Dr. Johnson teaches BME201 Section B
(4, 1, 'B');  -- Dr. Johnson teaches BME202 Section B

-- ============================================
-- 10. Create Student Users (10 students)
-- ============================================
INSERT INTO users (name, email, password_hash, role, mobile_number, mobile_banking_number, present_address, birth_reg_number, birth_date, nid_number, emergency_contact_number) VALUES
-- CSE Students (Section A)
('Alice Chen', 'alice.chen@student.edu', '$2b$10$studenthash1', 'Student', '01712345001', '01812345001', 'Student Dorm A, Room 101', 'BR2001001', '2004-03-12', 'NID1001', '01812345001'),
('Bob Martin', 'bob.martin@student.edu', '$2b$10$studenthash2', 'Student', '01712345002', '01812345002', 'Student Dorm A, Room 102', 'BR2001002', '2004-05-20', 'NID1002', '01812345002'),
('Carol Stevens', 'carol.stevens@student.edu', '$2b$10$studenthash3', 'Student', '01712345003', '01812345003', 'Student Dorm A, Room 103', 'BR2001003', '2004-07-08', 'NID1003', '01812345003'),
('David Kim', 'david.kim@student.edu', '$2b$10$studenthash4', 'Student', '01712345004', '01812345004', 'Student Dorm A, Room 104', 'BR2001004', '2004-09-15', 'NID1004', '01812345004'),
('Emma Wilson', 'emma.wilson@student.edu', '$2b$10$studenthash5', 'Student', '01712345005', '01812345005', 'Student Dorm A, Room 105', 'BR2001005', '2004-11-22', 'NID1005', '01812345005'),

-- BME Students (Section B)
('Frank Rodriguez', 'frank.rodriguez@student.edu', '$2b$10$studenthash6', 'Student', '01712345006', '01812345006', 'Student Dorm B, Room 201', 'BR2001006', '2004-02-14', 'NID1006', '01812345006'),
('Grace Lee', 'grace.lee@student.edu', '$2b$10$studenthash7', 'Student', '01712345007', '01812345007', 'Student Dorm B, Room 202', 'BR2001007', '2004-04-18', 'NID1007', '01812345007'),
('Henry Thompson', 'henry.thompson@student.edu', '$2b$10$studenthash8', 'Student', '01712345008', '01812345008', 'Student Dorm B, Room 203', 'BR2001008', '2004-06-25', 'NID1008', '01812345008'),
('Iris Patel', 'iris.patel@student.edu', '$2b$10$studenthash9', 'Student', '01712345009', '01812345009', 'Student Dorm B, Room 204', 'BR2001009', '2004-08-30', 'NID1009', '01812345009'),
('Jack Anderson', 'jack.anderson@student.edu', '$2b$10$studenthash10', 'Student', '01712345010', '01812345010', 'Student Dorm B, Room 205', 'BR2001010', '2004-10-05', 'NID1010', '01812345010');

-- Student user_ids: 2-11

-- ============================================
-- 11. Create Student Records
-- ============================================
INSERT INTO students (user_id, roll_number, official_mail, status, current_term) VALUES
-- CSE Students (Section A)
(2, 'CSE2024001', 'alice.chen@student.edu', 'Active', 1),
(3, 'CSE2024002', 'bob.martin@student.edu', 'Active', 1),
(4, 'CSE2024003', 'carol.stevens@student.edu', 'Active', 1),
(5, 'CSE2024004', 'david.kim@student.edu', 'Active', 1),
(6, 'CSE2024005', 'emma.wilson@student.edu', 'Active', 1),

-- BME Students (Section B)
(7, 'BME2024001', 'frank.rodriguez@student.edu', 'Active', 2),
(8, 'BME2024002', 'grace.lee@student.edu', 'Active', 2),
(9, 'BME2024003', 'henry.thompson@student.edu', 'Active', 2),
(10, 'BME2024004', 'iris.patel@student.edu', 'Active', 2),
(11, 'BME2024005', 'jack.anderson@student.edu', 'Active', 2);

-- ============================================
-- 12. Assign Students to Sections
-- ============================================
INSERT INTO student_sections (student_id, section_name) VALUES
-- CSE Students in Section A
(2, 'A'),
(3, 'A'),
(4, 'A'),
(5, 'A'),
(6, 'A'),

-- BME Students in Section B
(7, 'B'),
(8, 'B'),
(9, 'B'),
(10, 'B'),
(11, 'B');

-- ============================================
-- 13. Enroll Students in Courses
-- ============================================
-- CSE Students enrolled in CSE courses (Section A)
INSERT INTO student_enrollments (student_id, course_offering_id, credit_when_taking, status, enrollment_timestamp, approved_timestamp) VALUES
-- Alice Chen
(2, 1, 3.0, 'Enrolled', '2026-01-10 10:00:00+00', '2026-01-11 09:00:00+00'),
(2, 2, 1.5, 'Enrolled', '2026-01-10 10:00:00+00', '2026-01-11 09:00:00+00'),

-- Bob Martin
(3, 1, 3.0, 'Enrolled', '2026-01-10 11:00:00+00', '2026-01-11 09:30:00+00'),
(3, 2, 1.5, 'Enrolled', '2026-01-10 11:00:00+00', '2026-01-11 09:30:00+00'),

-- Carol Stevens
(4, 1, 3.0, 'Enrolled', '2026-01-10 12:00:00+00', '2026-01-11 10:00:00+00'),
(4, 2, 1.5, 'Enrolled', '2026-01-10 12:00:00+00', '2026-01-11 10:00:00+00'),

-- David Kim
(5, 1, 3.0, 'Enrolled', '2026-01-10 13:00:00+00', '2026-01-11 10:30:00+00'),
(5, 2, 1.5, 'Enrolled', '2026-01-10 13:00:00+00', '2026-01-11 10:30:00+00'),

-- Emma Wilson
(6, 1, 3.0, 'Enrolled', '2026-01-10 14:00:00+00', '2026-01-11 11:00:00+00'),
(6, 2, 1.5, 'Enrolled', '2026-01-10 14:00:00+00', '2026-01-11 11:00:00+00');

-- BME Students enrolled in BME courses (Section B)
INSERT INTO student_enrollments (student_id, course_offering_id, credit_when_taking, status, enrollment_timestamp, approved_timestamp) VALUES
-- Frank Rodriguez
(7, 3, 3.0, 'Enrolled', '2026-01-10 10:00:00+00', '2026-01-11 09:00:00+00'),
(7, 4, 1.5, 'Enrolled', '2026-01-10 10:00:00+00', '2026-01-11 09:00:00+00'),

-- Grace Lee
(8, 3, 3.0, 'Enrolled', '2026-01-10 11:00:00+00', '2026-01-11 09:30:00+00'),
(8, 4, 1.5, 'Enrolled', '2026-01-10 11:00:00+00', '2026-01-11 09:30:00+00'),

-- Henry Thompson
(9, 3, 3.0, 'Enrolled', '2026-01-10 12:00:00+00', '2026-01-11 10:00:00+00'),
(9, 4, 1.5, 'Enrolled', '2026-01-10 12:00:00+00', '2026-01-11 10:00:00+00'),

-- Iris Patel
(10, 3, 3.0, 'Enrolled', '2026-01-10 13:00:00+00', '2026-01-11 10:30:00+00'),
(10, 4, 1.5, 'Enrolled', '2026-01-10 13:00:00+00', '2026-01-11 10:30:00+00'),

-- Jack Anderson
(11, 3, 3.0, 'Enrolled', '2026-01-10 14:00:00+00', '2026-01-11 11:00:00+00'),
(11, 4, 1.5, 'Enrolled', '2026-01-10 14:00:00+00', '2026-01-11 11:00:00+00');

-- ============================================
-- Verification Queries
-- ============================================
-- Run these to verify the setup:

-- Check departments
-- SELECT * FROM departments;

-- Check terms
-- SELECT * FROM terms;

-- Check current_state
-- SELECT * FROM current_state;

-- Check teacher
-- SELECT u.id, u.name, u.email, t.appointment, t.department_id 
-- FROM users u 
-- JOIN teachers t ON u.id = t.user_id;

-- Check courses
-- SELECT c.id, c.course_code, c.name, d.code as dept 
-- FROM courses c 
-- JOIN departments d ON c.department_id = d.id;

-- Check what the teacher teaches (should return 4 rows: 2 CSE courses in section A, 2 BME courses in section B)
-- SELECT te.section_name, d.code as dept, c.course_code, c.name
-- FROM teaches te
-- JOIN course_offerings co ON te.course_offering_id = co.id
-- JOIN courses c ON co.course_id = c.id
-- JOIN departments d ON c.department_id = d.id
-- WHERE te.teacher_id = 1
-- ORDER BY d.code, c.course_code;

-- Check students by section
-- SELECT ss.section_name, s.roll_number, u.name, d.code as dept
-- FROM student_sections ss
-- JOIN students s ON ss.student_id = s.user_id
-- JOIN users u ON s.user_id = u.id
-- JOIN terms t ON s.current_term = t.id
-- JOIN departments d ON t.department_id = d.id
-- ORDER BY d.code, ss.section_name, s.roll_number;

-- Check enrollments
-- SELECT d.code as dept, ss.section_name, s.roll_number, u.name, c.course_code, se.status
-- FROM student_enrollments se
-- JOIN students s ON se.student_id = s.user_id
-- JOIN users u ON s.user_id = u.id
-- JOIN course_offerings co ON se.course_offering_id = co.id
-- JOIN courses c ON co.course_id = c.id
-- JOIN departments d ON c.department_id = d.id
-- JOIN student_sections ss ON ss.student_id = s.user_id
-- WHERE se.status = 'Enrolled'
-- ORDER BY d.code, ss.section_name, s.roll_number, c.course_code;

-- ============================================
-- Test the PL/SQL Functions
-- ============================================

-- Test Function 1: Get teacher's sections (should return 4 rows)
-- SELECT * FROM get_teacher_sections(1);
-- Expected: CSE-A (CSE105, CSE106) and BME-B (BME201, BME202)

-- Test Function 2: Get students in CSE Section A (should return 5 students)
-- SELECT * FROM get_students_in_teacher_section(1, 'A', 1);
-- Expected: Alice, Bob, Carol, David, Emma with their CSE courses

-- Test Function 2: Get students in BME Section B (should return 5 students)
-- SELECT * FROM get_students_in_teacher_section(1, 'B', 2);
-- Expected: Frank, Grace, Henry, Iris, Jack with their BME courses

-- Test Function 2: Get students in wrong section (should return 0 rows)
-- SELECT * FROM get_students_in_teacher_section(1, 'B', 1);
-- Expected: Empty (teacher teaches CSE in section A, not B)

COMMIT;

-- ============================================
-- Summary
-- ============================================
-- ✓ 2 Departments: CSE (id=1), BME (id=2)
-- ✓ 2 Terms: Both term 3, starting 2026-01-15
-- ✓ 1 Teacher: Dr. Sarah Johnson (user_id=1)
-- ✓ 4 Courses: CSE105, CSE106, BME201, BME202
-- ✓ 4 Course Offerings
-- ✓ Teacher teaches:
--   - CSE105 & CSE106 in Section A (CSE department)
--   - BME201 & BME202 in Section B (BME department)
-- ✓ 10 Students:
--   - 5 CSE students in Section A (Alice, Bob, Carol, David, Emma)
--   - 5 BME students in Section B (Frank, Grace, Henry, Iris, Jack)
-- ✓ All students enrolled in their respective courses
-- ============================================
