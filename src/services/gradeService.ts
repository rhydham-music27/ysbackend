import mongoose from 'mongoose';
import Grade, { IGrade } from '../models/Grade';
import Assignment from '../models/Assignment';
import Course from '../models/Course';
import User from '../models/User';
import { GradeType, LetterGrade, UserRole } from '../types/enums';

export interface AddGradeParams {
  student: string;
  course: string;
  assignment?: string;
  gradeType: GradeType;
  score: number;
  maxScore: number;
  weight?: number;
  feedback?: string;
  gradedBy: string;
  term?: string;
  isPublished?: boolean;
  notes?: string;
}

export interface UpdateGradeParams {
  gradeId: string;
  score?: number;
  maxScore?: number;
  weight?: number;
  feedback?: string;
  isPublished?: boolean;
  notes?: string;
  updatedBy: string;
}

export interface SyncAssignmentGradeParams {
  assignmentId: string;
  submissionId: string;
  studentId: string;
}

function isValidObjectId(id?: string): boolean {
  return !!id && mongoose.Types.ObjectId.isValid(id);
}

export async function validateTeacherForCourse(teacherId: string, courseId: string): Promise<boolean> {
  try {
    if (!isValidObjectId(teacherId) || !isValidObjectId(courseId)) {
      throw new Error('Invalid identifiers');
    }

    const user = await User.findById(teacherId);
    if (!user) throw new Error('Teacher not found');
    if (user.role !== UserRole.TEACHER) throw new Error('User is not a teacher');
    if ((user as any).isActive === false) throw new Error('Teacher account is not active');

    const course = await Course.findById(courseId);
    if (!course) throw new Error('Course not found');

    // Assume course.teacher references the assigned teacher
    if (!course.teacher || course.teacher.toString() !== teacherId) {
      throw new Error('Teacher is not assigned to this course');
    }

    return true;
  } catch (err) {
    throw err;
  }
}

export async function addGrade(params: AddGradeParams): Promise<IGrade> {
  try {
    const { student, course, assignment, gradeType, score, maxScore, weight, feedback, gradedBy, term, isPublished, notes } = params;

    if (!isValidObjectId(student) || !isValidObjectId(course) || !isValidObjectId(gradedBy) || (assignment && !isValidObjectId(assignment))) {
      throw new Error('Invalid identifiers');
    }

    await validateTeacherForCourse(gradedBy, course);

    const studentDoc = await User.findById(student);
    if (!studentDoc) throw new Error('Student not found');
    if (studentDoc.role !== UserRole.STUDENT) throw new Error('User is not a student');

    const courseDoc = await Course.findById(course);
    if (!courseDoc) throw new Error('Course not found');

    // Enrollment check: assume course.students is an array of user ids
    const isEnrolled = Array.isArray((courseDoc as any).students)
      ? (courseDoc as any).students.map((s: any) => s.toString()).includes(student)
      : false;
    if (!isEnrolled) throw new Error('Student is not enrolled in this course');

    if (score < 0 || score > maxScore) {
      throw new Error('Score must be between 0 and maximum score');
    }

    if (assignment) {
      const assignmentDoc = await Assignment.findById(assignment);
      if (!assignmentDoc) throw new Error('Assignment not found');
      if (assignmentDoc.course.toString() !== course) {
        throw new Error('Assignment does not belong to the specified course');
      }

      if (gradeType === GradeType.ASSIGNMENT) {
        const dup = await Grade.findOne({ assignment, student, gradeType: GradeType.ASSIGNMENT });
        if (dup) throw new Error('Assignment grade already exists for this student');
      }
    }

    const created = await Grade.create({
      student,
      course,
      assignment,
      gradeType,
      score,
      maxScore,
      weight,
      feedback,
      gradedBy,
      gradedAt: new Date(),
      term,
      isPublished,
      notes,
    } as any);

    const populated = await created
      .populate('student', 'profile.firstName profile.lastName email')
      .populate('course', 'name code')
      .populate('assignment', 'title')
      .populate('gradedBy', 'profile.firstName profile.lastName');

    return populated as unknown as IGrade;
  } catch (err) {
    throw err;
  }
}

export async function updateGrade(params: UpdateGradeParams): Promise<IGrade> {
  try {
    const { gradeId, score, maxScore, weight, feedback, isPublished, notes, updatedBy } = params;
    if (!isValidObjectId(gradeId) || !isValidObjectId(updatedBy)) {
      throw new Error('Invalid identifiers');
    }

    const grade = await Grade.findById(gradeId);
    if (!grade) throw new Error('Grade not found');

    await validateTeacherForCourse(updatedBy, grade.course.toString());

    const nextMax = typeof maxScore === 'number' ? maxScore : grade.maxScore;
    if (typeof score === 'number' && (score < 0 || score > nextMax)) {
      throw new Error('Score must be between 0 and maximum score');
    }

    const update: Record<string, unknown> = {};
    if (typeof score === 'number') update.score = score;
    if (typeof maxScore === 'number') update.maxScore = maxScore;
    if (typeof weight === 'number') update.weight = weight;
    if (typeof isPublished === 'boolean') update.isPublished = isPublished;
    if (typeof feedback === 'string') update.feedback = feedback;
    if (typeof notes === 'string') update.notes = notes;

    const updated = await Grade.findByIdAndUpdate(gradeId, update, { new: true, runValidators: true });
    const populated = await updated!
      .populate('student', 'profile.firstName profile.lastName email')
      .populate('course', 'name code')
      .populate('assignment', 'title')
      .populate('gradedBy', 'profile.firstName profile.lastName');
    return populated as unknown as IGrade;
  } catch (err) {
    throw err;
  }
}

export async function deleteGrade(gradeId: string, deletedBy: string): Promise<void> {
  try {
    if (!isValidObjectId(gradeId) || !isValidObjectId(deletedBy)) {
      throw new Error('Invalid identifiers');
    }
    const grade = await Grade.findById(gradeId);
    if (!grade) throw new Error('Grade not found');

    await validateTeacherForCourse(deletedBy, grade.course.toString());

    // Integrity: allow deletion, but systems may restrict assignment-derived grades
    await Grade.findByIdAndDelete(gradeId);
  } catch (err) {
    throw err;
  }
}

export async function syncAssignmentGrade(params: SyncAssignmentGradeParams): Promise<IGrade | null> {
  try {
    const { assignmentId, submissionId, studentId } = params;
    if (!isValidObjectId(assignmentId) || !isValidObjectId(submissionId) || !isValidObjectId(studentId)) {
      throw new Error('Invalid identifiers');
    }

    const assignment = await Assignment.findById(assignmentId);
    if (!assignment) throw new Error('Assignment not found');

    const submission = assignment.submissions?.find((s: any) => s._id.toString() === submissionId);
    if (!submission) throw new Error('Submission not found');

    if (typeof submission.grade !== 'number' || typeof submission.maxGrade !== 'number') {
      return null; // nothing to sync
    }

    const existing = await Grade.findOne({
      assignment: assignmentId,
      student: studentId,
      gradeType: GradeType.ASSIGNMENT,
    });

    const payload: Record<string, unknown> = {
      student: studentId,
      course: assignment.course,
      assignment: assignmentId,
      gradeType: GradeType.ASSIGNMENT,
      score: submission.grade,
      maxScore: submission.maxGrade,
      feedback: submission.feedback,
      gradedBy: submission.gradedBy || assignment.createdBy || assignment.teacher,
      gradedAt: submission.gradedAt || new Date(),
    };

    let result: IGrade | null = null;
    if (existing) {
      result = (await Grade.findByIdAndUpdate(existing._id, payload, { new: true })) as IGrade;
    } else {
      result = (await Grade.create(payload)) as IGrade;
    }

    if (!result) return null;
    const populated = await (result as any)
      .populate('student', 'profile.firstName profile.lastName email')
      .populate('course', 'name code')
      .populate('assignment', 'title')
      .populate('gradedBy', 'profile.firstName profile.lastName');

    return populated as IGrade;
  } catch (err) {
    throw err;
  }
}

export async function getStudentGrades(studentId: string, courseId?: string): Promise<IGrade[]> {
  try {
    if (!isValidObjectId(studentId)) throw new Error('Invalid student id');
    if (courseId) {
      if (!isValidObjectId(courseId)) throw new Error('Invalid course id');
      return Grade.findByStudentAndCourse(studentId, courseId);
    }
    return Grade.findByStudent(studentId);
  } catch (err) {
    throw err;
  }
}

export async function getCourseGrades(courseId: string): Promise<IGrade[]> {
  try {
    if (!isValidObjectId(courseId)) throw new Error('Invalid course id');
    return Grade.findByCourse(courseId);
  } catch (err) {
    throw err;
  }
}

export async function calculateCourseGrade(
  studentId: string,
  courseId: string
): Promise<{ averageScore: number; percentage: number; letterGrade: LetterGrade; gpa: number; totalGrades: number; weightedAverage: number }> {
  try {
    if (!isValidObjectId(studentId) || !isValidObjectId(courseId)) {
      throw new Error('Invalid identifiers');
    }
    const { averageScore, letterGrade, gpa, totalGrades } = await Grade.calculateCourseGrade(studentId, courseId);
    return {
      averageScore,
      percentage: averageScore,
      letterGrade,
      gpa,
      totalGrades,
      weightedAverage: averageScore,
    };
  } catch (err) {
    throw err;
  }
}

export async function calculateStudentGPA(
  studentId: string
): Promise<{
  gpa: number;
  totalCourses: number;
  totalGrades: number;
  courseGrades: Array<{ course: string; courseName: string; grade: number; letterGrade: LetterGrade; gpa: number }>;
}> {
  try {
    if (!isValidObjectId(studentId)) throw new Error('Invalid student id');

    // Compute overall
    const overall = await Grade.calculateStudentGPA(studentId);

    // Detailed per-course breakdown
    const grades = await Grade.find({ student: new mongoose.Types.ObjectId(studentId) }).populate('course', 'name');
    const byCourse = new Map<string, { name: string; gradePct: number; letter: LetterGrade; gpa: number }>();

    const courseIds = Array.from(new Set(grades.map((g) => g.course.toString())));
    for (const cid of courseIds) {
      const cg = await Grade.calculateCourseGrade(studentId, cid);
      const name = (grades.find((g) => g.course.toString() === cid) as any)?.course?.name || '';
      byCourse.set(cid, { name, gradePct: cg.averageScore, letter: cg.letterGrade, gpa: cg.gpa });
    }

    const courseGrades = Array.from(byCourse.entries()).map(([course, v]) => ({
      course,
      courseName: v.name,
      grade: v.gradePct,
      letterGrade: v.letter,
      gpa: v.gpa,
    }));

    return { gpa: overall.gpa, totalCourses: overall.totalCourses, totalGrades: overall.totalGrades, courseGrades };
  } catch (err) {
    throw err;
  }
}

export async function getGradeStatistics(
  courseId: string
): Promise<{ averageScore: number; highestScore: number; lowestScore: number; passingRate: number; gradeDistribution: Record<LetterGrade, number> }> {
  try {
    if (!isValidObjectId(courseId)) throw new Error('Invalid course id');
    const grades = await Grade.find({ course: new mongoose.Types.ObjectId(courseId) });
    if (grades.length === 0) {
      return {
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        passingRate: 0,
        gradeDistribution: {
          [LetterGrade.A_PLUS]: 0,
          [LetterGrade.A]: 0,
          [LetterGrade.A_MINUS]: 0,
          [LetterGrade.B_PLUS]: 0,
          [LetterGrade.B]: 0,
          [LetterGrade.B_MINUS]: 0,
          [LetterGrade.C_PLUS]: 0,
          [LetterGrade.C]: 0,
          [LetterGrade.C_MINUS]: 0,
          [LetterGrade.D]: 0,
          [LetterGrade.F]: 0,
        },
      };
    }

    let sumPct = 0;
    let highest = -Infinity;
    let lowest = Infinity;
    const dist: Record<LetterGrade, number> = {
      [LetterGrade.A_PLUS]: 0,
      [LetterGrade.A]: 0,
      [LetterGrade.A_MINUS]: 0,
      [LetterGrade.B_PLUS]: 0,
      [LetterGrade.B]: 0,
      [LetterGrade.B_MINUS]: 0,
      [LetterGrade.C_PLUS]: 0,
      [LetterGrade.C]: 0,
      [LetterGrade.C_MINUS]: 0,
      [LetterGrade.D]: 0,
      [LetterGrade.F]: 0,
    };

    let passCount = 0;
    for (const g of grades) {
      const pct = (g.score / g.maxScore) * 100;
      sumPct += pct;
      if (pct > highest) highest = pct;
      if (pct < lowest) lowest = pct;
      const letter = g.calculateLetterGrade();
      dist[letter] += 1;
      if (pct >= 60) passCount += 1;
    }

    const averageScore = sumPct / grades.length;
    const passingRate = grades.length > 0 ? passCount / grades.length : 0;

    return { averageScore, highestScore: highest, lowestScore: lowest, passingRate, gradeDistribution: dist };
  } catch (err) {
    throw err;
  }
}

export { GradeType, LetterGrade };


