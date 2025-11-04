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

// Future enums (placeholders for subsequent phases):
// export enum AttendanceStatus { PRESENT = 'present', ABSENT = 'absent', LATE = 'late' }
// export enum AssignmentStatus { PENDING = 'pending', SUBMITTED = 'submitted', GRADED = 'graded' }
// export enum NotificationType { EMAIL = 'email', IN_APP = 'in-app', SMS = 'sms' }

