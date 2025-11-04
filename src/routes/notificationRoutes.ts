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
 * @route   GET /api/v1/notifications/my
 * @desc    Get notifications for current user
 * @access  Private (All authenticated users)
 * @query   { category?, isRead?, limit?, priority? }
 */
router.get('/my', authenticate, notificationQueryValidation, handleNotificationValidationErrors, getMyNotifications);

/**
 * @route   GET /api/v1/notifications/my/unread
 * @desc    Get unread notifications for current user
 * @access  Private (All authenticated users)
 */
router.get('/my/unread', authenticate, getUnreadNotifications);

/**
 * @route   GET /api/v1/notifications/my/count
 * @desc    Get count of unread notifications for current user
 * @access  Private (All authenticated users)
 */
router.get('/my/count', authenticate, getUnreadCount);

/**
 * @route   PATCH /api/v1/notifications/my/read-all
 * @desc    Mark all notifications as read for current user
 * @access  Private (All authenticated users)
 */
router.patch('/my/read-all', authenticate, markAllAsRead);

/**
 * @route   DELETE /api/v1/notifications/my/all
 * @desc    Delete all notifications for current user
 * @access  Private (All authenticated users)
 */
router.delete('/my/all', authenticate, deleteAllNotifications);

/**
 * @route   POST /api/v1/notifications
 * @desc    Create a notification for a user (manual)
 * @access  Private (Manager, Admin)
 * @body    { userId, type, category, priority?, title, message, metadata?, expiresAt? }
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
 * @route   PATCH /api/v1/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private (All authenticated users - own notifications only)
 */
router.patch('/:id/read', authenticate, notificationIdParamValidation, handleNotificationValidationErrors, markAsRead);

/**
 * @route   PATCH /api/v1/notifications/:id/unread
 * @desc    Mark a notification as unread
 * @access  Private (All authenticated users - own notifications only)
 */
router.patch(
  '/:id/unread',
  authenticate,
  notificationIdParamValidation,
  handleNotificationValidationErrors,
  markAsUnread
);

/**
 * @route   DELETE /api/v1/notifications/:id
 * @desc    Delete a notification
 * @access  Private (All authenticated users - own notifications only)
 */
router.delete(
  '/:id',
  authenticate,
  notificationIdParamValidation,
  handleNotificationValidationErrors,
  deleteNotification
);

export default router;

