# Backend API Documentation (for Frontend Developers)

- Base URL: `NEXT_PUBLIC_API_URL` (default `http://localhost:5000/api/v1`)
- Auth: Bearer JWT via `Authorization: Bearer <accessToken>`
- Content-Type: JSON for most endpoints. File uploads use `multipart/form-data`.

## Conventions

- Standard response
  - Success: `{ success: true, data: { ... }, message?: string }`
  - Error: `{ success: false, message?: string, error?: string | object, errors?: Array<{ field: string, message: string }> }`
- Pagination
  - Query params: `page`, `limit`
  - Response shape (if paginated): include `count` alongside list
- Dates
  - ISO strings; parse to Date on the client
- Auth tokens
  - Access token short-lived; refresh token available via refresh endpoint or OAuth callback

---

# Authentication

- POST `/auth/register`
  - Body: `{ email, password, profile: { firstName, lastName, phone }, role }`
  - Returns: `{ success, data: { user, accessToken, refreshToken } }`
- POST `/auth/login`
  - Body: `{ email, password }`
  - Returns: `{ success, data: { user, accessToken, refreshToken } }`
- POST `/auth/logout`
- POST `/auth/refresh`
  - Body: `{ refreshToken }`
  - Returns: `{ success, accessToken, refreshToken }`
- GET `/auth/me`
  - Returns: `{ success, data: { user } }`
- PUT `/auth/profile`
  - Body: `UpdateProfileRequest` (dates as ISO strings)
- POST `/auth/profile/avatar` (multipart)
- DELETE `/auth/profile/avatar`

## Google OAuth web flow
- GET `/auth/google` -> provider
- GET `/auth/google/callback` -> server issues tokens, then redirects to `${FRONTEND_URL}/callback?accessToken=...&refreshToken=...`
- Frontend handles `/callback` to store tokens and redirect to dashboard

Headers used by client:
- `Authorization: Bearer <accessToken>`

---

# Student-Facing Endpoints

## Dashboard
- GET `/student/dashboard`
  - Returns: `{ success, data: { dashboard } }`
  - `dashboard` shape:
    - `enrolledCourses: Array<{ courseId, courseName, teacherName, enrollmentDate, schedule? }>`
    - `upcomingAssignments: Array<{ assignmentId, title, courseName, dueDate, status, isOverdue }>`
    - `recentGrades: Array<{ gradeId, courseName, score, maxScore, letterGrade, gradedAt }>`
    - `attendanceSummary: { totalClasses, present, absent, late, attendanceRate }`
    - `overallGPA: number`
    - `upcomingClasses: Array<{ classId, title, courseName, scheduledDate, startTime, location }>`
    - `notifications: { unreadCount, recentNotifications: any[] }`

## Courses
- GET `/student/courses/available`
  - Returns: `{ success, data: { courses: Course[], count } }`
- POST `/student/courses/:courseId/enroll`
  - Returns: `{ success, data: { course, message } }`
- POST `/student/courses/:courseId/drop`
  - Returns: `{ success, data: { course, message } }`
- GET `/student/courses/:courseId/progress`
  - Returns: `{ success, data: { progress: CourseProgress } }`
  - `CourseProgress`:
    - `course: { courseId, courseName, teacherName, description, schedule? }`
    - `assignments: Array<{ assignmentId, title, dueDate, status, submissionStatus, hasSubmitted, grade?, maxGrade, feedback? }>`
    - `grades: Array<{ gradeId, score, maxScore, letterGrade, gradeType, gradedAt, feedback? }>`
    - `attendance: { total, present, absent, late, attendanceRate }`
    - `progress: { assignmentsCompleted, totalAssignments, averageGrade, attendanceRate }`

## Assignments
- GET `/assignments/my`
  - Query (optional): `course`, `status`
  - Returns: `{ success, data: { assignments: Assignment[], count } }`
- GET `/assignments/:assignmentId/my-submission`
  - Returns: `{ success, data: { submission } }`
- POST `/assignments/:assignmentId/submit` (multipart)
  - Body: `FormData` with files and optional content
  - Returns: `{ success, data: { submission, message } }`

## Grades
- GET `/grades/my`
  - Query (optional): `course`, `gradeType`
  - Returns: `{ success, data: { grades: Grade[], count } }`
- GET `/grades/my/gpa`
  - Returns: `{ success, data: { gpa, totalCourses, totalGrades } }`
- GET `/grades/my/courses/:courseId`
  - Returns: `{ success, data: { averageScore, letterGrade, gpa, totalGrades } }`

## Attendance
- GET `/attendance/my`
  - Query (optional): `startDate`, `endDate`
  - Returns: `{ success, data: { attendance: Attendance[], count } }`
- GET `/attendance/my/stats`
  - Returns: `{ success, data: { total, present, absent, late, attendanceRate } }`

---

# Classes (General / Teacher-centric)

- GET `/classes`
  - Query: `course?`, `teacher?`, `status?`, `startDate?`, `endDate?`
  - Returns: `{ success, data: { classes, count } }`
- GET `/classes/:id`
  - Returns: `{ success, data: { class } }`
- POST `/classes`
  - Body includes:
    - `course`, `title`, `teacher`, `coordinator?`, `scheduledDate`, `startTime`, `endTime`
    - `location: { type: 'online'|'offline', room?, building?, meetingLink?, meetingId?, meetingPassword? }`
    - `maxStudents?`, `topics?`
- PUT `/classes/:id`
- DELETE `/classes/:id`
- POST `/classes/:id/students` Body: `{ studentId }`
- DELETE `/classes/:id/students` Body: `{ studentId }`
- GET `/classes/my?upcoming=true|false`
- GET `/classes/upcoming`

Validation errors
- `{ success: false, errors: [{ field, message }] }`

---

# Shared Models

- Course:
  - `{ id, name, description, code?, teacher: { id, firstName, lastName }, maxStudents, enrolledCount, isFullyEnrolled, schedule?, status, startDate?, endDate?, tags[], prerequisites[], syllabus?, createdAt, updatedAt }`
- Assignment:
  - `{ id, title, description, course, courseName, teacher, dueDate, maxGrade, attachments[], instructions?, allowLateSubmission, submissionStatus, hasSubmitted, isOverdue, createdAt, updatedAt }`
- Submission:
  - `{ id, student, submittedAt?, status, attachments[], content?, grade?, maxGrade?, feedback?, gradedBy?, gradedAt?, isLate? }`
- Grade:
  - `{ id, student, course, courseName, assignment?, gradeType, score, maxScore, percentage, letterGrade, feedback?, gradedBy, gradedAt, term?, isPublished, createdAt, updatedAt }`
- Attendance:
  - `{ id, class, student, date, status, markedBy, markedAt?, notes?, createdAt, updatedAt }`

---

# Headers and Auth in practice

- Include `Authorization: Bearer <accessToken>` for secured endpoints
- On refresh failure, client should clear tokens and redirect to login

---

# RTK Query hooks available (frontend)

- Dashboard: `useGetStudentDashboardQuery`
- Courses: `useGetAvailableCoursesQuery`, `useEnrollInCourseMutation`, `useDropCourseMutation`, `useGetCourseProgressQuery`
- Assignments: `useGetMyAssignmentsQuery`, `useGetMySubmissionQuery`, `useSubmitAssignmentMutation`
- Grades: `useGetMyGradesQuery`, `useGetMyGPAQuery`, `useGetMyCourseGradeQuery`
- Attendance: `useGetMyAttendanceQuery`, `useGetMyAttendanceStatsQuery`

---

# Example cURL

```bash
# Login
curl -X POST "$NEXT_PUBLIC_API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret"}'

# Me
curl -X GET "$NEXT_PUBLIC_API_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Student Dashboard
curl -X GET "$NEXT_PUBLIC_API_URL/student/dashboard" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

# Environment variables
- Frontend: `NEXT_PUBLIC_API_URL`
- Backend: `FRONTEND_URL` (used for Google OAuth to redirect to `/callback`)
