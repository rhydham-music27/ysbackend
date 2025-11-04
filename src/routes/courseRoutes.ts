import { Router } from 'express';
import authenticate from '../middlewares/auth';
import { authorize, authorizeMinRole } from '../middlewares/rbac';
import { UserRole } from '../types/enums';
import {
  createCourse,
  deleteCourse,
  enrollStudentInCourse,
  getCourse,
  getCourseCapacity,
  getMyCourses,
  listCourses,
  unenrollStudentFromCourse,
  updateCourse,
} from '../controllers/courseController';
import {
  courseIdParamValidation,
  courseQueryValidation,
  createCourseValidation,
  enrollStudentValidation,
  handleCourseValidationErrors,
  unenrollStudentValidation,
  updateCourseValidation,
} from '../validators/courseValidator';

const router = Router();

/**
 * @route   POST /api/v1/courses
 * @desc    Create a new course
 * @access  Private (Admin, Manager)
 */
router.post('/', authenticate, authorizeMinRole(UserRole.MANAGER), createCourseValidation, handleCourseValidationErrors, createCourse);

/**
 * @route   GET /api/v1/courses
 * @desc    List all courses with optional filters
 * @access  Private (All authenticated users)
 */
router.get('/', authenticate, courseQueryValidation, handleCourseValidationErrors, listCourses);

/**
 * @route   GET /api/v1/courses/my
 * @desc    Get courses for current user (taught or enrolled)
 * @access  Private (Teacher, Student)
 */
router.get('/my', authenticate, getMyCourses);

/**
 * @route   GET /api/v1/courses/:id
 * @desc    Get a single course by ID
 * @access  Private (All authenticated users)
 */
router.get('/:id', authenticate, courseIdParamValidation, handleCourseValidationErrors, getCourse);

/**
 * @route   PUT /api/v1/courses/:id
 * @desc    Update a course
 * @access  Private (Admin, Manager)
 */
router.put('/:id', authenticate, authorizeMinRole(UserRole.MANAGER), courseIdParamValidation, updateCourseValidation, handleCourseValidationErrors, updateCourse);

/**
 * @route   DELETE /api/v1/courses/:id
 * @desc    Delete a course (only if no enrolled students)
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), courseIdParamValidation, handleCourseValidationErrors, deleteCourse);

/**
 * @route   POST /api/v1/courses/:id/enroll
 * @desc    Enroll a student in a course
 * @access  Private (Admin, Manager, Teacher)
 */
router.post('/:id/enroll', authenticate, authorizeMinRole(UserRole.TEACHER), courseIdParamValidation, enrollStudentValidation, handleCourseValidationErrors, enrollStudentInCourse);

/**
 * @route   POST /api/v1/courses/:id/unenroll
 * @desc    Unenroll a student from a course
 * @access  Private (Admin, Manager, Teacher)
 */
router.post('/:id/unenroll', authenticate, authorizeMinRole(UserRole.TEACHER), courseIdParamValidation, unenrollStudentValidation, handleCourseValidationErrors, unenrollStudentFromCourse);

/**
 * @route   GET /api/v1/courses/:id/capacity
 * @desc    Check course enrollment capacity
 * @access  Private (All authenticated users)
 */
router.get('/:id/capacity', authenticate, courseIdParamValidation, handleCourseValidationErrors, getCourseCapacity);

export default router;


