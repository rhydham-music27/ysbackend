import { Router } from 'express';
import authenticate from '../middlewares/auth';
import { convertLead } from '../controllers/finalClassController';

const router = Router();

/**
 * @route   POST /api/v1/classes/convert
 * @desc    Convert an approved & paid lead into a final class
 * @access  Private (Bearer token required)
 * @body    { leadId, cityCode, tutorAssigned?, tutorTier?, firstMonthStartDate?, monthStartDate? }
 */
router.post('/convert', authenticate, convertLead);

export default router;


