
-- 1. Set Registration Period (REQUIRED)
-- Make sure the dates include today's date
INSERT INTO current_state (reg_start, reg_end, newest_term_start) 
VALUES ('2026-02-20', '2026-03-10', '2026-03-15')
ON CONFLICT DO NOTHING;

-- If current_state already exists, update it:
-- UPDATE current_state SET reg_start = '2026-02-20', reg_end = '2026-03-10', newest_term_start = '2026-03-15';


-- 2. Create Department (if not exists)
INSERT INTO departments (id, code, name, department_head_id)
VALUES (1, 'CSE', 'Computer Science and Engineering', NULL)
ON CONFLICT (id) DO NOTHING;


-- 3. Create Terms for the Department
INSERT INTO terms (id, term_number, start_date, end_date, department_id)
VALUES 
    (1, 1, '2026-01-01', '2026-05-31', 1),
    (2, 2, '2026-06-01', '2026-10-31', 1),
    (3, 3, '2026-11-01', '2027-03-31', 1)
ON CONFLICT (id) DO NOTHING;


-- 4. Create Sections for Terms
INSERT INTO sections (term_id, name)
VALUES 
    (1, 'A'),
    (1, 'B'),
    (2, 'A'),
    (2, 'B'),
    (3, 'A'),
    (3, 'B'),
    (3, 'C')
ON CONFLICT (term_id, name) DO NOTHING;


-- 5. Create Courses
INSERT INTO courses (id, course_code, name, credit_hours, type, department_id)
VALUES 
    (1, 'CSE101', 'Introduction to Programming', 3.0, 'Theory', 1),
    (2, 'CSE102', 'Programming Lab', 1.5, 'Lab', 1),
    (3, 'CSE201', 'Data Structures', 3.0, 'Theory', 1),
    (4, 'CSE202', 'Data Structures Lab', 1.5, 'Lab', 1),
    (5, 'CSE301', 'Algorithms', 3.0, 'Theory', 1),
    (6, 'CSE302', 'Database Systems', 3.0, 'Theory', 1),
    (7, 'CSE303', 'Operating Systems', 3.0, 'Theory', 1)
ON CONFLICT (id) DO NOTHING;


-- 6. Setup Course Prerequisites
-- CSE201 (Data Structures) requires CSE101 (Intro to Programming)
INSERT INTO course_prerequisites (course_id, prereq_id)
VALUES 
    (3, 1),  -- CSE201 requires CSE101
    (4, 2),  -- CSE202 Lab requires CSE102 Lab
    (5, 3)   -- CSE301 (Algorithms) requires CSE201 (Data Structures)
ON CONFLICT (course_id, prereq_id) DO NOTHING;


-- 7. Create Course Offerings for Term 3
INSERT INTO course_offerings (id, term_id, course_id, max_capacity)
VALUES 
    (1, 3, 1, 50),   -- CSE101 in Term 3
    (2, 3, 2, 50),   -- CSE102 in Term 3
    (3, 3, 3, 40),   -- CSE201 in Term 3
    (4, 3, 4, 40),   -- CSE202 in Term 3
    (5, 3, 6, 35),   -- CSE302 in Term 3
    (6, 3, 7, 35)    -- CSE303 in Term 3
ON CONFLICT (id) DO NOTHING;


-- 8. Create Test Users (Student and Teacher/Advisor)
-- Note: Password for both users is 'password123'
-- You'll need to hash it properly using bcrypt before inserting
-- For testing, use the register endpoint or hash manually:
-- const bcrypt = require('bcrypt'); bcrypt.hashSync('password123', 10);

INSERT INTO users (id, name, email, password_hash, role, mobile_number, mobile_banking_number, bank_account_number, present_address, permanent_address, birth_reg_number, nid_number, passport_number, birth_date, emergency_contact_name, emergency_contact_number, emergency_contact_relation)
VALUES 
    -- Teacher/Advisor (user_id: 2)
    (2, 
     'Dr. Jane Smith', 
     'jane.smith@university.com', 
     '$2b$10$K7L/lHcCxPZNzXjL5BZMReNj8vKv9E7VKfJPqF5YzWxZ9Xy2JqZP6',  -- password123
     'Teacher', 
     '01712345678', 
     '01712345678',  -- bKash/Nagad number
     '1234567890123456',  -- Bank account
     '25/A, Faculty Quarter, Dhaka University Campus, Dhaka-1000', 
     '123, Green Road, Dhanmondi, Dhaka-1205',
     'B19800515123456',  -- Birth registration
     '1234567890123',  -- NID
     NULL,  -- Passport (optional)
     '1980-05-15',
     'Michael Smith',
     '01798765432',
     'Husband'),
    
    -- Student (user_id: 3)
    (3, 
     'John Doe', 
     'john.doe@university.com', 
     '$2b$10$K7L/lHcCxPZNzXjL5BZMReNj8vKv9E7VKfJPqF5YzWxZ9Xy2JqZP6',  -- password123
     'Student', 
     '01798765432', 
     '01798765432',  -- bKash/Nagad number
     NULL,  -- Bank account (optional since mobile banking provided)
     'Room 305, Shahidullah Hall, Dhaka University Campus, Dhaka-1000', 
     '456, Mirpur-10, Dhaka-1216',
     'B20020820987654',  -- Birth registration
     NULL,  -- NID (optional for students)
     'A12345678',  -- Passport
     '2002-08-20',
     'Mary Doe',
     '01612345678',
     'Mother')
ON CONFLICT (id) DO NOTHING;


-- 9. Create Teacher Record
INSERT INTO teachers (user_id, appointment, official_mail, department_id)
VALUES (2, 'Professor', 'jane.smith@cse.university.com', 1)
ON CONFLICT (user_id) DO NOTHING;


-- 10. Create Student Record
INSERT INTO students (user_id, roll_number, official_mail, status, current_term)
VALUES (3, '2024001', 'john.doe@student.university.com', 'Active', 1)
ON CONFLICT (user_id) DO NOTHING;


-- 11. Assign Advisor to Student
INSERT INTO student_advisor_history (student_id, teacher_id, start_date, end_date, change_reason)
VALUES (3, 2, '2026-01-01', NULL, 'Initial assignment')
ON CONFLICT DO NOTHING;


-- 12. Clear any Overdue Dues (for testing) OR Create some test dues
-- Option A: Create a cleared due
INSERT INTO dues (id, name, amount, bank_account_number)
VALUES (1, 'Semester Fee - Spring 2026', 25000.00, '1234567890')
ON CONFLICT (id) DO NOTHING;

INSERT INTO student_dues_payment (student_id, due_id, amount_paid, paid_at, payment_method, status, deadline)
VALUES (3, 1, 25000.00, '2026-02-15', 'Bank Transfer', 'Paid', '2026-02-28')
ON CONFLICT DO NOTHING;

-- Option B: To test dues blocking, uncomment this:
-- INSERT INTO student_dues_payment (student_id, due_id, amount_paid, paid_at, payment_method, status, deadline)
-- VALUES (3, 1, 0, NULL, NULL, 'Overdue', '2026-02-28');


-- 13. Create Previous Enrollments (so student has completed CSE101)
-- This allows student to take courses with prerequisites
INSERT INTO course_offerings (id, term_id, course_id, max_capacity)
VALUES (10, 1, 1, 50)  -- CSE101 in Term 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO student_enrollments (student_id, course_offering_id, credit_when_taking, status, grade, is_retake)
VALUES (3, 10, 3.0, 'Enrolled', 'A', false)
ON CONFLICT DO NOTHING;


-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify the setup:

-- Check registration period:
SELECT * FROM current_state;

-- Check student details:
SELECT s.*, u.name, u.email, u.role 
FROM students s 
JOIN users u ON s.user_id = u.id 
WHERE s.user_id = 3;

-- Check student's advisor:
SELECT sah.*, u.name as advisor_name 
FROM student_advisor_history sah 
JOIN users u ON sah.teacher_id = u.id 
WHERE sah.student_id = 3 AND sah.end_date IS NULL;

-- Check student's completed courses:
SELECT se.*, co.course_id, c.course_code, c.name, se.grade
FROM student_enrollments se
JOIN course_offerings co ON se.course_offering_id = co.id
JOIN courses c ON co.course_id = c.id
WHERE se.student_id = 3 AND se.status = 'Enrolled';

-- Check available offerings for Term 3:
SELECT co.*, c.course_code, c.name, c.credit_hours
FROM course_offerings co
JOIN courses c ON co.course_id = c.id
WHERE co.term_id = 3;

-- Check sections for Term 3:
SELECT * FROM sections WHERE term_id = 3;

-- Check dues status:
SELECT sdp.*, d.name as due_name, d.amount 
FROM student_dues_payment sdp 
JOIN dues d ON sdp.due_id = d.id 
WHERE sdp.student_id = 3;


-- =====================================================
-- RESET/CLEANUP (Run if you need to start over)
-- =====================================================
-- Uncomment to cleanup test data:

-- DELETE FROM student_enrollments WHERE student_id = 3;
-- DELETE FROM student_sections WHERE student_id = 3;
-- DELETE FROM student_advisor_history WHERE student_id = 3;
-- DELETE FROM students WHERE user_id = 3;
-- DELETE FROM teachers WHERE user_id = 2;
-- DELETE FROM users WHERE id IN (2, 3);
