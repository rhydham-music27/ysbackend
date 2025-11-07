import mongoose, { Document, Model, Schema } from 'mongoose';
import { hashPassword } from '../utils/password';

export interface ITutorLeadApplication extends Document {
  teacherId: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  gender: 'Male' | 'Female' | 'Other';
  phoneNumber: string;
  email: string;
  qualification: string;
  experience: string;
  subjects: string[];
  city: string;
  preferredAreas: string[];
  pincode: string;
  password: string;
  isVerification: boolean;
  aadharUrl?: string;
  avatarUrl?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

interface ITutorLeadApplicationModel extends Model<ITutorLeadApplication> {}

const TutorLeadApplicationSchema = new Schema<ITutorLeadApplication, ITutorLeadApplicationModel>(
  {
    teacherId: { type: String, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    phoneNumber: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    qualification: { type: String, required: true, trim: true },
    experience: { type: String, required: true, trim: true },
    subjects: { type: [String], default: [], validate: [(arr: string[]) => arr.length > 0, 'At least one subject required'] },
    city: { type: String, required: true, trim: true },
    preferredAreas: { type: [String], default: [], validate: [(arr: string[]) => arr.length > 0, 'At least one area required'] },
    pincode: { type: String, required: true, trim: true, match: [/^\d{6}$/ , 'Pincode must be 6 digits'] },
    password: { type: String, required: true, minlength: 6, select: false },
    isVerification: { type: Boolean, default: false },
    aadharUrl: { type: String, trim: true },
    avatarUrl: { type: String, trim: true },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, trim: true },
    },
  },
  { timestamps: true }
);

function randomLetters(count: number) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let s = '';
  for (let i = 0; i < count; i += 1) s += letters[Math.floor(Math.random() * letters.length)];
  return s;
}

function randomDigits(count: number) {
  let n = '';
  for (let i = 0; i < count; i += 1) n += Math.floor(Math.random() * 10).toString();
  return n;
}

async function generateUniqueTeacherId(gender: ITutorLeadApplication['gender']): Promise<string> {
  const g = (gender || 'Other').charAt(0).toUpperCase();
  for (let attempts = 0; attempts < 25; attempts += 1) {
    const candidate = `T${g}${randomLetters(2)}${randomDigits(4)}`;
    const exists = await TutorLeadApplication.exists({ teacherId: candidate });
    if (!exists) return candidate;
  }
  // fallback with timestamp shard
  return `T${g}${randomLetters(2)}${Date.now().toString().slice(-4)}`;
}

TutorLeadApplicationSchema.pre('validate', async function preValidate(next) {
  try {
    const doc = this as ITutorLeadApplication;
    if (!doc.teacherId) {
      doc.teacherId = await generateUniqueTeacherId(doc.gender);
    }
    next();
  } catch (e) {
    next(e as any);
  }
});

TutorLeadApplicationSchema.pre('save', async function preSave(next) {
  try {
    const doc = this as ITutorLeadApplication;
    if (doc.isModified('password')) {
      doc.password = await hashPassword(doc.password);
    }
    return next();
  } catch (e) {
    return next(e as any);
  }
});

TutorLeadApplicationSchema.index({ email: 1 });
TutorLeadApplicationSchema.index({ phoneNumber: 1 });
TutorLeadApplicationSchema.index({ teacherId: 1 }, { unique: true });

const TutorLeadApplication = mongoose.model<ITutorLeadApplication, ITutorLeadApplicationModel>('TutorLeadApplication', TutorLeadApplicationSchema);
export default TutorLeadApplication;
