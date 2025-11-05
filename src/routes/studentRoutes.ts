import { Router } from 'express';
import authenticate from '../middlewares/auth';
import { authorize } from '../middlewares/rbac';
import { UserRole } from '../types/enums';
import {
  getDashboard,
  enrollInCourseController,
  dropCourseController,
  getAvailableCoursesController,
  getCourseProgress,
} from '../controllers/studentController';
import { courseIdParamValidation, handleStudentValidationErrors } from '../validators/studentValidator';

const router = Router();

/**
 * @swagger
 * /api/v1/student/dashboard:
 *   get:
 *     summary: Get comprehensive student dashboard (courses, assignments, grades, attendance, GPA, classes, notifications)
 *     tags: [Student]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Student dashboard data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Student only
 */
router.get('/dashboard', authenticate, authorize(UserRole.STUDENT), getDashboard);

/**
 * @swagger
 * /api/v1/student/courses/available:
 *   get:
 *     summary: Get courses available for enrollment (active, not full, not already enrolled)
 *     tags: [Student]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of available courses
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Student only
 */
router.get('/courses/available', authenticate, authorize(UserRole.STUDENT), getAvailableCoursesController);

/**
 * @swagger
 * /api/v1/student/courses/{id}/enroll:
 *   post:
 *     summary: Enroll in a course (self-enrollment)
 *     tags: [Student]
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
 *         description: Successfully enrolled in course
 *       400:
 *         description: Course is full or already enrolled
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Student only
 *       404:
 *         description: Course not found
 */
router.post(
  '/courses/:id/enroll',
  authenticate,
  authorize(UserRole.STUDENT),
  courseIdParamValidation,
  handleStudentValidationErrors,
  enrollInCourseController
);

/**
 * @swagger
 * /api/v1/student/courses/{id}/drop:
 *   post:
 *     summary: Drop a course (unenroll)
 *     tags: [Student]
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
 *         description: Successfully dropped course
 *       400:
 *         description: Cannot drop course
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Student only
 *       404:
 *         description: Course not found or not enrolled
 */
router.post(
  '/courses/:id/drop',
  authenticate,
  authorize(UserRole.STUDENT),
  courseIdParamValidation,
  handleStudentValidationErrors,
  dropCourseController
);

/**
 * @swagger
 * /api/v1/student/courses/{id}/progress:
 *   get:
 *     summary: Get detailed progress for a specific course (assignments, grades, attendance)
 *     tags: [Student]
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
 *         description: Course progress details
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Student only
 *       404:
 *         description: Course not found or not enrolled
 */
router.get(
  '/courses/:id/progress',
  authenticate,
  authorize(UserRole.STUDENT),
  courseIdParamValidation,
  handleStudentValidationErrors,
  getCourseProgress
);

export default router;

