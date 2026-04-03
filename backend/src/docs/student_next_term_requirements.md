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

For a student to be considered by the session-end progression flow, all of the following must be true:

1. The student current term is inside the ended session window.
2. The student has at least one enrolled course in that term.
3. The student has pending/enrolled rows in ended terms (pending rows are auto-approved before evaluation).

For non-terminal terms (1-7), students are promoted to next term even if they failed one or more courses.
Failed courses are expected to be handled through retake registration in future terms.

## 3. Passing Grade Definition

A course is treated as passed only if grade is one of:
- A+
- A
- A-
- B
- C
- D

Anything else is non-passing.

Passing grade is still used for:
- retake eligibility logic,
- credit accumulation toward graduation,
- reporting outcomes.

## 4. Important Backend Behaviors Before Evaluation

Before progression is evaluated, the backend does this:

1. Auto-approves pending enrollments in the ended term(s) to Enrolled.
2. Refreshes grades from marking components.
3. Sets any remaining null grade to F.

Meaning: if marks are missing or incomplete by session end, that enrollment can become F and block progression.

Under the current policy, this does not block non-terminal promotion. It does affect:
- whether the course becomes a retake path,
- whether terminal-term credit requirements are met.

## 5. Terminal Term Rule (Credit-Based)

Terminal term is term number 8.

If a student in term 8 reaches required_total_credits for their department:
- student is marked Graduated.

If required_total_credits is not met:
- student remains in term 8,
- student is not graduated,
- student can continue retake/improvement attempts to reach required credits.

Credit counting policy:
- unique passed courses count once (best attempt),
- optional passed courses are included,
- failed courses do not contribute.

## 6. Why A Student Might Not Progress

Current reason codes used by backend include:

- student_current_term_not_in_ended_window
- no_enrolled_courses_in_current_term
- current_term_number_missing
- next_term_not_found
- promoted_all_courses_passed
- promoted_with_retake_path
- credit_requirement_met
- terminal_term_credit_shortfall

## 7. Practical Checklist For Students

Before session end, a student should ensure:

1. They are enrolled in the intended courses for the current term.
2. Their marks are entered and finalized in time.
3. They understand failed courses remain retake candidates after promotion.
4. If they are in term 8, they should verify earned credits against department required_total_credits.
5. They are in the correct current term record for their department.

## 8. Related Backend Source

Primary logic is implemented in:
- backend/src/models/systemStateModel.js

Supporting grade and enrollment data flow:
- backend/src/models/markingModel.js
- backend/src/models/enrollmentModel.js
- backend/src/models/studentModel.js
