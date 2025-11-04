import { Router } from 'express';
import authenticate from '../middlewares/auth';
import { authorize, authorizeMinRole } from '../middlewares/rbac';
import { UserRole } from '../types/enums';
import {
  addStudentToClass,
  createClass,
  deleteClass,
  getClass,
  getMyClasses,
  getUpcomingClasses,
  listClasses,
  removeStudentFromClass,
  updateClass,
} from '../controllers/classController';
import {
  addStudentValidation,
  classIdParamValidation,
  classQueryValidation,
  createClassValidation,
  handleClassValidationErrors,
  removeStudentValidation,
  updateClassValidation,
} from '../validators/classValidator';

const router = Router();

/**
 * @route   POST /api/v1/classes
 * @desc    Create a new class session
 * @access  Private (Admin, Manager, Coordinator)
 */
router.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.COORDINATOR), createClassValidation, handleClassValidationErrors, createClass);

/**
 * @route   GET /api/v1/classes
 * @desc    List all classes with optional filters
 * @access  Private (All authenticated users)
 */
router.get('/', authenticate, classQueryValidation, handleClassValidationErrors, listClasses);

/**
 * @route   GET /api/v1/classes/my
 * @desc    Get classes for current user (teaching or attending)
 * @access  Private (Teacher, Student)
 */
router.get('/my', authenticate, classQueryValidation, handleClassValidationErrors, getMyClasses);

/**
 * @route   GET /api/v1/classes/upcoming
 * @desc    Get all upcoming scheduled classes
 * @access  Private (All authenticated users)
 */
router.get('/upcoming', authenticate, getUpcomingClasses);

/**
 * @route   GET /api/v1/classes/:id
 * @desc    Get a single class by ID
 * @access  Private (All authenticated users)
 */
router.get('/:id', authenticate, classIdParamValidation, handleClassValidationErrors, getClass);

/**
 * @route   PUT /api/v1/classes/:id
 * @desc    Update a class session
 * @access  Private (Admin, Manager, Coordinator)
 */
router.put('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.COORDINATOR), classIdParamValidation, updateClassValidation, handleClassValidationErrors, updateClass);

/**
 * @route   DELETE /api/v1/classes/:id
 * @desc    Delete a class session (only if not started/completed)
 * @access  Private (Admin, Manager)
 */
router.delete('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER), classIdParamValidation, handleClassValidationErrors, deleteClass);

/**
 * @route   POST /api/v1/classes/:id/students
 * @desc    Add a student to a class session
 * @access  Private (Admin, Manager, Teacher, Coordinator)
 */
router.post('/:id/students', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER, UserRole.COORDINATOR), classIdParamValidation, addStudentValidation, handleClassValidationErrors, addStudentToClass);

/**
 * @route   DELETE /api/v1/classes/:id/students
 * @desc    Remove a student from a class session
 * @access  Private (Admin, Manager, Teacher, Coordinator)
 */
router.delete('/:id/students', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER, UserRole.COORDINATOR), classIdParamValidation, removeStudentValidation, handleClassValidationErrors, removeStudentFromClass);

export default router;


