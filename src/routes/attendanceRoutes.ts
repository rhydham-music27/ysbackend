import { Router } from 'express';
import authenticate from '../middlewares/auth';
import { authorize, authorizeMinRole } from '../middlewares/rbac';
import { UserRole } from '../types/enums';
import {
  markAttendanceForStudent,
  bulkMarkAttendanceForClass,
  updateAttendanceRecord,
  getAttendanceByClass,
  getAttendanceByStudent,
  getMyAttendance,
  getStudentAttendanceStats,
  getMyAttendanceStats,
  deleteAttendanceRecord,
} from '../controllers/attendanceController';
import {
  markAttendanceValidation,
  bulkMarkAttendanceValidation,
  updateAttendanceValidation,
  attendanceIdParamValidation,
  classIdParamValidation,
  studentIdParamValidation,
  attendanceQueryValidation,
  handleAttendanceValidationErrors,
} from '../validators/attendanceValidator';

const router = Router();

/**
 * @swagger
 * /api/v1/attendance/bulk:
 *   post:
 *     summary: Mark attendance for multiple students in a class
 *     tags: [Attendance]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [classId, attendanceRecords]
 *             properties:
 *               classId:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               attendanceRecords:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [studentId, status]
 *                   properties:
 *                     studentId:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [present, absent, late, excused]
 *                     notes:
 *                       type: string
 *     responses:
 *       200:
 *         description: Attendance marked successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Teacher or Coordinator role
 */
router.post(
  '/bulk',
  authenticate,
  authorize(UserRole.TEACHER, UserRole.COORDINATOR),
  bulkMarkAttendanceValidation,
  handleAttendanceValidationErrors,
  bulkMarkAttendanceForClass
);

/**
 * @swagger
 * /api/v1/attendance/my:
 *   get:
 *     summary: Get attendance records for current student
 *     tags: [Attendance]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Attendance records
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Student only
 */
router.get(
  '/my',
  authenticate,
  authorize(UserRole.STUDENT),
  attendanceQueryValidation,
  handleAttendanceValidationErrors,
  getMyAttendance
);

/**
 * @swagger
 * /api/v1/attendance/my/stats:
 *   get:
 *     summary: Get attendance statistics for current student
 *     tags: [Attendance]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Attendance statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Student only
 */
router.get('/my/stats', authenticate, authorize(UserRole.STUDENT), getMyAttendanceStats);

/**
 * @swagger
 * /api/v1/attendance/class/{id}:
 *   get:
 *     summary: Get all attendance records for a specific class
 *     tags: [Attendance]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Class attendance records
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Teacher, Coordinator, Manager, or Admin role
 *       404:
 *         description: Class not found
 */
router.get(
  '/class/:id',
  authenticate,
  authorizeMinRole(UserRole.TEACHER),
  classIdParamValidation,
  attendanceQueryValidation,
  handleAttendanceValidationErrors,
  getAttendanceByClass
);

/**
 * @swagger
 * /api/v1/attendance/student/{id}:
 *   get:
 *     summary: Get all attendance records for a specific student
 *     tags: [Attendance]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Student attendance records
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Teacher, Coordinator, Manager, or Admin role
 *       404:
 *         description: Student not found
 */
router.get(
  '/student/:id',
  authenticate,
  authorizeMinRole(UserRole.TEACHER),
  studentIdParamValidation,
  attendanceQueryValidation,
  handleAttendanceValidationErrors,
  getAttendanceByStudent
);

/**
 * @swagger
 * /api/v1/attendance/student/{id}/stats:
 *   get:
 *     summary: Get attendance statistics for a specific student
 *     tags: [Attendance]
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
 *         description: Student attendance statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Teacher, Coordinator, Manager, or Admin role
 *       404:
 *         description: Student not found
 */
router.get(
  '/student/:id/stats',
  authenticate,
  authorizeMinRole(UserRole.TEACHER),
  studentIdParamValidation,
  handleAttendanceValidationErrors,
  getStudentAttendanceStats
);

/**
 * @swagger
 * /api/v1/attendance:
 *   post:
 *     summary: Mark attendance for a single student
 *     tags: [Attendance]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MarkAttendanceRequest'
 *     responses:
 *       200:
 *         description: Attendance marked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AttendanceResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Teacher or Coordinator role
 */
router.post(
  '/',
  authenticate,
  authorize(UserRole.TEACHER, UserRole.COORDINATOR),
  markAttendanceValidation,
  handleAttendanceValidationErrors,
  markAttendanceForStudent
);

/**
 * @swagger
 * /api/v1/attendance/{id}:
 *   put:
 *     summary: Update an existing attendance record
 *     tags: [Attendance]
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
 *               status:
 *                 type: string
 *                 enum: [present, absent, late, excused]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Attendance updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Teacher or Coordinator role
 *       404:
 *         description: Attendance record not found
 */
router.put(
  '/:id',
  authenticate,
  authorize(UserRole.TEACHER, UserRole.COORDINATOR),
  attendanceIdParamValidation,
  updateAttendanceValidation,
  handleAttendanceValidationErrors,
  updateAttendanceRecord
);

/**
 * @swagger
 * /api/v1/attendance/{id}:
 *   delete:
 *     summary: Delete an attendance record
 *     tags: [Attendance]
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
 *         description: Attendance deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager or Admin only
 *       404:
 *         description: Attendance record not found
 */
router.delete(
  '/:id',
  authenticate,
  authorizeMinRole(UserRole.MANAGER),
  attendanceIdParamValidation,
  handleAttendanceValidationErrors,
  deleteAttendanceRecord
);

export default router;


