import { body, param, ValidationChain, validationResult } from 'express-validator';
import { NextFunction, Request, Response } from 'express';
import { LeadSource, LeadStatus, PreferredTutor, TuitionMode } from '../models/Lead';

export const createLeadValidation: ValidationChain[] = [
  body('parentsName').notEmpty().withMessage('parentsName is required').trim(),
  body('studentName').notEmpty().withMessage('studentName is required').trim(),
  body('contactNumber').notEmpty().withMessage('contactNumber is required').trim(),
  body('alternateNumber').optional().trim(),
  body('classAndBoard.classLevel').notEmpty().withMessage('classLevel is required').trim(),
  body('classAndBoard.board').notEmpty().withMessage('board is required').trim(),
  body('subjectsRequired').optional().isArray().withMessage('subjectsRequired must be an array of strings'),
  body('numClassesPerMonth').optional().isInt({ min: 1 }).withMessage('numClassesPerMonth must be >= 1'),
  body('classDurationMinutes').optional().isInt({ min: 1 }).withMessage('classDurationMinutes must be >= 1'),
  body('preferredTuitionMode')
    .isIn(Object.values(TuitionMode))
    .withMessage('preferredTuitionMode invalid'),
  body('classLocation.addressText').optional().isString(),
  body('classLocation.googleMapLink').optional().isString(),
  body('preferredTutor').isIn(Object.values(PreferredTutor)).withMessage('preferredTutor invalid'),
  body('fees').optional().isFloat({ min: 0 }).withMessage('fees must be >= 0'),
  body('demoTutor').optional().isString(),
  body('demoAt').optional().isISO8601().toDate(),
  body('parentsCustomizedDemands').optional().isString(),
  body('leadSource').isIn(Object.values(LeadSource)).withMessage('leadSource invalid'),
  body('leadStatus').isIn(Object.values(LeadStatus)).withMessage('leadStatus invalid'),
  body('paymentReceived.received').isBoolean().withMessage('paymentReceived.received is required'),
  body('paymentReceived.amount').optional().isFloat({ min: 0 }).withMessage('amount must be >= 0'),
  body('mentorNote').optional().isString(),
  body('leadAssignedTo').optional().isString(),
  body('isConverted').optional().isBoolean(),
  body('paymentMode').optional().isString(),
  body('invoiceId').optional().isString(),
];

export const leadIdParamValidation: ValidationChain[] = [
  param('id').isMongoId().withMessage('Invalid lead id'),
];

export function handleLeadValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({ field: (err as any).path ?? (err as any).param, message: err.msg }));
    return res.status(400).json({ success: false, errors: formatted });
  }
  return next();
}



