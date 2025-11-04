import { Router } from 'express';
import authenticate from '../middlewares/auth';
import { authorize, authorizeMinRole } from '../middlewares/rbac';
import { UserRole } from '../types/enums';
import {
  getStudentPerformance,
  getMyPerformance,
  getTeacherWorkload,
  getMyWorkload,
  getCourseEnrollmentTrends,
  getAttendanceStatistics,
  getCourseAnalytics,
  getClassPerformance,
  getDashboardSummary,
} from '../controllers/reportController';
import {
  studentIdParamValidation,
  teacherIdParamValidation,
  courseIdParamValidation,
  classIdParamValidation,
  dateRangeQueryValidation,
  attendanceReportQueryValidation,
  enrollmentTrendsQueryValidation,
  handleReportValidationErrors,
} from '../validators/reportValidator';

const router = Router();

/**
 * @route   GET /api/v1/reports/my/performance
 * @desc    Get performance report for current student
 * @access  Private (Student)
 * @query   { startDate?, endDate? }
 */
router.get(
  '/my/performance',
  authenticate,
  authorize(UserRole.STUDENT),
  dateRangeQueryValidation,
  handleReportValidationErrors,
  getMyPerformance
);

/**
 * @route   GET /api/v1/reports/my/workload
 * @desc    Get workload report for current teacher
 * @access  Private (Teacher)
 * @query   { startDate?, endDate? }
 */
router.get(
  '/my/workload',
  authenticate,
  authorize(UserRole.TEACHER),
  dateRangeQueryValidation,
  handleReportValidationErrors,
  getMyWorkload
);

/**
 * @route   GET /api/v1/reports/enrollment-trends
 * @desc    Get course enrollment trends and statistics
 * @access  Private (Manager, Admin)
 * @query   { startDate?, endDate?, limit? }
 */
router.get(
  '/enrollment-trends',
  authenticate,
  authorizeMinRole(UserRole.MANAGER),
  enrollmentTrendsQueryValidation,
  handleReportValidationErrors,
  getCourseEnrollmentTrends
);

/**
 * @route   GET /api/v1/reports/attendance-statistics
 * @desc    Get attendance statistics with optional filters
 * @access  Private (Teacher, Manager, Admin)
 * @query   { courseId?, teacherId?, classId?, startDate?, endDate? }
 */
router.get(
  '/attendance-statistics',
  authenticate,
  authorizeMinRole(UserRole.TEACHER),
  attendanceReportQueryValidation,
  handleReportValidationErrors,
  getAttendanceStatistics
);

/**
 * @route   GET /api/v1/reports/dashboard
 * @desc    Get dashboard summary for current user (role-specific)
 * @access  Private (All authenticated users)
 */
router.get('/dashboard', authenticate, getDashboardSummary);

/**
 * @route   GET /api/v1/reports/students/:id/performance
 * @desc    Get comprehensive performance report for a student
 * @access  Private (Teacher, Manager, Admin)
 * @query   { startDate?, endDate? }
 */
router.get(
  '/students/:id/performance',
  authenticate,
  authorizeMinRole(UserRole.TEACHER),
  studentIdParamValidation,
  dateRangeQueryValidation,
  handleReportValidationErrors,
  getStudentPerformance
);

/**
 * @route   GET /api/v1/reports/teachers/:id/workload
 * @desc    Get workload report for a teacher
 * @access  Private (Manager, Admin)
 * @query   { startDate?, endDate? }
 */
router.get(
  '/teachers/:id/workload',
  authenticate,
  authorizeMinRole(UserRole.MANAGER),
  teacherIdParamValidation,
  dateRangeQueryValidation,
  handleReportValidationErrors,
  getTeacherWorkload
);

/**
 * @route   GET /api/v1/reports/courses/:id/analytics
 * @desc    Get comprehensive analytics for a specific course
 * @access  Private (Teacher, Manager, Admin)
 */
router.get(
  '/courses/:id/analytics',
  authenticate,
  authorizeMinRole(UserRole.TEACHER),
  courseIdParamValidation,
  handleReportValidationErrors,
  getCourseAnalytics
);

/**
 * @route   GET /api/v1/reports/classes/:id/performance
 * @desc    Get performance report for a specific class session
 * @access  Private (Teacher, Manager, Admin)
 */
router.get(
  '/classes/:id/performance',
  authenticate,
  authorizeMinRole(UserRole.TEACHER),
  classIdParamValidation,
  handleReportValidationErrors,
  getClassPerformance
);

export default router;

