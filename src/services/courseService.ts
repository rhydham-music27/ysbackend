import mongoose from 'mongoose';
import Course, { ICourse } from '../models/Course';
import User from '../models/User';
import SystemSettings from '../models/SystemSettings';
import { CourseStatus, UserRole } from '../types/enums';

export interface EnrollStudentParams {
  courseId: string;
  studentId: string;
  enrolledBy: string;
}

export interface UnenrollStudentParams {
  courseId: string;
  studentId: string;
  unenrolledBy: string;
}

export interface CheckCapacityParams {
  courseId: string;
}

export async function enrollStudent(params: EnrollStudentParams): Promise<ICourse> {
  const { courseId, studentId } = params;
  try {
    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(studentId)) {
      throw new Error('Invalid course or student ID');
    }

    const course = await Course.findById(courseId);
    if (!course) throw new Error('Course not found');

    if (course.status !== CourseStatus.ACTIVE) {
      throw new Error('Course is not active for enrollment');
    }

    const student = await User.findById(studentId);
    if (!student) throw new Error('Student not found');
    if (student.role !== UserRole.STUDENT) throw new Error('User is not a student');

    if (course.isEnrolled(studentId)) throw new Error('Student is already enrolled in this course');

    if (!course.canEnroll()) throw new Error('Course has reached maximum capacity');

    course.students.push(new mongoose.Types.ObjectId(studentId));
    await course.save();
    return course;
  } catch (error) {
    throw error;
  }
}

export async function unenrollStudent(params: UnenrollStudentParams): Promise<ICourse> {
  const { courseId, studentId } = params;
  try {
    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(studentId)) {
      throw new Error('Invalid course or student ID');
    }

    const course = await Course.findById(courseId);
    if (!course) throw new Error('Course not found');

    if (!course.isEnrolled(studentId)) throw new Error('Student is not enrolled in this course');

    course.students = course.students.filter((id) => id.toString() !== studentId);
    await course.save();
    return course;
  } catch (error) {
    throw error;
  }
}

export async function checkCourseCapacity(
  params: CheckCapacityParams
): Promise<{ available: number; total: number; isFull: boolean }> {
  const { courseId } = params;
  try {
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new Error('Invalid course ID');
    }

    const course = await Course.findById(courseId);
    if (!course) throw new Error('Course not found');

    const total = course.maxStudents || 0;
    const enrolled = course.students?.length || 0;
    const available = Math.max(0, total - enrolled);
    const isFull = course.isFullyEnrolled;

    return { available, total, isFull };
  } catch (error) {
    throw error;
  }
}

export async function validateTeacherAssignment(teacherId: string): Promise<boolean> {
  try {
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      throw new Error('Invalid teacher ID');
    }
    const user = await User.findById(teacherId);
    if (!user) throw new Error('Teacher not found');
    if (user.role !== UserRole.TEACHER) throw new Error('User is not a teacher');
    if ((user as any).isActive === false) throw new Error('Teacher account is not active');
    return true;
  } catch (error) {
    throw error;
  }
}

export async function bulkEnrollStudents(
  courseId: string,
  studentIds: string[],
  enrolledBy: string
): Promise<{ enrolled: string[]; failed: Array<{ studentId: string; reason: string }> }> {
  const enrolled: string[] = [];
  const failed: Array<{ studentId: string; reason: string }> = [];
  try {
    if (!mongoose.Types.ObjectId.isValid(courseId)) throw new Error('Invalid course ID');
    const course = await Course.findById(courseId);
    if (!course) throw new Error('Course not found');

    for (const studentId of studentIds) {
      try {
        await enrollStudent({ courseId, studentId, enrolledBy });
        enrolled.push(studentId);
      } catch (err: any) {
        failed.push({ studentId, reason: err?.message || 'Unknown error' });
      }
    }

    return { enrolled, failed };
  } catch (error) {
    throw error;
  }
}

export async function getCourseStatistics(
  courseId: string
): Promise<{ enrolledCount: number; capacity: number; utilizationRate: number; status: CourseStatus }> {
  try {
    if (!mongoose.Types.ObjectId.isValid(courseId)) throw new Error('Invalid course ID');
    const course = await Course.findById(courseId);
    if (!course) throw new Error('Course not found');

    const enrolledCount = course.students?.length || 0;
    const capacity = course.maxStudents || 0;
    const utilizationRate = capacity > 0 ? (enrolledCount / capacity) * 100 : 0;
    const status = course.status;

    return { enrolledCount, capacity, utilizationRate, status };
  } catch (error) {
    throw error;
  }
}

/**
 * Check if course creation requires approval based on system settings
 * This is an optional helper function for approval workflow integration
 * @param teacherId - The teacher creating the course
 * @returns Promise<boolean> - true if approval is required, false otherwise
 */
export async function checkApprovalRequirement(teacherId: string): Promise<boolean> {
  try {
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      throw new Error('Invalid teacher ID');
    }

    // Check system setting for global approval requirement
    const requiresApproval = await SystemSettings.getSetting('COURSE_REQUIRES_APPROVAL', false);
    if (requiresApproval) {
      return true;
    }

    // Future: Check teacher-specific settings (e.g., new teachers require approval)
    // const teacher = await User.findById(teacherId);
    // if (teacher) {
    //   const teacherExperience = ...; // Calculate based on courses taught, account age, etc.
    //   if (teacherExperience < threshold) {
    //     return true;
    //   }
    // }

    return false;
  } catch (error) {
    throw error;
  }
}


