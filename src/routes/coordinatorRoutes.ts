import { Router } from 'express';
import authenticate from '../middlewares/auth';
import { authorize, authorizeMinRole } from '../middlewares/rbac';
import { UserRole } from '../types/enums';
import {
  getCoordinatorDashboardController,
  getMyAssignedClasses,
  getMySchedule,
  getClassAttendance,
  getClassStudents,
  sendClassAnnouncement,
  assignCoordinatorToClass,
} from '../controllers/coordinatorController';
import {
  assignCoordinatorValidation,
  sendAnnouncementValidation,
  classIdParamValidation,
  coordinatorQueryValidation,
  handleCoordinatorValidationErrors,
} from '../validators/coordinatorValidator';

const router = Router();

/**
 * @swagger
 * /api/v1/coordinator/dashboard:
 *   get:
 *     summary: Get coordinator dashboard with assigned classes overview
 *     tags: [Coordinator]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Coordinator dashboard data
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Coordinator only
 */
router.get('/dashboard', authenticate, authorize(UserRole.COORDINATOR), getCoordinatorDashboardController);

/**
 * @swagger
 * /api/v1/coordinator/classes:
 *   get:
 *     summary: Get classes assigned to current coordinator
 *     tags: [Coordinator]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [scheduled, in-progress, completed, cancelled]
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
 *         description: List of assigned classes
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Coordinator only
 */
router.get('/classes', authenticate, authorize(UserRole.COORDINATOR), coordinatorQueryValidation, handleCoordinatorValidationErrors, getMyAssignedClasses);

/**
 * @swagger
 * /api/v1/coordinator/schedule:
 *   get:
 *     summary: Get weekly schedule for coordinator's assigned classes
 *     tags: [Coordinator]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Weekly schedule
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Coordinator only
 */
router.get('/schedule', authenticate, authorize(UserRole.COORDINATOR), getMySchedule);

/**
 * @swagger
 * /api/v1/coordinator/classes/{id}/attendance:
 *   get:
 *     summary: Get attendance overview for an assigned class
 *     tags: [Coordinator]
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
 *         description: Class attendance overview
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Coordinator only or class not assigned
 *       404:
 *         description: Class not found
 */
router.get('/classes/:id/attendance', authenticate, authorize(UserRole.COORDINATOR), classIdParamValidation, handleCoordinatorValidationErrors, getClassAttendance);

/**
 * @swagger
 * /api/v1/coordinator/classes/{id}/students:
 *   get:
 *     summary: Get student list for an assigned class
 *     tags: [Coordinator]
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
 *         description: List of students in the class
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Coordinator only or class not assigned
 *       404:
 *         description: Class not found
 */
router.get('/classes/:id/students', authenticate, authorize(UserRole.COORDINATOR), classIdParamValidation, handleCoordinatorValidationErrors, getClassStudents);

/**
 * @swagger
 * /api/v1/coordinator/classes/{id}/announcement:
 *   post:
 *     summary: Send announcement to students in assigned class
 *     tags: [Coordinator]
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
 *             required: [title, message]
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               studentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Announcement sent successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Coordinator only or class not assigned
 *       404:
 *         description: Class not found
 */
router.post('/classes/:id/announcement', authenticate, authorize(UserRole.COORDINATOR), classIdParamValidation, sendAnnouncementValidation, handleCoordinatorValidationErrors, sendClassAnnouncement);

/**
 * @swagger
 * /api/v1/coordinator/classes/{id}/assign:
 *   patch:
 *     summary: Assign a coordinator to a class
 *     tags: [Coordinator]
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
 *             required: [coordinatorId]
 *             properties:
 *               coordinatorId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Coordinator assigned successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager or Admin only
 *       404:
 *         description: Class or coordinator not found
 */
router.patch('/classes/:id/assign', authenticate, authorizeMinRole(UserRole.MANAGER), classIdParamValidation, assignCoordinatorValidation, handleCoordinatorValidationErrors, assignCoordinatorToClass);

export default router;

