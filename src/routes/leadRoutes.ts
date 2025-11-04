import { Router } from 'express';
import authenticate from '../middlewares/auth';
import { createLead, getLead, listLeads } from '../controllers/leadController';
import { createLeadValidation, handleLeadValidationErrors, leadIdParamValidation } from '../validators/leadValidator';

const router = Router();

/**
 * @route   POST /api/v1/leads
 * @desc    Create a new lead
 * @access  Private (Bearer token required)
 */
router.post('/', authenticate, createLeadValidation, handleLeadValidationErrors, createLead);

/**
 * @route   GET /api/v1/leads
 * @desc    List leads (newest first)
 * @access  Private (Bearer token required)
 */
router.get('/', authenticate, listLeads);

/**
 * @route   GET /api/v1/leads/:id
 * @desc    Get a single lead by id
 * @access  Private (Bearer token required)
 */
router.get('/:id', authenticate, leadIdParamValidation, handleLeadValidationErrors, getLead);

export default router;



