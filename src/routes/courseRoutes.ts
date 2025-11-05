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
 * @swagger
 * /api/v1/courses:
 *   post:
 *     summary: Create a new course
 *     tags: [Courses]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCourseRequest'
 *     responses:
 *       201:
 *         description: Course created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Manager or Admin role
 */
router.post('/', authenticate, authorizeMinRole(UserRole.MANAGER), createCourseValidation, handleCourseValidationErrors, createCourse);

/**
 * @swagger
 * /api/v1/courses:
 *   get:
 *     summary: List all courses with optional filters
 *     tags: [Courses]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, active, archived, completed]
 *       - in: query
 *         name: teacher
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of courses
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseListResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, courseQueryValidation, handleCourseValidationErrors, listCourses);

/**
 * @swagger
 * /api/v1/courses/my:
 *   get:
 *     summary: Get courses for current user (taught or enrolled)
 *     tags: [Courses]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User's courses
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseListResponse'
 *       401:
 *         description: Unauthorized
 */
router.get('/my', authenticate, getMyCourses);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   get:
 *     summary: Get a single course by ID
 *     tags: [Courses]
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
 *         description: Course details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseResponse'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.get('/:id', authenticate, courseIdParamValidation, handleCourseValidationErrors, getCourse);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   put:
 *     summary: Update a course
 *     tags: [Courses]
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
 *             $ref: '#/components/schemas/CreateCourseRequest'
 *     responses:
 *       200:
 *         description: Course updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CourseResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Manager or Admin role
 *       404:
 *         description: Course not found
 */
router.put('/:id', authenticate, authorizeMinRole(UserRole.MANAGER), courseIdParamValidation, updateCourseValidation, handleCourseValidationErrors, updateCourse);

/**
 * @swagger
 * /api/v1/courses/{id}:
 *   delete:
 *     summary: Delete a course (only if no enrolled students)
 *     tags: [Courses]
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
 *         description: Course deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StandardResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin only
 *       404:
 *         description: Course not found
 *       409:
 *         description: Cannot delete course with enrolled students
 */
router.delete('/:id', authenticate, authorize(UserRole.ADMIN), courseIdParamValidation, handleCourseValidationErrors, deleteCourse);

/**
 * @swagger
 * /api/v1/courses/{id}/enroll:
 *   post:
 *     summary: Enroll a student in a course
 *     tags: [Courses]
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
 *             $ref: '#/components/schemas/EnrollStudentRequest'
 *     responses:
 *       200:
 *         description: Student enrolled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StandardResponse'
 *       400:
 *         description: Validation error or course is full
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Teacher, Manager, or Admin role
 *       404:
 *         description: Course or student not found
 */
router.post('/:id/enroll', authenticate, authorizeMinRole(UserRole.TEACHER), courseIdParamValidation, enrollStudentValidation, handleCourseValidationErrors, enrollStudentInCourse);

/**
 * @swagger
 * /api/v1/courses/{id}/unenroll:
 *   post:
 *     summary: Unenroll a student from a course
 *     tags: [Courses]
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
 *             $ref: '#/components/schemas/EnrollStudentRequest'
 *     responses:
 *       200:
 *         description: Student unenrolled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StandardResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Teacher, Manager, or Admin role
 *       404:
 *         description: Course or student not found
 */
router.post('/:id/unenroll', authenticate, authorizeMinRole(UserRole.TEACHER), courseIdParamValidation, unenrollStudentValidation, handleCourseValidationErrors, unenrollStudentFromCourse);

/**
 * @swagger
 * /api/v1/courses/{id}/capacity:
 *   get:
 *     summary: Check course enrollment capacity
 *     tags: [Courses]
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
 *         description: Course capacity information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     enrolled:
 *                       type: number
 *                     maxStudents:
 *                       type: number
 *                     available:
 *                       type: number
 *                     isFull:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Course not found
 */
router.get('/:id/capacity', authenticate, courseIdParamValidation, handleCourseValidationErrors, getCourseCapacity);

export default router;


