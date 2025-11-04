import { body, ValidationChain, validationResult } from 'express-validator';
import { NextFunction, Request, Response } from 'express';
import { UserRole } from '../types/enums';

export const registerValidation: ValidationChain[] = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail().trim(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('profile.firstName')
    .notEmpty()
    .withMessage('First name is required')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be 2-50 characters'),
  body('profile.lastName')
    .notEmpty()
    .withMessage('Last name is required')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be 2-50 characters'),
  body('role')
    .optional()
    .isIn(Object.values(UserRole))
    .withMessage('Invalid role'),
  body('profile.phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Invalid phone number'),
];

export const loginValidation: ValidationChain[] = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail().trim(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const refreshTokenValidation: ValidationChain[] = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required').isString().withMessage('Refresh token must be a string'),
];

export const changePasswordValidation: ValidationChain[] = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('confirmPassword').custom((value, { req }) => value === req.body.newPassword).withMessage('Passwords do not match'),
];

export const updateProfileValidation: ValidationChain[] = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be 2-50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be 2-50 characters'),
  body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
  body('dateOfBirth').optional().isISO8601().toDate().withMessage('Invalid date of birth format'),
  body('address.street').optional().isString().trim().withMessage('Street must be a string'),
  body('address.city').optional().isString().trim().withMessage('City must be a string'),
  body('address.state').optional().isString().trim().withMessage('State must be a string'),
  body('address.zipCode').optional().isString().trim().withMessage('Zip code must be a string'),
  body('address.country').optional().isString().trim().withMessage('Country must be a string'),
  body('firstName').custom((value, { req }) => {
    if (
      !value &&
      !req.body.lastName &&
      !req.body.phone &&
      !req.body.dateOfBirth &&
      !req.body.address
    ) {
      throw new Error('At least one field must be provided for update');
    }
    return true;
  }),
];

export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({ field: err.param, message: err.msg }));
    return res.status(400).json({ success: false, errors: formatted });
  }
  return next();
}


