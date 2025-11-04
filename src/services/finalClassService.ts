import mongoose from 'mongoose';
import Lead, { ILead, LeadStatus } from '../models/Lead';
import FinalClass, { IFinalClass, ClassStatus } from '../models/FinalClass';
import { generateClassId } from '../utils/classId';

export interface ConvertLeadParams {
  leadId: string;
  cityCode: string;
  tutorAssigned?: string;
  tutorTier?: string;
  firstMonthStartDate?: Date;
  monthStartDate?: Date;
}

export async function convertLeadToFinalClass(params: ConvertLeadParams): Promise<IFinalClass> {
  const { leadId, cityCode, tutorAssigned, tutorTier, firstMonthStartDate, monthStartDate } = params;

  const lead = await Lead.findById(leadId);
  if (!lead) {
    throw new Error('Lead not found');
  }

  // Must be approved demo and payment received
  if (lead.leadStatus !== LeadStatus.DEMO_APPROVED_BY_PARENT) {
    throw new Error('Lead is not approved by parent');
  }
  if (!lead.paymentReceived?.received) {
    throw new Error('Payment not received');
  }

  const classId = generateClassId(cityCode);

  const doc = await FinalClass.create({
    lead: lead._id as mongoose.Types.ObjectId,
    classId,
    classStatus: ClassStatus.ACTIVE,
    tutorAssigned: tutorAssigned ? new mongoose.Types.ObjectId(tutorAssigned) : undefined,
    tutorTier,
    firstMonthStartDate,
    monthStartDate,
  });

  // mark lead converted for easy filtering
  lead.isConverted = true;
  await lead.save();

  return doc;
}


