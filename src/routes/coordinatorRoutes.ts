import { Router } from 'express';
import authenticate from '../middlewares/auth';
import { authorize, authorizeMinRole } from '../middlewares/rbac';
import { UserRole } from '../types/enums';
import {
  getCoordinatorDashboardController,
  getMyAssignedClasses,
  getMySchedule,
  getClassAttendance,
  getClassStudents,
  sendClassAnnouncement,
  assignCoordinatorToClass,
} from '../controllers/coordinatorController';
import {
  assignCoordinatorValidation,
  sendAnnouncementValidation,
  classIdParamValidation,
  coordinatorQueryValidation,
  handleCoordinatorValidationErrors,
} from '../validators/coordinatorValidator';

const router = Router();

/**
 * @route   GET /api/v1/coordinator/dashboard
 * @desc    Get coordinator dashboard with assigned classes overview
 * @access  Private (Coordinator)
 */
router.get('/dashboard', authenticate, authorize(UserRole.COORDINATOR), getCoordinatorDashboardController);

/**
 * @route   GET /api/v1/coordinator/classes
 * @desc    Get classes assigned to current coordinator
 * @access  Private (Coordinator)
 * @query   { status?, startDate?, endDate? }
 */
router.get('/classes', authenticate, authorize(UserRole.COORDINATOR), coordinatorQueryValidation, handleCoordinatorValidationErrors, getMyAssignedClasses);

/**
 * @route   GET /api/v1/coordinator/schedule
 * @desc    Get weekly schedule for coordinator's assigned classes
 * @access  Private (Coordinator)
 */
router.get('/schedule', authenticate, authorize(UserRole.COORDINATOR), getMySchedule);

/**
 * @route   GET /api/v1/coordinator/classes/:id/attendance
 * @desc    Get attendance overview for an assigned class
 * @access  Private (Coordinator - assigned classes only)
 */
router.get('/classes/:id/attendance', authenticate, authorize(UserRole.COORDINATOR), classIdParamValidation, handleCoordinatorValidationErrors, getClassAttendance);

/**
 * @route   GET /api/v1/coordinator/classes/:id/students
 * @desc    Get student list for an assigned class
 * @access  Private (Coordinator - assigned classes only)
 */
router.get('/classes/:id/students', authenticate, authorize(UserRole.COORDINATOR), classIdParamValidation, handleCoordinatorValidationErrors, getClassStudents);

/**
 * @route   POST /api/v1/coordinator/classes/:id/announcement
 * @desc    Send announcement to students in assigned class
 * @access  Private (Coordinator - assigned classes only)
 * @body    { title, message, studentIds? }
 */
router.post('/classes/:id/announcement', authenticate, authorize(UserRole.COORDINATOR), classIdParamValidation, sendAnnouncementValidation, handleCoordinatorValidationErrors, sendClassAnnouncement);

/**
 * @route   PATCH /api/v1/coordinator/classes/:id/assign
 * @desc    Assign a coordinator to a class
 * @access  Private (Manager, Admin)
 * @body    { coordinatorId }
 */
router.patch('/classes/:id/assign', authenticate, authorizeMinRole(UserRole.MANAGER), classIdParamValidation, assignCoordinatorValidation, handleCoordinatorValidationErrors, assignCoordinatorToClass);

export default router;

