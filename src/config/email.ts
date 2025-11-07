import nodemailer, { Transporter } from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: false, // Use STARTTLS for port 587, true for port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false, // For development, remove in production
  },
};

const transporter: Transporter = nodemailer.createTransport(emailConfig);

export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    // eslint-disable-next-line no-console
    console.log('✅ Email service connected successfully');
    return true;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('⚠️ Email service connection failed. Email notifications will not work.');
    return false;
  }
}

export const EMAIL_FROM = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@yourshikshak.com';

export const EMAIL_TEMPLATES = {
  ASSIGNMENT_DUE: { subject: 'Assignment Due Soon', template: 'assignment-due' },
  ASSIGNMENT_GRADED: { subject: 'Assignment Graded', template: 'assignment-graded' },
  GRADE_POSTED: { subject: 'New Grade Posted', template: 'grade-posted' },
  ATTENDANCE_MARKED: { subject: 'Attendance Marked', template: 'attendance-marked' },
  WELCOME: { subject: 'Welcome to Your Shikshak', template: 'welcome' },
} as const;

export default transporter;

