import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { GradeType } from '../types/enums';

export const addGradeValidation: ValidationChain[] = [
  body('student').notEmpty().withMessage('Student ID is required').isMongoId().withMessage('Invalid student ID'),
  body('course').notEmpty().withMessage('Course ID is required').isMongoId().withMessage('Invalid course ID'),
  body('assignment').optional().isMongoId().withMessage('Invalid assignment ID'),
  body('gradeType').notEmpty().withMessage('Grade type is required').isIn(Object.values(GradeType)).withMessage('Invalid grade type'),
  body('score').notEmpty().withMessage('Score is required').isFloat({ min: 0 }).withMessage('Score must be a non-negative number'),
  body('maxScore').notEmpty().withMessage('Max score is required').isFloat({ min: 1 }).withMessage('Max score must be at least 1'),
  body('weight').optional().isFloat({ min: 0, max: 10 }).withMessage('Weight must be between 0 and 10'),
  body('feedback').optional().isString().trim().withMessage('Feedback must be a string').isLength({ max: 2000 }).withMessage('Feedback must not exceed 2000 characters'),
  body('term').optional().isString().trim().withMessage('Term must be a string').isLength({ max: 50 }).withMessage('Term must not exceed 50 characters'),
  body('isPublished').optional().isBoolean().withMessage('isPublished must be a boolean'),
  body('notes').optional().isString().trim().withMessage('Notes must be a string').isLength({ max: 1000 }).withMessage('Notes must not exceed 1000 characters'),
  body('score').custom((value, { req }) => {
    if (typeof req.body.maxScore === 'number' && value > req.body.maxScore) {
      throw new Error('Score cannot exceed maximum score');
    }
    return true;
  }),
];

export const updateGradeValidation: ValidationChain[] = [
  body('score').optional().isFloat({ min: 0 }).withMessage('Score must be a non-negative number'),
  body('maxScore').optional().isFloat({ min: 1 }).withMessage('Max score must be at least 1'),
  body('weight').optional().isFloat({ min: 0, max: 10 }).withMessage('Weight must be between 0 and 10'),
  body('feedback').optional().isString().trim().withMessage('Feedback must be a string').isLength({ max: 2000 }).withMessage('Feedback must not exceed 2000 characters'),
  body('isPublished').optional().isBoolean().withMessage('isPublished must be a boolean'),
  body('notes').optional().isString().trim().withMessage('Notes must be a string').isLength({ max: 1000 }).withMessage('Notes must not exceed 1000 characters'),
  body('score').custom((value, { req }) => {
    if (
      typeof value === 'undefined' &&
      typeof req.body.maxScore === 'undefined' &&
      typeof req.body.weight === 'undefined' &&
      typeof req.body.feedback === 'undefined' &&
      typeof req.body.isPublished === 'undefined' &&
      typeof req.body.notes === 'undefined'
    ) {
      throw new Error('At least one field must be provided for update');
    }
    return true;
  }),
];

export const syncAssignmentGradeValidation: ValidationChain[] = [
  body('assignmentId').notEmpty().withMessage('Assignment ID is required').isMongoId().withMessage('Invalid assignment ID'),
  body('submissionId').notEmpty().withMessage('Submission ID is required').isMongoId().withMessage('Invalid submission ID'),
  body('studentId').notEmpty().withMessage('Student ID is required').isMongoId().withMessage('Invalid student ID'),
];

export const gradeIdParamValidation: ValidationChain[] = [param('id').isMongoId().withMessage('Invalid grade ID')];

export const studentIdParamValidation: ValidationChain[] = [param('id').isMongoId().withMessage('Invalid student ID')];

export const courseIdParamValidation: ValidationChain[] = [param('id').isMongoId().withMessage('Invalid course ID')];

export const studentCourseParamValidation: ValidationChain[] = [
  param('studentId').isMongoId().withMessage('Invalid student ID'),
  param('courseId').isMongoId().withMessage('Invalid course ID'),
];

export const gradeQueryValidation: ValidationChain[] = [
  query('student').optional().isMongoId().withMessage('Invalid student ID'),
  query('course').optional().isMongoId().withMessage('Invalid course ID'),
  query('gradeType').optional().isIn(Object.values(GradeType)).withMessage('Invalid grade type filter'),
  query('term').optional().isString().trim().withMessage('Term must be a string'),
  query('isPublished').optional().isBoolean().withMessage('isPublished must be a boolean'),
];

export function handleGradeValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({ field: err.param, message: err.msg }));
    return res.status(400).json({ success: false, errors: formatted });
  }
  return next();
}


