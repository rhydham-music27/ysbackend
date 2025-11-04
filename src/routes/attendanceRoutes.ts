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
 * @route   POST /api/v1/attendance/bulk
 * @desc    Mark attendance for multiple students in a class
 * @access  Private (Teacher, Coordinator)
 * @body    { classId, date?, attendanceRecords: [{ studentId, status, notes? }] }
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
 * @route   GET /api/v1/attendance/my
 * @desc    Get attendance records for current student
 * @access  Private (Student)
 * @query   { startDate?, endDate? }
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
 * @route   GET /api/v1/attendance/my/stats
 * @desc    Get attendance statistics for current student
 * @access  Private (Student)
 */
router.get('/my/stats', authenticate, authorize(UserRole.STUDENT), getMyAttendanceStats);

/**
 * @route   GET /api/v1/attendance/class/:id
 * @desc    Get all attendance records for a specific class
 * @access  Private (Teacher, Coordinator, Manager, Admin)
 * @query   { date? }
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
 * @route   GET /api/v1/attendance/student/:id
 * @desc    Get all attendance records for a specific student
 * @access  Private (Teacher, Coordinator, Manager, Admin)
 * @query   { startDate?, endDate? }
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
 * @route   GET /api/v1/attendance/student/:id/stats
 * @desc    Get attendance statistics for a specific student
 * @access  Private (Teacher, Coordinator, Manager, Admin)
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
 * @route   POST /api/v1/attendance
 * @desc    Mark attendance for a single student
 * @access  Private (Teacher, Coordinator)
 * @body    { classId, studentId, date?, status, notes? }
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
 * @route   PUT /api/v1/attendance/:id
 * @desc    Update an existing attendance record
 * @access  Private (Teacher, Coordinator)
 * @body    { status?, notes? }
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
 * @route   DELETE /api/v1/attendance/:id
 * @desc    Delete an attendance record
 * @access  Private (Manager, Admin)
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


