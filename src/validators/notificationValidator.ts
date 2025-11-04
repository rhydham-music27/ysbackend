import { body, param, query, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { NotificationType, NotificationCategory, NotificationPriority } from '../types/enums';

export const createNotificationValidation: ValidationChain[] = [
  body('userId').notEmpty().withMessage('User ID is required').isMongoId().withMessage('Invalid user ID'),
  body('type')
    .notEmpty()
    .withMessage('Notification type is required')
    .isIn(Object.values(NotificationType))
    .withMessage('Invalid notification type'),
  body('category')
    .notEmpty()
    .withMessage('Notification category is required')
    .isIn(Object.values(NotificationCategory))
    .withMessage('Invalid notification category'),
  body('priority')
    .optional()
    .isIn(Object.values(NotificationPriority))
    .withMessage('Invalid notification priority'),
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be 3-200 characters'),
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Message must be 10-1000 characters'),
  body('metadata').optional().isObject().withMessage('Metadata must be an object'),
  body('expiresAt').optional().isISO8601().toDate().withMessage('Invalid expiration date'),
];

export const notificationIdParamValidation: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid notification ID'),
];

export const notificationQueryValidation: ValidationChain[] = [
  query('category')
    .optional()
    .isIn(Object.values(NotificationCategory))
    .withMessage('Invalid category filter'),
  query('isRead').optional().isBoolean().withMessage('isRead must be a boolean'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('priority')
    .optional()
    .isIn(Object.values(NotificationPriority))
    .withMessage('Invalid priority filter'),
];

export function handleNotificationValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err: any) => ({
      field: err.param,
      message: err.msg,
    }));
    return res.status(400).json({ success: false, errors: formatted });
  }
  next();
}

