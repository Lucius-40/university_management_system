const DB_Connection = require('../database/db.js');

const query = 
`-- Extensions
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. ENUM DEFINITIONS
-- Defining all custom types first

CREATE TYPE user_role_type AS ENUM ('student', 'teacher', 'admin');

CREATE TYPE account_category_type AS ENUM ('hall', 'department', 'university');

CREATE TYPE room_category_type AS ENUM ('lab', 'class', 'library', 'auditorium');

CREATE TYPE dues_category_type AS ENUM ('hall', 'exam', 'dining', 'admission', 'library_fine');

CREATE TYPE teacher_appointment_type AS ENUM ('lecturer', 'assistant_professor', 'associate_professor', 'professor', 'provost');

CREATE TYPE course_type_enum AS ENUM ('theory', 'sessional', 'thesis');

CREATE TYPE notice_target_type AS ENUM ('student', 'teacher', 'department', 'all');

CREATE TYPE approval_status_type AS ENUM ('pending', 'approved', 'rejected');

CREATE TYPE transaction_category_type AS ENUM ('salary', 'procurement', 'fee_collection', 'maintenance', 'grant');

CREATE TYPE student_status_type AS ENUM ('active', 'graduated', 'inactive', 'suspended');

CREATE TYPE day_of_week_type AS ENUM ('saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday');

CREATE TYPE hall_residence_status_type AS ENUM ('resident', 'attached');

CREATE TYPE enrollment_status_type AS ENUM ('enrolled', 'dropped', 'withdrawn');

CREATE TYPE course_completion_status_type AS ENUM ('completed', 'ongoing', 'incomplete');

CREATE TYPE overall_status_type AS ENUM ('failed', 'successful');

-- 2. TABLE DEFINITIONS

-- LEVEL 0: Independent Tables (No foreign key references)

CREATE TABLE IF NOT EXISTS users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    mobile_number VARCHAR(15) UNIQUE NOT NULL, 
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    mobile_banking_number VARCHAR(15),
    bank_account_number VARCHAR(50),
    present_address TEXT,
    permanent_address TEXT,
    birth_registration_number VARCHAR(50),
    date_of_birth DATE,
    nid_number VARCHAR(50),
    passport_number VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    refresh_token TEXT,
    CONSTRAINT payment_info_check CHECK (mobile_banking_number IS NOT NULL OR bank_account_number IS NOT NULL),
    CONSTRAINT citizenship_info_check CHECK (nid_number IS NOT NULL OR passport_number IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS bank_accounts (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    account_number VARCHAR(50) UNIQUE NOT NULL,
    account_type account_category_type DEFAULT 'university',
    balance NUMERIC(15, 2) DEFAULT 0.00 CONSTRAINT neg_balance_check CHECK (balance >= 0),
    status BOOLEAN DEFAULT TRUE -- True = Active, False = Frozen
);

CREATE TABLE IF NOT EXISTS buildings (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    location TEXT NOT NULL 
);

CREATE TABLE IF NOT EXISTS tenders (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tender_name VARCHAR(200) NOT NULL,
    contractor VARCHAR(100) NOT NULL,
    contract_value NUMERIC(15, 2) DEFAULT 0.00,
    reference VARCHAR(100) NOT NULL,
    leader_name VARCHAR(100) NOT NULL,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE NOT NULL,
    status BOOLEAN DEFAULT TRUE
);

-- LEVEL 1: Depends on Level 0 tables

CREATE TABLE IF NOT EXISTS departments (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    building_id INTEGER,
    bank_account_id INTEGER,
    name VARCHAR(100) NOT NULL,
    CONSTRAINT fk_departments_building FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE SET NULL,
    CONSTRAINT fk_departments_bank FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS scholarships (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bank_account_id INTEGER NOT NULL,
    name VARCHAR(200) NOT NULL,
    requirements TEXT NOT NULL,
    status BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_scholarships_bank FOREIGN KEY(bank_account_id) REFERENCES bank_accounts(id)
);

CREATE TABLE IF NOT EXISTS emergency_contacts (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    relation VARCHAR(50) NOT NULL,
    mobile_number VARCHAR(15) NOT NULL,
    address TEXT NOT NULL,
    CONSTRAINT fk_emergency_contacts_user FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS classrooms (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    building_id INTEGER,
    room_number VARCHAR(20) NOT NULL,
    row_counts INTEGER DEFAULT 0,
    column_counts INTEGER DEFAULT 0,
    category room_category_type NOT NULL,
    exam_capacity INTEGER DEFAULT 0,
    arrangements TEXT,
    CONSTRAINT fk_classrooms_building FOREIGN KEY(building_id) REFERENCES buildings(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS dues (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    bank_account_id INTEGER,
    amount NUMERIC(10, 2) NOT NULL,
    category dues_category_type NOT NULL,
    CONSTRAINT fk_dues_bank FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL
);

-- LEVEL 2: Depends on Level 0-1 tables

CREATE TABLE IF NOT EXISTS terms (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    department_id INTEGER NOT NULL,
    term_number INTEGER NOT NULL,
    started_on DATE NOT NULL,
    ended_on DATE,
    CONSTRAINT fk_terms_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS courses (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    department_id INTEGER,
    course_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) UNIQUE NOT NULL,
    credit_hours NUMERIC(3, 2) DEFAULT 3.00,
    type course_type_enum DEFAULT 'theory',
    CONSTRAINT fk_courses_department FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
);

-- Teachers table inherits ID from Users (1:1 relationship)
CREATE TABLE IF NOT EXISTS teachers (
    id INTEGER PRIMARY KEY, -- Primary Key is also Foreign Key to users
    employee_id VARCHAR(10) NOT NULL UNIQUE,
    department_id INTEGER,
    appointment teacher_appointment_type NOT NULL,
    official_mail VARCHAR(100) NOT NULL UNIQUE,
    security_clearance INTEGER DEFAULT 0,
    CONSTRAINT fk_teachers_user FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_teacher_dept FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE SET NULL 
);

-- LEVEL 3: Depends on Level 0-2 tables

CREATE TABLE IF NOT EXISTS sections (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    department_id INTEGER NOT NULL,
    term_id INTEGER NOT NULL,
    name VARCHAR(50) NOT NULL,
    CONSTRAINT fk_sections_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    CONSTRAINT fk_sections_term FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS halls (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    building_id INTEGER NOT NULL,
    provost_id INTEGER NOT NULL,
    bank_account_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    max_capacity INTEGER,
    CONSTRAINT fk_halls_building FOREIGN KEY (building_id) REFERENCES buildings(id) ON DELETE SET NULL,
    CONSTRAINT fk_halls_provost FOREIGN KEY (provost_id) REFERENCES teachers(id) ON DELETE SET NULL,
    CONSTRAINT fk_halls_bank FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS dept_heads (
    head_id INTEGER NOT NULL,
    dept_id INTEGER NOT NULL UNIQUE,
    PRIMARY KEY (head_id, dept_id),
    CONSTRAINT fk_dept_head_teacher FOREIGN KEY (head_id) REFERENCES teachers(id) ON DELETE CASCADE,
    CONSTRAINT fk_dept_head_dept FOREIGN KEY (dept_id) REFERENCES departments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS prerequisites (
    course_id INTEGER NOT NULL,
    prerequisite_id INTEGER NOT NULL,
    logic_group INTEGER NOT NULL, -- Used for OR logic (e.g. Math 1 OR Math 2)
    PRIMARY KEY(course_id, prerequisite_id),
    CONSTRAINT fk_prereq_course FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_prereq_required FOREIGN KEY(prerequisite_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT no_self_prereq CHECK (course_id != prerequisite_id)
);

CREATE TABLE IF NOT EXISTS course_offerings (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    term_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    max_capacity INTEGER NOT NULL,
    CONSTRAINT fk_offering_term FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE,
    CONSTRAINT fk_offering_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_offering_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notices (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    issue_teacher_id INTEGER NOT NULL,
    recipient_teacher_id INTEGER,
    target_type notice_target_type NOT NULL,
    target_id VARCHAR(50), -- Can be Dept ID or Hall ID, kept generic
    content TEXT NOT NULL,
    approval_status approval_status_type DEFAULT 'pending',
    approved_by_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT fk_notices_issuer FOREIGN KEY (issue_teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    CONSTRAINT fk_notices_receiver FOREIGN KEY (recipient_teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
    CONSTRAINT fk_notices_approved_by FOREIGN KEY (approved_by_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS feedbacks (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_id INTEGER NOT NULL,
    course_teacher_id INTEGER NOT NULL,
    dept_id INTEGER NOT NULL,
    csv_file_url VARCHAR(255),
    average_rating NUMERIC(3,2),
    CONSTRAINT fk_feedbacks_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_feedbacks_teacher FOREIGN KEY (course_teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    CONSTRAINT fk_feedbacks_dept FOREIGN KEY (dept_id) REFERENCES departments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions_received (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    recipient_account_id INTEGER NOT NULL,
    authorized_by_id INTEGER NOT NULL,
    giver_account_number VARCHAR(50) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    description TEXT,
    type transaction_category_type NOT NULL,
    transaction_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT fk_tr_recv_account FOREIGN KEY (recipient_account_id) REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    CONSTRAINT fk_tr_recv_auth FOREIGN KEY (authorized_by_id) REFERENCES teachers(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS transactions_paid (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    giver_account_id INTEGER NOT NULL,
    authorized_by_id INTEGER NOT NULL,
    recipient_account_number VARCHAR(50) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    description TEXT,
    type transaction_category_type NOT NULL,
    transaction_time TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT fk_tr_paid_giver FOREIGN KEY (giver_account_id) REFERENCES bank_accounts(id) ON DELETE RESTRICT,
    CONSTRAINT fk_tr_paid_auth FOREIGN KEY (authorized_by_id) REFERENCES teachers(id) ON DELETE RESTRICT
);

-- LEVEL 4: Depends on Level 0-3 tables

CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY, -- Inherits from Users
    term_id INTEGER NOT NULL,
    section_id INTEGER NOT NULL,
    department_id INTEGER NOT NULL,
    hall_id INTEGER NOT NULL,
    roll CHAR(7) UNIQUE NOT NULL,
    status student_status_type DEFAULT 'active',
    CONSTRAINT fk_student_user FOREIGN KEY (id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_student_term FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE RESTRICT,
    CONSTRAINT fk_student_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT,
    CONSTRAINT fk_student_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_student_hall FOREIGN KEY (hall_id) REFERENCES halls(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS exams (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    department_id INTEGER NOT NULL,
    term_id INTEGER NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_exam_dept FOREIGN KEY(department_id) REFERENCES departments(id) ON DELETE CASCADE,
    CONSTRAINT fk_exam_term FOREIGN KEY(term_id) REFERENCES terms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hall_assistant_provosts (
    hall_id INTEGER NOT NULL,
    assistant_provost_id INTEGER NOT NULL,
    special_description TEXT,
    PRIMARY KEY (hall_id, assistant_provost_id),
    CONSTRAINT fk_hap_hall FOREIGN KEY (hall_id) REFERENCES halls(id) ON DELETE CASCADE,
    CONSTRAINT fk_hap_teacher FOREIGN KEY (assistant_provost_id) REFERENCES teachers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hall_tenders (
    hall_id INTEGER NOT NULL,
    tender_id INTEGER NOT NULL,
    PRIMARY KEY (hall_id, tender_id),
    CONSTRAINT fk_hall_tenders_hall FOREIGN KEY (hall_id) REFERENCES halls(id) ON DELETE CASCADE,
    CONSTRAINT fk_hall_tenders_tender FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS time_slots (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    classroom_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    section_id INTEGER NOT NULL,
    day day_of_week_type NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    CONSTRAINT fk_timeslot_room FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE SET NULL,
    CONSTRAINT fk_timeslot_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_timeslot_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
    CONSTRAINT fk_timeslot_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS teaches (
    course_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    section_id INTEGER NOT NULL,
    PRIMARY KEY (course_id, teacher_id, section_id),
    CONSTRAINT fk_teaches_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_teaches_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    CONSTRAINT fk_teaches_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
);

-- LEVEL 5: Depends on Level 0-4 tables

CREATE TABLE IF NOT EXISTS exam_courses (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    exam_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    section_id INTEGER NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    attending_students INTEGER,
    CONSTRAINT fk_exam_courses_exam FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    CONSTRAINT fk_exam_courses_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_exam_courses_section FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS student_advisor_history (
    student_id INTEGER NOT NULL,
    advisor_id INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    change_reason TEXT NOT NULL,
    PRIMARY KEY (student_id, advisor_id),
    CONSTRAINT fk_advisor_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_advisor_teacher FOREIGN KEY (advisor_id) REFERENCES teachers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS student_halls (
    student_id INTEGER NOT NULL,
    hall_id INTEGER NOT NULL,
    status hall_residence_status_type NOT NULL,
    room_number VARCHAR(10),
    seat_number VARCHAR(10),
    PRIMARY KEY (student_id, hall_id),
    CONSTRAINT fk_st_hall_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_st_hall_hall FOREIGN KEY (hall_id) REFERENCES halls(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_dues (
    student_id INTEGER NOT NULL,
    due_id INTEGER NOT NULL,
    amount_paid NUMERIC(10, 2),
    paid_at TIMESTAMP WITH TIME ZONE,
    pay_type dues_category_type,
    bank_account_paid_by VARCHAR(50),
    mobile_banking_paid_by VARCHAR(20),
    status BOOLEAN DEFAULT FALSE, -- False = Due, True = Paid
    deadline DATE,
    PRIMARY KEY (student_id, due_id),
    CONSTRAINT fk_st_dues_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_st_dues_due FOREIGN KEY (due_id) REFERENCES dues(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_courses (
    student_id INTEGER NOT NULL,
    course_offering_id INTEGER NOT NULL,
    credits_at_time_of_taking NUMERIC(3, 2),
    enrollment_status enrollment_status_type DEFAULT 'enrolled',
    status course_completion_status_type DEFAULT 'ongoing',
    enrollment_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
    approved_timestamp TIMESTAMP WITH TIME ZONE,
    grades NUMERIC(3,2),
    is_retake BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (student_id, course_offering_id),
    CONSTRAINT fk_st_courses_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_st_courses_offering FOREIGN KEY (course_offering_id) REFERENCES course_offerings(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS student_terms (
    student_id INTEGER NOT NULL,
    term_id INTEGER NOT NULL,
    PRIMARY KEY (student_id, term_id),
    CONSTRAINT fk_st_terms_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_st_terms_term FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    student_id INTEGER NOT NULL,
    advisor_id INTEGER NOT NULL,
    term_id INTEGER NOT NULL,
    total_requested_credits NUMERIC(4,2),
    is_due BOOLEAN,
    advisor_approved BOOLEAN,
    vc_approved BOOLEAN,
    overall_status overall_status_type DEFAULT 'failed',
    CONSTRAINT fk_rg_student_id FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_rg_advisor_id FOREIGN KEY (advisor_id) REFERENCES teachers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_rg_term_id FOREIGN KEY (term_id) REFERENCES terms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scholarship_benefactors (
    student_id INTEGER NOT NULL,
    scholarship_id INTEGER NOT NULL,
    amount NUMERIC(10,2),
    installments INTEGER,
    number_of_completed_installments INTEGER,
    PRIMARY KEY (student_id, scholarship_id),
    CONSTRAINT fk_sb_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    CONSTRAINT fk_sb_scholarship FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS marking_components (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    course_offering_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    CONSTRAINT fk_mc_course_offering_id FOREIGN KEY (course_offering_id) REFERENCES course_offerings(id) ON DELETE CASCADE,
    CONSTRAINT fk_mc_student_id FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- LEVEL 6: Depends on Level 0-5 tables

CREATE TABLE IF NOT EXISTS exam_rooms (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    exam_course_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    start_student_id TEXT,
    end_student_id TEXT,
    CONSTRAINT fk_er_exam_course_id FOREIGN KEY (exam_course_id) REFERENCES exam_courses(id) ON DELETE CASCADE,
    CONSTRAINT fk_er_room_id FOREIGN KEY (room_id) REFERENCES classrooms(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reg_course_req (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reg_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    CONSTRAINT fk_rcr_reg_id FOREIGN KEY (reg_id) REFERENCES registrations(id) ON DELETE CASCADE,
    CONSTRAINT fk_rcr_course_id FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS students_ct_marks (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    marking_component_id INTEGER NOT NULL,
    ct_sequence_number INTEGER NOT NULL,
    ct_mark NUMERIC(5, 2) DEFAULT 0.00,
    CONSTRAINT fk_ct_marking_comp FOREIGN KEY (marking_component_id) REFERENCES marking_components(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_assignment_marks (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    marking_component_id INTEGER NOT NULL,
    assignment_sequence_number INTEGER NOT NULL,
    assignment_mark NUMERIC(5, 2) DEFAULT 0.00,
    CONSTRAINT fk_assign_marking_comp FOREIGN KEY (marking_component_id) REFERENCES marking_components(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_theory_marks (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    marking_component_id INTEGER NOT NULL,
    total_ct_assignment_marks NUMERIC(5, 2) DEFAULT 0.00,
    final_exam_marks NUMERIC(5, 2) DEFAULT 0.00,
    attendance_marks NUMERIC(5, 2) DEFAULT 0.00,
    total_marks NUMERIC(5, 2) DEFAULT 0.00,
    grade NUMERIC(3, 2), -- Format for GPA (e.g., 3.75)
    CONSTRAINT fk_theory_marking_comp FOREIGN KEY (marking_component_id) REFERENCES marking_components(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_lab_marks (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    marking_component_id INTEGER NOT NULL,
    lab_test_marks NUMERIC(5, 2) DEFAULT 0.00,
    viva_marks NUMERIC(5, 2) DEFAULT 0.00,
    attendance_marks NUMERIC(5, 2) DEFAULT 0.00,
    total_marks NUMERIC(5, 2) DEFAULT 0.00,
    grade NUMERIC(3, 2),
    CONSTRAINT fk_lab_marking_comp FOREIGN KEY (marking_component_id) REFERENCES marking_components(id) ON DELETE CASCADE
);

-- LEVEL 7: Depends on Level 0-6 tables

CREATE TABLE IF NOT EXISTS exam_invigilators (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    exam_room_id INTEGER NOT NULL,
    teacher_id INTEGER NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT fk_ei_exam_room FOREIGN KEY (exam_room_id) REFERENCES exam_rooms(id) ON DELETE CASCADE,
    CONSTRAINT fk_ei_teacher FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- Add a unique constraint to prevent room conflicts (simpler approach)
-- This prevents exactly the same time slot but allows for manual conflict checking
CREATE UNIQUE INDEX idx_unique_room_time_slot 
    ON time_slots (classroom_id, day, start_time, end_time);


-- ============================================================================
-- 3. INDEXES
-- ============================================================================
-- Note: PRIMARY KEY columns automatically have unique B-tree indexes.
-- PostgreSQL does NOT auto-create indexes on FOREIGN KEY columns.
-- UNIQUE constraints also auto-create indexes (email, roll, course_code, etc.)
-- Focus: FK columns for JOINs, search fields, and high-selectivity filters.

-- USERS: Full-text search on name
CREATE INDEX idx_users_name_trgm ON users USING gin (name gin_trgm_ops);

-- TEACHERS: FK and search
CREATE INDEX idx_teachers_department_id ON teachers(department_id);

-- STUDENTS: FKs and status filter
CREATE INDEX idx_students_department_id ON students(department_id);
CREATE INDEX idx_students_section_id ON students(section_id);
CREATE INDEX idx_students_term_id ON students(term_id);
CREATE INDEX idx_students_hall_id ON students(hall_id);
CREATE INDEX idx_students_status ON students(status) WHERE status != 'graduated'; -- Partial: active students queried more

-- DEPARTMENTS: FK
CREATE INDEX idx_departments_building_id ON departments(building_id);
CREATE INDEX idx_departments_bank_account_id ON departments(bank_account_id);

-- HALLS: FKs
CREATE INDEX idx_halls_building_id ON halls(building_id);
CREATE INDEX idx_halls_provost_id ON halls(provost_id);
CREATE INDEX idx_halls_bank_account_id ON halls(bank_account_id);

-- COURSES: FK and search
CREATE INDEX idx_courses_department_id ON courses(department_id);

-- TERMS: FK
CREATE INDEX idx_terms_department_id ON terms(department_id);

-- SECTIONS: FKs
CREATE INDEX idx_sections_department_id ON sections(department_id);
CREATE INDEX idx_sections_term_id ON sections(term_id);

-- COURSE_OFFERINGS: FKs 
CREATE INDEX idx_course_offerings_term_id ON course_offerings(term_id);
CREATE INDEX idx_course_offerings_course_id ON course_offerings(course_id);
CREATE INDEX idx_course_offerings_teacher_id ON course_offerings(teacher_id);

-- STUDENT_COURSES: FKs and status filter
CREATE INDEX idx_student_courses_course_offering_id ON student_courses(course_offering_id);
CREATE INDEX idx_student_courses_status ON student_courses(status) WHERE status = 'ongoing'; -- Partial: current enrollments

-- REGISTRATIONS: FKs and status
CREATE INDEX idx_registrations_student_id ON registrations(student_id);
CREATE INDEX idx_registrations_advisor_id ON registrations(advisor_id);
CREATE INDEX idx_registrations_term_id ON registrations(term_id);
CREATE INDEX idx_registrations_status ON registrations(overall_status) WHERE overall_status = 'failed'; -- Partial: pending reviews

-- TIME_SLOTS: FKs and scheduling queries
CREATE INDEX idx_time_slots_classroom_id ON time_slots(classroom_id);
CREATE INDEX idx_time_slots_course_id ON time_slots(course_id);
CREATE INDEX idx_time_slots_teacher_id ON time_slots(teacher_id);
CREATE INDEX idx_time_slots_section_id ON time_slots(section_id);
CREATE INDEX idx_time_slots_day ON time_slots(day); -- Schedule lookups by day

-- EXAMS: FKs
CREATE INDEX idx_exams_department_id ON exams(department_id);
CREATE INDEX idx_exams_term_id ON exams(term_id);

-- EXAM_COURSES: FKs
CREATE INDEX idx_exam_courses_exam_id ON exam_courses(exam_id);
CREATE INDEX idx_exam_courses_course_id ON exam_courses(course_id);
CREATE INDEX idx_exam_courses_section_id ON exam_courses(section_id);

-- EXAM_ROOMS: FKs
CREATE INDEX idx_exam_rooms_exam_course_id ON exam_rooms(exam_course_id);
CREATE INDEX idx_exam_rooms_room_id ON exam_rooms(room_id);

-- EXAM_INVIGILATORS: FKs
CREATE INDEX idx_exam_invigilators_exam_room_id ON exam_invigilators(exam_room_id);
CREATE INDEX idx_exam_invigilators_teacher_id ON exam_invigilators(teacher_id);

-- NOTICES: FKs and filtering
CREATE INDEX idx_notices_issue_teacher_id ON notices(issue_teacher_id);
CREATE INDEX idx_notices_approval_status ON notices(approval_status) WHERE approval_status = 'pending'; -- Partial: pending approvals

-- TRANSACTIONS: FKs and time-based queries
CREATE INDEX idx_transactions_received_recipient ON transactions_received(recipient_account_id);
CREATE INDEX idx_transactions_received_time ON transactions_received(transaction_time);
CREATE INDEX idx_transactions_paid_giver ON transactions_paid(giver_account_id);
CREATE INDEX idx_transactions_paid_time ON transactions_paid(transaction_time);

-- STUDENT_DUES: FKs and unpaid filter
CREATE INDEX idx_student_dues_student_id ON student_dues(student_id);
CREATE INDEX idx_student_dues_due_id ON student_dues(due_id);
CREATE INDEX idx_student_dues_unpaid ON student_dues(student_id) WHERE status = FALSE; -- Partial: unpaid dues

-- MARKING_COMPONENTS: FKs
CREATE INDEX idx_marking_components_course_offering_id ON marking_components(course_offering_id);
CREATE INDEX idx_marking_components_student_id ON marking_components(student_id);

-- MARKS TABLES: FK (single index each - small tables)
CREATE INDEX idx_students_ct_marks_component ON students_ct_marks(marking_component_id);
CREATE INDEX idx_student_assignment_marks_component ON student_assignment_marks(marking_component_id);
CREATE INDEX idx_student_theory_marks_component ON student_theory_marks(marking_component_id);
CREATE INDEX idx_student_lab_marks_component ON student_lab_marks(marking_component_id);

-- EMERGENCY_CONTACTS: FK
CREATE INDEX idx_emergency_contacts_user_id ON emergency_contacts(user_id);

-- CLASSROOMS: FK
CREATE INDEX idx_classrooms_building_id ON classrooms(building_id);

`;


class CreateTables {
    constructor(){
        this.db_connection = DB_Connection.getInstance();
    }
    
    CreateTables = async()=>{
        try{
            const res = await this.db_connection.query_executor(query);
            return res;
        }catch(err){
            console.error(err);
            throw err;
        }
    }

    checkConnection = async ()=>{
        const query =
        `DROP TABLE pitom_EKTA_GADHA ;`
        try {
            const res = await this.db_connection.query_executor(query);
            console.log(res);
        }catch(err){
            console.log(err);
        }
    }
    

}

module.exports = CreateTables ;