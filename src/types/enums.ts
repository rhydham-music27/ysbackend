export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  TEACHER = 'teacher',
  COORDINATOR = 'coordinator',
  STUDENT = 'student',
}

export enum OAuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  GITHUB = 'github',
}

// Resource/action enums for future permission-based authorization (Phase 5+)
export enum ResourceType {
  COURSE = 'course',
  CLASS = 'class',
  ASSIGNMENT = 'assignment',
  ATTENDANCE = 'attendance',
  GRADE = 'grade',
  SCHEDULE = 'schedule',
  USER = 'user',
  NOTIFICATION = 'notification',
  REPORT = 'report',
}

export enum ActionType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
}

export enum CourseStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  COMPLETED = 'completed',
}

export enum ClassStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday',
}

export enum RecurrenceType {
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  CUSTOM = 'custom',
}

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EXCUSED = 'excused',
}

// Assignment and submission lifecycle enums
export enum AssignmentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
  GRADED = 'graded',
}

export enum SubmissionStatus {
  NOT_SUBMITTED = 'not_submitted',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
  LATE = 'late',
  RESUBMITTED = 'resubmitted',
}


// Grading system enums
export enum GradeType {
  ASSIGNMENT = 'assignment',
  MANUAL = 'manual',
  EXAM = 'exam',
  QUIZ = 'quiz',
  PARTICIPATION = 'participation',
  PROJECT = 'project',
  ATTENDANCE = 'attendance',
  FINAL = 'final',
}

export enum LetterGrade {
  A_PLUS = 'A+',
  A = 'A',
  A_MINUS = 'A-',
  B_PLUS = 'B+',
  B = 'B',
  B_MINUS = 'B-',
  C_PLUS = 'C+',
  C = 'C',
  C_MINUS = 'C-',
  D = 'D',
  F = 'F',
}

// File upload enums (Phase 11)
export enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  VIDEO = 'video',
  AUDIO = 'audio',
}

export enum FileCategory {
  PROFILE_AVATAR = 'profile_avatar',
  ASSIGNMENT_ATTACHMENT = 'assignment_attachment',
  ASSIGNMENT_MATERIAL = 'assignment_material',
  COURSE_MATERIAL = 'course_material',
  DOCUMENT = 'document',
}

// Notification system enums (Phase 12)
export enum NotificationType {
  EMAIL = 'email',
  IN_APP = 'in_app',
  BOTH = 'both',
  SMS = 'sms',
}

export enum NotificationCategory {
  ASSIGNMENT_DUE = 'assignment_due',
  ASSIGNMENT_GRADED = 'assignment_graded',
  GRADE_POSTED = 'grade_posted',
  ATTENDANCE_MARKED = 'attendance_marked',
  COURSE_ENROLLMENT = 'course_enrollment',
  CLASS_SCHEDULED = 'class_scheduled',
  CLASS_CANCELLED = 'class_cancelled',
  ANNOUNCEMENT = 'announcement',
  SYSTEM = 'system',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Admin dashboard enums (Phase 14)
export enum AuditAction {
  USER_CREATED = 'user_created',
  USER_UPDATED = 'user_updated',
  USER_DELETED = 'user_deleted',
  ROLE_ASSIGNED = 'role_assigned',
  USER_ACTIVATED = 'user_activated',
  USER_DEACTIVATED = 'user_deactivated',
  BULK_USER_IMPORT = 'bulk_user_import',
  BULK_ENROLLMENT = 'bulk_enrollment',
  SETTINGS_UPDATED = 'settings_updated',
  SYSTEM_CONFIG_CHANGED = 'system_config_changed',
}

export enum SettingType {
  BOOLEAN = 'boolean',
  STRING = 'string',
  NUMBER = 'number',
  JSON = 'json',
}

