import { Router } from 'express';
import authenticate from '../middlewares/auth';
import { createLead, getLead, listLeads } from '../controllers/leadController';
import { createLeadValidation, handleLeadValidationErrors, leadIdParamValidation } from '../validators/leadValidator';

const router = Router();

/**
 * @swagger
 * /api/v1/leads:
 *   post:
 *     summary: Create a new lead
 *     tags: [Leads]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateLeadRequest'
 *     responses:
 *       201:
 *         description: Lead created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, createLeadValidation, handleLeadValidationErrors, createLead);

/**
 * @swagger
 * /api/v1/leads:
 *   get:
 *     summary: List leads (newest first)
 *     tags: [Leads]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of leads
 *       401:
 *         description: Unauthorized
 */
router.get('/', authenticate, listLeads);

/**
 * @swagger
 * /api/v1/leads/{id}:
 *   get:
 *     summary: Get a single lead by id
 *     tags: [Leads]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lead details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lead not found
 */
router.get('/:id', authenticate, leadIdParamValidation, handleLeadValidationErrors, getLead);

export default router;



