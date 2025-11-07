import { Router } from 'express';
import { tutorLeadLogin, tutorLeadMe, updateTutorLeadMe } from '../controllers/tutorLeadAuthController';
import { body } from 'express-validator';
import { handleValidationErrors } from '../validators/authValidator';

const router = Router();

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail().trim(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  handleValidationErrors,
  tutorLeadLogin
);

export default router;
router.get('/me', tutorLeadMe);
router.patch('/me', updateTutorLeadMe);
