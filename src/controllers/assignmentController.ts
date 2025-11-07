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
import { AssignmentStatus, FileCategory } from '../types/enums';
import { uploadMultipleToCloudinary, deleteFromCloudinary, extractPublicIdFromUrl } from '../utils/fileUpload';
import { notifyAssignmentGraded, notifyAssignmentDue } from '../services/notificationService';
import Course from '../models/Course';

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

    // Handle file uploads if present
    let finalAttachments = attachments || [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const uploadResults = await uploadMultipleToCloudinary(
        req.files as Express.Multer.File[],
        FileCategory.ASSIGNMENT_MATERIAL
      );
      const uploadedUrls = uploadResults.filter((r) => r.success && r.url).map((r) => r.url!);
      finalAttachments = [...(attachments || []), ...uploadedUrls];
    }

    const assignment = await createAssignment({
      title,
      description,
      course,
      teacher: (req as any).user._id.toString(),
      dueDate: new Date(dueDate),
      publishDate: publishDate ? new Date(publishDate) : undefined,
      maxGrade,
      attachments: finalAttachments,
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

    // Handle file uploads if present
    let finalAttachments = attachments || [];
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const uploadResults = await uploadMultipleToCloudinary(
        req.files as Express.Multer.File[],
        FileCategory.ASSIGNMENT_ATTACHMENT
      );
      const uploadedUrls = uploadResults.filter((r) => r.success && r.url).map((r) => r.url!);
      finalAttachments = [...(attachments || []), ...uploadedUrls];
    }

    const assignment = await submitAssignment({
      assignmentId: id,
      studentId: (req as any).user._id.toString(),
      content,
      attachments: finalAttachments,
    });
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
    
    // Trigger notification after successful grading
    const submission = assignment.submissions.find((s) => s._id?.toString() === submissionId);
    if (submission && submission.student) {
      const maxGrade = submission.maxGrade || assignment.maxGrade;
      notifyAssignmentGraded(
        submission.student.toString(),
        id,
        assignment.title,
        submission.grade || grade,
        maxGrade,
        submission.feedback || feedback
      ).catch((err) => console.error('Notification error:', err));
    }
    
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
    
    // Optional: Trigger assignment due notification if due within 24 hours
    const course = await Course.findById(assignment.course).populate('students');
    if (course && course.students && Array.isArray(course.students)) {
      const studentIds = course.students.map((s: any) => s._id.toString());
      const hoursUntilDue = (assignment.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
      
      if (hoursUntilDue > 0 && hoursUntilDue <= 24) {
        notifyAssignmentDue(id, studentIds, assignment.title, assignment.dueDate, assignment.course.toString()).catch(
          (err) => console.error('Notification error:', err)
        );
      }
    }
    
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

export async function uploadAssignmentMaterials(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const files = req.files as Express.Multer.File[] | undefined;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded' });
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    // Validate user is the assignment teacher
    if (assignment.teacher.toString() !== (req as any).user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the assignment teacher can upload materials',
      });
    }

    // Upload files to Cloudinary
    const uploadResults = await uploadMultipleToCloudinary(files, FileCategory.ASSIGNMENT_MATERIAL);
    const uploadedUrls = uploadResults.filter((r) => r.success && r.url).map((r) => r.url!);

    if (uploadedUrls.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to upload files',
      });
    }

    // Add URLs to assignment attachments
    assignment.attachments.push(...uploadedUrls);
    await assignment.save();

    return res.status(200).json({
      success: true,
      message: 'Materials uploaded successfully',
      data: { attachments: uploadedUrls, assignment },
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteAssignmentMaterial(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { fileUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ success: false, message: 'File URL is required' });
    }

    const assignment = await Assignment.findById(id);
    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    // Validate user is the assignment teacher
    if (assignment.teacher.toString() !== (req as any).user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Only the assignment teacher can delete materials',
      });
    }

    // Check if fileUrl exists in assignment attachments
    if (!assignment.attachments.includes(fileUrl)) {
      return res.status(404).json({
        success: false,
        message: 'File not found in assignment attachments',
      });
    }

    // Extract public ID and delete from Cloudinary
    const publicId = extractPublicIdFromUrl(fileUrl);
    if (publicId) {
      await deleteFromCloudinary({ publicId, resourceType: 'raw' });
    }

    // Remove URL from attachments array
    assignment.attachments = assignment.attachments.filter((url) => url !== fileUrl);
    await assignment.save();

    return res.status(200).json({
      success: true,
      message: 'Material deleted successfully',
    });
  } catch (error) {
    return next(error);
  }
}


