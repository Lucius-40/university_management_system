# Student Next-Term Progression Requirements

This document explains how the backend currently decides whether a student can proceed to the next term.

Scope: these rules are applied during the session-end progression flow (end current session operation).

## 1. When The Check Runs

The progression check runs when the system admin triggers session end.

The backend first selects terms whose date window exactly matches:
- current_state.term_start
- current_state.term_end

Only students in those ended terms are evaluated for progression.

## 2. What Must Already Be True (Previous Requirements)

For a student to proceed to the next term, all of the following must be true:

1. The student current term is inside the ended session window.
2. The student has at least one enrolled course in that term.
3. Every enrolled course in that term has a passing grade.
4. The student is not already in the terminal term.
5. The next term (current term number + 1) exists for the same department.

## 3. Passing Grade Definition

A course is treated as passed only if grade is one of:
- A+
- A
- A-
- B
- C
- D

Anything else is non-passing.

## 4. Important Backend Behaviors Before Evaluation

Before progression is evaluated, the backend does this:

1. Auto-approves pending enrollments in the ended term(s) to Enrolled.
2. Refreshes grades from marking components.
3. Sets any remaining null grade to F.

Meaning: if marks are missing or incomplete by session end, that enrollment can become F and block progression.

## 5. Terminal Term Rule

Terminal term is term number 8.

If a student in term 8 passes all enrolled courses in the ended session:
- student is marked Graduated
- student is not moved to term 9

## 6. Why A Student Might Not Progress

Current reason codes used by backend include:

- student_current_term_not_in_ended_window
- no_enrolled_courses
- one_or_more_courses_not_passed
- current_term_number_missing
- next_term_not_found

## 7. Practical Checklist For Students

Before session end, a student should ensure:

1. They are enrolled in the intended courses for the current term.
2. Their marks are entered and finalized in time.
3. They achieve at least D in all enrolled courses.
4. They are in the correct current term record for their department.

## 8. Related Backend Source

Primary logic is implemented in:
- backend/src/models/systemStateModel.js

Supporting grade and enrollment data flow:
- backend/src/models/markingModel.js
- backend/src/models/enrollmentModel.js
- backend/src/models/studentModel.js
