import { Router } from 'express';
import authenticate from '../middlewares/auth';
import { convertLead } from '../controllers/finalClassController';

const router = Router();

/**
 * @swagger
 * /api/v1/classes/convert:
 *   post:
 *     summary: Convert an approved & paid lead into a final class
 *     tags: [FinalClass]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [leadId, cityCode]
 *             properties:
 *               leadId:
 *                 type: string
 *               cityCode:
 *                 type: string
 *               tutorAssigned:
 *                 type: string
 *               tutorTier:
 *                 type: string
 *               firstMonthStartDate:
 *                 type: string
 *                 format: date
 *               monthStartDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       200:
 *         description: Lead converted to final class successfully
 *       400:
 *         description: Validation error or lead not approved/paid
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Lead not found
 */
router.post('/convert', authenticate, convertLead);

export default router;


