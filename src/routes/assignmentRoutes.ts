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
 * @swagger
 * /api/v1/assignments/my:
 *   get:
 *     summary: Get assignments for current student's enrolled courses
 *     tags: [Assignments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: course
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, closed, graded]
 *     responses:
 *       200:
 *         description: List of assignments
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Student only
 */
router.get('/my', authenticate, authorize(UserRole.STUDENT), assignmentQueryValidation, handleAssignmentValidationErrors, getMyAssignments);

/**
 * @swagger
 * /api/v1/assignments/{id}/my-submission:
 *   get:
 *     summary: Get current student's submission for an assignment
 *     tags: [Assignments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student's submission
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Student only
 *       404:
 *         description: Assignment or submission not found
 */
router.get('/:id/my-submission', authenticate, authorize(UserRole.STUDENT), assignmentIdParamValidation, handleAssignmentValidationErrors, getMySubmission);

/**
 * @swagger
 * /api/v1/assignments/{id}/stats:
 *   get:
 *     summary: Get assignment statistics (submissions, grades, etc.)
 *     tags: [Assignments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assignment statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Teacher, Manager, or Admin role
 *       404:
 *         description: Assignment not found
 */
router.get('/:id/stats', authenticate, authorizeMinRole(UserRole.TEACHER), assignmentIdParamValidation, handleAssignmentValidationErrors, getAssignmentStats);

/**
 * @swagger
 * /api/v1/assignments/{id}/deadline:
 *   get:
 *     summary: Check assignment deadline status
 *     tags: [Assignments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deadline status information
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Assignment not found
 */
router.get('/:id/deadline', authenticate, assignmentIdParamValidation, handleAssignmentValidationErrors, checkAssignmentDeadline);

/**
 * @swagger
 * /api/v1/assignments/{id}/publish:
 *   patch:
 *     summary: Publish an assignment (make it visible to students)
 *     tags: [Assignments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assignment published successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Teacher only
 *       404:
 *         description: Assignment not found
 */
router.patch('/:id/publish', authenticate, authorize(UserRole.TEACHER), assignmentIdParamValidation, handleAssignmentValidationErrors, publishAssignment);

/**
 * @swagger
 * /api/v1/assignments/{id}/close:
 *   patch:
 *     summary: Close an assignment (stop accepting submissions)
 *     tags: [Assignments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assignment closed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Teacher only
 *       404:
 *         description: Assignment not found
 */
router.patch('/:id/close', authenticate, authorize(UserRole.TEACHER), assignmentIdParamValidation, handleAssignmentValidationErrors, closeAssignment);

/**
 * @swagger
 * /api/v1/assignments/{id}/materials:
 *   post:
 *     summary: Upload additional materials to an existing assignment
 *     tags: [Assignments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               materials:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Materials uploaded successfully
 *       400:
 *         description: Validation error or invalid file type
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Teacher only
 *       404:
 *         description: Assignment not found
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
 * @swagger
 * /api/v1/assignments/{id}/materials:
 *   delete:
 *     summary: Delete a material file from an assignment
 *     tags: [Assignments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fileUrl]
 *             properties:
 *               fileUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Material deleted successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Teacher only
 *       404:
 *         description: Assignment or file not found
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
 * @swagger
 * /api/v1/assignments/{id}/submit:
 *   post:
 *     summary: Submit an assignment
 *     tags: [Assignments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Assignment submitted successfully
 *       400:
 *         description: Validation error or deadline passed
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Student only
 *       404:
 *         description: Assignment not found
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
 * @swagger
 * /api/v1/assignments/{id}/submissions/{submissionId}/grade:
 *   post:
 *     summary: Grade a student's submission
 *     tags: [Assignments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GradeSubmissionRequest'
 *     responses:
 *       200:
 *         description: Submission graded successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Teacher only
 *       404:
 *         description: Assignment or submission not found
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
 * @swagger
 * /api/v1/assignments:
 *   post:
 *     summary: Create a new assignment
 *     tags: [Assignments]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [title, description, course, dueDate, maxGrade]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               course:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               publishDate:
 *                 type: string
 *                 format: date-time
 *               maxGrade:
 *                 type: number
 *               instructions:
 *                 type: string
 *               allowLateSubmission:
 *                 type: boolean
 *               lateSubmissionPenalty:
 *                 type: number
 *               materials:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Assignment created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Teacher only
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
 * @swagger
 * /api/v1/assignments:
 *   get:
 *     summary: List all assignments with optional filters
 *     tags: [Assignments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: course
 *         schema:
 *           type: string
 *       - in: query
 *         name: teacher
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, published, closed, graded]
 *     responses:
 *       200:
 *         description: List of assignments
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, assignmentQueryValidation, handleAssignmentValidationErrors, listAssignments);

/**
 * @swagger
 * /api/v1/assignments/{id}:
 *   get:
 *     summary: Get a single assignment by ID
 *     tags: [Assignments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assignment details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AssignmentResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Assignment not found
 */
router.get('/:id', authenticate, assignmentIdParamValidation, handleAssignmentValidationErrors, getAssignment);

/**
 * @swagger
 * /api/v1/assignments/{id}:
 *   put:
 *     summary: Update an assignment
 *     tags: [Assignments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAssignmentRequest'
 *     responses:
 *       200:
 *         description: Assignment updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Teacher only
 *       404:
 *         description: Assignment not found
 */
router.put('/:id', authenticate, authorize(UserRole.TEACHER), assignmentIdParamValidation, updateAssignmentValidation, handleAssignmentValidationErrors, updateAssignmentController);

/**
 * @swagger
 * /api/v1/assignments/{id}:
 *   delete:
 *     summary: Delete an assignment (only if no submissions exist)
 *     tags: [Assignments]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Assignment deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Teacher only
 *       404:
 *         description: Assignment not found
 *       409:
 *         description: Cannot delete assignment with submissions
 */
router.delete('/:id', authenticate, authorize(UserRole.TEACHER), assignmentIdParamValidation, handleAssignmentValidationErrors, deleteAssignmentController);

export default router;


