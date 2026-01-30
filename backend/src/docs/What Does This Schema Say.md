# Schema Capabilities Analysis

## Legend - Table Row Counts
*   $N_{users}$: Rows in `users`
*   $N_{students}$: Rows in `students`
*   $N_{teachers}$: Rows in `teachers`
*   $N_{dept}$: Rows in `departments`
*   $N_{courses}$: Rows in `courses`
*   $N_{terms}$: Rows in `terms`
*   $N_{offerings}$: Rows in `course_offerings`
*   $N_{sections}$: Rows in `sections`
*   $N_{enrollments}$: Rows in `student_enrollments`
*   $N_{marks}$: Rows in `marking_components` (Total marks recorded)
*   $N_{dues}$: Rows in `dues` (Types of dues)
*   $N_{payments}$: Rows in `student_dues_payment` (Transaction history)
*   $N_{history}$: Rows in `student_advisor_history`
*   $N_{prereq}$: Rows in `course_prerequisites`
*   $N_{feedback}$: Rows in `feedback`

---

## 1. Profile & Identity

### **Q: "What are my personal details, email, and emergency contact?"**
*   **Tables:** `students` JOIN `users`
*   **Complexity:** $O(\log N_{students} + \log N_{users})$
    *   Lookup student by ID in `students` table ($N_{students}$) -> 1 row key lookup.
    *   Lookup user details by FK in `users` table ($N_{users}$) -> 1 row key lookup.

### **Q: "Who is the head of my department?"**
*   **Tables:** `students` $\to$ `departments` $\to$ `teachers` $\to$ `users`
*   **Complexity:** $O(\log N_{students} + \log N_{dept} + \log N_{teachers} + \log N_{users})$
    *   Requires 4 sequential primary key index lookups.

### **Q: "What is my unique student roll number?"**
*   **Tables:** `students`
*   **Complexity:** $O(\log N_{students})$
    *   Direct unique index lookup on `students` table.

---

## 2. Academic Progress & History

### **Q: "What courses have I completed and what are my grades? (Transcript)"**
*   **Tables:** `student_enrollments` JOIN `course_offerings` JOIN `courses`
*   **Complexity:** $O(\log N_{enrollments} + k \cdot (\log N_{offerings} + \log N_{courses}))$
    *   $k$ = number of courses the student has enrolled in.
    *   We scan the index of `student_enrollments` for the student ID to find $k$ rows.
    *   For each of the $k$ rows, we perform index lookups on `course_offerings` and `courses`.

### **Q: "What are my marks (Midterm/Final) for my current courses?"**
*   **Tables:** `student_enrollments` JOIN `marking_components`
*   **Complexity:** $O(\log N_{enrollments} + m \cdot \log N_{marks})$
    *   $m$ = number of marking components associated with the student's active enrollments.
    *   Filter enrollments for "active" status, then join marks on foreign key.

### **Q: "Who have been my advisors in the past?"**
*   **Tables:** `student_advisor_history` JOIN `teachers` JOIN `users`
*   **Complexity:** $O(\log N_{history} + a \cdot (\log N_{teachers} + \log N_{users}))$
    *   $a$ = number of advisor changes in the student's history.
    *   Index lookup on `student_advisor_history` for student_id yields $a$ rows.

### **Q: "Is my enrollment in 'Calculus II' marked as a retake?"**
*   **Tables:** `student_enrollments` JOIN `course_offerings` JOIN `courses`
*   **Complexity:** $O(\log N_{enrollments})$
    *   Lookup specific enrollment record.

---

## 3. Course Registration & Planning

### **Q: "What courses are available this term?"**
*   **Tables:** `terms` JOIN `course_offerings` JOIN `courses`
*   **Complexity:** $O(\log N_{terms} + c \cdot (\log N_{offerings} + \log N_{courses}))$
    *   $c$ = number of courses offered in the specific term.
    *   We filter `course_offerings` by `term_id`, yielding $c$ rows.

### **Q: "Can I enroll in 'Course X'? (Prerequisite Check)"**
*   **Tables:** `courses` (Target) JOIN `course_prerequisites` JOIN `student_enrollments` (History)
*   **Complexity:** $O(p \cdot \log N_{prereq} + p \cdot \log N_{enrollments})$
    *   $p$ = number of prerequisites for the target course.
    *   We lookup the $p$ prerequisites, then check if each exists in the student's enrollment history with a passing grade.

### **Q: "Who is teaching 'Section A' of a specific course?"**
*   **Tables:** `course_offerings` JOIN `sections` JOIN `teachers` JOIN `users`
*   **Complexity:** $O(\log N_{offerings} + s \cdot (\log N_{sections} + \log N_{teachers} + \log N_{users}))$
    *   $s$ = number of sections for that course offering.

### **Q: "Who approved my enrollment into this course?"**
*   **Tables:** `student_enrollments` JOIN `teachers` JOIN `users`
*   **Complexity:** $O(\log N_{enrollments} + \log N_{teachers} + \log N_{users})$
    *   Traverse FK `approved_by_teacher_id` to get the teacher's name.

### **Q: "How many credits does this course carry?"**
*   **Tables:** `courses`
*   **Complexity:** $O(\log N_{courses})$
    *   Key lookup on `courses` table.

---

## 4. Financials

### **Q: "How much do I owe? (Unpaid Dues)"**
*   **Tables:** `student_dues_payment` JOIN `dues`
*   **Complexity:** $O(\log N_{payments} + d \cdot \log N_{dues})$
    *   $d$ = number of payment records assigned to the student.
    *   We filter `student_dues_payment` ($N_{payments}$) by student ID to get $d$ rows (where status is unpaid).
    *   For each row, we join with `dues` ($N_{dues}$) to get the amount/name.

### **Q: "Did my specific payment clear?"**
*   **Tables:** `student_dues_payment`
*   **Complexity:** $O(\log N_{payments})$
    *   Direct lookup by payment transaction ID (if known) or Student ID + Date.

### **Q: "What payment method (Mobile/Bank) did I use?"**
*   **Tables:** `student_dues_payment`
*   **Complexity:** $O(\log N_{payments})$
    *   Direct retrieval of `payment_method` column.

---

## 5. Feedback

### **Q: "What is the average rating of a specific teacher/course offering?"**
*   **Tables:** `feedback` JOIN `course_offerings` JOIN `courses` JOIN `teachers`
*   **Complexity:** $O(\log N_{feedback})$
    *   Assuming an index on `course_offering_id` or `teacher_id` in the `feedback` table.

---

## Questions That CANNOT Be Answered

### **1. Logistics & Scheduling**
*   **Q: "Where is my class held (Room No) and at what time?"**
*   **Reason:** The `sections` table links a teacher to a course offering, but there is no `schedule`, `room_number`, or `time_slot` column/table. You know *who* teaches it contextually, but not *when* or *where*.

### **2. Daily Activities**
*   **Q: "What is my attendance percentage for 'Data Structures'?"**
*   **Reason:** You have `marking_components` for exams (Midterm/Final), but there is no `attendance` or `class_sessions` table to track daily presence or absence.

### **3. Grading Logic**
*   **Q: "I scored 78. What Letter Grade (A, B, C) does that correspond to?"**
*   **Reason:** While you store the final `grade` in `student_enrollments`, there is no `grading_scale` or `grade_policy` table (e.g., defining "A = 80-100") to programmatically answer what a numeric score implies before the teacher assigns the final letter.

### **4. Direct Feedback Content**
*   **Q: "What exactly did I write in my feedback for Dr. Smith?"**
*   **Reason:** Your `feedback` table stores an `average_rating` and a `csv_file_url`. The detailed textual comments are stored in an external file (the CSV), not inside the database, so SQL cannot query the specific words written by a student. Furthermore, the `feedback` table does not appear to have a `student_id` column, implying anonymity or aggregation.

### **5. Facility Usage**
*   **Q: "Do I have any overdue library books or hostel fees?"**
*   **Reason:** The `dues` table is generic, but there are no specific tables for `library_loans` or `hostel_allocations` to track the usage of these facilities. You can see a due named "Library Fine," but you cannot see *which book* caused it.


### Schema Diagram 
[link](https://dbdiagram.io/d/UMS_new-697c483fbd82f5fce2196db2)