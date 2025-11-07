import { Router } from 'express';
import { uploadSingleDocument, uploadSingleImage } from '../middlewares/upload';
import { uploadAadhar, uploadAvatar } from '../controllers/tutorLeadDocumentController';

const router = Router();

// Accepts multipart/form-data with field name 'document' (PDF)
router.post('/aadhar', uploadSingleDocument('document'), uploadAadhar);

// Accepts multipart/form-data with field name 'avatar' (image)
router.post('/avatar', uploadSingleImage('avatar'), uploadAvatar);

export default router;
