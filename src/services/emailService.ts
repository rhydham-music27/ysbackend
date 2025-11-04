import mongoose from 'mongoose';
import transporter, { EMAIL_FROM, EMAIL_TEMPLATES } from '../config/email';
import User from '../models/User';
import { NotificationCategory } from '../types/enums';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{ filename: string; path: string }>;
}

export interface SendNotificationEmailParams {
  userId: string;
  category: NotificationCategory;
  data: Record<string, any>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<EmailResult> {
  try {
    if (!params.to || !params.subject) {
      throw new Error('Recipient email and subject are required');
    }

    if (!params.text && !params.html) {
      throw new Error('Either text or html content is required');
    }

    const mailOptions = {
      from: EMAIL_FROM,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
      attachments: params.attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendNotificationEmail(params: SendNotificationEmailParams): Promise<EmailResult> {
  try {
    if (!mongoose.Types.ObjectId.isValid(params.userId)) {
      throw new Error('Invalid user ID');
    }

    const user = await User.findById(params.userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.isEmailVerified) {
      // eslint-disable-next-line no-console
      console.warn(`User ${params.userId} email not verified, skipping email notification`);
      return { success: false, error: 'Email not verified' };
    }

    const template = EMAIL_TEMPLATES[params.category as keyof typeof EMAIL_TEMPLATES];
    if (!template) {
      throw new Error(`No email template found for category: ${params.category}`);
    }

    const userName = user.profile?.firstName || user.email;
    const { subject, html, text } = buildEmailTemplate(params.category, params.data, userName);

    return await sendEmail({
      to: user.email,
      subject,
      html,
      text,
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export function buildEmailTemplate(
  category: NotificationCategory,
  data: Record<string, any>,
  userName: string
): { subject: string; html: string; text: string } {
  const template = EMAIL_TEMPLATES[category as keyof typeof EMAIL_TEMPLATES];
  const subject = template?.subject || 'Notification from Your Shikshak';

  let htmlContent = '';
  let textContent = '';

  switch (category) {
    case 'assignment_due':
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Assignment Due Soon</h2>
          <p>Hi ${userName},</p>
          <p>Your assignment "<strong>${data.assignmentTitle || 'Assignment'}</strong>" is due on <strong>${data.dueDate || 'N/A'}</strong>.</p>
          ${data.actionUrl ? `<p><a href="${data.actionUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Assignment</a></p>` : ''}
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated notification from Your Shikshak.</p>
        </div>
      `;
      textContent = `Hi ${userName},\n\nYour assignment "${data.assignmentTitle || 'Assignment'}" is due on ${data.dueDate || 'N/A'}.\n\n${data.actionUrl ? `View: ${data.actionUrl}` : ''}`;
      break;

    case 'assignment_graded':
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Assignment Graded</h2>
          <p>Hi ${userName},</p>
          <p>Your assignment "<strong>${data.assignmentTitle || 'Assignment'}</strong>" has been graded.</p>
          <p><strong>Score:</strong> ${data.grade || 'N/A'} / ${data.maxGrade || 'N/A'}</p>
          ${data.feedback ? `<p><strong>Feedback:</strong> ${data.feedback}</p>` : ''}
          ${data.actionUrl ? `<p><a href="${data.actionUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Submission</a></p>` : ''}
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated notification from Your Shikshak.</p>
        </div>
      `;
      textContent = `Hi ${userName},\n\nYour assignment "${data.assignmentTitle || 'Assignment'}" has been graded.\nScore: ${data.grade || 'N/A'} / ${data.maxGrade || 'N/A'}\n${data.feedback ? `Feedback: ${data.feedback}\n` : ''}${data.actionUrl ? `View: ${data.actionUrl}` : ''}`;
      break;

    case 'grade_posted':
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Grade Posted</h2>
          <p>Hi ${userName},</p>
          <p>A new grade has been posted for <strong>${data.courseName || 'Course'}</strong>.</p>
          <p><strong>Score:</strong> ${data.score || 'N/A'} / ${data.maxScore || 'N/A'}</p>
          ${data.letterGrade ? `<p><strong>Letter Grade:</strong> ${data.letterGrade}</p>` : ''}
          ${data.actionUrl ? `<p><a href="${data.actionUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Grades</a></p>` : ''}
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated notification from Your Shikshak.</p>
        </div>
      `;
      textContent = `Hi ${userName},\n\nA new grade has been posted for ${data.courseName || 'Course'}.\nScore: ${data.score || 'N/A'} / ${data.maxScore || 'N/A'}\n${data.letterGrade ? `Letter Grade: ${data.letterGrade}\n` : ''}${data.actionUrl ? `View: ${data.actionUrl}` : ''}`;
      break;

    case 'attendance_marked':
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Attendance Marked</h2>
          <p>Hi ${userName},</p>
          <p>Your attendance for <strong>${data.className || 'Class'}</strong> on <strong>${data.date || 'N/A'}</strong> has been marked as <strong>${data.status || 'N/A'}</strong>.</p>
          ${data.actionUrl ? `<p><a href="${data.actionUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Attendance</a></p>` : ''}
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated notification from Your Shikshak.</p>
        </div>
      `;
      textContent = `Hi ${userName},\n\nYour attendance for ${data.className || 'Class'} on ${data.date || 'N/A'} has been marked as ${data.status || 'N/A'}.\n${data.actionUrl ? `View: ${data.actionUrl}` : ''}`;
      break;

    default:
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Notification</h2>
          <p>Hi ${userName},</p>
          <p>You have a new notification from Your Shikshak.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated notification from Your Shikshak.</p>
        </div>
      `;
      textContent = `Hi ${userName},\n\nYou have a new notification from Your Shikshak.`;
  }

  return { subject, html: htmlContent, text: textContent };
}

export async function sendBulkEmails(
  recipients: Array<{ userId: string; category: NotificationCategory; data: Record<string, any> }>
): Promise<{ sent: number; failed: number; results: EmailResult[] }> {
  let sent = 0;
  let failed = 0;
  const results: EmailResult[] = [];

  for (const recipient of recipients) {
    try {
      const result = await sendNotificationEmail({
        userId: recipient.userId,
        category: recipient.category,
        data: recipient.data,
      });
      results.push(result);
      if (result.success) {
        sent++;
      } else {
        failed++;
      }
    } catch (error) {
      failed++;
      results.push({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  return { sent, failed, results };
}

export async function testEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    return true;
  } catch (error) {
    return false;
  }
}

