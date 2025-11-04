import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { CourseStatus } from '../types/enums';

export const createCourseValidation: ValidationChain[] = [
  body('name').notEmpty().withMessage('Course name is required').trim().isLength({ min: 3, max: 200 }).withMessage('Course name must be 3-200 characters'),
  body('description').notEmpty().withMessage('Course description is required').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('code').optional().trim().isLength({ min: 2, max: 20 }).withMessage('Course code must be 2-20 characters').toUpperCase(),
  body('teacher').notEmpty().withMessage('Teacher is required').isMongoId().withMessage('Invalid teacher ID'),
  body('maxStudents').optional().isInt({ min: 1, max: 500 }).withMessage('Max students must be between 1 and 500'),
  body('schedule.daysOfWeek').optional().isArray().withMessage('Days of week must be an array'),
  body('schedule.startTime').optional().isString().withMessage('Start time must be a string'),
  body('schedule.endTime').optional().isString().withMessage('End time must be a string'),
  body('schedule.duration').optional().isInt({ min: 1 }).withMessage('Duration must be a positive number'),
  body('status').optional().isIn(Object.values(CourseStatus)).withMessage('Invalid course status'),
  body('startDate').optional().isISO8601().toDate().withMessage('Invalid start date'),
  body('endDate').optional().isISO8601().toDate().withMessage('Invalid end date'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('prerequisites').optional().isArray().withMessage('Prerequisites must be an array'),
  body('syllabus').optional().isString().withMessage('Syllabus must be a string'),
];

export const updateCourseValidation: ValidationChain[] = [
  body('name').optional().trim().isLength({ min: 3, max: 200 }).withMessage('Course name must be 3-200 characters'),
  body('description').optional().trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('teacher').optional().isMongoId().withMessage('Invalid teacher ID'),
  body('maxStudents').optional().isInt({ min: 1, max: 500 }).withMessage('Max students must be between 1 and 500'),
  body('status').optional().isIn(Object.values(CourseStatus)).withMessage('Invalid course status'),
  body('startDate').optional().isISO8601().toDate().withMessage('Invalid start date'),
  body('endDate').optional().isISO8601().toDate().withMessage('Invalid end date'),
  body('schedule.daysOfWeek').optional().isArray().withMessage('Days of week must be an array'),
  body('schedule.startTime').optional().isString().withMessage('Start time must be a string'),
  body('schedule.endTime').optional().isString().withMessage('End time must be a string'),
  body('schedule.duration').optional().isInt({ min: 1 }).withMessage('Duration must be a positive number'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('prerequisites').optional().isArray().withMessage('Prerequisites must be an array'),
  body('syllabus').optional().isString().withMessage('Syllabus must be a string'),
];

export const enrollStudentValidation: ValidationChain[] = [
  body('studentId').notEmpty().withMessage('Student ID is required').isMongoId().withMessage('Invalid student ID'),
];

export const unenrollStudentValidation: ValidationChain[] = [
  body('studentId').notEmpty().withMessage('Student ID is required').isMongoId().withMessage('Invalid student ID'),
];

export const courseIdParamValidation: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid course ID'),
];

export const courseQueryValidation: ValidationChain[] = [
  query('status').optional().isIn(Object.values(CourseStatus)).withMessage('Invalid status filter'),
  query('teacher').optional().isMongoId().withMessage('Invalid teacher ID'),
  query('search').optional().isString().trim().withMessage('Search must be a string'),
];

export function handleCourseValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({ field: err.param, message: err.msg }));
    return res.status(400).json({ success: false, errors: formatted });
  }
  next();
}


