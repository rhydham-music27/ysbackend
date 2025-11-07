import { Request, Response } from 'express';
import { uploadToCloudinary } from '../utils/fileUpload';
import { FileCategory } from '../types/enums';
import TutorLeadApplication from '../models/TutorLeadApplication';

export async function uploadAadhar(req: Request, res: Response) {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const tokenHeader = req.headers.authorization || '';
    const token = tokenHeader.toLowerCase().startsWith('bearer ') ? tokenHeader.slice(7).trim() : '';
    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Identify tutor lead from token (issued by tutor-lead-auth controller)
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    const id = decoded?.sub as string | undefined;
    if (!id) return res.status(401).json({ success: false, message: 'Invalid token' });

    const up = await uploadToCloudinary({ file, category: FileCategory.DOCUMENT, customFolder: 'yourshikshak/tutorlead/aadhar' });
    if (!up.success || !up.url) {
      return res.status(500).json({ success: false, message: up.error || 'Upload failed' });
    }

    const doc = await TutorLeadApplication.findByIdAndUpdate(id, { aadharUrl: up.url }, { new: true });

    return res.status(200).json({ success: true, message: 'Aadhaar uploaded', data: { url: up.url, aadharUrl: doc?.aadharUrl } });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e?.message || 'Upload failed' });
  }
}

export async function uploadAvatar(req: Request, res: Response) {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const tokenHeader = req.headers.authorization || '';
    const token = tokenHeader.toLowerCase().startsWith('bearer ') ? tokenHeader.slice(7).trim() : '';
    if (!token) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    const id = decoded?.sub as string | undefined;
    if (!id) return res.status(401).json({ success: false, message: 'Invalid token' });

    const up = await uploadToCloudinary({ file, category: FileCategory.PROFILE_AVATAR, customFolder: 'yourshikshak/tutorlead/avatar' });
    if (!up.success || !up.url) {
      return res.status(500).json({ success: false, message: up.error || 'Upload failed' });
    }

    const doc = await TutorLeadApplication.findByIdAndUpdate(id, { avatarUrl: up.url }, { new: true });
    return res.status(200).json({ success: true, message: 'Avatar uploaded', data: { url: up.url, avatarUrl: doc?.avatarUrl } });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e?.message || 'Upload failed' });
  }
}
