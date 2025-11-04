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
import {
  approvalNotesValidation,
  rejectNotesValidation,
  courseIdParamValidation,
  scheduleIdParamValidation,
  teacherIdParamValidation,
  handleManagerValidationErrors,
} from '../validators/managerValidator';

const router = Router();

/**
 * @route   GET /api/v1/manager/dashboard
 * @desc    Get manager dashboard with pending approvals and statistics
 * @access  Private (Manager, Admin)
 */
router.get('/dashboard', authenticate, authorizeMinRole(UserRole.MANAGER), getManagerDashboardController);

/**
 * @route   GET /api/v1/manager/course-stats
 * @desc    Get course statistics for manager overview
 * @access  Private (Manager, Admin)
 */
router.get('/course-stats', authenticate, authorizeMinRole(UserRole.MANAGER), getCourseStats);

/**
 * @route   GET /api/v1/manager/approvals/pending
 * @desc    Get all pending course and schedule approvals
 * @access  Private (Manager, Admin)
 */
router.get('/approvals/pending', authenticate, authorizeMinRole(UserRole.MANAGER), getPendingApprovals);

/**
 * @route   GET /api/v1/manager/teachers/performance
 * @desc    Get performance metrics for all teachers
 * @access  Private (Manager, Admin)
 */
router.get('/teachers/performance', authenticate, authorizeMinRole(UserRole.MANAGER), getAllTeachersPerformanceController);

/**
 * @route   PATCH /api/v1/manager/courses/:id/approve
 * @desc    Approve a course creation request
 * @access  Private (Manager, Admin)
 * @body    { approvalNotes? }
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
 * @route   PATCH /api/v1/manager/courses/:id/reject
 * @desc    Reject a course creation request
 * @access  Private (Manager, Admin)
 * @body    { approvalNotes } (required - rejection reason)
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
 * @route   PATCH /api/v1/manager/schedules/:id/approve
 * @desc    Approve a schedule creation/change request
 * @access  Private (Manager, Admin)
 * @body    { approvalNotes? }
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
 * @route   PATCH /api/v1/manager/schedules/:id/reject
 * @desc    Reject a schedule creation/change request
 * @access  Private (Manager, Admin)
 * @body    { approvalNotes } (required - rejection reason)
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
 * @route   GET /api/v1/manager/teachers/:id/performance
 * @desc    Get performance metrics for a specific teacher
 * @access  Private (Manager, Admin)
 */
router.get(
  '/teachers/:id/performance',
  authenticate,
  authorizeMinRole(UserRole.MANAGER),
  teacherIdParamValidation,
  handleManagerValidationErrors,
  getTeacherPerformance
);

export default router;

