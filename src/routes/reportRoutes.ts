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
 * @swagger
 * /api/v1/reports/my/performance:
 *   get:
 *     summary: Get performance report for current student
 *     tags: [Reports]
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
 *         description: Student performance report
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Student only
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
 * @swagger
 * /api/v1/reports/my/workload:
 *   get:
 *     summary: Get workload report for current teacher
 *     tags: [Reports]
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
 *         description: Teacher workload report
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Teacher only
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
 * @swagger
 * /api/v1/reports/enrollment-trends:
 *   get:
 *     summary: Get course enrollment trends and statistics
 *     tags: [Reports]
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
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Enrollment trends report
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager or Admin only
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
 * @swagger
 * /api/v1/reports/attendance-statistics:
 *   get:
 *     summary: Get attendance statistics with optional filters
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: string
 *       - in: query
 *         name: teacherId
 *         schema:
 *           type: string
 *       - in: query
 *         name: classId
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
 *         description: Attendance statistics report
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Teacher, Manager, or Admin role
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
 * @swagger
 * /api/v1/reports/dashboard:
 *   get:
 *     summary: Get dashboard summary for current user (role-specific)
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/dashboard', authenticate, getDashboardSummary);

/**
 * @swagger
 * /api/v1/reports/students/{id}/performance:
 *   get:
 *     summary: Get comprehensive performance report for a student
 *     tags: [Reports]
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
 *         description: Student performance report
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Teacher, Manager, or Admin role
 *       404:
 *         description: Student not found
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
 * @swagger
 * /api/v1/reports/teachers/{id}/workload:
 *   get:
 *     summary: Get workload report for a teacher
 *     tags: [Reports]
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
 *         description: Teacher workload report
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager or Admin only
 *       404:
 *         description: Teacher not found
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
 * @swagger
 * /api/v1/reports/courses/{id}/analytics:
 *   get:
 *     summary: Get comprehensive analytics for a specific course
 *     tags: [Reports]
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
 *         description: Course analytics report
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Teacher, Manager, or Admin role
 *       404:
 *         description: Course not found
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
 * @swagger
 * /api/v1/reports/classes/{id}/performance:
 *   get:
 *     summary: Get performance report for a specific class session
 *     tags: [Reports]
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
 *         description: Class performance report
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Teacher, Manager, or Admin role
 *       404:
 *         description: Class not found
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

