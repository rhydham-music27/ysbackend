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
 * @route   GET /api/v1/grades/my
 * @desc    Get grades for current student
 * @access  Private (Student)
 */
router.get('/my', authenticate, authorize(UserRole.STUDENT), gradeQueryValidation, handleGradeValidationErrors, getMyGrades);

/**
 * @route   GET /api/v1/grades/my/gpa
 * @desc    Get GPA for current student
 * @access  Private (Student)
 */
router.get('/my/gpa', authenticate, authorize(UserRole.STUDENT), getMyGPA);

/**
 * @route   GET /api/v1/grades/my/courses/:id
 * @desc    Get current student's grade for a specific course
 * @access  Private (Student)
 */
router.get('/my/courses/:id', authenticate, authorize(UserRole.STUDENT), courseIdParamValidation, handleGradeValidationErrors, getMyCourseGrade);

/**
 * @route   GET /api/v1/grades/students/:id
 * @desc    Get all grades for a specific student
 * @access  Private (Teacher, Manager, Admin)
 */
router.get('/students/:id', authenticate, authorizeMinRole(UserRole.TEACHER), studentIdParamValidation, gradeQueryValidation, handleGradeValidationErrors, getStudentGradesController);

/**
 * @route   GET /api/v1/grades/students/:id/gpa
 * @desc    Get GPA for a specific student
 * @access  Private (Teacher, Manager, Admin)
 */
router.get('/students/:id/gpa', authenticate, authorizeMinRole(UserRole.TEACHER), studentIdParamValidation, handleGradeValidationErrors, getStudentGPAController);

/**
 * @route   GET /api/v1/grades/students/:studentId/courses/:courseId
 * @desc    Get a student's grade for a specific course
 * @access  Private (Teacher, Manager, Admin)
 */
router.get('/students/:studentId/courses/:courseId', authenticate, authorizeMinRole(UserRole.TEACHER), studentCourseParamValidation, handleGradeValidationErrors, getStudentCourseGrade);

/**
 * @route   GET /api/v1/grades/courses/:id
 * @desc    Get all grades for a specific course
 * @access  Private (Teacher, Manager, Admin)
 */
router.get('/courses/:id', authenticate, authorizeMinRole(UserRole.TEACHER), courseIdParamValidation, handleGradeValidationErrors, getCourseGradesController);

/**
 * @route   GET /api/v1/grades/courses/:id/stats
 * @desc    Get grade statistics for a specific course
 * @access  Private (Teacher, Manager, Admin)
 */
router.get('/courses/:id/stats', authenticate, authorizeMinRole(UserRole.TEACHER), courseIdParamValidation, handleGradeValidationErrors, getCourseGradeStats);

/**
 * @route   POST /api/v1/grades/sync-assignment
 * @desc    Sync an assignment grade to the grade book
 * @access  Private (Teacher)
 * @body    { assignmentId, submissionId, studentId }
 */
router.post('/sync-assignment', authenticate, authorize(UserRole.TEACHER), syncAssignmentGradeValidation, handleGradeValidationErrors, syncAssignmentGradeController);

/**
 * @route   POST /api/v1/grades
 * @desc    Add a grade to the grade book
 * @access  Private (Teacher)
 * @body    { student, course, assignment?, gradeType, score, maxScore, weight?, feedback?, term?, isPublished?, notes? }
 */
router.post('/', authenticate, authorize(UserRole.TEACHER), addGradeValidation, handleGradeValidationErrors, addGradeController);

/**
 * @route   GET /api/v1/grades
 * @desc    List all grades with optional filters
 * @access  Private (Teacher, Manager, Admin)
 * @query   { student?, course?, gradeType?, term?, isPublished? }
 */
router.get('/', authenticate, authorizeMinRole(UserRole.TEACHER), gradeQueryValidation, handleGradeValidationErrors, listGrades);

/**
 * @route   GET /api/v1/grades/:id
 * @desc    Get a single grade by ID
 * @access  Private (Teacher, Manager, Admin)
 */
router.get('/:id', authenticate, authorizeMinRole(UserRole.TEACHER), gradeIdParamValidation, handleGradeValidationErrors, getGrade);

/**
 * @route   PUT /api/v1/grades/:id
 * @desc    Update a grade
 * @access  Private (Teacher)
 * @body    { score?, maxScore?, weight?, feedback?, isPublished?, notes? }
 */
router.put('/:id', authenticate, authorize(UserRole.TEACHER), gradeIdParamValidation, updateGradeValidation, handleGradeValidationErrors, updateGradeController);

/**
 * @route   DELETE /api/v1/grades/:id
 * @desc    Delete a grade
 * @access  Private (Teacher)
 */
router.delete('/:id', authenticate, authorize(UserRole.TEACHER), gradeIdParamValidation, handleGradeValidationErrors, deleteGradeController);

export default router;


