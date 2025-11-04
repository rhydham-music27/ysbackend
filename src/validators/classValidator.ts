import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ClassStatus } from '../types/enums';

export const createClassValidation: ValidationChain[] = [
  body('course').notEmpty().withMessage('Course is required').isMongoId().withMessage('Invalid course ID'),
  body('title').notEmpty().withMessage('Class title is required').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('description').optional().trim().isString().withMessage('Description must be a string'),
  body('teacher').notEmpty().withMessage('Teacher is required').isMongoId().withMessage('Invalid teacher ID'),
  body('coordinator').optional().isMongoId().withMessage('Invalid coordinator ID'),
  body('scheduledDate').notEmpty().withMessage('Scheduled date is required').isISO8601().toDate().withMessage('Invalid scheduled date'),
  body('startTime').notEmpty().withMessage('Start time is required').isISO8601().toDate().withMessage('Invalid start time'),
  body('endTime').notEmpty().withMessage('End time is required').isISO8601().toDate().withMessage('Invalid end time'),
  body('location.type').notEmpty().withMessage('Location type is required').isIn(['online', 'offline']).withMessage('Location type must be online or offline'),
  body('location.room').optional().isString().withMessage('Room must be a string'),
  body('location.building').optional().isString().withMessage('Building must be a string'),
  body('location.meetingLink').optional().isURL().withMessage('Meeting link must be a valid URL'),
  body('location.meetingId').optional().isString().withMessage('Meeting ID must be a string'),
  body('location.meetingPassword').optional().isString().withMessage('Meeting password must be a string'),
  body('maxStudents').optional().isInt({ min: 1, max: 500 }).withMessage('Max students must be between 1 and 500'),
  body('topics').optional().isArray().withMessage('Topics must be an array'),
  body('endTime')
    .custom((value, { req }) => {
      const start = new Date(req.body.startTime);
      const end = new Date(value);
      return end > start;
    })
    .withMessage('End time must be after start time'),
];

export const updateClassValidation: ValidationChain[] = [
  body('title').optional().trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('description').optional().trim().isString().withMessage('Description must be a string'),
  body('coordinator').optional().isMongoId().withMessage('Invalid coordinator ID'),
  body('scheduledDate').optional().isISO8601().toDate().withMessage('Invalid scheduled date'),
  body('startTime').optional().isISO8601().toDate().withMessage('Invalid start time'),
  body('endTime').optional().isISO8601().toDate().withMessage('Invalid end time'),
  body('status').optional().isIn(Object.values(ClassStatus)).withMessage('Invalid class status'),
  body('location.type').optional().isIn(['online', 'offline']).withMessage('Location type must be online or offline'),
  body('topics').optional().isArray().withMessage('Topics must be an array'),
  body('materials').optional().isArray().withMessage('Materials must be an array'),
  body('recordingUrl').optional().isURL().withMessage('Recording URL must be valid'),
  body('notes').optional().isString().withMessage('Notes must be a string'),
];

export const addStudentValidation: ValidationChain[] = [
  body('studentId').notEmpty().withMessage('Student ID is required').isMongoId().withMessage('Invalid student ID'),
];

export const removeStudentValidation: ValidationChain[] = [
  body('studentId').notEmpty().withMessage('Student ID is required').isMongoId().withMessage('Invalid student ID'),
];

export const classIdParamValidation: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid class ID'),
];

export const classQueryValidation: ValidationChain[] = [
  query('course').optional().isMongoId().withMessage('Invalid course ID'),
  query('teacher').optional().isMongoId().withMessage('Invalid teacher ID'),
  query('status').optional().isIn(Object.values(ClassStatus)).withMessage('Invalid status filter'),
  query('startDate').optional().isISO8601().toDate().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().toDate().withMessage('Invalid end date'),
  query('upcoming').optional().isBoolean().withMessage('Upcoming must be a boolean'),
];

export function handleClassValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({ field: err.param, message: err.msg }));
    return res.status(400).json({ success: false, errors: formatted });
  }
  next();
}


