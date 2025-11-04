## Your Shikshak Management System - Backend API

### Description
Your Shikshak is an EdTech platform designed to support five user roles: Admin, Manager, Teacher, Class Coordinator, and Student. This repository contains the backend API built with Node.js, TypeScript, Express, and MongoDB.

### Tech Stack
- Node.js with TypeScript
- Express.js framework
- MongoDB with Mongoose
- JWT & OAuth authentication (Passport.js with Google OAuth 2.0)
- Cloudinary SDK (v1.41.0) - Cloud storage and CDN
- Multer (v1.4.5) - Multipart/form-data handling
- Nodemailer (v6.9.0) - Email delivery service
- Winston (v3.11.0) - Logging

### Project Structure (MVC)
```
src/
  config/        # configuration: db, passport, cloudinary, logger, permissions (future)
  controllers/   # controllers (future)
  middlewares/   # middlewares: auth, rbac, validation, error handlers, upload (future)
  models/        # mongoose models (future)
  routes/        # routes (future)
  services/      # business logic (future)
  types/         # shared types & enums
  utils/         # helpers & utilities (future)
  app.ts         # express app setup
  server.ts      # server bootstrap
```

### Setup Instructions
#### Prerequisites
- Node.js (LTS recommended)
- MongoDB instance (local or cloud)

#### Install Dependencies
```bash
npm install
```

#### Environment Setup
1. Copy the example environment file and fill values:
```bash
cp .env.example .env
```
2. Update the variables as needed.

#### Run the Application
- Development: auto-reload with TypeScript transpile-only
```bash
npm run dev
```

- Production build and start
```bash
npm run build
npm start
```

### Development
- Linting
```bash
npm run lint
```

- Code formatting
```bash
npm run format
```

### API Documentation
Swagger/OpenAPI documentation will be added in a future phase.

## Authentication

This project uses JWT-based authentication:
- Users register or log in to receive an access token (short-lived) and a refresh token (long-lived).
- The access token is used in the Authorization header for protected APIs: `Authorization: Bearer <accessToken>`.
- When the access token expires, the refresh token can be exchanged for a new token pair.
- Logging out invalidates the stored refresh token to prevent reuse.

### Local Authentication (Email/Password)
- Standard register/login flow using email and password
- Returns a token pair: `{ accessToken, refreshToken }`
- Access token is used for protected endpoints; refresh token obtains a new pair

### Google OAuth 2.0 Authentication
1. User clicks "Login with Google" → redirects to `/api/v1/auth/google`
2. User grants permission on Google's consent screen
3. Google redirects to `/api/v1/auth/google/callback` with an authorization code
4. Backend exchanges the code for profile/email, finds or creates user, and generates JWT tokens
5. Returns the same `{ accessToken, refreshToken }` pair as local auth

Notes:
- If a user exists with the same email (LOCAL provider), the Google account is linked automatically
- OAuth users have `isEmailVerified = true`
- Deactivated accounts cannot log in

## Authorization (RBAC)

This project implements Role-Based Access Control with a hierarchical model:

- Admin (highest) > Manager > Teacher/Coordinator (parallel) > Student (lowest)
- Two patterns are supported: exact role match and minimum role level

### Role Hierarchy
- **Admin (Level 5)**: Full system access, user management, all permissions
- **Manager (Level 4)**: Oversee teachers, manage courses, view reports
- **Teacher (Level 3)**: Create/grade assignments, mark attendance, manage assigned courses
- **Coordinator (Level 3)**: Schedule classes, monitor attendance, coordinate students (parallel to Teacher)
- **Student (Level 1)**: View courses, submit assignments, view own grades and attendance

### Authorization Middleware
- `authorize(...roles)`: Exact role match (e.g., `authorize(UserRole.ADMIN, UserRole.MANAGER)`)
- `authorizeMinRole(role)`: Minimum role level (e.g., `authorizeMinRole(UserRole.MANAGER)` allows Manager and Admin)
- `authorizePermission(...permissions)`: Permission-based (future use)
- `authorizeOwnership(field)`: Resource ownership check (future use)
- `adminOnly()`: Shortcut for admin-only routes

All authorization middleware must be used after `authenticate` so `req.user` is populated.

### Usage Examples
```ts
// Admin-only route
router.delete('/users/:id', authenticate, authorize(UserRole.ADMIN), deleteUser);

// Manager and Admin can access
router.get('/reports', authenticate, authorizeMinRole(UserRole.MANAGER), getReports);

// Teachers and Coordinators can mark attendance
router.post('/attendance', authenticate, authorize(UserRole.TEACHER, UserRole.COORDINATOR), markAttendance);
```

### API Endpoints (Notes)
- All endpoints (except public auth routes) require authentication
- Role-based authorization is enforced on protected endpoints
- See Authorization section for role/permission guidance

## API Endpoints

### Authentication
- POST `/api/v1/auth/register` — Register new user
- POST `/api/v1/auth/login` — User login
- POST `/api/v1/auth/logout` — User logout (protected)
- POST `/api/v1/auth/refresh` — Refresh access token
- GET `/api/v1/auth/me` — Get current user (protected)

### Profile Management
- PUT `/api/v1/auth/profile` — Update profile text fields (All authenticated)
- POST `/api/v1/auth/profile/avatar` — Upload profile avatar (All authenticated)
- DELETE `/api/v1/auth/profile/avatar` — Delete profile avatar (All authenticated)

#### OAuth Endpoints
- GET `/api/v1/auth/google` — Initiate Google OAuth flow
- GET `/api/v1/auth/google/callback` — OAuth callback handler
- GET `/api/v1/auth/google/failure` — OAuth failure handler

### Leads
- POST `/api/v1/leads` — Create a lead (protected)
- GET `/api/v1/leads` — List leads (protected)
- GET `/api/v1/leads/:id` — Get a lead by id (protected)

Notes:
- Lead responses include both `_id` and `leadId` (virtual alias of `_id`). Use either when calling related endpoints.

### Classes
- POST `/api/v1/classes/convert` — Convert an approved + paid lead into a final class (protected)
  - Body: `{ leadId, cityCode, tutorAssigned?, tutorTier?, firstMonthStartDate?, monthStartDate? }`



### Class Sessions
- POST `/api/v1/classes-sessions` — Create class session (Admin/Manager/Coordinator)
- GET `/api/v1/classes-sessions` — List class sessions (auth, filters supported)
- GET `/api/v1/classes-sessions/my` — Get my class sessions (Teacher/Student)
- GET `/api/v1/classes-sessions/upcoming` — Get upcoming scheduled sessions (auth)
- GET `/api/v1/classes-sessions/:id` — Get class session by id (auth)
- PUT `/api/v1/classes-sessions/:id` — Update class session (Admin/Manager/Coordinator)
- DELETE `/api/v1/classes-sessions/:id` — Delete class session (Admin/Manager; not started/completed)
- POST `/api/v1/classes-sessions/:id/students` — Add student to session (Admin/Manager/Teacher/Coordinator)
- DELETE `/api/v1/classes-sessions/:id/students` — Remove student from session (Admin/Manager/Teacher/Coordinator)

### Attendance Tracking

- POST `/api/v1/attendance` — Mark individual attendance (Teacher, Coordinator)
- POST `/api/v1/attendance/bulk` — Bulk mark attendance (Teacher, Coordinator)
- PUT `/api/v1/attendance/:id` — Update attendance (Teacher, Coordinator)
- GET `/api/v1/attendance/class/:id` — Get class attendance (Teacher+)
- GET `/api/v1/attendance/student/:id` — Get student attendance (Teacher+)
- GET `/api/v1/attendance/student/:id/stats` — Get student stats (Teacher+)
- GET `/api/v1/attendance/my` — Get own attendance (Student)
- GET `/api/v1/attendance/my/stats` — Get own stats (Student)
- DELETE `/api/v1/attendance/:id` — Delete attendance (Manager, Admin)

## Assignment and Homework Management

The assignment system enables teachers to create, publish, and grade assignments linked to courses, while students can view and submit their work.

- Assignments linked to Courses with deadlines and grading
- Teachers can create, update, publish, and grade assignments
- Students can submit assignments with content and attachments
- Support for late submissions with optional penalties
- Embedded submission tracking within assignment documents
- Assignment lifecycle: Draft → Published → Closed/Graded
- Submission statuses: Not Submitted, Submitted, Late, Graded, Resubmitted

### Assignment Workflow
1. **Test Teacher creates assignment:**
   - Create in draft mode with title, description, due date, and max grade
   - Optionally add attachments and instructions
   - Publish to make it visible to students
2. **Student submits assignment:**
   - View published assignments for enrolled courses
   - Submit content and/or attachments before the deadline
   - Resubmissions allowed if enabled by teacher; late submissions marked accordingly
3. **Teacher grades submission:**
   - View all submissions
   - Grade each submission with score and feedback
   - System tracks grading progress and statistics
4. **Student views grade:**
   - View submission status and grade
   - Read teacher feedback

### Assignment API Endpoints

- POST `/api/v1/assignments` — Create assignment (Teacher) - Now supports file uploads for materials
- GET `/api/v1/assignments` — List assignments (All authenticated)
- GET `/api/v1/assignments/my` — Get student's assignments (Student)
- GET `/api/v1/assignments/:id` — Get assignment details (All authenticated)
- PUT `/api/v1/assignments/:id` — Update assignment (Teacher)
- DELETE `/api/v1/assignments/:id` — Delete assignment (Teacher)
- POST `/api/v1/assignments/:id/submit` — Submit assignment (Student) - Now supports file uploads for submissions
- POST `/api/v1/assignments/:id/submissions/:submissionId/grade` — Grade submission (Teacher)
- GET `/api/v1/assignments/:id/my-submission` — Get own submission (Student)
- GET `/api/v1/assignments/:id/stats` — Get assignment statistics (Teacher+)
- GET `/api/v1/assignments/:id/deadline` — Check deadline status (All authenticated)
- PATCH `/api/v1/assignments/:id/publish` — Publish assignment (Teacher)
- PATCH `/api/v1/assignments/:id/close` — Close assignment (Teacher)
- POST `/api/v1/assignments/:id/materials` — Upload additional materials (Teacher)
- DELETE `/api/v1/assignments/:id/materials` — Delete material file (Teacher)

#### Quick cURL Examples

Create (Teacher):
```bash
curl -X POST http://localhost:5000/api/v1/assignments \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Homework 1",
    "description": "Solve problems 1-10",
    "course": "<COURSE_ID>",
    "dueDate": "2030-01-01T17:00:00.000Z",
    "maxGrade": 100
  }'
```

Publish (Teacher):
```bash
curl -X PATCH http://localhost:5000/api/v1/assignments/<ASSIGNMENT_ID>/publish \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

Submit (Student):
```bash
curl -X POST http://localhost:5000/api/v1/assignments/<ASSIGNMENT_ID>/submit \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"My answers..."}'
```

Grade (Teacher):
```bash
curl -X POST http://localhost:5000/api/v1/assignments/<ASSIGNMENT_ID>/submissions/<SUBMISSION_ID>/grade \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"grade": 95, "feedback": "Great work"}'
```

Stats (Teacher+):
```bash
curl http://localhost:5000/api/v1/assignments/<ASSIGNMENT_ID>/stats \
  -H "Authorization: Bearer ACCESS_TOKEN"
```



### Completed Features (updated)

- File upload and storage with Cloudinary
- Profile avatar upload and management
- Assignment material uploads (teacher)
- Assignment submission file uploads (student)
- Automatic file type validation (images, documents)
- File size limits (images: 5MB, documents: 10MB)
- Secure file deletion from cloud storage
- CDN delivery for uploaded files
- Organized folder structure in Cloudinary
- Comprehensive grading system with grade book
- Multiple grade types (assignments, exams, quizzes, manual, participation)
- GPA calculation (4.0 scale)
- Letter grade conversion (A+ to F)
- Weighted grade calculations
- Course-level grade aggregation
- Grade statistics and analytics
- Student grade viewing and GPA tracking
- Teacher grade management
- Assignment grade synchronization
- Reports and analytics system
- Student performance reports with GPA, grades, attendance, assignments
- Teacher workload analytics with course and student metrics
- Course enrollment trends and utilization analysis
- Attendance statistics with low-attendance student identification
- Course-specific analytics (enrollment, assignments, grades, attendance)
- Class performance reports
- Role-specific dashboard summaries
- Mongoose aggregation pipelines for complex queries
- Date range filtering for time-based analysis
- RBAC-enforced report access control
- Manager dashboard APIs
- Teacher oversight and performance monitoring
- Course approval workflows (approve/reject)
- Schedule approval workflows (approve/reject)
- Manager dashboard with pending approvals
- Course statistics for manager overview
- Teacher performance metrics and analytics
- Approval status tracking (pending, approved, rejected)
- Manager-only RBAC enforcement
- Admin dashboard APIs
- User management (CRUD all users, role assignment, activation/deactivation)
- System settings management (platform configuration, feature flags)
- Bulk operations (user import up to 100, student enrollment up to 100)
- Comprehensive audit logging for all admin actions
- User statistics and analytics
- Audit log retention (90 days with automatic cleanup)
- IP address and user agent tracking for security
- Strict admin-only RBAC enforcement

### Data Model Relationships

- Assignment → Class (many-to-one)
- Assignment → Teacher/User (many-to-one, creator)
- Submission (embedded) → Student/User (many-to-one)
- Submission (embedded) → GradedBy/User (many-to-one)
- Submissions are embedded subdocuments within Assignment for data locality

### Completed Features (updated)

- Assignment and homework management system
- Assignment creation with deadlines and grading criteria
- Student submission tracking with content and attachments
- Teacher grading workflow with feedback
- Late submission handling with penalties
- Assignment statistics and analytics
- Deadline validation and status tracking
- Reports and analytics system with comprehensive data analysis
- Student performance reports with GPA, grades, attendance, assignments
- Teacher workload analytics with course and student metrics
- Course enrollment trends and utilization analysis
- Attendance statistics with low-attendance student identification
- Course-specific analytics (enrollment, assignments, grades, attendance)
- Class performance reports
- Role-specific dashboard summaries
- Mongoose aggregation pipelines for complex queries
- Date range filtering for time-based analysis
- RBAC-enforced report access control

## Attendance Tracking

The attendance system enables teachers and coordinators to mark student attendance per class session, with RBAC enforcement and student self-service views.

- Attendance records link to `Class` and `User` (student)
- Teachers/Coordinators can mark individual or bulk attendance
- Students can view their own attendance history and statistics
- Admin/Manager can view any student's or class's attendance
- Supported statuses: Present, Absent, Late, Excused

### Attendance Workflow

1. Teacher marks attendance:
   - Navigate to a class and mark Present/Absent/Late for students
   - Optionally bulk mark the entire class; add notes where needed
2. Student views attendance:
   - View own attendance history by date range and see statistics
3. Admin/Manager monitors attendance:
   - View any class or student's attendance, generate reports, and correct records

## Environment Variables

Add these variables to your `.env` file (see `.env.example`):
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`

Google OAuth (add these):
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL` (e.g. `http://localhost:5000/api/v1/auth/google/callback`)
- `FRONTEND_URL` (optional redirect target for OAuth web flows)

Cloudinary (Phase 11 - add these):
- `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
- `CLOUDINARY_API_KEY` - API key from Cloudinary dashboard
- `CLOUDINARY_API_SECRET` - API secret from Cloudinary dashboard

Email Service (Phase 12 - add these):
- `EMAIL_HOST` - SMTP server host (e.g., smtp.gmail.com)
- `EMAIL_PORT` - SMTP port (587 for TLS, 465 for SSL)
- `EMAIL_USER` - SMTP username (usually your email address)
- `EMAIL_PASSWORD` - SMTP password (for Gmail, use App Password)
- `EMAIL_FROM` - Sender email address

Note: Use strong, unique secrets for JWT; you can generate with `openssl rand -base64 32`.

## Security Best Practices
- Always use `authenticate` before any authorization middleware
- Use `authorize()` for exact role matching
- Use `authorizeMinRole()` for hierarchical access
- Combine authorization checks for complex scenarios (e.g., admin or owner)
- Thoroughly test authorization logic for each endpoint

## Testing Authentication (dev examples)

Login:
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Passw0rd!"}'
```

Get current user (replace ACCESS_TOKEN):
```bash
curl http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

## Lead and Class Examples

Create a lead:
```bash
curl -X POST http://localhost:5000/api/v1/leads \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "parentsName":"Parent A",
    "studentName":"Student A",
    "contactNumber":"9999999999",
    "classAndBoard":{"classLevel":"10","board":"CBSE"},
    "subjectsRequired":["maths","science"],
    "preferredTuitionMode":"online",
    "preferredTutor":"no_preference",
    "leadSource":"WhatsApp",
    "leadStatus":"DEMO SCHEDULE",
    "paymentReceived":{"received":false}
  }'
```

Convert to final class (after status is "DEMO APPROVED BY PARENT" and payment received):
```bash
curl -X POST http://localhost:5000/api/v1/classes/convert \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "leadId":"<LEAD_ID_OR_leadId>",
    "cityCode":"BPL",
    "tutorAssigned":"<USER_ID_OPTIONAL>",
    "tutorTier":"A",
    "firstMonthStartDate":"2025-07-01",
    "monthStartDate":"2025-07-01"
  }'
```

### License
This project is licensed under the MIT License.

## Google OAuth Setup
1. Go to Google Cloud Console: https://console.cloud.google.com/
2. Create a new project or select an existing one
3. Enable Google People API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Configure the OAuth consent screen (app name, support email, scopes)
6. Add authorized redirect URIs:
   - Development: `http://localhost:5000/api/v1/auth/google/callback`
   - Production: `https://yourdomain.com/api/v1/auth/google/callback`
7. Add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to `.env`
8. Test the flow in your browser



## Scheduling and Timetable Management

The scheduling system provides recurring weekly schedule management (master timetable), conflict detection for teacher and room overlaps, and integration with the `Class` model to generate specific class instances.

- Recurring weekly schedule templates
- Conflict detection (teacher and room)
- Recurrence patterns: weekly, biweekly, custom
- Effective date ranges for semesters (effectiveFrom/effectiveTo)
- Integration with `Class` model (generate instances)
- RBAC: Admin, Manager, Coordinator manage; Teachers/Students view
- Weekly and daily timetable views

### Schedule vs Class

- **Schedule**: Recurring weekly pattern (e.g., "Math every Monday 9-10 AM in Room 101"). Used for planning and timetables.
- **Class**: Specific occurrence (e.g., "Math on Jan 15, 2024, 9-10 AM in Room 101"). Used for attendance/materials/recordings.
- Schedules can generate Class instances for a date range.

### Conflict Detection Algorithm

- **Teacher Conflict**: A teacher cannot have overlapping classes on the same day.
- **Room Conflict**: A room cannot be double-booked for overlapping times on the same day.
- **Overlap Rule**: Two time ranges overlap if `(start1 < end2) AND (end1 > start2)`.
- Example: 09:00-10:30 overlaps 10:00-11:00.

### Scheduling Workflow

1. Admin/Manager/Coordinator creates a schedule with course, teacher, day, time, room.
2. System checks conflicts (teacher/room) and saves if none.
3. Users view weekly/daily timetables (filter by teacher, course, room, day).
4. Optionally generate `Class` instances for a semester date range.

### Schedule API Endpoints

- POST `/api/v1/schedules` — Create schedule (Admin, Manager, Coordinator)
- GET `/api/v1/schedules` — List schedules (All authenticated)
- GET `/api/v1/schedules/my` — Get own schedule (Teacher)
- GET `/api/v1/schedules/weekly` — Get weekly timetable (All authenticated)
- POST `/api/v1/schedules/check-conflicts` — Check conflicts (Admin, Manager, Coordinator)
- GET `/api/v1/schedules/teachers/:id` — Get teacher schedules (Teacher+)
- GET `/api/v1/schedules/courses/:id` — Get course schedules (All authenticated)
- GET `/api/v1/schedules/days/:day` — Get day schedules (All authenticated)
- GET `/api/v1/schedules/:id` — Get schedule details (All authenticated)
- PUT `/api/v1/schedules/:id` — Update schedule (Admin, Manager, Coordinator)
- DELETE `/api/v1/schedules/:id` — Delete schedule (soft; Admin, Manager)
- POST `/api/v1/schedules/:id/generate-classes` — Generate class instances (Admin, Manager, Coordinator)

### Completed Features (update)

- Scheduling and timetable management system
- Recurring weekly schedule templates
- Teacher and room conflict detection
- Weekly and daily timetable views
- Semester-based scheduling (effective date ranges)
- Schedule-to-Class instance generation
- Soft delete for schedule deactivation

## File Upload and Storage

The file upload system provides cloud storage integration with Cloudinary for handling profile avatars and assignment materials. The system uses Multer for handling multipart/form-data and Cloudinary SDK for cloud storage and CDN delivery.

### Features

- Cloudinary integration for cloud storage and CDN delivery
- Multer middleware for handling multipart/form-data
- Support for images (profile avatars) and documents (assignments)
- Automatic file type and size validation
- Organized folder structure in Cloudinary (profiles, assignments, courses)
- Secure file deletion when removing avatars or attachments
- Memory-based storage (no local disk usage)

### File Upload Workflow

#### User uploads profile avatar:
1. User selects image file (JPG, PNG, GIF, WebP)
2. Frontend sends multipart/form-data to POST /api/v1/auth/profile/avatar
3. Multer validates file type and size (max 5MB)
4. File uploaded to Cloudinary in 'yourshikshak/profiles' folder
5. Cloudinary URL stored in User.profile.avatar
6. Old avatar automatically deleted if exists

#### Teacher uploads assignment materials:
1. Teacher creates assignment with materials
2. Uploads up to 5 documents (PDF, DOC, DOCX, TXT)
3. Files uploaded to Cloudinary in 'yourshikshak/assignments/materials' folder
4. URLs stored in Assignment.attachments array
5. Can upload additional materials later using POST /:id/materials

#### Student submits assignment with files:
1. Student submits assignment with up to 5 attachments
2. Files uploaded to Cloudinary in 'yourshikshak/assignments/submissions' folder
3. URLs stored in Submission.attachments array
4. Supports resubmission with new files

## Cloudinary Setup

1. Sign up for free Cloudinary account at https://cloudinary.com/users/register/free
2. Go to Dashboard: https://cloudinary.com/console
3. Copy Cloud Name, API Key, and API Secret from dashboard
4. Add credentials to .env file:
   - CLOUDINARY_CLOUD_NAME=your-cloud-name
   - CLOUDINARY_API_KEY=your-api-key
   - CLOUDINARY_API_SECRET=your-api-secret
5. (Optional) Configure upload presets in Cloudinary dashboard
6. (Optional) Set up folder structure for organization
7. Test file upload using Postman or frontend

### File Upload Limits

#### Profile Avatars:
- File types: JPEG, JPG, PNG, GIF, WebP
- Max size: 5MB per file
- Max files: 1 (single upload)

#### Assignment Materials (Teacher):
- File types: PDF, DOC, DOCX, TXT
- Max size: 10MB per file
- Max files: 5 per request (can upload more in separate requests)

#### Assignment Submissions (Student):
- File types: PDF, DOC, DOCX, TXT
- Max size: 10MB per file
- Max files: 5 per submission

#### Cloudinary Free Tier:
- Storage: 25 GB
- Bandwidth: 25 GB/month
- Transformations: 25,000/month

### Cloudinary Features

- Automatic image optimization (quality, format)
- CDN delivery for fast global access
- Image transformations (resize, crop, filters)
- Secure URLs with signed uploads (future enhancement)
- Automatic backup and redundancy
- Media library management dashboard
- Analytics and usage tracking

### Security Best Practices

- File type validation (MIME type and extension)
- File size limits to prevent DoS attacks
- Memory storage (no local disk pollution)
- Cloudinary URL validation before deletion
- Only authenticated users can upload files
- RBAC enforced on all upload endpoints
- Automatic cleanup when deleting resources

## Notification System (Phase 12)

The notification system provides dual-channel notifications (email and in-app) for keeping users informed about important events in the platform. The system supports multiple notification categories, priorities, and automatic event-driven triggers.

### Features

- **Dual-channel notifications**: Email (via nodemailer) and In-App (database)
- **Multiple notification categories**: Assignment due, graded, grade posted, attendance marked, course enrollment, class scheduled, cancelled, announcements, and system notifications
- **Priority-based notifications**: Low, medium, high, and urgent priority levels
- **Read/unread tracking**: In-app notifications with read status and timestamps
- **Automatic email delivery**: HTML email templates with notification-specific content
- **Event-driven triggers**: Automatic notifications from controllers (assignment graded, grade posted, attendance marked)
- **User notification management**: View, mark as read, delete notifications
- **Automatic cleanup**: TTL index for expired notification deletion

### Notification Workflow

#### 1. Teacher grades assignment:
- Teacher grades student submission
- System automatically triggers notification
- Email sent to student with grade details
- In-app notification created in database
- Student sees unread notification badge

#### 2. Student views notifications:
- Student logs in and sees unread count
- Clicks notifications to view list
- Reads notification and marks as read
- Can filter by category or priority
- Can delete individual or all notifications

#### 3. Admin sends announcement:
- Admin creates manual notification
- Selects recipient user(s)
- Chooses notification type (email, in-app, both)
- Sets priority and category
- Notification delivered to selected users

### Notification Categories

- **ASSIGNMENT_DUE**: Assignment deadline approaching (24 hours before due date)
- **ASSIGNMENT_GRADED**: Teacher graded student's submission
- **GRADE_POSTED**: New grade added to grade book
- **ATTENDANCE_MARKED**: Attendance marked for student
- **COURSE_ENROLLMENT**: Student enrolled in new course
- **CLASS_SCHEDULED**: New class scheduled
- **CLASS_CANCELLED**: Class cancelled
- **ANNOUNCEMENT**: General announcement from admin/teacher
- **SYSTEM**: System notifications

### Notification API Endpoints

- POST `/api/v1/notifications` - Create notification (Manager, Admin)
- GET `/api/v1/notifications/my` - Get own notifications (All authenticated)
- GET `/api/v1/notifications/my/unread` - Get unread notifications (All authenticated)
- GET `/api/v1/notifications/my/count` - Get unread count (All authenticated)
- PATCH `/api/v1/notifications/:id/read` - Mark as read (All authenticated)
- PATCH `/api/v1/notifications/:id/unread` - Mark as unread (All authenticated)
- PATCH `/api/v1/notifications/my/read-all` - Mark all as read (All authenticated)
- DELETE `/api/v1/notifications/:id` - Delete notification (All authenticated)
- DELETE `/api/v1/notifications/my/all` - Delete all notifications (All authenticated)

### Reports and Analytics API Endpoints

- GET `/api/v1/reports/students/:id/performance` - Student performance report (Teacher+)
- GET `/api/v1/reports/my/performance` - Own performance report (Student)
- GET `/api/v1/reports/teachers/:id/workload` - Teacher workload report (Manager+)
- GET `/api/v1/reports/my/workload` - Own workload report (Teacher)
- GET `/api/v1/reports/enrollment-trends` - Enrollment trends (Manager+)
- GET `/api/v1/reports/attendance-statistics` - Attendance statistics (Teacher+)
- GET `/api/v1/reports/courses/:id/analytics` - Course analytics (Teacher+)
- GET `/api/v1/reports/classes/:id/performance` - Class performance (Teacher+)
- GET `/api/v1/reports/dashboard` - Dashboard summary (All authenticated)

### Manager Dashboard APIs

#### Dashboard
- GET `/api/v1/manager/dashboard` - Manager dashboard (Manager, Admin)
- GET `/api/v1/manager/course-stats` - Course statistics (Manager, Admin)

#### Approval Workflows
- GET `/api/v1/manager/approvals/pending` - Pending approvals (Manager, Admin)
- PATCH `/api/v1/manager/courses/:id/approve` - Approve course (Manager, Admin)
- PATCH `/api/v1/manager/courses/:id/reject` - Reject course (Manager, Admin)
- PATCH `/api/v1/manager/schedules/:id/approve` - Approve schedule (Manager, Admin)
- PATCH `/api/v1/manager/schedules/:id/reject` - Reject schedule (Manager, Admin)

#### Teacher Oversight
- GET `/api/v1/manager/teachers/performance` - All teachers performance (Manager, Admin)
- GET `/api/v1/manager/teachers/:id/performance` - Specific teacher performance (Manager, Admin)

### Admin Dashboard APIs

#### User Management
- POST `/api/v1/admin/users` - Create user (Admin only)
- GET `/api/v1/admin/users` - List all users (Admin only)
- GET `/api/v1/admin/users/stats` - User statistics (Admin only)
- GET `/api/v1/admin/users/:id` - Get user by ID (Admin only)
- PUT `/api/v1/admin/users/:id` - Update user (Admin only)
- DELETE `/api/v1/admin/users/:id` - Delete user (Admin only)
- PATCH `/api/v1/admin/users/:id/role` - Assign role (Admin only)
- PATCH `/api/v1/admin/users/:id/activate` - Activate user (Admin only)
- PATCH `/api/v1/admin/users/:id/deactivate` - Deactivate user (Admin only)

#### Bulk Operations
- POST `/api/v1/admin/bulk/import-users` - Bulk import users (Admin only)
- POST `/api/v1/admin/bulk/enroll-students` - Bulk enroll students (Admin only)

#### System Settings
- GET `/api/v1/admin/settings` - Get system settings (Admin only)
- PUT `/api/v1/admin/settings/:key` - Update setting (Admin only)
- DELETE `/api/v1/admin/settings/:key` - Delete setting (Admin only)

#### Audit Logs
- GET `/api/v1/admin/audit-logs` - Get audit logs (Admin only)
- GET `/api/v1/admin/audit-logs/my` - Get own audit logs (Admin only)

### Notification Triggers

Notifications are automatically triggered in the following scenarios:

- **Assignment Graded**: Triggered in `assignmentController.gradeSubmissionController` after grading submission
- **Grade Posted**: Triggered in `gradeController.addGradeController` after adding grade (only if published)
- **Attendance Marked**: Triggered in `attendanceController.markAttendanceForStudent` after marking attendance
- **Assignment Due**: Should be triggered by scheduled job (cron) that runs daily (future enhancement)

All triggers use fire-and-forget pattern (non-blocking) to ensure main operations succeed even if notifications fail.

### Email Service Setup

#### For Gmail (Development):
1. Enable 2-Factor Authentication on your Google account
2. Go to Google Account > Security > 2-Step Verification > App passwords
3. Generate app password for 'Mail' application
4. Use the generated 16-character password as EMAIL_PASSWORD (not regular password)
5. Set EMAIL_HOST=smtp.gmail.com and EMAIL_PORT=587

#### For SendGrid (Production - Recommended):
1. Sign up at https://sendgrid.com/ (free tier: 100 emails/day)
2. Create API key in Settings > API Keys
3. Set EMAIL_HOST=smtp.sendgrid.net, EMAIL_PORT=587
4. Set EMAIL_USER=apikey, EMAIL_PASSWORD=your-api-key

#### For Mailtrap (Testing):
1. Sign up at https://mailtrap.io/ (free tier available)
2. Get SMTP credentials from inbox settings
3. Use Mailtrap credentials for development testing
4. Emails are caught and not delivered (safe for testing)

#### Test Email Configuration:
- Server logs email connection status on startup
- Send test notification to verify email delivery

### Future Enhancements

- User notification preferences (enable/disable categories, channels)
- Email template engine (Handlebars, EJS) for better templates
- SMS notifications via Twilio
- Push notifications for mobile apps
- Scheduled job for assignment due reminders (cron)
- Notification batching (digest emails)
- Unsubscribe functionality
- Notification history and analytics

## Reports and Analytics (Phase 13)

The reporting and analytics system provides comprehensive data analysis using Mongoose aggregation pipelines. The system generates actionable insights for different user roles, with RBAC-enforced data access ensuring students see only their own data, teachers see their classes, and admin/manager see all reports.

### Features

- **Comprehensive analytics** using Mongoose aggregation pipelines
- **Student performance reports** with GPA, grades, attendance, and assignments
- **Teacher workload reports** with courses, students, assignments, and grading pending
- **Course enrollment trends** with enrollment by month, top courses, and utilization rates
- **Attendance statistics** with overall rates, by class, and low attendance student identification
- **Course-specific analytics** including enrollment, assignments, grades, and attendance
- **Class performance reports** with attendance by student
- **Role-specific dashboard summaries** for all user roles
- **Date range filtering** for time-based analysis
- **RBAC-enforced data access** (students see own data, teachers see their classes, admin/manager see all)

### Available Reports

#### 1. Student Performance Report

- Overall GPA and total courses
- Course-by-course performance (grades, attendance, assignments)
- Attendance statistics (total, present, absent, late, rate)
- Assignment statistics (total, submitted, graded, average score)
- **Accessible by:** Student (own), Teacher/Manager/Admin (any student)

#### 2. Teacher Workload Report

- Total courses, students, classes, assignments
- Pending grading count (submissions awaiting grading)
- Average class size
- Course-by-course breakdown (students, assignments, classes)
- **Accessible by:** Teacher (own), Manager/Admin (any teacher)

#### 3. Course Enrollment Trends

- Total courses and active courses
- Total enrollments and average per course
- Enrollment by month (time series)
- Top courses by enrollment with utilization rates
- Courses by status distribution
- **Accessible by:** Manager and Admin only

#### 4. Attendance Statistics

- Overall attendance rate
- Status distribution (present, absent, late)
- Attendance by month (time series)
- Attendance by class (identify problematic classes)
- Low attendance students (attendance rate < 75%)
- Filterable by course, teacher, class, date range
- **Accessible by:** Teacher (own classes), Manager/Admin (all)

#### 5. Course Analytics

- Enrollment statistics (current, capacity, utilization)
- Assignment statistics (total, by status, average submissions)
- Grade statistics (average, distribution, passing rate)
- Attendance statistics (overall rate for course)
- **Accessible by:** Teacher (own courses), Manager/Admin (all)

#### 6. Class Performance

- Class details and attendance summary
- Student-by-student attendance list
- **Accessible by:** Teacher (own classes), Manager/Admin (all)

#### 7. Dashboard Summary

- Role-specific summary data
- Admin/Manager: system-wide metrics
- Teacher: my courses, students, pending tasks
- Student: enrolled courses, upcoming assignments, recent grades
- **Accessible by:** All authenticated users (role-specific data)

### Aggregation Pipeline Examples

The reporting system leverages Mongoose aggregation pipelines for complex queries:

- **Student Performance:** $match student → $lookup courses → $lookup grades → $group by course → calculate averages
- **Teacher Workload:** $match teacher → $lookup courses → $unwind students → count unique students → $lookup assignments → count pending
- **Enrollment Trends:** $unwind students → $group by month → count enrollments → sort by month
- **Attendance Statistics:** $match filters → $group by status → calculate rates → $lookup classes → group by class

These pipelines leverage existing indexes for optimal performance.

### Performance Considerations

- Aggregation pipelines use existing compound indexes
- Date range filtering reduces dataset size
- Pagination support for large result sets (future enhancement)
- Caching for frequently accessed reports (future enhancement)
- Background job for pre-computing complex reports (future enhancement)

## Admin Dashboard APIs (Phase 14)

The admin dashboard system provides comprehensive user management, system settings management, bulk operations, and audit logging for platform administrators. All admin operations are strictly protected with admin-only RBAC enforcement and automatic audit trail tracking.

### Features

- **Comprehensive user management**: CRUD all users, role assignment, activation/deactivation
- **System settings management**: Platform configuration, feature flags, type-safe settings
- **Bulk operations**: User import (up to 100 per request), student enrollment (up to 100 per request)
- **Comprehensive audit logging**: All admin actions tracked with IP address and user agent
- **User statistics and analytics**: Total users, by role, active/inactive, recent registrations
- **Strict admin-only RBAC enforcement**: Only exact admin role match (no hierarchical access)
- **Automatic audit trail**: Immutable logs with 90-day retention and automatic cleanup
- **IP address and user agent tracking**: Security auditing for all admin actions

### Admin Workflows

#### 1. User Management
- Admin creates new user with specific role
- Admin can update user details (email, role, profile)
- Admin can activate/deactivate users (soft delete)
- Admin can assign/change user roles
- All actions are automatically logged in audit trail

#### 2. Bulk Operations
- Admin uploads CSV/JSON with user data
- System validates all users before import
- Bulk import creates up to 100 users at once
- Returns success/failure report for each user
- Admin can bulk enroll students in courses
- Partial success supported (some succeed, some fail)

#### 3. System Settings
- Admin views all platform settings grouped by category
- Admin updates feature flags (e.g., ENABLE_REGISTRATION)
- Admin configures limits (e.g., MAX_FILE_SIZE, MAX_STUDENTS_PER_COURSE)
- Settings are type-safe (boolean, string, number, JSON)
- All setting changes are audit logged

#### 4. Audit Logs
- Admin views all admin actions across the platform
- Can filter by admin, action type, target user, date range
- Each log includes: action, performer, target, timestamp, metadata
- Logs are immutable (cannot be edited or deleted)
- Automatic cleanup after 90 days

### Audit Logging

#### Tracked Actions
- USER_CREATED, USER_UPDATED, USER_DELETED
- ROLE_ASSIGNED, USER_ACTIVATED, USER_DEACTIVATED
- BULK_USER_IMPORT, BULK_ENROLLMENT
- SETTINGS_UPDATED, SYSTEM_CONFIG_CHANGED

#### Logged Information
- Action type and description
- Admin who performed action (performedBy)
- Target resource and resource ID
- Old and new values (for updates)
- IP address and user agent
- Timestamp and success status
- Error message if action failed

#### Retention Policy
- Audit logs retained for 90 days
- Automatic cleanup via MongoDB TTL index
- Configurable retention period in SystemSettings

#### Compliance
- Immutable logs (no updates or deletes)
- Complete audit trail for security and compliance
- Supports forensic analysis and accountability

### System Settings

#### Setting Types
- **BOOLEAN**: Feature flags (e.g., ENABLE_REGISTRATION, ENABLE_OAUTH)
- **STRING**: Text configurations (e.g., PLATFORM_NAME, SUPPORT_EMAIL)
- **NUMBER**: Numeric limits (e.g., MAX_FILE_SIZE, MAX_STUDENTS_PER_COURSE)
- **JSON**: Complex configurations (e.g., EMAIL_TEMPLATES, NOTIFICATION_PREFERENCES)

#### Setting Categories
- **feature_flags**: Enable/disable platform features
- **limits**: Resource limits and quotas
- **email**: Email service configuration
- **security**: Security settings (password policy, session timeout)
- **ui**: Frontend configuration (theme, branding)

#### Public Settings
- Some settings can be marked as public (isPublic: true)
- Public settings are accessible to non-admin users
- Useful for frontend configuration (e.g., ENABLE_REGISTRATION)

#### Default Settings
- System can be seeded with default settings on first deployment
- Settings can be updated via admin API

### Bulk Operations

#### Bulk User Import
- Import up to 100 users per request
- Supports CSV or JSON format (frontend converts to JSON)
- Validates all users before import
- Returns detailed success/failure report
- Failed users include reason (duplicate email, validation error)
- Successful users are created with hashed passwords
- All imports are audit logged

#### Bulk Student Enrollment
- Enroll up to 100 students in a course per request
- Validates student existence and role
- Checks course capacity
- Prevents duplicate enrollments
- Returns detailed success/failure report
- All enrollments are audit logged

#### Partial Success Handling
- Bulk operations support partial success
- Some records succeed while others fail
- Detailed error reporting for failed records
- Allows admin to fix issues and retry failed records

### Security Best Practices

- All admin endpoints require authentication AND admin role
- No hierarchical access (only exact admin role match)
- All admin actions are audit logged (immutable trail)
- IP address and user agent tracked for security
- Cannot delete admin users (only deactivate)
- Cannot delete users with dependencies (data integrity)
- Soft delete (deactivation) preferred over hard delete
- Audit logs retained for 90 days for compliance

## Manager Dashboard APIs (Phase 15)

The manager dashboard system provides comprehensive oversight capabilities for managers to monitor teacher performance, approve course and schedule creation requests, and access aggregated analytics. All manager operations are protected with RBAC using `authorizeMinRole(UserRole.MANAGER)` to allow both Manager and Admin access, following the role hierarchy where Admin (level 5) inherits all Manager (level 4) capabilities.

### Features

- **Teacher oversight and performance monitoring**: Comprehensive metrics for all teachers including courses taught, students enrolled, assignments created, and pending grading
- **Course approval workflows**: Approve or reject course creation requests with notes and automatic activation
- **Schedule approval workflows**: Approve or reject schedule creation/change requests with notes
- **Manager dashboard**: Comprehensive overview with pending approvals, statistics, recent approvals, and teacher performance summary
- **Course statistics and analytics**: Course overview with status distribution, enrollment trends, and top courses
- **Approval status tracking**: Pending, Approved, Rejected, and Auto-Approved statuses for courses and schedules
- **RBAC enforcement**: Manager-only access with Admin inheritance (hierarchical access via `authorizeMinRole`)

### Manager Workflows

#### 1. Course Approval Workflow

- Teacher creates course with `requiresApproval` flag set to true
- Course status set to DRAFT, `approvalStatus` set to PENDING
- Manager views pending approvals in dashboard
- Manager reviews course details (name, description, teacher, schedule)
- Manager approves or rejects with notes
- If approved: course status changes to ACTIVE, `approvalStatus` to APPROVED
- If rejected: course remains DRAFT, `approvalStatus` to REJECTED, teacher notified

#### 2. Schedule Approval Workflow

- Coordinator/Admin creates schedule with `requiresApproval` flag set to true
- Schedule `isActive` set to false, `approvalStatus` set to PENDING
- Manager views pending schedule approvals
- Manager reviews schedule details (teacher, time, room, conflicts)
- Manager approves or rejects with notes
- If approved: schedule `isActive` set to true, `approvalStatus` to APPROVED
- If rejected: schedule remains inactive, `approvalStatus` to REJECTED

#### 3. Teacher Oversight

- Manager views all teachers performance metrics
- Sees courses taught, students enrolled, assignments created
- Identifies teachers with high pending grading count
- Reviews teacher workload and average class sizes
- Uses data for teacher support and resource allocation

#### 4. Manager Dashboard

- Manager logs in and sees dashboard summary
- Views pending approvals count (courses + schedules)
- Sees total teachers, courses, students
- Reviews recent approvals history
- Accesses teacher performance summary (top 5 by student count)

### Approval Workflows

#### Approval Statuses

- **PENDING**: Awaiting manager approval
- **APPROVED**: Manager approved, resource activated
- **REJECTED**: Manager rejected, resource remains inactive
- **AUTO_APPROVED**: Automatically approved based on rules (future enhancement)

#### Approval Fields

- `approvalStatus`: Current approval state
- `approvedBy`: Manager who approved/rejected
- `approvalDate`: When approval/rejection occurred
- `approvalNotes`: Manager's notes (required for rejection)
- `requiresApproval`: Whether resource needs approval

#### Approval Policies

- System setting: `COURSE_REQUIRES_APPROVAL` (global policy)
- Teacher-specific: New teachers require approval, experienced teachers don't (future)
- Resource-specific: High-capacity courses require approval (future)
- Configurable via SystemSettings model

#### Approval Integration

- Course model: approval fields added (backward compatible)
- Schedule model: approval fields added (backward compatible)
- Existing resources without approval fields continue to work
- New resources can opt-in to approval workflow

### Manager Dashboard API Endpoints

#### Dashboard

- GET `/api/v1/manager/dashboard` - Manager dashboard (Manager, Admin)
  - Returns: pending approvals count, total teachers/courses/students, recent approvals, teacher performance summary

- GET `/api/v1/manager/course-stats` - Course statistics (Manager, Admin)
  - Returns: total courses, active courses, pending approvals, courses by status, top courses by enrollment

#### Approval Workflows

- GET `/api/v1/manager/approvals/pending` - Pending approvals (Manager, Admin)
  - Returns: pending courses and schedules with summary

- PATCH `/api/v1/manager/courses/:id/approve` - Approve course (Manager, Admin)
  - Body: `{ approvalNotes? }` (optional)
  - Sets course status to ACTIVE and approvalStatus to APPROVED

- PATCH `/api/v1/manager/courses/:id/reject` - Reject course (Manager, Admin)
  - Body: `{ approvalNotes }` (required - rejection reason)
  - Sets approvalStatus to REJECTED, keeps course as DRAFT

- PATCH `/api/v1/manager/schedules/:id/approve` - Approve schedule (Manager, Admin)
  - Body: `{ approvalNotes? }` (optional)
  - Sets schedule isActive to true and approvalStatus to APPROVED

- PATCH `/api/v1/manager/schedules/:id/reject` - Reject schedule (Manager, Admin)
  - Body: `{ approvalNotes }` (required - rejection reason)
  - Sets approvalStatus to REJECTED, keeps schedule inactive

#### Teacher Oversight

- GET `/api/v1/manager/teachers/performance` - All teachers performance (Manager, Admin)
  - Returns: array of teacher performance metrics sorted by total students (busiest first)

- GET `/api/v1/manager/teachers/:id/performance` - Specific teacher performance (Manager, Admin)
  - Returns: detailed performance metrics for a specific teacher

### Teacher Performance Metrics

Each teacher performance record includes:

- `teacherId`: Teacher user ID
- `teacherName`: Full name of teacher
- `totalCourses`: Number of courses taught
- `totalStudents`: Unique students across all courses
- `averageClassSize`: Average students per course
- `totalAssignments`: Total assignments created
- `gradingPending`: Number of submissions awaiting grading
- `averageGradeGiven`: Average grade assigned by teacher

### Role Hierarchy

- **Admin (Level 5)**: Full system access, user management, system settings, all manager capabilities
- **Manager (Level 4)**: Teacher oversight, course/schedule approvals, reports, all teacher capabilities
- **Teacher (Level 3)**: Create courses/assignments, grade students, mark attendance
- **Coordinator (Level 3)**: Schedule classes, monitor attendance, coordinate students (parallel to Teacher)
- **Student (Level 1)**: View courses, submit assignments, view own grades/attendance

Higher roles inherit lower role capabilities. Manager can perform all Teacher operations plus approval workflows.

### Security Best Practices

- All manager endpoints use `authorizeMinRole(UserRole.MANAGER)` for hierarchical access
- Admins can access all manager endpoints (role hierarchy)
- Approval actions require authentication and manager role
- Rejection requires approval notes (explanation required)
- All approval actions are tracked with `approvedBy` and `approvalDate`

### Progress Tracker

- Phase 15 complete: Manager Dashboard APIs
- 15/18 phases completed
- Next phase: Phase 16 — Class Coordinator-Specific APIs
