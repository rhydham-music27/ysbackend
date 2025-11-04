import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { DayOfWeek, RecurrenceType } from '../types/enums';

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

export const createScheduleValidation: ValidationChain[] = [
  body('class').notEmpty().withMessage('Class ID is required').isMongoId().withMessage('Invalid class ID'),
  body('course').notEmpty().withMessage('Course ID is required').isMongoId().withMessage('Invalid course ID'),
  body('teacher').notEmpty().withMessage('Teacher ID is required').isMongoId().withMessage('Invalid teacher ID'),
  body('dayOfWeek')
    .notEmpty()
    .withMessage('Day of week is required')
    .isIn(Object.values(DayOfWeek))
    .withMessage('Invalid day of week'),
  body('startTime')
    .notEmpty()
    .withMessage('Start time is required')
    .matches(timeRegex)
    .withMessage('Start time must be in HH:MM format (e.g., 09:00)'),
  body('endTime')
    .notEmpty()
    .withMessage('End time is required')
    .matches(timeRegex)
    .withMessage('End time must be in HH:MM format (e.g., 10:30)'),
  body('room').optional().isString().trim().withMessage('Room must be a string').isLength({ max: 50 }).withMessage('Room must not exceed 50 characters'),
  body('building').optional().isString().trim().withMessage('Building must be a string').isLength({ max: 100 }).withMessage('Building must not exceed 100 characters'),
  body('recurrenceType').optional().isIn(Object.values(RecurrenceType)).withMessage('Invalid recurrence type'),
  body('effectiveFrom').optional().isISO8601().toDate().withMessage('Invalid effective from date'),
  body('effectiveTo').optional().isISO8601().toDate().withMessage('Invalid effective to date'),
  body('notes').optional().isString().trim().withMessage('Notes must be a string').isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters'),
  body('endTime').custom((value, { req }) => {
    const start = req.body.startTime?.split(':').map(Number);
    const end = value?.split(':').map(Number);
    if (!start || !end) return true;
    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];
    if (endMinutes <= startMinutes) throw new Error('End time must be after start time');
    return true;
  }),
  body('effectiveTo').optional().custom((value, { req }) => {
    if (req.body.effectiveFrom && value) {
      if (new Date(value) <= new Date(req.body.effectiveFrom)) throw new Error('Effective to date must be after effective from date');
    }
    return true;
  }),
];

export const updateScheduleValidation: ValidationChain[] = [
  body('dayOfWeek').optional().isIn(Object.values(DayOfWeek)).withMessage('Invalid day of week'),
  body('startTime').optional().matches(timeRegex).withMessage('Start time must be in HH:MM format'),
  body('endTime').optional().matches(timeRegex).withMessage('End time must be in HH:MM format'),
  body('room').optional().isString().trim().withMessage('Room must be a string').isLength({ max: 50 }).withMessage('Room must not exceed 50 characters'),
  body('building').optional().isString().trim().withMessage('Building must be a string').isLength({ max: 100 }).withMessage('Building must not exceed 100 characters'),
  body('effectiveFrom').optional().isISO8601().toDate().withMessage('Invalid effective from date'),
  body('effectiveTo').optional().isISO8601().toDate().withMessage('Invalid effective to date'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('notes').optional().isString().trim().withMessage('Notes must be a string').isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters'),
  body('dayOfWeek').custom((value, { req }) => {
    if (
      value === undefined &&
      req.body.startTime === undefined &&
      req.body.endTime === undefined &&
      req.body.room === undefined &&
      req.body.building === undefined &&
      req.body.effectiveFrom === undefined &&
      req.body.effectiveTo === undefined &&
      req.body.isActive === undefined &&
      req.body.notes === undefined
    ) {
      throw new Error('At least one field must be provided for update');
    }
    return true;
  }),
];

export const checkConflictsValidation: ValidationChain[] = [
  body('teacher').notEmpty().withMessage('Teacher ID is required').isMongoId().withMessage('Invalid teacher ID'),
  body('dayOfWeek').notEmpty().withMessage('Day of week is required').isIn(Object.values(DayOfWeek)).withMessage('Invalid day of week'),
  body('startTime').notEmpty().withMessage('Start time is required').matches(timeRegex).withMessage('Start time must be in HH:MM format'),
  body('endTime').notEmpty().withMessage('End time is required').matches(timeRegex).withMessage('End time must be in HH:MM format'),
  body('room').optional().isString().trim().withMessage('Room must be a string'),
  body('excludeId').optional().isMongoId().withMessage('Invalid exclude ID'),
];

export const generateClassesValidation: ValidationChain[] = [
  body('startDate').notEmpty().withMessage('Start date is required').isISO8601().toDate().withMessage('Invalid start date'),
  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .toDate()
    .withMessage('Invalid end date')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startDate)) throw new Error('End date must be after start date');
      return true;
    }),
];

export const scheduleIdParamValidation: ValidationChain[] = [param('id').isMongoId().withMessage('Invalid schedule ID')];
export const teacherIdParamValidation: ValidationChain[] = [param('id').isMongoId().withMessage('Invalid teacher ID')];
export const courseIdParamValidation: ValidationChain[] = [param('id').isMongoId().withMessage('Invalid course ID')];
export const dayParamValidation: ValidationChain[] = [param('day').isIn(Object.values(DayOfWeek)).withMessage('Invalid day of week')];

export const scheduleQueryValidation: ValidationChain[] = [
  query('course').optional().isMongoId().withMessage('Invalid course ID'),
  query('teacher').optional().isMongoId().withMessage('Invalid teacher ID'),
  query('dayOfWeek').optional().isIn(Object.values(DayOfWeek)).withMessage('Invalid day of week'),
  query('room').optional().isString().trim().withMessage('Room must be a string'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export function handleScheduleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({ field: err.param, message: err.msg }));
    return res.status(400).json({ success: false, errors: formatted });
  }
  return next();
}


