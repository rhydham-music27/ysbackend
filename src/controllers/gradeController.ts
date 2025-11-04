import { Request, Response, NextFunction } from 'express';
import Grade from '../models/Grade';
import {
  addGrade,
  updateGrade,
  deleteGrade,
  syncAssignmentGrade,
  getStudentGrades,
  getCourseGrades,
  calculateCourseGrade,
  calculateStudentGPA,
  getGradeStatistics,
} from '../services/gradeService';

export async function addGradeController(req: Request, res: Response, next: NextFunction) {
  try {
    const { student, course, assignment, gradeType, score, maxScore, weight, feedback, term, isPublished, notes } = req.body;
    const grade = await addGrade({
      student,
      course,
      assignment,
      gradeType,
      score,
      maxScore,
      weight,
      feedback,
      gradedBy: (req as any).user._id.toString(),
      term,
      isPublished,
      notes,
    });
    res.status(201).json({ success: true, message: 'Grade added successfully', data: { grade } });
  } catch (err) {
    next(err);
  }
}

export async function listGrades(req: Request, res: Response, next: NextFunction) {
  try {
    const { student, course, gradeType, term, isPublished } = req.query as Record<string, string>;
    const query: Record<string, unknown> = {};
    if (student) query.student = student;
    if (course) query.course = course;
    if (gradeType) query.gradeType = gradeType;
    if (term) query.term = term;
    if (typeof isPublished !== 'undefined') query.isPublished = isPublished === 'true';

    const grades = await Grade.find(query)
      .populate('student', 'profile.firstName profile.lastName email')
      .populate('course', 'name code')
      .populate('assignment', 'title')
      .populate('gradedBy', 'profile.firstName profile.lastName')
      .sort({ gradedAt: -1 });

    res.status(200).json({ success: true, data: { grades, count: grades.length } });
  } catch (err) {
    next(err);
  }
}

export async function getGrade(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const grade = await Grade.findById(id)
      .populate('student', 'profile.firstName profile.lastName email')
      .populate('course', 'name code')
      .populate('assignment', 'title dueDate')
      .populate('gradedBy', 'profile.firstName profile.lastName');
    if (!grade) return res.status(404).json({ success: false, message: 'Grade not found' });
    res.status(200).json({ success: true, data: { grade } });
  } catch (err) {
    next(err);
  }
}

export async function updateGradeController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { score, maxScore, weight, feedback, isPublished, notes } = req.body;
    const grade = await updateGrade({
      gradeId: id,
      score,
      maxScore,
      weight,
      feedback,
      isPublished,
      notes,
      updatedBy: (req as any).user._id.toString(),
    });
    res.status(200).json({ success: true, message: 'Grade updated successfully', data: { grade } });
  } catch (err) {
    next(err);
  }
}

export async function deleteGradeController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await deleteGrade(id, (req as any).user._id.toString());
    res.status(200).json({ success: true, message: 'Grade deleted successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getStudentGradesController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const courseId = req.query.course as string | undefined;
    const grades = await getStudentGrades(id, courseId);
    res.status(200).json({ success: true, data: { grades, count: grades.length } });
  } catch (err) {
    next(err);
  }
}

export async function getMyGrades(req: Request, res: Response, next: NextFunction) {
  try {
    const courseId = req.query.course as string | undefined;
    const grades = await getStudentGrades((req as any).user._id.toString(), courseId);
    res.status(200).json({ success: true, data: { grades, count: grades.length } });
  } catch (err) {
    next(err);
  }
}

export async function getCourseGradesController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const grades = await getCourseGrades(id);
    res.status(200).json({ success: true, data: { grades, count: grades.length } });
  } catch (err) {
    next(err);
  }
}

export async function getStudentCourseGrade(req: Request, res: Response, next: NextFunction) {
  try {
    const { studentId, courseId } = req.params as { studentId: string; courseId: string };
    const courseGrade = await calculateCourseGrade(studentId, courseId);
    res.status(200).json({ success: true, data: { courseGrade } });
  } catch (err) {
    next(err);
  }
}

export async function getMyCourseGrade(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const courseGrade = await calculateCourseGrade((req as any).user._id.toString(), id);
    res.status(200).json({ success: true, data: { courseGrade } });
  } catch (err) {
    next(err);
  }
}

export async function getStudentGPAController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const gpaData = await calculateStudentGPA(id);
    res.status(200).json({ success: true, data: { gpa: gpaData } });
  } catch (err) {
    next(err);
  }
}

export async function getMyGPA(req: Request, res: Response, next: NextFunction) {
  try {
    const gpaData = await calculateStudentGPA((req as any).user._id.toString());
    res.status(200).json({ success: true, data: { gpa: gpaData } });
  } catch (err) {
    next(err);
  }
}

export async function getCourseGradeStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const stats = await getGradeStatistics(id);
    res.status(200).json({ success: true, data: { stats } });
  } catch (err) {
    next(err);
  }
}

export async function syncAssignmentGradeController(req: Request, res: Response, next: NextFunction) {
  try {
    const { assignmentId, submissionId, studentId } = req.body as { assignmentId: string; submissionId: string; studentId: string };
    const grade = await syncAssignmentGrade({ assignmentId, submissionId, studentId });
    res.status(200).json({ success: true, message: 'Assignment grade synced to grade book', data: { grade } });
  } catch (err) {
    next(err);
  }
}


