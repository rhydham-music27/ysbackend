import { NextFunction, Request, Response } from 'express';
import { convertLeadToFinalClass } from '../services/finalClassService';

export async function convertLead(req: Request, res: Response, next: NextFunction) {
  try {
    const { leadId, cityCode, tutorAssigned, tutorTier, firstMonthStartDate, monthStartDate } = req.body as {
      leadId: string;
      cityCode: string;
      tutorAssigned?: string;
      tutorTier?: string;
      firstMonthStartDate?: string;
      monthStartDate?: string;
    };

    const finalClass = await convertLeadToFinalClass({
      leadId,
      cityCode,
      tutorAssigned,
      tutorTier,
      firstMonthStartDate: firstMonthStartDate ? new Date(firstMonthStartDate) : undefined,
      monthStartDate: monthStartDate ? new Date(monthStartDate) : undefined,
    });

    return res.status(201).json({ success: true, message: 'Lead converted to final class', data: { finalClass } });
  } catch (error) {
    return next(error);
  }
}


