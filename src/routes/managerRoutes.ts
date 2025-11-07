import { Router } from 'express';
import authenticate from '../middlewares/auth';
import { authorizeMinRole } from '../middlewares/rbac';
import { UserRole } from '../types/enums';
import {
  approveCourseController,
  rejectCourseController,
  approveScheduleController,
  rejectScheduleController,
  getPendingApprovals,
  getTeacherPerformance,
  getAllTeachersPerformanceController,
  getManagerDashboardController,
  getCourseStats,
} from '../controllers/managerController';
import { assignCoordinatorToClass } from '../controllers/coordinatorController';
import { notifyTeacherOfClassAssignment } from '../controllers/managerController';
import { createClass } from '../controllers/classController';
import {
  approvalNotesValidation,
  rejectNotesValidation,
  courseIdParamValidation,
  scheduleIdParamValidation,
  teacherIdParamValidation,
  handleManagerValidationErrors,
} from '../validators/managerValidator';
import { assignCoordinatorValidation, classIdParamValidation as coordinatorClassIdParamValidation, handleCoordinatorValidationErrors } from '../validators/coordinatorValidator';
import { createClassValidation, handleClassValidationErrors } from '../validators/classValidator';

const router = Router();

/**
 * @swagger
 * /api/v1/manager/dashboard:
 *   get:
 *     summary: Get manager dashboard with pending approvals and statistics
 *     tags: [Manager]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Manager dashboard data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager or Admin only
 */
router.get('/dashboard', authenticate, authorizeMinRole(UserRole.MANAGER), getManagerDashboardController);

/**
 * @swagger
 * /api/v1/manager/course-stats:
 *   get:
 *     summary: Get course statistics for manager overview
 *     tags: [Manager]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Course statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager or Admin only
 */
router.get('/course-stats', authenticate, authorizeMinRole(UserRole.MANAGER), getCourseStats);

/**
 * @swagger
 * /api/v1/manager/classes:
 *   post:
 *     summary: Create a class session (manager/admin)
 *     tags: [Manager]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Class created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager or Admin only
 */
router.post(
  '/classes',
  authenticate,
  authorizeMinRole(UserRole.MANAGER),
  createClassValidation,
  handleClassValidationErrors,
  createClass
);

/**
 * @swagger
 * /api/v1/manager/approvals/pending:
 *   get:
 *     summary: Get all pending course and schedule approvals
 *     tags: [Manager]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Pending approvals
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager or Admin only
 */
router.get('/approvals/pending', authenticate, authorizeMinRole(UserRole.MANAGER), getPendingApprovals);

/**
 * @swagger
 * /api/v1/manager/teachers/performance:
 *   get:
 *     summary: Get performance metrics for all teachers
 *     tags: [Manager]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All teachers performance metrics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager or Admin only
 */
router.get('/teachers/performance', authenticate, authorizeMinRole(UserRole.MANAGER), getAllTeachersPerformanceController);

/**
 * @swagger
 * /api/v1/manager/courses/{id}/approve:
 *   patch:
 *     summary: Approve a course creation request
 *     tags: [Manager]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               approvalNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Course approved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager or Admin only
 *       404:
 *         description: Course not found
 */
router.patch(
  '/courses/:id/approve',
  authenticate,
  authorizeMinRole(UserRole.MANAGER),
  courseIdParamValidation,
  approvalNotesValidation,
  handleManagerValidationErrors,
  approveCourseController
);

/**
 * @swagger
 * /api/v1/manager/courses/{id}/reject:
 *   patch:
 *     summary: Reject a course creation request
 *     tags: [Manager]
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
 *             required: [approvalNotes]
 *             properties:
 *               approvalNotes:
 *                 type: string
 *                 description: Rejection reason (required)
 *     responses:
 *       200:
 *         description: Course rejected successfully
 *       400:
 *         description: Validation error - approvalNotes required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager or Admin only
 *       404:
 *         description: Course not found
 */
router.patch(
  '/courses/:id/reject',
  authenticate,
  authorizeMinRole(UserRole.MANAGER),
  courseIdParamValidation,
  rejectNotesValidation,
  handleManagerValidationErrors,
  rejectCourseController
);

/**
 * @swagger
 * /api/v1/manager/schedules/{id}/approve:
 *   patch:
 *     summary: Approve a schedule creation/change request
 *     tags: [Manager]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               approvalNotes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Schedule approved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager or Admin only
 *       404:
 *         description: Schedule not found
 */
router.patch(
  '/schedules/:id/approve',
  authenticate,
  authorizeMinRole(UserRole.MANAGER),
  scheduleIdParamValidation,
  approvalNotesValidation,
  handleManagerValidationErrors,
  approveScheduleController
);

/**
 * @swagger
 * /api/v1/manager/schedules/{id}/reject:
 *   patch:
 *     summary: Reject a schedule creation/change request
 *     tags: [Manager]
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
 *             required: [approvalNotes]
 *             properties:
 *               approvalNotes:
 *                 type: string
 *                 description: Rejection reason (required)
 *     responses:
 *       200:
 *         description: Schedule rejected successfully
 *       400:
 *         description: Validation error - approvalNotes required
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager or Admin only
 *       404:
 *         description: Schedule not found
 */
router.patch(
  '/schedules/:id/reject',
  authenticate,
  authorizeMinRole(UserRole.MANAGER),
  scheduleIdParamValidation,
  rejectNotesValidation,
  handleManagerValidationErrors,
  rejectScheduleController
);

/**
 * @swagger
 * /api/v1/manager/teachers/{id}/performance:
 *   get:
 *     summary: Get performance metrics for a specific teacher
 *     tags: [Manager]
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
 *         description: Teacher performance metrics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager or Admin only
 *       404:
 *         description: Teacher not found
 */
router.get(
  '/teachers/:id/performance',
  authenticate,
  authorizeMinRole(UserRole.MANAGER),
  teacherIdParamValidation,
  handleManagerValidationErrors,
  getTeacherPerformance
);

/**
 * @swagger
 * /api/v1/manager/classes/{id}/assign-coordinator:
 *   patch:
 *     summary: Assign a coordinator to a class (manager/admin only)
 *     tags: [Manager]
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
 *             required: [coordinatorId]
 *             properties:
 *               coordinatorId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Coordinator assigned successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager or Admin only
 *       404:
 *         description: Class or coordinator not found
 */
router.patch(
  '/classes/:id/assign-coordinator',
  authenticate,
  authorizeMinRole(UserRole.MANAGER),
  coordinatorClassIdParamValidation,
  assignCoordinatorValidation,
  handleCoordinatorValidationErrors,
  assignCoordinatorToClass
);

/**
 * @swagger
 * /api/v1/manager/classes/{id}/notify-teacher:
 *   post:
 *     summary: Notify the assigned teacher for a class to select weekdays
 *     tags: [Manager]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               teacherId:
 *                 type: string
 *                 description: Explicit teacher ID (optional). If omitted, uses class.teacher.
 *     responses:
 *       201:
 *         description: Notification sent to teacher
 *       400:
 *         description: No teacher assigned
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager or Admin only
 *       404:
 *         description: Class not found
 */
router.post(
  '/classes/:id/notify-teacher',
  authenticate,
  authorizeMinRole(UserRole.MANAGER),
  notifyTeacherOfClassAssignment
);

export default router;

