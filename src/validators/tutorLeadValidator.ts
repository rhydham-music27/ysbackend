import { body, ValidationChain } from 'express-validator';

export const createTutorLeadValidation: ValidationChain[] = [
  body('fullName').notEmpty().withMessage('Full name is required').isString().trim(),
  body('gender').isIn(['Male', 'Female', 'Other']).withMessage('Invalid gender'),
  body('phoneNumber').notEmpty().withMessage('Phone is required').matches(/^\d{10}$/).withMessage('Phone must be 10 digits'),
  body('email').notEmpty().isEmail().withMessage('Valid email required').normalizeEmail().trim(),
  body('qualification').notEmpty().withMessage('Qualification is required').isString().trim(),
  body('experience').notEmpty().withMessage('Experience is required').isString().trim(),
  body('subjects').isArray({ min: 1 }).withMessage('Select at least one subject'),
  body('subjects.*').isString().withMessage('Subject must be string'),
  body('city').notEmpty().withMessage('City is required').isString().trim(),
  body('preferredAreas').isArray({ min: 1 }).withMessage('Select at least one area'),
  body('preferredAreas.*').isString().withMessage('Area must be string'),
  body('pincode').matches(/^\d{6}$/).withMessage('Pincode must be 6 digits'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];
