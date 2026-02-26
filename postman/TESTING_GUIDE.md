# Teacher Sections Testing Guide

This guide walks you through testing the new teacher sections functionality.

## Prerequisites

1. PostgreSQL database running
2. Backend server configured with proper `.env` file
3. Postman installed (or use the provided collection)

## Step 1: Database Setup

### 1.1 Run the Schema (if not already done)
```bash
psql -U your_username -d your_database -f schema.txt
```

### 1.2 Load Test Data
```bash
psql -U your_username -d your_database -f postman/Teacher_Sections_Test_Setup.sql
```

This creates:
- 2 departments: **CSE** and **BME**
- 1 teacher: **Dr. Sarah Johnson** (teaches in both departments)
- 10 students: 5 in each section across 2 departments
- Teacher teaches:
  - **CSE105 & CSE106** in **Section A** (CSE department)
  - **BME201 & BME202** in **Section B** (BME department)

### 1.3 Verify Test Data (Optional)

Run these queries to verify the setup:

```sql
-- Check teacher's sections
SELECT * FROM get_teacher_sections(1);
-- Expected: 4 rows (2 courses × 2 departments)

-- Check students in CSE Section A
SELECT * FROM get_students_in_teacher_section(1, 'A', 1);
-- Expected: 5 students (Alice, Bob, Carol, David, Emma)

-- Check students in BME Section B
SELECT * FROM get_students_in_teacher_section(1, 'B', 2);
-- Expected: 5 students (Frank, Grace, Henry, Iris, Jack)
```

## Step 2: Start Backend Server

```bash
cd backend
npm install  # if not already done
npm start
```

Server should start on `http://localhost:3000`

## Step 3: API Testing with Postman

### 3.1 Import Collection and Environment

1. Open Postman
2. Import `postman/University_Management.postman_collection.json`
3. Import `postman/University_Env.postman_environment.json`
4. Select "University_Env" environment in Postman

### 3.2 Login as Teacher

1. Go to **Auth → Login**
2. Update the request body:
   ```json
   {
       "email": "sarah.johnson@university.com",
       "password": "password123"
   }
   ```
   (Note: The test script uses a bcrypt hash placeholder. You may need to update the password or hash in the SQL script)

3. Send the request
4. The access token will be automatically saved to environment variable `{{accessToken}}`

### 3.3 Test Endpoint 1: Get Teacher's Sections

1. Go to **Teacher Sections → Get My Sections**
2. Endpoint: `GET {{baseUrl}}/api/teacher-sections/my-sections`
3. Authorization: Bearer `{{accessToken}}`
4. Send the request

**Expected Response (200 OK):**
```json
[
    {
        "section_name": "A",
        "department_id": 1,
        "department_code": "CSE",
        "department_name": "Computer Science and Engineering",
        "course_code": "CSE105",
        "course_name": "Introduction to Programming",
        "term_id": 1,
        "term_number": 3
    },
    {
        "section_name": "A",
        "department_id": 1,
        "department_code": "CSE",
        "department_name": "Computer Science and Engineering",
        "course_code": "CSE106",
        "course_name": "Programming Lab",
        "term_id": 1,
        "term_number": 3
    },
    {
        "section_name": "B",
        "department_id": 2,
        "department_code": "BME",
        "department_name": "Biomedical Engineering",
        "course_code": "BME201",
        "course_name": "Biomedical Instrumentation",
        "term_id": 2,
        "term_number": 3
    },
    {
        "section_name": "B",
        "department_id": 2,
        "department_code": "BME",
        "department_name": "Biomedical Engineering",
        "course_code": "BME202",
        "course_name": "Instrumentation Lab",
        "term_id": 2,
        "term_number": 3
    }
]
```

### 3.4 Test Endpoint 2: Get Students in CSE Section A

1. Go to **Teacher Sections → Get Students in Section**
2. Endpoint: `GET {{baseUrl}}/api/teacher-sections/sections/A/department/1/students`
3. Update URL parameters:
   - `sectionName`: `A`
   - `departmentId`: `1` (CSE)
4. Send the request

**Expected Response (200 OK):**
```json
[
    {
        "user_id": 2,
        "name": "Alice Chen",
        "roll_number": "CSE2024001",
        "email": "alice.chen@student.edu",
        "course_code": "CSE105",
        "course_name": "Introduction to Programming"
    },
    {
        "user_id": 2,
        "name": "Alice Chen",
        "roll_number": "CSE2024001",
        "email": "alice.chen@student.edu",
        "course_code": "CSE106",
        "course_name": "Programming Lab"
    },
    // ... (Bob, Carol, David, Emma with their courses)
    // Total: 10 rows (5 students × 2 courses each)
]
```

### 3.5 Test Endpoint 2: Get Students in BME Section B

1. Update URL to: `GET {{baseUrl}}/api/teacher-sections/sections/B/department/2/students`
2. Update URL parameters:
   - `sectionName`: `B`
   - `departmentId`: `2` (BME)
3. Send the request

**Expected Response (200 OK):**
```json
[
    {
        "user_id": 7,
        "name": "Frank Rodriguez",
        "roll_number": "BME2024001",
        "email": "frank.rodriguez@student.edu",
        "course_code": "BME201",
        "course_name": "Biomedical Instrumentation"
    },
    // ... (Grace, Henry, Iris, Jack with their courses)
    // Total: 10 rows (5 students × 2 courses each)
]
```

### 3.6 Test Edge Case: Wrong Section/Department Combination

Try to get CSE courses in Section B (teacher doesn't teach this):

1. URL: `GET {{baseUrl}}/api/teacher-sections/sections/B/department/1/students`
2. Parameters:
   - `sectionName`: `B`
   - `departmentId`: `1` (CSE)

**Expected Response (404 Not Found):**
```json
{
    "message": "No enrolled students found in this section"
}
```

## Step 4: Manual Testing with cURL (Alternative)

If you prefer command-line testing:

### Login and Get Token
```bash
curl -X POST http://localhost:3000/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email": "sarah.johnson@university.com", "password": "password123"}'
```

Save the `accessToken` from the response.

### Get Teacher Sections
```bash
curl -X GET http://localhost:3000/api/teacher-sections/my-sections \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get Students in Section
```bash
curl -X GET "http://localhost:3000/api/teacher-sections/sections/A/department/1/students" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Test Scenarios Summary

| Test Case | Endpoint | Expected Result |
|-----------|----------|-----------------|
| Get all sections | `GET /my-sections` | 4 rows (2 depts × 2 courses) |
| CSE Section A students | `GET /sections/A/department/1/students` | 10 rows (5 students × 2 courses) |
| BME Section B students | `GET /sections/B/department/2/students` | 10 rows (5 students × 2 courses) |
| Wrong section combo | `GET /sections/B/department/1/students` | 404 Error |
| No auth token | Any endpoint without token | 401 Unauthorized |

## Troubleshooting

### Issue: "No sections found"
- Check `current_state` table has `newest_term_start = '2026-01-15'`
- Verify terms have `start_date = '2026-01-15'`
- Confirm `teaches` table has entries for teacher_id = 1

### Issue: "No enrolled students found"
- Check `student_enrollments` status is 'Enrolled'
- Verify `student_sections` table has matching section names
- Confirm students exist in `students` and `users` tables

### Issue: "401 Unauthorized"
- Token expired (refresh token or login again)
- Token not included in Authorization header
- Token format incorrect (should be `Bearer <token>`)

### Issue: Password authentication fails
The test data script uses placeholder password hashes. To fix:

**Option 1:** Update password hash in database
```sql
-- Generate hash using bcrypt (in Node.js)
-- const bcrypt = require('bcrypt');
-- const hash = await bcrypt.hash('password123', 10);

UPDATE users 
SET password_hash = 'YOUR_BCRYPT_HASH_HERE'
WHERE email = 'sarah.johnson@university.com';
```

**Option 2:** Create teacher via registration API
1. Use `POST /api/users/register` to create teacher user
2. Update the user's role to 'Teacher'
3. Insert teacher record with the new user_id

## Success Criteria

✅ PL/SQL functions return correct data  
✅ API endpoints return 200 OK with valid data  
✅ Edge cases return appropriate 404 errors  
✅ Authentication properly protects endpoints  
✅ Teacher sees only their own sections and students  
✅ Data matches across different departments  

## Next Steps

After successful testing, you can:
1. Integrate with a frontend interface
2. Add more features (filtering, sorting, pagination)
3. Add export functionality (CSV, PDF)
4. Implement student performance metrics
5. Add attendance tracking per section
