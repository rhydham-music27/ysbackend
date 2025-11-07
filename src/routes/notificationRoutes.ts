import { Router } from 'express';
import authenticate from '../middlewares/auth';
import { authorizeMinRole } from '../middlewares/rbac';
import { UserRole } from '../types/enums';
import {
  createNotificationController,
  getMyNotifications,
  getUnreadNotifications,
  getUnreadCount,
  markAsRead,
  markAsUnread,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
} from '../controllers/notificationController';
import {
  createNotificationValidation,
  notificationIdParamValidation,
  notificationQueryValidation,
  handleNotificationValidationErrors,
} from '../validators/notificationValidator';

const router = Router();

/**
 * @swagger
 * /api/v1/notifications/my:
 *   get:
 *     summary: Get notifications for current user
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [assignment_due, assignment_graded, grade_posted, attendance_marked, course_enrollment, class_scheduled, class_cancelled, announcement, system]
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *     responses:
 *       200:
 *         description: List of notifications
 *       401:
 *         description: Unauthorized
 */
router.get('/my', authenticate, notificationQueryValidation, handleNotificationValidationErrors, getMyNotifications);

/**
 * @swagger
 * /api/v1/notifications/my/unread:
 *   get:
 *     summary: Get unread notifications for current user
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of unread notifications
 *       401:
 *         description: Unauthorized
 */
router.get('/my/unread', authenticate, getUnreadNotifications);

/**
 * @swagger
 * /api/v1/notifications/my/count:
 *   get:
 *     summary: Get count of unread notifications for current user
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Unread notification count
 *       401:
 *         description: Unauthorized
 */
router.get('/my/count', authenticate, getUnreadCount);

/**
 * @swagger
 * /api/v1/notifications/my/read-all:
 *   patch:
 *     summary: Mark all notifications as read for current user
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *       401:
 *         description: Unauthorized
 */
router.patch('/my/read-all', authenticate, markAllAsRead);

/**
 * @swagger
 * /api/v1/notifications/my/all:
 *   delete:
 *     summary: Delete all notifications for current user
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications deleted
 *       401:
 *         description: Unauthorized
 */
router.delete('/my/all', authenticate, deleteAllNotifications);

/**
 * @swagger
 * /api/v1/notifications:
 *   post:
 *     summary: Create a notification for a user (manual)
 *     tags: [Notifications]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateNotificationRequest'
 *     responses:
 *       201:
 *         description: Notification created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Manager or Admin only
 */
router.post(
  '/',
  authenticate,
  authorizeMinRole(UserRole.MANAGER),
  createNotificationValidation,
  handleNotificationValidationErrors,
  createNotificationController
);

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
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
 *         description: Notification marked as read
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - can only mark own notifications
 *       404:
 *         description: Notification not found
 */
router.patch('/:id/read', authenticate, notificationIdParamValidation, handleNotificationValidationErrors, markAsRead);

/**
 * @swagger
 * /api/v1/notifications/{id}/unread:
 *   patch:
 *     summary: Mark a notification as unread
 *     tags: [Notifications]
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
 *         description: Notification marked as unread
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - can only mark own notifications
 *       404:
 *         description: Notification not found
 */
router.patch(
  '/:id/unread',
  authenticate,
  notificationIdParamValidation,
  handleNotificationValidationErrors,
  markAsUnread
);

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
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
 *         description: Notification deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - can only delete own notifications
 *       404:
 *         description: Notification not found
 */
router.delete(
  '/:id',
  authenticate,
  notificationIdParamValidation,
  handleNotificationValidationErrors,
  deleteNotification
);

export default router;

