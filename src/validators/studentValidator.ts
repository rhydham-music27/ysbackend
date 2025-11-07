import { param, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

export const courseIdParamValidation: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid course ID'),
];

export function handleStudentValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({ field: err.param, message: err.msg }));
    return res.status(400).json({ success: false, errors: formatted });
  }
  return next();
}

