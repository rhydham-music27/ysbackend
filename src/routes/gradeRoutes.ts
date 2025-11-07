import { Router } from 'express';
import authenticate from '../middlewares/auth';
import { authorize, authorizeMinRole } from '../middlewares/rbac';
import { UserRole } from '../types/enums';
import {
  addGradeController,
  listGrades,
  getGrade,
  updateGradeController,
  deleteGradeController,
  getStudentGradesController,
  getCourseGradesController,
  getStudentCourseGrade,
  getMyGrades,
  getMyCourseGrade,
  getStudentGPAController,
  getMyGPA,
  getCourseGradeStats,
  syncAssignmentGradeController,
} from '../controllers/gradeController';
import {
  addGradeValidation,
  updateGradeValidation,
  syncAssignmentGradeValidation,
  gradeIdParamValidation,
  studentIdParamValidation,
  courseIdParamValidation,
  studentCourseParamValidation,
  gradeQueryValidation,
  handleGradeValidationErrors,
} from '../validators/gradeValidator';

const router = Router();

/**
 * @swagger
 * /api/v1/grades/my:
 *   get:
 *     summary: Get grades for current student
 *     tags: [Grades]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: course
 *         schema:
 *           type: string
 *       - in: query
 *         name: gradeType
 *         schema:
 *           type: string
 *           enum: [assignment, manual, exam, quiz, participation, project, attendance, final]
 *     responses:
 *       200:
 *         description: Student's grades
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Student only
 */
router.get('/my', authenticate, authorize(UserRole.STUDENT), gradeQueryValidation, handleGradeValidationErrors, getMyGrades);

/**
 * @swagger
 * /api/v1/grades/my/gpa:
 *   get:
 *     summary: Get GPA for current student
 *     tags: [Grades]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Student GPA information
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Student only
 */
router.get('/my/gpa', authenticate, authorize(UserRole.STUDENT), getMyGPA);

/**
 * @swagger
 * /api/v1/grades/my/courses/{id}:
 *   get:
 *     summary: Get current student's grade for a specific course
 *     tags: [Grades]
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
 *         description: Course grade information
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Student only
 *       404:
 *         description: Course not found
 */
router.get('/my/courses/:id', authenticate, authorize(UserRole.STUDENT), courseIdParamValidation, handleGradeValidationErrors, getMyCourseGrade);

/**
 * @swagger
 * /api/v1/grades/students/{id}:
 *   get:
 *     summary: Get all grades for a specific student
 *     tags: [Grades]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: course
 *         schema:
 *           type: string
 *       - in: query
 *         name: gradeType
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Student's grades
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Teacher, Manager, or Admin role
 *       404:
 *         description: Student not found
 */
router.get('/students/:id', authenticate, authorizeMinRole(UserRole.TEACHER), studentIdParamValidation, gradeQueryValidation, handleGradeValidationErrors, getStudentGradesController);

/**
 * @swagger
 * /api/v1/grades/students/{id}/gpa:
 *   get:
 *     summary: Get GPA for a specific student
 *     tags: [Grades]
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
 *         description: Student GPA information
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Teacher, Manager, or Admin role
 *       404:
 *         description: Student not found
 */
router.get('/students/:id/gpa', authenticate, authorizeMinRole(UserRole.TEACHER), studentIdParamValidation, handleGradeValidationErrors, getStudentGPAController);

/**
 * @swagger
 * /api/v1/grades/students/{studentId}/courses/{courseId}:
 *   get:
 *     summary: Get a student's grade for a specific course
 *     tags: [Grades]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course grade information
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Teacher, Manager, or Admin role
 *       404:
 *         description: Student or course not found
 */
router.get('/students/:studentId/courses/:courseId', authenticate, authorizeMinRole(UserRole.TEACHER), studentCourseParamValidation, handleGradeValidationErrors, getStudentCourseGrade);

/**
 * @swagger
 * /api/v1/grades/courses/{id}:
 *   get:
 *     summary: Get all grades for a specific course
 *     tags: [Grades]
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
 *         description: Course grades
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Teacher, Manager, or Admin role
 *       404:
 *         description: Course not found
 */
router.get('/courses/:id', authenticate, authorizeMinRole(UserRole.TEACHER), courseIdParamValidation, handleGradeValidationErrors, getCourseGradesController);

/**
 * @swagger
 * /api/v1/grades/courses/{id}/stats:
 *   get:
 *     summary: Get grade statistics for a specific course
 *     tags: [Grades]
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
 *         description: Course grade statistics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Teacher, Manager, or Admin role
 *       404:
 *         description: Course not found
 */
router.get('/courses/:id/stats', authenticate, authorizeMinRole(UserRole.TEACHER), courseIdParamValidation, handleGradeValidationErrors, getCourseGradeStats);

/**
 * @swagger
 * /api/v1/grades/sync-assignment:
 *   post:
 *     summary: Sync an assignment grade to the grade book
 *     tags: [Grades]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assignmentId, submissionId, studentId]
 *             properties:
 *               assignmentId:
 *                 type: string
 *               submissionId:
 *                 type: string
 *               studentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Grade synced successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Teacher only
 */
router.post('/sync-assignment', authenticate, authorize(UserRole.TEACHER), syncAssignmentGradeValidation, handleGradeValidationErrors, syncAssignmentGradeController);

/**
 * @swagger
 * /api/v1/grades:
 *   post:
 *     summary: Add a grade to the grade book
 *     tags: [Grades]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [student, course, gradeType, score, maxScore]
 *             properties:
 *               student:
 *                 type: string
 *               course:
 *                 type: string
 *               assignment:
 *                 type: string
 *               gradeType:
 *                 type: string
 *                 enum: [assignment, manual, exam, quiz, participation, project, attendance, final]
 *               score:
 *                 type: number
 *               maxScore:
 *                 type: number
 *               weight:
 *                 type: number
 *               feedback:
 *                 type: string
 *               term:
 *                 type: string
 *               isPublished:
 *                 type: boolean
 *               notes:
 *                 type: string
 *     responses:
 *       201:
 *         description: Grade added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GradeResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Teacher only
 */
router.post('/', authenticate, authorize(UserRole.TEACHER), addGradeValidation, handleGradeValidationErrors, addGradeController);

/**
 * @swagger
 * /api/v1/grades:
 *   get:
 *     summary: List all grades with optional filters
 *     tags: [Grades]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: student
 *         schema:
 *           type: string
 *       - in: query
 *         name: course
 *         schema:
 *           type: string
 *       - in: query
 *         name: gradeType
 *         schema:
 *           type: string
 *           enum: [assignment, manual, exam, quiz, participation, project, attendance, final]
 *       - in: query
 *         name: term
 *         schema:
 *           type: string
 *       - in: query
 *         name: isPublished
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of grades
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Teacher, Manager, or Admin role
 */
router.get('/', authenticate, authorizeMinRole(UserRole.TEACHER), gradeQueryValidation, handleGradeValidationErrors, listGrades);

/**
 * @swagger
 * /api/v1/grades/{id}:
 *   get:
 *     summary: Get a single grade by ID
 *     tags: [Grades]
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
 *         description: Grade details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GradeResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Teacher, Manager, or Admin role
 *       404:
 *         description: Grade not found
 */
router.get('/:id', authenticate, authorizeMinRole(UserRole.TEACHER), gradeIdParamValidation, handleGradeValidationErrors, getGrade);

/**
 * @swagger
 * /api/v1/grades/{id}:
 *   put:
 *     summary: Update a grade
 *     tags: [Grades]
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
 *               score:
 *                 type: number
 *               maxScore:
 *                 type: number
 *               weight:
 *                 type: number
 *               feedback:
 *                 type: string
 *               isPublished:
 *                 type: boolean
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Grade updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Teacher only
 *       404:
 *         description: Grade not found
 */
router.put('/:id', authenticate, authorize(UserRole.TEACHER), gradeIdParamValidation, updateGradeValidation, handleGradeValidationErrors, updateGradeController);

/**
 * @swagger
 * /api/v1/grades/{id}:
 *   delete:
 *     summary: Delete a grade
 *     tags: [Grades]
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
 *         description: Grade deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Teacher only
 *       404:
 *         description: Grade not found
 */
router.delete('/:id', authenticate, authorize(UserRole.TEACHER), gradeIdParamValidation, handleGradeValidationErrors, deleteGradeController);

export default router;


