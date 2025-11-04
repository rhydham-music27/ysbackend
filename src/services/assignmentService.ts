import mongoose from 'mongoose';
import Assignment, { IAssignment, ISubmission } from '../models/Assignment';
import Course from '../models/Course';
import User from '../models/User';
import { AssignmentStatus, SubmissionStatus, UserRole } from '../types/enums';

export interface CreateAssignmentParams {
  title: string;
  description: string;
  course: string;
  teacher: string;
  dueDate: Date | string;
  publishDate?: Date | string;
  maxGrade?: number;
  attachments?: string[];
  instructions?: string;
  allowLateSubmission?: boolean;
  lateSubmissionPenalty?: number;
}

export interface SubmitAssignmentParams {
  assignmentId: string;
  studentId: string;
  content?: string;
  attachments?: string[];
}

export interface GradeSubmissionParams {
  assignmentId: string;
  submissionId: string;
  grade: number;
  feedback?: string;
  gradedBy: string;
}

export interface UpdateAssignmentParams {
  assignmentId: string;
  updates: Partial<IAssignment>;
  updatedBy: string;
}

export async function validateTeacherAssignment(teacherId: string, courseId: string): Promise<boolean> {
  try {
    if (!mongoose.Types.ObjectId.isValid(teacherId) || !mongoose.Types.ObjectId.isValid(courseId)) {
      throw new Error('Invalid teacher or course ID');
    }

    const user = await User.findById(teacherId);
    if (!user) throw new Error('Teacher not found');
    if (user.role !== UserRole.TEACHER) throw new Error('User is not a teacher');
    if ((user as any).isActive === false) throw new Error('Teacher account is not active');

    const course = await Course.findById(courseId);
    if (!course) throw new Error('Course not found');
    if (course.teacher?.toString() !== teacherId) throw new Error('Teacher is not assigned to this course');

    return true;
  } catch (error) {
    throw error;
  }
}

export async function createAssignment(params: CreateAssignmentParams): Promise<IAssignment> {
  try {
    if (!mongoose.Types.ObjectId.isValid(params.course) || !mongoose.Types.ObjectId.isValid(params.teacher)) {
      throw new Error('Invalid course or teacher ID');
    }

    await validateTeacherAssignment(params.teacher, params.course);

    const due = new Date(params.dueDate);
    if (due <= new Date()) throw new Error('Due date must be in the future');

    if (params.publishDate) {
      const pub = new Date(params.publishDate);
      if (pub >= due) throw new Error('Publish date must be before due date');
    }

    const assignment = await Assignment.create({
      title: params.title,
      description: params.description,
      course: new mongoose.Types.ObjectId(params.course),
      teacher: new mongoose.Types.ObjectId(params.teacher),
      dueDate: due,
      publishDate: params.publishDate ? new Date(params.publishDate) : undefined,
      maxGrade: params.maxGrade ?? 100,
      attachments: params.attachments ?? [],
      instructions: params.instructions,
      allowLateSubmission: params.allowLateSubmission ?? false,
      lateSubmissionPenalty: params.lateSubmissionPenalty,
      status: AssignmentStatus.DRAFT,
      submissions: [],
    });

    await assignment.populate([
      { path: 'teacher', select: 'profile.firstName profile.lastName email' },
      { path: 'course', select: 'name code' },
    ] as any);

    return assignment;
  } catch (error) {
    throw error;
  }
}

export async function submitAssignment(params: SubmitAssignmentParams): Promise<IAssignment> {
  try {
    const { assignmentId, studentId, content, attachments } = params;
    if (!mongoose.Types.ObjectId.isValid(assignmentId) || !mongoose.Types.ObjectId.isValid(studentId)) {
      throw new Error('Invalid assignment or student ID');
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw new Error('Assignment not found');

    const student = await User.findById(studentId);
    if (!student) throw new Error('Student not found');
    if (student.role !== UserRole.STUDENT) throw new Error('User is not a student');

    const course = await Course.findById(assignment.course);
    if (!course) throw new Error('Course not found');
    const enrolled = (course.students || []).some((s: mongoose.Types.ObjectId) => s.toString() === studentId);
    if (!enrolled) throw new Error('Student is not enrolled in this course');

    if (!assignment.canSubmit(studentId)) {
      throw new Error('Assignment cannot be submitted at this time');
    }

    const now = new Date();
    const isLate = now > assignment.dueDate;
    const status = isLate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED;

    let sub = assignment.getSubmission(studentId);
    if (sub) {
      sub.content = content;
      sub.attachments = attachments ?? [];
      sub.submittedAt = now;
      sub.status = status === SubmissionStatus.LATE ? SubmissionStatus.RESUBMITTED : status;
      sub.isLate = isLate;
    } else {
      const newSub: ISubmission = {
        student: new mongoose.Types.ObjectId(studentId),
        content,
        attachments: attachments ?? [],
        submittedAt: now,
        status,
        isLate,
      };
      assignment.submissions.push(newSub);
    }

    const saved = await assignment.save();
    await saved.populate([
      { path: 'submissions.student', select: 'profile.firstName profile.lastName email' },
    ] as any);
    return saved;
  } catch (error) {
    throw error;
  }
}

export async function gradeSubmission(params: GradeSubmissionParams): Promise<IAssignment> {
  try {
    const { assignmentId, submissionId, grade, feedback, gradedBy } = params;
    if (!mongoose.Types.ObjectId.isValid(assignmentId) || !mongoose.Types.ObjectId.isValid(submissionId) || !mongoose.Types.ObjectId.isValid(gradedBy)) {
      throw new Error('Invalid IDs');
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw new Error('Assignment not found');

    await validateTeacherAssignment(gradedBy, assignment.course.toString());

    const sub = (assignment.submissions || []).find((s) => s._id?.toString() === submissionId);
    if (!sub) throw new Error('Submission not found');
    if (sub.status === SubmissionStatus.NOT_SUBMITTED) throw new Error('Cannot grade submission that has not been submitted');

    const maxAllowed = sub.maxGrade ?? assignment.maxGrade;
    if (grade < 0 || grade > maxAllowed) throw new Error('Grade must be between 0 and maximum grade');

    sub.grade = grade;
    sub.feedback = feedback;
    sub.gradedBy = new mongoose.Types.ObjectId(gradedBy);
    sub.gradedAt = new Date();
    sub.status = SubmissionStatus.GRADED;

    const saved = await assignment.save();
    await saved.populate([{ path: 'submissions.gradedBy', select: 'profile.firstName profile.lastName' }] as any);
    return saved;
  } catch (error) {
    throw error;
  }
}

export async function updateAssignment(params: UpdateAssignmentParams): Promise<IAssignment> {
  try {
    const { assignmentId, updates, updatedBy } = params;
    if (!mongoose.Types.ObjectId.isValid(assignmentId) || !mongoose.Types.ObjectId.isValid(updatedBy)) {
      throw new Error('Invalid IDs');
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw new Error('Assignment not found');

    await validateTeacherAssignment(updatedBy, assignment.course.toString());

    if (updates.dueDate) {
      const nextDue = new Date(updates.dueDate as any);
      if (nextDue <= new Date()) throw new Error('Due date must be in the future');
    }

    if (updates.course && assignment.submissions && assignment.submissions.length > 0) {
      throw new Error('Cannot change course after submissions exist');
    }

    Object.assign(assignment, updates);
    const saved = await assignment.save();
    return saved;
  } catch (error) {
    throw error;
  }
}

export async function deleteAssignment(assignmentId: string, deletedBy: string): Promise<void> {
  try {
    if (!mongoose.Types.ObjectId.isValid(assignmentId) || !mongoose.Types.ObjectId.isValid(deletedBy)) {
      throw new Error('Invalid IDs');
    }
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw new Error('Assignment not found');

    await validateTeacherAssignment(deletedBy, assignment.course.toString());

    if ((assignment.submissions || []).length > 0) {
      throw new Error('Cannot delete assignment with existing submissions. Close the assignment instead.');
    }

    await Assignment.findByIdAndDelete(assignmentId);
  } catch (error) {
    throw error;
  }
}

export async function getAssignmentStatistics(
  assignmentId: string
): Promise<{ totalSubmissions: number; gradedSubmissions: number; averageGrade: number; submissionRate: number }> {
  try {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) throw new Error('Invalid assignment ID');
    const assignment = await Assignment.findById(assignmentId).populate({ path: 'course', select: 'students', options: {} } as any);
    if (!assignment) throw new Error('Assignment not found');

    const totalSubmissions = (assignment.submissions || []).filter((s) => s.status !== SubmissionStatus.NOT_SUBMITTED).length;
    const gradedSubmissions = assignment.gradedCount;
    const averageGrade = assignment.averageGrade;
    const courseDoc: any = assignment.course as any;
    const totalStudents = (courseDoc?.students || []).length || 0;
    const submissionRate = totalStudents > 0 ? (totalSubmissions / totalStudents) * 100 : 0;

    return { totalSubmissions, gradedSubmissions, averageGrade, submissionRate };
  } catch (error) {
    throw error;
  }
}

export async function getStudentAssignments(studentId: string, courseId?: string): Promise<IAssignment[]> {
  try {
    if (!mongoose.Types.ObjectId.isValid(studentId)) throw new Error('Invalid student ID');
    const courseQuery: Record<string, unknown> = { students: new mongoose.Types.ObjectId(studentId) };
    if (courseId) courseQuery._id = new mongoose.Types.ObjectId(courseId);
    const courses = await Course.find(courseQuery, { _id: 1 }).lean();
    const courseIds = courses.map((c: any) => c._id);

    const assignments = await Assignment.find({
      course: { $in: courseIds },
      status: AssignmentStatus.PUBLISHED,
    }).sort({ dueDate: 1 });

    return assignments;
  } catch (error) {
    throw error;
  }
}

export async function checkDeadline(
  assignmentId: string
): Promise<{ isOverdue: boolean; timeRemaining: number; canSubmit: boolean }> {
  try {
    if (!mongoose.Types.ObjectId.isValid(assignmentId)) throw new Error('Invalid assignment ID');
    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw new Error('Assignment not found');
    const timeRemaining = assignment.dueDate.getTime() - new Date().getTime();
    const isOverdue = timeRemaining < 0;
    const canSubmit = !isOverdue || assignment.allowLateSubmission === true;
    return { isOverdue, timeRemaining, canSubmit };
  } catch (error) {
    throw error;
  }
}


