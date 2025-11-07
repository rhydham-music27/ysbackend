import { param, query, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const studentIdParamValidation: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid student ID'),
];

export const teacherIdParamValidation: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid teacher ID'),
];

export const courseIdParamValidation: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid course ID'),
];

export const classIdParamValidation: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid class ID'),
];

export const dateRangeQueryValidation: ValidationChain[] = [
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

export const attendanceReportQueryValidation: ValidationChain[] = [
  query('courseId').optional().isMongoId().withMessage('Invalid course ID'),
  query('teacherId').optional().isMongoId().withMessage('Invalid teacher ID'),
  query('classId').optional().isMongoId().withMessage('Invalid class ID'),
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

export const enrollmentTrendsQueryValidation: ValidationChain[] = [
  query('startDate').optional().isISO8601().toDate().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().toDate().withMessage('Invalid end date format'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
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

export function handleReportValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({ field: err.param, message: err.msg }));
    return res.status(400).json({ success: false, errors: formatted });
  }
  return next();
}

