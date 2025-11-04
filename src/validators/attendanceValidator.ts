import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { AttendanceStatus } from '../types/enums';

export const markAttendanceValidation: ValidationChain[] = [
  body('classId').notEmpty().withMessage('Class ID is required').isMongoId().withMessage('Invalid class ID'),
  body('studentId').notEmpty().withMessage('Student ID is required').isMongoId().withMessage('Invalid student ID'),
  body('date').optional().isISO8601().toDate().withMessage('Invalid date format'),
  body('status')
    .notEmpty()
    .withMessage('Attendance status is required')
    .isIn(Object.values(AttendanceStatus))
    .withMessage('Invalid attendance status'),
  body('notes').optional().isString().trim().withMessage('Notes must be a string').isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters'),
];

export const bulkMarkAttendanceValidation: ValidationChain[] = [
  body('classId').notEmpty().withMessage('Class ID is required').isMongoId().withMessage('Invalid class ID'),
  body('date').optional().isISO8601().toDate().withMessage('Invalid date format'),
  body('attendanceRecords')
    .notEmpty()
    .withMessage('Attendance records are required')
    .isArray({ min: 1 })
    .withMessage('Attendance records must be a non-empty array'),
  body('attendanceRecords.*.studentId')
    .notEmpty()
    .withMessage('Student ID is required in each record')
    .isMongoId()
    .withMessage('Invalid student ID in attendance record'),
  body('attendanceRecords.*.status')
    .notEmpty()
    .withMessage('Status is required in each record')
    .isIn(Object.values(AttendanceStatus))
    .withMessage('Invalid attendance status in record'),
  body('attendanceRecords.*.notes')
    .optional()
    .isString()
    .trim()
    .withMessage('Notes must be a string')
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),
];

export const updateAttendanceValidation: ValidationChain[] = [
  body('status').optional().isIn(Object.values(AttendanceStatus)).withMessage('Invalid attendance status'),
  body('notes').optional().isString().trim().withMessage('Notes must be a string').isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters'),
  body('status').custom((value, { req }) => {
    if (typeof value === 'undefined' && typeof req.body.notes === 'undefined') {
      throw new Error('At least one field (status or notes) must be provided');
    }
    return true;
  }),
];

export const attendanceIdParamValidation: ValidationChain[] = [param('id').isMongoId().withMessage('Invalid attendance ID')];

export const classIdParamValidation: ValidationChain[] = [param('id').isMongoId().withMessage('Invalid class ID')];

export const studentIdParamValidation: ValidationChain[] = [param('id').isMongoId().withMessage('Invalid student ID')];

export const attendanceQueryValidation: ValidationChain[] = [
  query('date').optional().isISO8601().toDate().withMessage('Invalid date format'),
  query('startDate').optional().isISO8601().toDate().withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (req.query.startDate && value) {
        const start = new Date(req.query.startDate as string);
        const end = new Date(value as string);
        if (end < start) throw new Error('End date must be after start date');
      }
      return true;
    }),
  query('status').optional().isIn(Object.values(AttendanceStatus)).withMessage('Invalid status filter'),
];

export function handleAttendanceValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({ field: err.param, message: err.msg }));
    return res.status(400).json({ success: false, errors: formatted });
  }
  return next();
}


