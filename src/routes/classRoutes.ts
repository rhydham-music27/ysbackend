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
 * @swagger
 * /api/v1/classes-sessions:
 *   post:
 *     summary: Create a new class session
 *     tags: [Classes]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [course, title, scheduledDate, startTime, endTime]
 *             properties:
 *               course:
 *                 type: string
 *               title:
 *                 type: string
 *               scheduledDate:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *               location:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [scheduled, in_progress, completed, cancelled]
 *     responses:
 *       201:
 *         description: Class created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Admin, Manager, or Coordinator role
 */
router.post('/', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.COORDINATOR), createClassValidation, handleClassValidationErrors, createClass);

/**
 * @swagger
 * /api/v1/classes-sessions:
 *   get:
 *     summary: List all classes with optional filters
 *     tags: [Classes]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, in_progress, completed, cancelled]
 *       - in: query
 *         name: course
 *         schema:
 *           type: string
 *       - in: query
 *         name: teacher
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of classes
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, classQueryValidation, handleClassValidationErrors, listClasses);

/**
 * @swagger
 * /api/v1/classes-sessions/my:
 *   get:
 *     summary: Get classes for current user (teaching or attending)
 *     tags: [Classes]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User's classes
 *       401:
 *         description: Unauthorized
 */
router.get('/my', authenticate, classQueryValidation, handleClassValidationErrors, getMyClasses);

/**
 * @swagger
 * /api/v1/classes-sessions/upcoming:
 *   get:
 *     summary: Get all upcoming scheduled classes
 *     tags: [Classes]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of upcoming classes
 *       401:
 *         description: Unauthorized
 */
router.get('/upcoming', authenticate, getUpcomingClasses);

/**
 * @swagger
 * /api/v1/classes-sessions/{id}:
 *   get:
 *     summary: Get a single class by ID
 *     tags: [Classes]
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
 *         description: Class details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Class not found
 */
router.get('/:id', authenticate, classIdParamValidation, handleClassValidationErrors, getClass);

/**
 * @swagger
 * /api/v1/classes-sessions/{id}:
 *   put:
 *     summary: Update a class session
 *     tags: [Classes]
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
 *               title:
 *                 type: string
 *               scheduledDate:
 *                 type: string
 *                 format: date
 *               startTime:
 *                 type: string
 *               endTime:
 *                 type: string
 *               location:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [scheduled, in_progress, completed, cancelled]
 *     responses:
 *       200:
 *         description: Class updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - requires Admin, Manager, or Coordinator role
 *       404:
 *         description: Class not found
 */
router.put('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.COORDINATOR), classIdParamValidation, updateClassValidation, handleClassValidationErrors, updateClass);

/**
 * @swagger
 * /api/v1/classes-sessions/{id}:
 *   delete:
 *     summary: Delete a class session (only if not started/completed)
 *     tags: [Classes]
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
 *         description: Class deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin or Manager only
 *       404:
 *         description: Class not found
 *       409:
 *         description: Cannot delete class that has started or completed
 */
router.delete('/:id', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER), classIdParamValidation, handleClassValidationErrors, deleteClass);

/**
 * @swagger
 * /api/v1/classes-sessions/{id}/students:
 *   post:
 *     summary: Add a student to a class session
 *     tags: [Classes]
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
 *             required: [studentId]
 *             properties:
 *               studentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Student added successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Class or student not found
 */
router.post('/:id/students', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER, UserRole.COORDINATOR), classIdParamValidation, addStudentValidation, handleClassValidationErrors, addStudentToClass);

/**
 * @swagger
 * /api/v1/classes-sessions/{id}/students:
 *   delete:
 *     summary: Remove a student from a class session
 *     tags: [Classes]
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
 *             required: [studentId]
 *             properties:
 *               studentId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Student removed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Class or student not found
 */
router.delete('/:id/students', authenticate, authorize(UserRole.ADMIN, UserRole.MANAGER, UserRole.TEACHER, UserRole.COORDINATOR), classIdParamValidation, removeStudentValidation, handleClassValidationErrors, removeStudentFromClass);

export default router;
