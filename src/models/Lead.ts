import mongoose, { Document, Model, Schema } from 'mongoose';

export enum TuitionMode {
  ONLINE = 'online',
  OFFLINE = 'offline',
}

export enum PreferredTutor {
  MALE = 'male',
  FEMALE = 'female',
  NO_PREFERENCE = 'no_preference',
}

export enum LeadSource {
  GOOGLE_PROFILE = 'Google profile',
  WHATSAPP = 'WhatsApp',
  REFERRED = 'Referred',
  OTHER = 'Other',
}

export enum LeadStatus {
  DEMO_SCHEDULE = 'DEMO SCHEDULE',
  DEMO_APPROVED_BY_PARENT = 'DEMO APPROVED BY PARENT',
  DEMO_REJECTED_BY_PARENT = 'DEMO REJECTED  BY PARENT',
  TUTOR_NOT_FOUND_FOR_DEMO = 'TUTOR NOT FOUND FOR DEMO',
  PARENT_DIDNT_RESPOND = "PARENT DID'NT RISPONDED",
  ENQUIRY = 'Enquiry',
}

export interface ILead extends Document {
  parentsName: string;
  studentName: string;
  contactNumber: string;
  alternateNumber?: string;
  classAndBoard: { classLevel: string; board: string };
  subjectsRequired: string[];
  numClassesPerMonth?: number;
  classDurationMinutes?: number;
  preferredTuitionMode: TuitionMode;
  classLocation?: { addressText?: string; googleMapLink?: string };
  preferredTutor: PreferredTutor;
  fees?: number;
  demoTutor?: mongoose.Types.ObjectId;
  demoAt?: Date;
  parentsCustomizedDemands?: string;
  leadSource: LeadSource;
  leadStatus: LeadStatus;
  paymentReceived: { received: boolean; amount?: number };
  mentorNote?: string;
  leadAssignedTo?: mongoose.Types.ObjectId;
  isConverted?: boolean;
  paymentMode?: string;
  invoiceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ILeadModel extends Model<ILead> {}

const LeadSchema = new Schema<ILead, ILeadModel>(
  {
    parentsName: { type: String, required: true, trim: true },
    studentName: { type: String, required: true, trim: true },
    contactNumber: { type: String, required: true, trim: true },
    alternateNumber: { type: String, trim: true },
    classAndBoard: {
      classLevel: { type: String, required: true, trim: true },
      board: { type: String, required: true, trim: true },
    },
    subjectsRequired: { type: [String], default: [] },
    numClassesPerMonth: { type: Number },
    classDurationMinutes: { type: Number },
    preferredTuitionMode: {
      type: String,
      enum: Object.values(TuitionMode),
      required: true,
    },
    classLocation: {
      addressText: { type: String, trim: true },
      googleMapLink: { type: String, trim: true },
    },
    preferredTutor: {
      type: String,
      enum: Object.values(PreferredTutor),
      required: true,
    },
    fees: { type: Number, min: 0 },
    demoTutor: { type: Schema.Types.ObjectId, ref: 'User' },
    demoAt: { type: Date },
    parentsCustomizedDemands: { type: String, trim: true },
    leadSource: { type: String, enum: Object.values(LeadSource), required: true },
    leadStatus: { type: String, enum: Object.values(LeadStatus), required: true, index: true },
    paymentReceived: {
      received: { type: Boolean, default: false },
      amount: { type: Number, min: 0 },
    },
    mentorNote: { type: String, trim: true },
    leadAssignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    isConverted: { type: Boolean, default: false, index: true },
    paymentMode: { type: String, trim: true },
    invoiceId: { type: String, trim: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

LeadSchema.virtual('leadId').get(function leadIdVirtual(this: ILead) {
  return (this as any)._id.toString();
});

LeadSchema.index({ contactNumber: 1 });
LeadSchema.index({ leadStatus: 1, leadSource: 1 });

const Lead = mongoose.model<ILead, ILeadModel>('Lead', LeadSchema);

export default Lead;


