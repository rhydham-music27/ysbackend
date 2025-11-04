import { Router } from 'express';
import authenticate from '../middlewares/auth';
import { authorize, authorizeMinRole } from '../middlewares/rbac';
import { UserRole } from '../types/enums';
import {
  createScheduleController,
  listSchedules,
  getMySchedule,
  getWeeklyTimetable,
  checkConflicts,
  getTeacherSchedules,
  getCourseSchedules,
  getDaySchedules,
  getSchedule,
  updateScheduleController,
  deleteScheduleController,
  generateClasses,
} from '../controllers/scheduleController';
import {
  createScheduleValidation,
  updateScheduleValidation,
  checkConflictsValidation,
  generateClassesValidation,
  scheduleIdParamValidation,
  teacherIdParamValidation,
  courseIdParamValidation,
  dayParamValidation,
  scheduleQueryValidation,
  handleScheduleValidationErrors,
} from '../validators/scheduleValidator';

const router = Router();

/**
 * @route   GET /api/v1/schedules/my
 * @desc    Get teaching schedule for current teacher
 * @access  Private (Teacher)
 */
router.get('/my', authenticate, authorize(UserRole.TEACHER), getMySchedule);

/**
 * @route   GET /api/v1/schedules/weekly
 * @desc    Get weekly timetable grouped by day
 * @access  Private (All authenticated users)
 * @query   { teacher?, course?, room? }
 */
router.get('/weekly', authenticate, scheduleQueryValidation, handleScheduleValidationErrors, getWeeklyTimetable);

/**
 * @route   POST /api/v1/schedules/check-conflicts
 * @desc    Check for scheduling conflicts (teacher/room)
 * @access  Private (Admin, Manager, Coordinator)
 * @body    { teacher, dayOfWeek, startTime, endTime, room?, excludeId? }
 */
router.post(
  '/check-conflicts',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.COORDINATOR),
  checkConflictsValidation,
  handleScheduleValidationErrors,
  checkConflicts
);

/**
 * @route   GET /api/v1/schedules/teachers/:id
 * @desc    Get all schedules for a specific teacher
 * @access  Private (Teacher, Coordinator, Manager, Admin)
 */
router.get(
  '/teachers/:id',
  authenticate,
  authorizeMinRole(UserRole.TEACHER),
  teacherIdParamValidation,
  handleScheduleValidationErrors,
  getTeacherSchedules
);

/**
 * @route   GET /api/v1/schedules/courses/:id
 * @desc    Get all schedules for a specific course
 * @access  Private (All authenticated users)
 */
router.get(
  '/courses/:id',
  authenticate,
  courseIdParamValidation,
  handleScheduleValidationErrors,
  getCourseSchedules
);

/**
 * @route   GET /api/v1/schedules/days/:day
 * @desc    Get all schedules for a specific day
 * @access  Private (All authenticated users)
 * @query   { room? }
 */
router.get(
  '/days/:day',
  authenticate,
  dayParamValidation,
  scheduleQueryValidation,
  handleScheduleValidationErrors,
  getDaySchedules
);

/**
 * @route   POST /api/v1/schedules
 * @desc    Create a new recurring schedule
 * @access  Private (Admin, Manager, Coordinator)
 * @body    { class, course, teacher, dayOfWeek, startTime, endTime, room?, building?, recurrenceType?, effectiveFrom?, effectiveTo?, notes? }
 */
router.post(
  '/',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.COORDINATOR),
  createScheduleValidation,
  handleScheduleValidationErrors,
  createScheduleController
);

/**
 * @route   GET /api/v1/schedules
 * @desc    List all schedules with optional filters
 * @access  Private (All authenticated users)
 * @query   { course?, teacher?, dayOfWeek?, room?, isActive? }
 */
router.get('/', authenticate, scheduleQueryValidation, handleScheduleValidationErrors, listSchedules);

/**
 * @route   GET /api/v1/schedules/:id
 * @desc    Get a single schedule by ID
 * @access  Private (All authenticated users)
 */
router.get('/:id', authenticate, scheduleIdParamValidation, handleScheduleValidationErrors, getSchedule);

/**
 * @route   PUT /api/v1/schedules/:id
 * @desc    Update a schedule
 * @access  Private (Admin, Manager, Coordinator)
 * @body    { dayOfWeek?, startTime?, endTime?, room?, building?, effectiveFrom?, effectiveTo?, isActive?, notes? }
 */
router.put(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.COORDINATOR),
  scheduleIdParamValidation,
  updateScheduleValidation,
  handleScheduleValidationErrors,
  updateScheduleController
);

/**
 * @route   DELETE /api/v1/schedules/:id
 * @desc    Delete a schedule (soft delete)
 * @access  Private (Admin, Manager)
 */
router.delete(
  '/:id',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MANAGER),
  scheduleIdParamValidation,
  handleScheduleValidationErrors,
  deleteScheduleController
);

/**
 * @route   POST /api/v1/schedules/:id/generate-classes
 * @desc    Generate Class instances from schedule template
 * @access  Private (Admin, Manager, Coordinator)
 * @body    { startDate, endDate }
 */
router.post(
  '/:id/generate-classes',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.COORDINATOR),
  scheduleIdParamValidation,
  generateClassesValidation,
  handleScheduleValidationErrors,
  generateClasses
);

export default router;


