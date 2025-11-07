import { Request, Response } from 'express';
import TutorLeadApplication from '../models/TutorLeadApplication';

export async function createTutorLead(req: Request, res: Response) {
  try {
    const payload = req.body;

    // Prevent duplicate email/phone (basic guard)
    const existing = await TutorLeadApplication.findOne({ $or: [ { email: payload.email }, { phoneNumber: payload.phoneNumber } ] });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A tutor application with this email or phone already exists' });
    }

    const doc = await TutorLeadApplication.create(payload);
    return res.status(201).json({ success: true, data: { id: doc.id, teacherId: doc.teacherId } });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e?.message || 'Failed to create tutor lead' });
  }
}
