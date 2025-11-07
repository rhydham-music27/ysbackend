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
 * @swagger
 * /api/v1/schedules/my:
 *   get:
 *     summary: Get teaching schedule for current teacher
 *     tags: [Schedules]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Teacher's schedule
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Teacher only
 */
router.get('/my', authenticate, authorize(UserRole.TEACHER), getMySchedule);

/**
 * @swagger
 * /api/v1/schedules/weekly:
 *   get:
 *     summary: Get weekly timetable grouped by day
 *     tags: [Schedules]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: teacher
 *         schema:
 *           type: string
 *       - in: query
 *         name: course
 *         schema:
 *           type: string
 *       - in: query
 *         name: room
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Weekly timetable
 *       401:
 *         description: Unauthorized
 */
router.get('/weekly', authenticate, scheduleQueryValidation, handleScheduleValidationErrors, getWeeklyTimetable);

/**
 * @swagger
 * /api/v1/schedules/check-conflicts:
 *   post:
 *     summary: Check for scheduling conflicts (teacher/room)
 *     tags: [Schedules]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [teacher, dayOfWeek, startTime, endTime]
 *             properties:
 *               teacher:
 *                 type: string
 *               dayOfWeek:
 *                 type: string
 *                 enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *               room:
 *                 type: string
 *               excludeId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Conflict check results
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Admin, Manager, or Coordinator role
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
 * @swagger
 * /api/v1/schedules/teachers/{id}:
 *   get:
 *     summary: Get all schedules for a specific teacher
 *     tags: [Schedules]
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
 *         description: Teacher's schedules
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Teacher, Coordinator, Manager, or Admin role
 *       404:
 *         description: Teacher not found
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
 * @swagger
 * /api/v1/schedules/courses/{id}:
 *   get:
 *     summary: Get all schedules for a specific course
 *     tags: [Schedules]
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
 *         description: Course schedules
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.get(
  '/courses/:id',
  authenticate,
  courseIdParamValidation,
  handleScheduleValidationErrors,
  getCourseSchedules
);

/**
 * @swagger
 * /api/v1/schedules/days/{day}:
 *   get:
 *     summary: Get all schedules for a specific day
 *     tags: [Schedules]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: day
 *         required: true
 *         schema:
 *           type: string
 *           enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *       - in: query
 *         name: room
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Day schedules
 *       401:
 *         description: Unauthorized
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
 * @swagger
 * /api/v1/schedules:
 *   post:
 *     summary: Create a new recurring schedule
 *     tags: [Schedules]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [class, course, teacher, dayOfWeek, startTime, endTime]
 *             properties:
 *               class:
 *                 type: string
 *               course:
 *                 type: string
 *               teacher:
 *                 type: string
 *               dayOfWeek:
 *                 type: string
 *                 enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *               room:
 *                 type: string
 *               building:
 *                 type: string
 *               recurrenceType:
 *                 type: string
 *                 enum: [weekly, biweekly, custom]
 *               effectiveFrom:
 *                 type: string
 *                 format: date
 *               effectiveTo:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Schedule created successfully
 *       400:
 *         description: Validation error or conflict detected
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Admin, Manager, or Coordinator role
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
 * @swagger
 * /api/v1/schedules:
 *   get:
 *     summary: List all schedules with optional filters
 *     tags: [Schedules]
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
 *         name: dayOfWeek
 *         schema:
 *           type: string
 *           enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *       - in: query
 *         name: room
 *         schema:
 *           type: string
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of schedules
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, scheduleQueryValidation, handleScheduleValidationErrors, listSchedules);

/**
 * @swagger
 * /api/v1/schedules/{id}:
 *   get:
 *     summary: Get a single schedule by ID
 *     tags: [Schedules]
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
 *         description: Schedule details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Schedule not found
 */
router.get('/:id', authenticate, scheduleIdParamValidation, handleScheduleValidationErrors, getSchedule);

/**
 * @swagger
 * /api/v1/schedules/{id}:
 *   put:
 *     summary: Update a schedule
 *     tags: [Schedules]
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
 *             properties:
 *               dayOfWeek:
 *                 type: string
 *                 enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *               room:
 *                 type: string
 *               building:
 *                 type: string
 *               effectiveFrom:
 *                 type: string
 *                 format: date
 *               effectiveTo:
 *                 type: string
 *                 format: date
 *               isActive:
 *                 type: boolean
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Schedule updated successfully
 *       400:
 *         description: Validation error or conflict detected
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Admin, Manager, or Coordinator role
 *       404:
 *         description: Schedule not found
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
 * @swagger
 * /api/v1/schedules/{id}:
 *   delete:
 *     summary: Delete a schedule (soft delete)
 *     tags: [Schedules]
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
 *         description: Schedule deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin or Manager only
 *       404:
 *         description: Schedule not found
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
 * @swagger
 * /api/v1/schedules/{id}/generate-classes:
 *   post:
 *     summary: Generate Class instances from schedule template
 *     tags: [Schedules]
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
 *             required: [startDate, endDate]
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Classes generated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Admin, Manager, or Coordinator role
 *       404:
 *         description: Schedule not found
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


