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

### Progress Tracker

- Phase 11 complete: File Upload Integration with Cloudinary
- 11/18 phases completed
- Next phase: Phase 12 — Notification System (Email and In-App)
