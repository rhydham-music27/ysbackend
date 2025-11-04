import { NextFunction, Request, Response } from 'express';
import Lead from '../models/Lead';

export async function createLead(req: Request, res: Response, next: NextFunction) {
  try {
    const lead = await Lead.create(req.body);
    return res.status(201).json({ success: true, message: 'Lead created', data: { lead } });
  } catch (error) {
    return next(error);
  }
}

export async function listLeads(_req: Request, res: Response, next: NextFunction) {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: { leads } });
  } catch (error) {
    return next(error);
  }
}

export async function getLead(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }
    return res.status(200).json({ success: true, data: { lead } });
  } catch (error) {
    return next(error);
  }
}



