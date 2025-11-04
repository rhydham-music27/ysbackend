import { Request, Response, NextFunction } from 'express';
import Assignment from '../models/Assignment';
import {
  createAssignment,
  submitAssignment,
  gradeSubmission,
  updateAssignment,
  deleteAssignment,
  getAssignmentStatistics,
  getStudentAssignments,
  checkDeadline,
} from '../services/assignmentService';
import { AssignmentStatus } from '../types/enums';

export async function createAssignmentController(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      title,
      description,
      course,
      dueDate,
      publishDate,
      maxGrade,
      attachments,
      instructions,
      allowLateSubmission,
      lateSubmissionPenalty,
    } = req.body;

    const assignment = await createAssignment({
      title,
      description,
      course,
      teacher: (req as any).user._id.toString(),
      dueDate: new Date(dueDate),
      publishDate: publishDate ? new Date(publishDate) : undefined,
      maxGrade,
      attachments,
      instructions,
      allowLateSubmission,
      lateSubmissionPenalty,
    });

    res.status(201).json({ success: true, message: 'Assignment created successfully', data: { assignment } });
  } catch (error) {
    next(error);
  }
}

export async function listAssignments(req: Request, res: Response, next: NextFunction) {
  try {
    const { course, status, teacher, dueAfter, dueBefore } = req.query as Record<string, string>;
    const query: Record<string, unknown> = {};
    if (course) query.course = course;
    if (status) query.status = status;
    if (teacher) query.teacher = teacher;
    if (dueAfter || dueBefore) {
      query.dueDate = {} as any;
      if (dueAfter) (query.dueDate as any).$gte = new Date(dueAfter);
      if (dueBefore) (query.dueDate as any).$lte = new Date(dueBefore);
    }

    const assignments = await Assignment.find(query)
      .populate('teacher', 'profile.firstName profile.lastName email')
      .populate('course', 'name code')
      .sort({ dueDate: 1 });

    res.status(200).json({ success: true, data: { assignments, count: assignments.length } });
  } catch (error) {
    next(error);
  }
}

export async function getAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findById(id)
      .populate('teacher', 'profile.firstName profile.lastName email')
      .populate('course', 'name code')
      .populate('submissions.student', 'profile.firstName profile.lastName email')
      .populate('submissions.gradedBy', 'profile.firstName profile.lastName');

    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found' });
    res.status(200).json({ success: true, data: { assignment } });
  } catch (error) {
    next(error);
  }
}

export async function updateAssignmentController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const assignment = await updateAssignment({ assignmentId: id, updates: req.body, updatedBy: (req as any).user._id.toString() });
    res.status(200).json({ success: true, message: 'Assignment updated successfully', data: { assignment } });
  } catch (error) {
    next(error);
  }
}

export async function deleteAssignmentController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await deleteAssignment(id, (req as any).user._id.toString());
    res.status(200).json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function submitAssignmentController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { content, attachments } = req.body;
    const assignment = await submitAssignment({ assignmentId: id, studentId: (req as any).user._id.toString(), content, attachments });
    res.status(201).json({ success: true, message: 'Assignment submitted successfully', data: { assignment } });
  } catch (error) {
    next(error);
  }
}

export async function gradeSubmissionController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, submissionId } = req.params as { id: string; submissionId: string };
    const { grade, feedback } = req.body as { grade: number; feedback?: string };
    const assignment = await gradeSubmission({ assignmentId: id, submissionId, grade, feedback, gradedBy: (req as any).user._id.toString() });
    res.status(200).json({ success: true, message: 'Submission graded successfully', data: { assignment } });
  } catch (error) {
    next(error);
  }
}

export async function getMyAssignments(req: Request, res: Response, next: NextFunction) {
  try {
    const { course } = req.query as Record<string, string>;
    const assignments = await getStudentAssignments((req as any).user._id.toString(), course);
    res.status(200).json({ success: true, data: { assignments, count: assignments.length } });
  } catch (error) {
    next(error);
  }
}

export async function getMySubmission(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const assignment = await Assignment.findById(id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Submission not found' });
    const submission = assignment.getSubmission((req as any).user._id.toString());
    if (!submission) return res.status(404).json({ success: false, message: 'Submission not found' });
    res.status(200).json({ success: true, data: { submission } });
  } catch (error) {
    next(error);
  }
}

export async function getAssignmentStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const stats = await getAssignmentStatistics(id);
    res.status(200).json({ success: true, data: { stats } });
  } catch (error) {
    next(error);
  }
}

export async function checkAssignmentDeadline(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const deadline = await checkDeadline(id);
    res.status(200).json({ success: true, data: { deadline } });
  } catch (error) {
    next(error);
  }
}

export async function publishAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const assignment = await updateAssignment({ assignmentId: id, updates: { status: AssignmentStatus.PUBLISHED } as any, updatedBy: (req as any).user._id.toString() });
    res.status(200).json({ success: true, message: 'Assignment published successfully', data: { assignment } });
  } catch (error) {
    next(error);
  }
}

export async function closeAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const assignment = await updateAssignment({ assignmentId: id, updates: { status: AssignmentStatus.CLOSED } as any, updatedBy: (req as any).user._id.toString() });
    res.status(200).json({ success: true, message: 'Assignment closed successfully', data: { assignment } });
  } catch (error) {
    next(error);
  }
}


