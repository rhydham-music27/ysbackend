import mongoose from 'mongoose';
import Notification, { INotification } from '../models/Notification';
import User from '../models/User';
import { sendNotificationEmail } from './emailService';
import { NotificationType, NotificationCategory, NotificationPriority } from '../types/enums';

export interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  metadata?: Record<string, any>;
  expiresAt?: Date;
}

export interface NotificationTriggerParams {
  event: NotificationCategory;
  recipientIds: string[];
  data: Record<string, any>;
  priority?: NotificationPriority;
}

export async function createNotification(params: CreateNotificationParams): Promise<INotification | null> {
  try {
    if (!mongoose.Types.ObjectId.isValid(params.userId)) {
      throw new Error('Invalid user ID');
    }

    const user = await User.findById(params.userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isActive) {
      throw new Error('User account is not active');
    }

    let emailSent = false;
    let emailSentAt: Date | undefined;

    // Handle email notification
    if (params.type === NotificationType.EMAIL || params.type === NotificationType.BOTH) {
      const emailResult = await sendNotificationEmail({
        userId: params.userId,
        category: params.category,
        data: params.metadata || {},
      });
      emailSent = emailResult.success;
      emailSentAt = emailResult.success ? new Date() : undefined;
    }

    // Handle in-app notification
    if (params.type === NotificationType.IN_APP || params.type === NotificationType.BOTH) {
      const notification = await Notification.create({
        user: params.userId,
        type: params.type,
        category: params.category,
        priority: params.priority,
        title: params.title,
        message: params.message,
        metadata: params.metadata,
        emailSent,
        emailSentAt,
        expiresAt: params.expiresAt,
      });
      return notification;
    }

    // EMAIL only - no database record
    return null;
  } catch (error: any) {
    throw new Error(`Failed to create notification: ${error.message}`);
  }
}

export async function triggerNotification(params: NotificationTriggerParams): Promise<{ created: number; failed: number }> {
  try {
    if (!params.recipientIds || params.recipientIds.length === 0) {
      throw new Error('Recipient IDs are required');
    }

    let title = '';
    let message = '';

    // Build notification content based on event category
    switch (params.event) {
      case NotificationCategory.ASSIGNMENT_DUE:
        title = 'Assignment Due Soon';
        message = `Your assignment "${params.data.assignmentTitle || 'Assignment'}" is due on ${params.data.dueDate || 'N/A'}`;
        break;
      case NotificationCategory.ASSIGNMENT_GRADED:
        title = 'Assignment Graded';
        message = `Your assignment "${params.data.assignmentTitle || 'Assignment'}" has been graded. Score: ${params.data.grade || 'N/A'}/${params.data.maxGrade || 'N/A'}`;
        break;
      case NotificationCategory.GRADE_POSTED:
        title = 'New Grade Posted';
        message = `A new grade has been posted for ${params.data.courseName || 'Course'}. Score: ${params.data.score || 'N/A'}/${params.data.maxScore || 'N/A'}`;
        break;
      case NotificationCategory.ATTENDANCE_MARKED:
        title = 'Attendance Marked';
        message = `Your attendance for ${params.data.className || 'Class'} on ${params.data.date || 'N/A'} has been marked as ${params.data.status || 'N/A'}`;
        break;
      default:
        title = 'New Notification';
        message = 'You have a new notification';
    }

    // Determine notification type (default to BOTH)
    const notificationType = NotificationType.BOTH;

    // Determine priority
    let priority = params.priority;
    if (!priority) {
      switch (params.event) {
        case NotificationCategory.ASSIGNMENT_DUE:
          priority = NotificationPriority.HIGH;
          break;
        default:
          priority = NotificationPriority.MEDIUM;
      }
    }

    let created = 0;
    let failed = 0;

    // Create notifications for each recipient
    for (const recipientId of params.recipientIds) {
      try {
        await createNotification({
          userId: recipientId,
          type: notificationType,
          category: params.event,
          priority,
          title,
          message,
          metadata: params.data,
        });
        created++;
      } catch (error) {
        failed++;
        // eslint-disable-next-line no-console
        console.error(`Failed to create notification for user ${recipientId}:`, error);
      }
    }

    return { created, failed };
  } catch (error: any) {
    throw new Error(`Failed to trigger notification: ${error.message}`);
  }
}

export async function notifyAssignmentDue(
  assignmentId: string,
  studentIds: string[],
  assignmentTitle: string,
  dueDate: Date,
  courseId: string
): Promise<void> {
  try {
    const notificationData = {
      assignmentId,
      assignmentTitle,
      dueDate: dueDate.toLocaleDateString(),
      courseId,
      actionUrl: `/assignments/${assignmentId}`,
    };

    await triggerNotification({
      event: NotificationCategory.ASSIGNMENT_DUE,
      recipientIds: studentIds,
      data: notificationData,
      priority: NotificationPriority.HIGH,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in notifyAssignmentDue:', error);
  }
}

export async function notifyAssignmentGraded(
  studentId: string,
  assignmentId: string,
  assignmentTitle: string,
  grade: number,
  maxGrade: number,
  feedback?: string
): Promise<void> {
  try {
    const notificationData = {
      assignmentId,
      assignmentTitle,
      grade,
      maxGrade,
      feedback,
      actionUrl: `/assignments/${assignmentId}/my-submission`,
    };

    await triggerNotification({
      event: NotificationCategory.ASSIGNMENT_GRADED,
      recipientIds: [studentId],
      data: notificationData,
      priority: NotificationPriority.MEDIUM,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in notifyAssignmentGraded:', error);
  }
}

export async function notifyGradePosted(
  studentId: string,
  gradeId: string,
  courseName: string,
  score: number,
  maxScore: number,
  letterGrade: string
): Promise<void> {
  try {
    const notificationData = {
      gradeId,
      courseName,
      score,
      maxScore,
      letterGrade,
      actionUrl: `/grades/my`,
    };

    await triggerNotification({
      event: NotificationCategory.GRADE_POSTED,
      recipientIds: [studentId],
      data: notificationData,
      priority: NotificationPriority.MEDIUM,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in notifyGradePosted:', error);
  }
}

export async function notifyAttendanceMarked(
  studentId: string,
  attendanceId: string,
  className: string,
  date: Date,
  status: string
): Promise<void> {
  try {
    const notificationData = {
      attendanceId,
      className,
      date: date.toLocaleDateString(),
      status,
      actionUrl: `/attendance/my`,
    };

    await triggerNotification({
      event: NotificationCategory.ATTENDANCE_MARKED,
      recipientIds: [studentId],
      data: notificationData,
      priority: NotificationPriority.LOW,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error in notifyAttendanceMarked:', error);
  }
}

export async function getUserNotificationPreferences(userId: string): Promise<{
  emailEnabled: boolean;
  inAppEnabled: boolean;
  categories: NotificationCategory[];
}> {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Default preferences (to be extended in future when User model has preferences field)
    return {
      emailEnabled: true,
      inAppEnabled: true,
      categories: Object.values(NotificationCategory),
    };
  } catch (error: any) {
    throw new Error(`Failed to get user notification preferences: ${error.message}`);
  }
}

