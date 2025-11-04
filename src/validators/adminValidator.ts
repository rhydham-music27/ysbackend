import { body, param, query, ValidationChain, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { UserRole, AuditAction } from '../types/enums';

export const createUserValidation: ValidationChain[] = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()
    .trim(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(Object.values(UserRole))
    .withMessage('Invalid role'),
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
  body('profile.phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const updateUserValidation: ValidationChain[] = [
  body('email')
    .optional()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail()
    .trim(),
  body('role').optional().isIn(Object.values(UserRole)).withMessage('Invalid role'),
  body('profile.firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be 2-50 characters'),
  body('profile.lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be 2-50 characters'),
  body('profile.phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body().custom((value, { req }) => {
    if (!value.email && !value.role && !value.profile && value.isActive === undefined) {
      throw new Error('At least one field must be provided for update');
    }
    return true;
  }),
];

export const assignRoleValidation: ValidationChain[] = [
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(Object.values(UserRole))
    .withMessage('Invalid role'),
];

export const bulkImportUsersValidation: ValidationChain[] = [
  body('users')
    .notEmpty()
    .withMessage('Users array is required')
    .isArray({ min: 1 })
    .withMessage('Users must be a non-empty array')
    .custom((value) => {
      if (value.length > 100) {
        throw new Error('Cannot import more than 100 users at once');
      }
      return true;
    }),
  body('users.*.email')
    .notEmpty()
    .withMessage('Email is required for each user')
    .isEmail()
    .withMessage('Valid email is required'),
  body('users.*.password')
    .notEmpty()
    .withMessage('Password is required for each user')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('users.*.role')
    .notEmpty()
    .withMessage('Role is required for each user')
    .isIn(Object.values(UserRole))
    .withMessage('Invalid role'),
  body('users.*.profile.firstName')
    .notEmpty()
    .withMessage('First name is required for each user'),
  body('users.*.profile.lastName')
    .notEmpty()
    .withMessage('Last name is required for each user'),
];

export const bulkEnrollmentValidation: ValidationChain[] = [
  body('courseId')
    .notEmpty()
    .withMessage('Course ID is required')
    .isMongoId()
    .withMessage('Invalid course ID'),
  body('studentIds')
    .notEmpty()
    .withMessage('Student IDs array is required')
    .isArray({ min: 1 })
    .withMessage('Student IDs must be a non-empty array')
    .custom((value) => {
      if (value.length > 100) {
        throw new Error('Cannot enroll more than 100 students at once');
      }
      return true;
    }),
  body('studentIds.*').isMongoId().withMessage('Each student ID must be a valid MongoDB ID'),
];

export const updateSettingValidation: ValidationChain[] = [
  body('value').notEmpty().withMessage('Value is required'),
];

export const userIdParamValidation: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid user ID'),
];

export const settingKeyParamValidation: ValidationChain[] = [
  param('key')
    .notEmpty()
    .withMessage('Setting key is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Setting key must be 2-100 characters'),
];

export const auditLogQueryValidation: ValidationChain[] = [
  query('adminId').optional().isMongoId().withMessage('Invalid admin ID'),
  query('action')
    .optional()
    .isIn(Object.values(AuditAction))
    .withMessage('Invalid audit action'),
  query('targetUserId').optional().isMongoId().withMessage('Invalid target user ID'),
  query('startDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .toDate()
    .withMessage('Invalid end date format'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('Limit must be between 1 and 500'),
  query().custom((value, { req }) => {
    if (value.startDate && value.endDate) {
      const start = new Date(value.startDate);
      const end = new Date(value.endDate);
      if (start > end) {
        throw new Error('Start date must be before end date');
      }
    }
    return true;
  }),
];

export const userQueryValidation: ValidationChain[] = [
  query('role').optional().isIn(Object.values(UserRole)).withMessage('Invalid role filter'),
  query('isActive')
    .optional()
    .custom((value) => {
      if (value !== 'true' && value !== 'false' && value !== undefined) {
        throw new Error('isActive must be a boolean');
      }
      return true;
    }),
  query('search').optional().isString().trim().withMessage('Search must be a string'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

export function handleAdminValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err: any) => ({
      field: err.param,
      message: err.msg,
    }));
    return res.status(400).json({ success: false, errors: formatted });
  }
  next();
}

