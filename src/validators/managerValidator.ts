import { body, param, ValidationChain } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const approvalNotesValidation: ValidationChain[] = [
  body('approvalNotes')
    .optional()
    .isString()
    .trim()
    .withMessage('Approval notes must be a string')
    .isLength({ max: 500 })
    .withMessage('Approval notes must not exceed 500 characters'),
];

export const rejectNotesValidation: ValidationChain[] = [
  body('approvalNotes')
    .notEmpty()
    .withMessage('Approval notes are required for rejection')
    .isString()
    .trim()
    .withMessage('Approval notes must be a string')
    .isLength({ min: 10, max: 500 })
    .withMessage('Approval notes must be 10-500 characters'),
];

export const courseIdParamValidation: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid course ID'),
];

export const scheduleIdParamValidation: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid schedule ID'),
];

export const teacherIdParamValidation: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid teacher ID'),
];

export function handleManagerValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.type === 'field' ? err.path : 'unknown',
      message: err.msg,
    }));
    return res.status(400).json({
      success: false,
      errors: formattedErrors,
    });
  }
  next();
}

