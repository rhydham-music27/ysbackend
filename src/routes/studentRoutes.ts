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
 * @route   GET /api/v1/student/dashboard
 * @desc    Get comprehensive student dashboard (courses, assignments, grades, attendance, GPA, classes, notifications)
 * @access  Private (Student)
 */
router.get('/dashboard', authenticate, authorize(UserRole.STUDENT), getDashboard);

/**
 * @route   GET /api/v1/student/courses/available
 * @desc    Get courses available for enrollment (active, not full, not already enrolled)
 * @access  Private (Student)
 */
router.get('/courses/available', authenticate, authorize(UserRole.STUDENT), getAvailableCoursesController);

/**
 * @route   POST /api/v1/student/courses/:id/enroll
 * @desc    Enroll in a course (self-enrollment)
 * @access  Private (Student)
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
 * @route   POST /api/v1/student/courses/:id/drop
 * @desc    Drop a course (unenroll)
 * @access  Private (Student)
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
 * @route   GET /api/v1/student/courses/:id/progress
 * @desc    Get detailed progress for a specific course (assignments, grades, attendance)
 * @access  Private (Student)
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

