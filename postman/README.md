# Student Registration Flow - Postman Testing Guide

This guide explains how to test the student course registration flow using the provided Postman collection. Please clear the DB or create a copy with 0 rows to start

## Setup

### 1. Import Postman Collection and Environment

1. Open Postman
2. Import `University_Management.postman_collection.json`
3. Import `University_Env.postman_environment.json`
4. Select "University Env" as the active environment

### 2. Setup Test Data in Database

Run the SQL script to set up test data:

```bash
psql -U your_username -d university_db -f Registration_Test_Setup.sql
```

Or copy and paste the contents of `Registration_Test_Setup.sql` into your database client.

This script creates:
- ✅ Registration period (Feb 20 - Mar 10, 2026)
- ✅ Department (CSE)
- ✅ Terms 1-3
- ✅ Sections (A, B, C)
- ✅ Sample courses with prerequisites
- ✅ Course offerings for Term 3
- ✅ Test student (user_id: 3, roll: 2024001)
- ✅ Test teacher/advisor (user_id: 2)
- ✅ Completed course (CSE101) for prerequisite testing
- ✅ Cleared dues

### 3. Login and Get Access Token

1. Run **Auth > Login** request with credentials:
   ```json
   {
     "email": "john.doe@university.com",
     "password": "password123"
   }
   ```
2. The `accessToken` will be automatically saved to environment variables
3. (If using default admin, use: `admin@university.com` / `admin123`)

## Testing the Registration Flow

Navigate to **Students > Registration Flow** folder in Postman.

### Step 1: Check Registration Eligibility

**Request:** `GET /api/students/{{studentId}}/registration-eligibility?term_number=3`

**What it checks:**
- ✅ Is registration period open?
- ✅ Is student status Active?
- ✅ Any overdue dues?
- ✅ Student's department and advisor
- ✅ Available sections for the term
- ✅ Current credit load

**Expected Response:**
```json
{
  "eligible": true,
  "registration_open": true,
  "student_status": "Active",
  "has_overdue_dues": false,
  "advisor": {
    "id": 2,
    "name": "Dr. Jane Smith",
    "email": "jane.smith@university.com"
  },
  "sections": ["A", "B", "C"],
  "credits": {
    "current": 0,
    "remaining": 23,
    "limit": 23
  }
}
```

### Step 2: Get Available Courses

**Request:** `GET /api/students/{{studentId}}/available-courses?term_number=3`

**What it shows:**
- All course offerings for Term 3 in student's department
- Prerequisites for each course
- Missing prerequisites (if any)
- Whether student can enroll
- Current enrollment count and capacity
- If it's a retake

**Expected Response:**
```json
{
  "term": {
    "id": 3,
    "term_number": 3
  },
  "courses": [
    {
      "id": 1,
      "course_code": "CSE101",
      "name": "Introduction to Programming",
      "credit_hours": 3.0,
      "prerequisites": [],
      "missing_prerequisites": [],
      "can_enroll": false,
      "is_retake": true,
      "previous_grade": "A",
      "already_enrolled": false,
      "enrollment_count": 0,
      "capacity_available": 50
    },
    {
      "id": 3,
      "course_code": "CSE201",
      "name": "Data Structures",
      "credit_hours": 3.0,
      "prerequisites": [
        {
          "prereq_id": 1,
          "course_code": "CSE101",
          "name": "Introduction to Programming"
        }
      ],
      "missing_prerequisites": [],
      "can_enroll": true,
      "is_retake": false,
      "previous_grade": null,
      "already_enrolled": false,
      "enrollment_count": 0,
      "capacity_available": 40
    },
    {
      "id": 4,
      "course_code": "CSE202",
      "name": "Data Structures Lab",
      "credit_hours": 1.5,
      "prerequisites": [
        {
          "prereq_id": 2,
          "course_code": "CSE102",
          "name": "Programming Lab"
        }
      ],
      "missing_prerequisites": [
        {
          "prereq_id": 2,
          "course_code": "CSE102",
          "name": "Programming Lab"
        }
      ],
      "can_enroll": false,
      "is_retake": false,
      "previous_grade": null
    }
  ]
}
```

**Response Fields Explained:**
- `can_enroll`: `true` only if all conditions met:
  - Not already enrolled in this term
  - All prerequisites completed with passing grade (D+)
  - Student hasn't already passed this course (prevents retaking passed courses)
- `is_retake`: `true` if student took this course before (regardless of grade)
- `previous_grade`: The grade received when taken before (`null` if never taken)
- `missing_prerequisites`: Lists prerequisites not yet completed

### Step 3: Register for Courses

**Request:** `POST /api/students/{{studentId}}/register`

**Request Body:**
```json
{
  "term_number": 3,
  "section_name": "A",
  "course_offering_ids": [2, 3]
}
```

**What it validates:**
1. Registration period is active
2. Student status is 'Active'
3. No overdue dues
4. All prerequisites met for each course
5. Student hasn't already passed the course (can only retake if failed)
6. Credit limit not exceeded (max 23)
7. No duplicate enrollments in current term
8. Section exists for the term
9. Course offerings belong to selected term

**Expected Success Response:**
```json
{
  "message": "Registration successful. Enrollments pending advisor approval.",
  "enrollments": [
    {
      "id": 1,
      "student_id": 3,
      "course_offering_id": 1,
      "credit_when_taking": 3.0,
      "status": "Pending",
      "is_retake": false
    }
  ],
  "section_assignment": {
    "student_id": 3,
    "section_name": "A"
  },
  "advisor": {
    "id": 2,
    "name": "Dr. Jane Smith",
    "email": "jane.smith@university.com"
  },
  "credits": {
    "previous": 0,
    "new": 7.5,
    "total": 7.5,
    "limit": 23
  },
  "warnings": []
}
```

## Testing Error Scenarios

### Test 1: Registration Outside Period

Update `current_state` to have past dates:
```sql
UPDATE current_state 
SET reg_start = '2026-01-01', reg_end = '2026-01-31';
```

**Expected Error:** `Registration is not open`

### Test 2: Overdue Dues

Add an overdue due:
```sql
INSERT INTO dues (id, name, amount) VALUES (2, 'Library Fine', 500);
INSERT INTO student_dues_payment (student_id, due_id, amount_paid, status, deadline)
VALUES (3, 2, 0, 'Overdue', '2026-02-01');
```

**Expected Error:** `Cannot register with overdue dues`

### Test 3: Missing Prerequisites

Try to register for CSE301 (Algorithms) without completing CSE201:
```json
{
  "term_number": 3,
  "section_name": "A",
  "course_offering_ids": [5]  // CSE301 requires CSE201
}
```

**Expected Error:** `Missing prerequisites for CSE301`

### Test 4: Credit Limit Exceeded

Try to register for courses totaling > 23 credits:
```json
{
  "term_number": 3,
  "section_name": "A",
  "course_offering_ids": [1, 2, 3, 4, 5, 6]  // More than 23 credits
}
```

**Expected Error:** `Credit limit exceeded`

### Test 5: Duplicate Enrollment

1. Register for a course successfully
2. Try to register for the same course again

**Expected Error:** `Already enrolled in [course_code]`

### Test 6: Invalid Section

Try to register with a non-existent section:
```json
{
  "term_number": 3,
  "section_name": "Z",
  "course_offering_ids": [1]
}
```

**Expected Error:** `Section Z does not exist for term 3`

### Test 7: Retaking a Passed Course

The system prevents students from re-enrolling in courses they've already passed (grade D or better).

**Setup:**
The test data includes a student who completed CSE101 with grade 'A' in Term 1.

**Try to register for CSE101 again:**
```json
{
  "term_number": 3,
  "section_name": "A",
  "course_offering_ids": [1]  // CSE101 - already passed with 'A'
}
```

**Expected Error:** `Cannot re-enroll in CSE101. You already passed with grade A`

**Retake Logic:**
- ✅ **Can retake:** If previously failed (grade F) or no grade assigned yet
- ❌ **Cannot retake:** If passed with D, C, B, A-, A, or A+
- **Available Courses Response** shows:
  - `is_retake: true` - Student took this course before
  - `previous_grade: "A"` - The grade they received
  - `can_enroll: false` - Cannot re-enroll (already passed)

**To test allowed retake (failed course):**
```sql
-- Update the previous enrollment to grade F
UPDATE student_enrollments 
SET grade = 'F' 
WHERE student_id = 3 AND course_offering_id = 10;
```

Now the student CAN retake CSE101, and the response will show:
- `is_retake: true`
- `previous_grade: "F"`
- `can_enroll: true` (assuming all other conditions met)

## Environment Variables

The following variables are used in the Postman collection:

| Variable | Description | Example |
|----------|-------------|---------|
| `baseUrl` | API base URL | `http://localhost:3000` |
| `accessToken` | JWT access token | Auto-set on login |
| `refreshToken` | JWT refresh token | Auto-set on login |
| `studentId` | Test student user_id | `3` |
| `enrollmentId` | Created enrollment ID | Auto-set on registration |

## Common Issues

### Issue: "Student has no department assigned"
**Solution:** Make sure the student has a `current_term` that belongs to a department:
```sql
UPDATE students SET current_term = 1 WHERE user_id = 3;
```

### Issue: "Authentication failed"
**Solution:** 
1. Run the Login request again
2. Check that Authorization header is set: `Bearer {{accessToken}}`
3. Verify the token hasn't expired

### Issue: "Term X not found for department"
**Solution:** Create the term for the student's department:
```sql
INSERT INTO terms (term_number, start_date, end_date, department_id)
VALUES (3, '2026-11-01', '2027-03-31', 1);
```

## Next Steps After Registration

After successful registration, the enrollments are in **"Pending"** status and require advisor approval. 

To approve enrollments (requires advisor/teacher permissions):
1. Get the enrollment IDs from the registration response
2. Update enrollment status using an approval endpoint (to be implemented)

## Database Queries for Verification

Check student's enrollments:
```sql
SELECT se.*, co.course_id, c.course_code, c.name, se.status
FROM student_enrollments se
JOIN course_offerings co ON se.course_offering_id = co.id
JOIN courses c ON co.course_id = c.id
WHERE se.student_id = 3
ORDER BY se.enrollment_timestamp DESC;
```

Check student's section:
```sql
SELECT * FROM student_sections WHERE student_id = 3;
```

View compiled results (after grades are published):
```sql
SELECT * FROM compile_student_term_result(3, 3);
```
