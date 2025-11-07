import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ClassStatus } from '../types/enums';

export const assignCoordinatorValidation: ValidationChain[] = [
  body('coordinatorId').notEmpty().withMessage('Coordinator ID is required').isMongoId().withMessage('Invalid coordinator ID'),
];

export const sendAnnouncementValidation: ValidationChain[] = [
  body('title').notEmpty().withMessage('Title is required').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('message').notEmpty().withMessage('Message is required').trim().isLength({ min: 10, max: 1000 }).withMessage('Message must be 10-1000 characters'),
  body('studentIds').optional().isArray().withMessage('Student IDs must be an array'),
  body('studentIds.*').optional().isMongoId().withMessage('Each student ID must be a valid MongoDB ID'),
];

export const classIdParamValidation: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid class ID'),
];

export const coordinatorQueryValidation: ValidationChain[] = [
  query('status').optional().isIn(Object.values(ClassStatus)).withMessage('Invalid status filter'),
  query('startDate').optional().isISO8601().toDate().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().toDate().withMessage('Invalid end date format'),
  query('endDate')
    .optional()
    .custom((value, { req }) => {
      if (req.query.startDate && value) {
        const start = new Date(req.query.startDate as string);
        const end = new Date(value);
        if (end < start) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),
];

export function handleCoordinatorValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({ field: err.param, message: err.msg }));
    return res.status(400).json({ success: false, errors: formatted });
  }
  next();
}

