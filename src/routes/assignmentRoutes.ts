import { Router } from 'express';
import authenticate from '../middlewares/auth';
import { authorize, authorizeMinRole } from '../middlewares/rbac';
import { UserRole } from '../types/enums';
import { uploadDocuments } from '../middlewares/upload';
import {
  createAssignmentController,
  listAssignments,
  getAssignment,
  updateAssignmentController,
  deleteAssignmentController,
  submitAssignmentController,
  gradeSubmissionController,
  getMyAssignments,
  getMySubmission,
  getAssignmentStats,
  checkAssignmentDeadline,
  publishAssignment,
  closeAssignment,
  uploadAssignmentMaterials,
  deleteAssignmentMaterial,
} from '../controllers/assignmentController';
import {
  createAssignmentValidation,
  updateAssignmentValidation,
  submitAssignmentValidation,
  gradeSubmissionValidation,
  assignmentIdParamValidation,
  submissionIdParamValidation,
  assignmentQueryValidation,
  handleAssignmentValidationErrors,
  deleteAssignmentMaterialValidation,
} from '../validators/assignmentValidator';

const router = Router();

/**
 * @route   GET /api/v1/assignments/my
 * @desc    Get assignments for current student's enrolled courses
 * @access  Private (Student)
 */
router.get('/my', authenticate, authorize(UserRole.STUDENT), assignmentQueryValidation, handleAssignmentValidationErrors, getMyAssignments);

/**
 * @route   GET /api/v1/assignments/:id/my-submission
 * @desc    Get current student's submission for an assignment
 * @access  Private (Student)
 */
router.get('/:id/my-submission', authenticate, authorize(UserRole.STUDENT), assignmentIdParamValidation, handleAssignmentValidationErrors, getMySubmission);

/**
 * @route   GET /api/v1/assignments/:id/stats
 * @desc    Get assignment statistics (submissions, grades, etc.)
 * @access  Private (Teacher, Manager, Admin)
 */
router.get('/:id/stats', authenticate, authorizeMinRole(UserRole.TEACHER), assignmentIdParamValidation, handleAssignmentValidationErrors, getAssignmentStats);

/**
 * @route   GET /api/v1/assignments/:id/deadline
 * @desc    Check assignment deadline status
 * @access  Private (All authenticated users)
 */
router.get('/:id/deadline', authenticate, assignmentIdParamValidation, handleAssignmentValidationErrors, checkAssignmentDeadline);

/**
 * @route   PATCH /api/v1/assignments/:id/publish
 * @desc    Publish an assignment (make it visible to students)
 * @access  Private (Teacher)
 */
router.patch('/:id/publish', authenticate, authorize(UserRole.TEACHER), assignmentIdParamValidation, handleAssignmentValidationErrors, publishAssignment);

/**
 * @route   PATCH /api/v1/assignments/:id/close
 * @desc    Close an assignment (stop accepting submissions)
 * @access  Private (Teacher)
 */
router.patch('/:id/close', authenticate, authorize(UserRole.TEACHER), assignmentIdParamValidation, handleAssignmentValidationErrors, closeAssignment);

/**
 * @route   POST /api/v1/assignments/:id/materials
 * @desc    Upload additional materials to an existing assignment
 * @access  Private (Teacher)
 * @body    multipart/form-data with 'materials' field (documents, max 10 files, 10MB each)
 */
router.post(
  '/:id/materials',
  authenticate,
  authorize(UserRole.TEACHER),
  uploadDocuments('materials', 10),
  assignmentIdParamValidation,
  handleAssignmentValidationErrors,
  uploadAssignmentMaterials
);

/**
 * @route   DELETE /api/v1/assignments/:id/materials
 * @desc    Delete a material file from an assignment
 * @access  Private (Teacher)
 * @body    { fileUrl }
 */
router.delete(
  '/:id/materials',
  authenticate,
  authorize(UserRole.TEACHER),
  assignmentIdParamValidation,
  deleteAssignmentMaterialValidation,
  handleAssignmentValidationErrors,
  deleteAssignmentMaterial
);

/**
 * @route   POST /api/v1/assignments/:id/submit
 * @desc    Submit an assignment
 * @access  Private (Student)
 */
router.post(
  '/:id/submit',
  authenticate,
  authorize(UserRole.STUDENT),
  uploadDocuments('attachments', 5),
  assignmentIdParamValidation,
  submitAssignmentValidation,
  handleAssignmentValidationErrors,
  submitAssignmentController
);

/**
 * @route   POST /api/v1/assignments/:id/submissions/:submissionId/grade
 * @desc    Grade a student's submission
 * @access  Private (Teacher)
 */
router.post(
  '/:id/submissions/:submissionId/grade',
  authenticate,
  authorize(UserRole.TEACHER),
  assignmentIdParamValidation,
  submissionIdParamValidation,
  gradeSubmissionValidation,
  handleAssignmentValidationErrors,
  gradeSubmissionController
);

/**
 * @route   POST /api/v1/assignments
 * @desc    Create a new assignment
 * @access  Private (Teacher)
 */
router.post(
  '/',
  authenticate,
  authorize(UserRole.TEACHER),
  uploadDocuments('materials', 5),
  createAssignmentValidation,
  handleAssignmentValidationErrors,
  createAssignmentController
);

/**
 * @route   GET /api/v1/assignments
 * @desc    List all assignments with optional filters
 * @access  Private (All authenticated users)
 */
router.get('/', authenticate, assignmentQueryValidation, handleAssignmentValidationErrors, listAssignments);

/**
 * @route   GET /api/v1/assignments/:id
 * @desc    Get a single assignment by ID
 * @access  Private (All authenticated users)
 */
router.get('/:id', authenticate, assignmentIdParamValidation, handleAssignmentValidationErrors, getAssignment);

/**
 * @route   PUT /api/v1/assignments/:id
 * @desc    Update an assignment
 * @access  Private (Teacher)
 */
router.put('/:id', authenticate, authorize(UserRole.TEACHER), assignmentIdParamValidation, updateAssignmentValidation, handleAssignmentValidationErrors, updateAssignmentController);

/**
 * @route   DELETE /api/v1/assignments/:id
 * @desc    Delete an assignment (only if no submissions exist)
 * @access  Private (Teacher)
 */
router.delete('/:id', authenticate, authorize(UserRole.TEACHER), assignmentIdParamValidation, handleAssignmentValidationErrors, deleteAssignmentController);

export default router;


