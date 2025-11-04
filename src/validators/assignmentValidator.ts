import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { AssignmentStatus } from '../types/enums';

export const createAssignmentValidation: ValidationChain[] = [
  body('title').notEmpty().withMessage('Assignment title is required').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('description').notEmpty().withMessage('Assignment description is required').trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('course').notEmpty().withMessage('Course ID is required').isMongoId().withMessage('Invalid course ID'),
  body('dueDate')
    .notEmpty()
    .withMessage('Due date is required')
    .isISO8601()
    .toDate()
    .withMessage('Invalid due date format')
    .custom((value) => {
      if (new Date(value) <= new Date()) throw new Error('Due date must be in the future');
      return true;
    }),
  body('publishDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Invalid publish date format')
    .custom((value, { req }) => {
      if (req.body.dueDate && new Date(value) >= new Date(req.body.dueDate)) throw new Error('Publish date must be before due date');
      return true;
    }),
  body('maxGrade').optional().isInt({ min: 1, max: 1000 }).withMessage('Max grade must be between 1 and 1000'),
  body('attachments').optional().isArray().withMessage('Attachments must be an array'),
  body('attachments.*').optional().isURL().withMessage('Each attachment must be a valid URL'),
  body('instructions').optional().isString().trim().withMessage('Instructions must be a string'),
  body('allowLateSubmission').optional().isBoolean().withMessage('Allow late submission must be a boolean'),
  body('lateSubmissionPenalty').optional().isInt({ min: 0, max: 100 }).withMessage('Late submission penalty must be between 0 and 100'),
];

export const updateAssignmentValidation: ValidationChain[] = [
  body('title').optional().trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('description').optional().trim().isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('dueDate').optional().isISO8601().toDate().withMessage('Invalid due date format'),
  body('publishDate').optional().isISO8601().toDate().withMessage('Invalid publish date format'),
  body('maxGrade').optional().isInt({ min: 1, max: 1000 }).withMessage('Max grade must be between 1 and 1000'),
  body('status').optional().isIn(Object.values(AssignmentStatus)).withMessage('Invalid assignment status'),
  body('allowLateSubmission').optional().isBoolean().withMessage('Allow late submission must be a boolean'),
  body('lateSubmissionPenalty').optional().isInt({ min: 0, max: 100 }).withMessage('Late submission penalty must be between 0 and 100'),
];

export const submitAssignmentValidation: ValidationChain[] = [
  body('content').optional().isString().trim().withMessage('Content must be a string').isLength({ max: 10000 }).withMessage('Content must not exceed 10000 characters'),
  body('attachments').optional().isArray().withMessage('Attachments must be an array'),
  body('attachments.*').optional().isURL().withMessage('Each attachment must be a valid URL'),
  body('content').custom((value, { req }) => {
    if (!value && (!req.body.attachments || req.body.attachments.length === 0)) {
      throw new Error('Either content or attachments must be provided');
    }
    return true;
  }),
];

export const gradeSubmissionValidation: ValidationChain[] = [
  body('grade').notEmpty().withMessage('Grade is required').isFloat({ min: 0 }).withMessage('Grade must be a non-negative number'),
  body('feedback').optional().isString().trim().withMessage('Feedback must be a string').isLength({ max: 2000 }).withMessage('Feedback must not exceed 2000 characters'),
];

export const assignmentIdParamValidation: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid assignment ID'),
];

export const submissionIdParamValidation: ValidationChain[] = [
  param('submissionId').isMongoId().withMessage('Invalid submission ID'),
];

export const assignmentQueryValidation: ValidationChain[] = [
  query('course').optional().isMongoId().withMessage('Invalid course ID'),
  query('status').optional().isIn(Object.values(AssignmentStatus)).withMessage('Invalid status filter'),
  query('teacher').optional().isMongoId().withMessage('Invalid teacher ID'),
  query('dueAfter').optional().isISO8601().toDate().withMessage('Invalid dueAfter date format'),
  query('dueBefore').optional().isISO8601().toDate().withMessage('Invalid dueBefore date format'),
];

export function handleAssignmentValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({ field: err.param, message: err.msg }));
    return res.status(400).json({ success: false, errors: formatted });
  }
  return next();
}


