import { Router } from 'express';
import { createTutorLead } from '../controllers/tutorLeadController';
import { createTutorLeadValidation } from '../validators/tutorLeadValidator';
import { handleValidationErrors } from '../validators/authValidator';

const router = Router();

router.post('/', createTutorLeadValidation, handleValidationErrors, createTutorLead);

export default router;
