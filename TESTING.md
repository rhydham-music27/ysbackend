## API Testing Guide (Postman)

This guide helps you validate the backend API end-to-end using Postman. It covers environment setup, running the server, testing authentication (local + Google OAuth), protected endpoints, leads, and class conversion.

### Prerequisites
- Node.js and npm installed
- MongoDB running (local or Atlas)
- `.env` configured (you mentioned this is already filled)

Required env variables currently used by the code:
- `API_VERSION`, `ALLOWED_ORIGINS`, `NODE_ENV`
- `MONGODB_URI` (and optionally `DB_NAME` if used)
- `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- `BCRYPT_SALT_ROUNDS`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
- `FRONTEND_URL` (optional; used only for Google OAuth redirect)

### Start the Server
```bash
npm install
npm run dev
# Server default: http://localhost:5000
```

### Postman Environment
Create a Postman Environment with the following variables:
- `baseUrl`: `http://localhost:5000`
- `apiVersion`: `v1`
- `accessToken`: will be set after login
- `refreshToken`: will be set after login

Use the URL pattern: `{{baseUrl}}/api/{{apiVersion}}/...`

---

## Authentication Tests (Local Email/Password)

### 1) Register
POST `{{baseUrl}}/api/{{apiVersion}}/auth/register`
Body (JSON):
```json
{
  "email": "user1@example.com",
  "password": "Passw0rd!",
  "profile": {"firstName": "User", "lastName": "One", "phone": "9999999999"},
  "role": "student"
}
```
Expected: `201 Created`, response contains `{ user, accessToken, refreshToken }`.

Actions:
- Save `data.accessToken` as `accessToken` env var
- Save `data.refreshToken` as `refreshToken` env var

### 2) Login
POST `{{baseUrl}}/api/{{apiVersion}}/auth/login`
Body (JSON):
```json
{ "email": "user1@example.com", "password": "Passw0rd!" }
```
Expected: `200 OK`, returns token pair. Update `accessToken` and `refreshToken` in Postman.

### 3) Get Current User (Protected)
GET `{{baseUrl}}/api/{{apiVersion}}/auth/me`
Headers:
- `Authorization: Bearer {{accessToken}}`

Expected: `200 OK`, returns `{ user }`.

### 4) Refresh Token
POST `{{baseUrl}}/api/{{apiVersion}}/auth/refresh`
Body (JSON):
```json
{ "refreshToken": "{{refreshToken}}" }
```
Expected: `200 OK`, new `{ accessToken, refreshToken }`. Update both Postman env vars.

### 5) Logout (Protected)
POST `{{baseUrl}}/api/{{apiVersion}}/auth/logout`
Headers:
- `Authorization: Bearer {{accessToken}}`

Expected: `200 OK`, refresh token cleared.

---

## Google OAuth Tests

Pre-setup:
- Ensure `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` are correct.
- In Google Cloud Console, add redirect URI: `http://localhost:5000/api/v1/auth/google/callback`.

### 1) Initiate
Open in browser (not Postman):
```
{{baseUrl}}/api/{{apiVersion}}/auth/google
```
Approve Google consent → it redirects to callback.

### 2) Callback
- If `FRONTEND_URL` is set in `.env`, you will be redirected there with `accessToken` and `refreshToken` query params. Copy tokens to Postman env.
- If `FRONTEND_URL` is not set, the API returns JSON with `{ user, accessToken, refreshToken }`. Copy tokens to Postman env.

### 3) Verify Protected Access
GET `{{baseUrl}}/api/{{apiVersion}}/auth/me` with `Authorization: Bearer {{accessToken}}`
Expected: `200 OK` with `{ user }`.

Notes:
- If an existing LOCAL user with same email logs in via Google, their account is linked (provider changes to google, `googleId` set).
- Deactivated users cannot log in.

---

## Leads API

All endpoints below require a valid `Authorization: Bearer {{accessToken}}`.

### 1) Create Lead
POST `{{baseUrl}}/api/{{apiVersion}}/leads`
Headers: `Authorization: Bearer {{accessToken}}`
Body (JSON) example:
```json
{
  "parentsName": "Parent A",
  "studentName": "Student A",
  "contactNumber": "9999999999",
  "classAndBoard": {"classLevel": "10", "board": "CBSE"},
  "subjectsRequired": ["maths", "science"],
  "preferredTuitionMode": "online",
  "preferredTutor": "no_preference",
  "leadSource": "WhatsApp",
  "leadStatus": "DEMO SCHEDULE",
  "paymentReceived": {"received": false}
}
```
Expected: `201/200`, returns created lead (note: responses include both `_id` and `leadId`).

### 2) List Leads
GET `{{baseUrl}}/api/{{apiVersion}}/leads`
Headers: `Authorization: Bearer {{accessToken}}`
Expected: `200 OK`, array of leads.

### 3) Get Lead by ID
GET `{{baseUrl}}/api/{{apiVersion}}/leads/:id`
Headers: `Authorization: Bearer {{accessToken}}`
Expected: `200 OK`, a lead document.

---

## Final Class Conversion

Preconditions:
- Lead status should be “DEMO APPROVED BY PARENT” and payment received (per your business rules).

### Convert Lead → Final Class
POST `{{baseUrl}}/api/{{apiVersion}}/classes/convert`
Headers: `Authorization: Bearer {{accessToken}}`
Body (JSON):
```json
{
  "leadId": "<LEAD_ID_OR_leadId>",
  "cityCode": "BPL",
  "tutorAssigned": "<OPTIONAL_USER_ID>",
  "tutorTier": "A",
  "firstMonthStartDate": "2025-07-01",
  "monthStartDate": "2025-07-01"
}
```
Expected: `200 OK`, created final class details.

---

## Courses API

All endpoints below require `Authorization: Bearer {{accessToken}}` unless stated.

### 1) Create Course (Admin/Manager)
POST `{{baseUrl}}/api/{{apiVersion}}/courses`
Headers: `Authorization: Bearer {{accessToken}}`
Body (JSON):
```json
{
  "name": "Mathematics 101",
  "description": "Introductory course covering algebra and geometry",
  "code": "MATH101",
  "teacher": "<TEACHER_USER_ID>",
  "maxStudents": 30,
  "status": "active",
  "schedule": {"daysOfWeek": ["monday","wednesday"], "startTime": "10:00 AM", "endTime": "11:00 AM", "duration": 60},
  "tags": ["mathematics"],
  "prerequisites": ["basic-arithmetic"],
  "syllabus": "Algebra basics, geometry fundamentals"
}
```
Expected: `201 Created`, returns `{ course }`.

### 2) List Courses
GET `{{baseUrl}}/api/{{apiVersion}}/courses?status=active&search=math`
Headers: `Authorization: Bearer {{accessToken}}`
Expected: `200 OK`, array of courses.

### 3) Get Course by ID
GET `{{baseUrl}}/api/{{apiVersion}}/courses/:id`
Headers: `Authorization: Bearer {{accessToken}}`
Expected: `200 OK`, a course document.

### 4) Update Course (Admin/Manager)
PUT `{{baseUrl}}/api/{{apiVersion}}/courses/:id`
Headers: `Authorization: Bearer {{accessToken}}`
Body (JSON example):
```json
{ "description": "Updated description", "status": "active" }
```
Expected: `200 OK`, updated course.

### 5) Delete Course (Admin)
DELETE `{{baseUrl}}/api/{{apiVersion}}/courses/:id`
Headers: `Authorization: Bearer {{accessToken}}`
Expected: `200 OK` (only if no students enrolled).

### 6) Enroll Student (Admin/Manager/Teacher)
POST `{{baseUrl}}/api/{{apiVersion}}/courses/:id/enroll`
Headers: `Authorization: Bearer {{accessToken}}`
Body (JSON):
```json
{ "studentId": "<STUDENT_USER_ID>" }
```
Expected: `200 OK`, updated course with students.

### 7) Unenroll Student (Admin/Manager/Teacher)
POST `{{baseUrl}}/api/{{apiVersion}}/courses/:id/unenroll`
Headers: `Authorization: Bearer {{accessToken}}`
Body (JSON):
```json
{ "studentId": "<STUDENT_USER_ID>" }
```
Expected: `200 OK`, updated course.

### 8) Course Capacity
GET `{{baseUrl}}/api/{{apiVersion}}/courses/:id/capacity`
Headers: `Authorization: Bearer {{accessToken}}`
Expected: `200 OK`, `{ available, total, isFull }`.

---

## Class Sessions API

All endpoints below require `Authorization: Bearer {{accessToken}}` unless stated.

### 1) Create Class Session (Admin/Manager/Coordinator)
POST `{{baseUrl}}/api/{{apiVersion}}/classes-sessions`
Headers: `Authorization: Bearer {{accessToken}}`
Body (JSON):
```json
{
  "course": "<COURSE_ID>",
  "title": "Session 1: Algebra Basics",
  "teacher": "<TEACHER_USER_ID>",
  "scheduledDate": "2025-07-10",
  "startTime": "2025-07-10T10:00:00.000Z",
  "endTime": "2025-07-10T11:00:00.000Z",
  "location": { "type": "online", "meetingLink": "https://meet.example.com/abc" },
  "topics": ["linear equations"],
  "maxStudents": 30
}
```
Expected: `201 Created`, returns `{ class }`.

### 2) List Class Sessions
GET `{{baseUrl}}/api/{{apiVersion}}/classes-sessions?course={{COURSE_ID}}&status=scheduled`
Headers: `Authorization: Bearer {{accessToken}}`
Expected: `200 OK`, array of classes.

### 3) Get Class Session by ID
GET `{{baseUrl}}/api/{{apiVersion}}/classes-sessions/:id`
Headers: `Authorization: Bearer {{accessToken}}`
Expected: `200 OK`, a class session.

### 4) Update Class Session (Admin/Manager/Coordinator)
PUT `{{baseUrl}}/api/{{apiVersion}}/classes-sessions/:id`
Headers: `Authorization: Bearer {{accessToken}}`
Body (JSON example):
```json
{ "status": "in_progress", "materials": ["https://docs.example.com/notes.pdf"] }
```
Expected: `200 OK`, updated class session.

### 5) Delete Class Session (Admin/Manager)
DELETE `{{baseUrl}}/api/{{apiVersion}}/classes-sessions/:id`
Headers: `Authorization: Bearer {{accessToken}}`
Expected: `200 OK` (only if not started/completed).

### 6) Add Student to Class Session (Admin/Manager/Teacher/Coordinator)
POST `{{baseUrl}}/api/{{apiVersion}}/classes-sessions/:id/students`
Headers: `Authorization: Bearer {{accessToken}}`
Body (JSON):
```json
{ "studentId": "<STUDENT_USER_ID>" }
```
Expected: `200 OK`, updated class session with students.

### 7) Remove Student from Class Session (Admin/Manager/Teacher/Coordinator)
DELETE `{{baseUrl}}/api/{{apiVersion}}/classes-sessions/:id/students`
Headers: `Authorization: Bearer {{accessToken}}`
Body (JSON):
```json
{ "studentId": "<STUDENT_USER_ID>" }
```
Expected: `200 OK`, updated class session.

### 8) Upcoming Class Sessions
GET `{{baseUrl}}/api/{{apiVersion}}/classes-sessions/upcoming`
Headers: `Authorization: Bearer {{accessToken}}`
Expected: `200 OK`, list of upcoming sessions.

---

## Attendance API

All endpoints require `Authorization: Bearer {{accessToken}}`.

Preconditions:
- At least one class session exists and a student is associated with the class per your Class model rules.
- The caller has appropriate role per RBAC for each endpoint.

### 1) Mark Individual Attendance (Teacher/Coordinator)
POST `{{baseUrl}}/api/{{apiVersion}}/attendance`
Headers: `Authorization: Bearer {{accessToken}}`
Body (JSON):
```json
{
  "classId": "<CLASS_ID>",
  "studentId": "<STUDENT_USER_ID>",
  "date": "2025-07-10",
  "status": "present",
  "notes": "On time"
}
```
Expected: `201 Created`, returns `{ attendance }`.

### 2) Bulk Mark Attendance (Teacher/Coordinator)
POST `{{baseUrl}}/api/{{apiVersion}}/attendance/bulk`
Headers: `Authorization: Bearer {{accessToken}}`
Body (JSON):
```json
{
  "classId": "<CLASS_ID>",
  "date": "2025-07-10",
  "attendanceRecords": [
    { "studentId": "<STUDENT_ID_1>", "status": "present" },
    { "studentId": "<STUDENT_ID_2>", "status": "absent", "notes": "Sick" }
  ]
}
```
Expected: `201 Created`, returns `{ marked, failed, summary }`.

### 3) Update Attendance (Teacher/Coordinator)
PUT `{{baseUrl}}/api/{{apiVersion}}/attendance/:id`
Headers: `Authorization: Bearer {{accessToken}}`
Body (JSON):
```json
{ "status": "late", "notes": "Joined 10 mins late" }
```
Expected: `200 OK`, returns updated `{ attendance }`.

### 4) Get Attendance by Class (Teacher/Coordinator/Manager/Admin)
GET `{{baseUrl}}/api/{{apiVersion}}/attendance/class/:id?date=2025-07-10`
Headers: `Authorization: Bearer {{accessToken}}`
Expected: `200 OK`, returns `{ attendance, count }`.

### 5) Get Attendance by Student (Teacher/Coordinator/Manager/Admin)
GET `{{baseUrl}}/api/{{apiVersion}}/attendance/student/:id?startDate=2025-07-01&endDate=2025-07-31`
Headers: `Authorization: Bearer {{accessToken}}`
Expected: `200 OK`, returns `{ attendance, count }`.

### 6) Get Student Attendance Statistics (Teacher/Coordinator/Manager/Admin)
GET `{{baseUrl}}/api/{{apiVersion}}/attendance/student/:id/stats`
Headers: `Authorization: Bearer {{accessToken}}`
Expected: `200 OK`, returns `{ stats: { total, present, absent, late, attendanceRate } }`.

### 7) Get My Attendance (Student)
GET `{{baseUrl}}/api/{{apiVersion}}/attendance/my?startDate=2025-07-01&endDate=2025-07-31`
Headers: `Authorization: Bearer {{accessToken}}`
Expected: `200 OK`, returns `{ attendance, count }`.

### 8) Get My Attendance Stats (Student)
GET `{{baseUrl}}/api/{{apiVersion}}/attendance/my/stats`
Headers: `Authorization: Bearer {{accessToken}}`
Expected: `200 OK`, returns `{ stats }`.

### 9) Delete Attendance (Manager/Admin)
DELETE `{{baseUrl}}/api/{{apiVersion}}/attendance/:id`
Headers: `Authorization: Bearer {{accessToken}}`
Expected: `200 OK`, confirmation message.

Notes:
- Valid `status` values: `present`, `absent`, `late`, `excused`.
- The API prevents duplicates per (class, student, date). Expect a 4xx error if re-marking the same record for the same day.

---

## Common Issues & Tips
- 401 on protected routes: ensure `Authorization` header is present and `accessToken` is not expired.
- 401 on refresh: ensure `refreshToken` matches the one stored for the user; if not, log in again.
- Google OAuth error: check `GOOGLE_*` envs and redirect URI setup in Google Console.
- CORS errors during frontend testing: update `ALLOWED_ORIGINS` in `.env`.

---

## Quick Smoke Test Sequence (Minimal)
1. Register → store tokens
2. GET `/auth/me` with `accessToken`
3. Refresh token → store new tokens
4. Create a course (as Manager/Admin) → capture courseId
5. Enroll a student into the course (Teacher/Manager/Admin)
6. Create a class session for the course → capture classId and ensure student belongs to the class
7. Mark attendance for the student: POST `/attendance` → capture attendanceId
8. Get class attendance: GET `/attendance/class/:classId`
9. Get student attendance: GET `/attendance/student/:studentId`
10. (Optional) Update or delete the attendance (role permitting)
11. (Optional) Leads: create and convert to final class
12. Logout → ensure `refreshToken` no longer works


