import mongoose, { Document, Model, Schema } from 'mongoose';
import { getCityCodeFromName } from '../utils/cityCodes';

// Personal Details
export interface IPersonalDetails {
  tutorId: string;
  fullName?: string;
  whatsappNumber?: string;
  alternateNumber?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  profilePhoto?: string;
}

// Education
export interface IEducation {
  highestQualification?: string;
  currentInstitution?: string;
}

// Work Experience
export interface IWorkExperience {
  currentlyEmployed?: boolean;
  employerName?: string;
  teachingExperience?: string;
  subjects?: string[];
  extracurricularActivities?: string[];
  classesCanTeach?: string[];
  educationBoards?: string[];
}

// Location Preferences
export type TeachingMode = 'Online' | 'Offline' | 'Both';
export interface ILocationPreferences {
  fullAddress?: string;
  pinCode?: string;
  teachingMode?: TeachingMode;
  cityCode?: string; // e.g., BPL for Bhopal
  city?: string; // e.g., Bhopal
  preferredLocations?: string[];
  availableTimeSlots?: string[];
}

// Documents
export interface IDocuments {
  profilePhoto?: string;
  experienceProof?: string;
  aadharCard?: string;
  marksheet?: string;
  paymentScreenshot?: string;
}

// Assigned Class (within Tutor)
export interface IAssignedClass {
  classId: string;
  subject?: string;
  grade?: string;
  studentName?: string;
  topic?: string;
  schedule?: string;
  duration?: number; // in hours
  totalSessions?: number;
  completedSessions?: number;
  nextSession?: Date;
}

// Attendance (separate collection)
export type AttendanceStatus = 'Pending' | 'Present' | 'Absent';
export interface IAttendance extends Document {
  attendanceId: string;
  tutorId: mongoose.Types.ObjectId;
  classId: string;
  date: Date;
  status: AttendanceStatus;
  duration?: number;
  topicsCovered?: string;
  markedAt?: Date;
}

// Payment Record (separate collection)
export type PaymentStatus = 'Paid' | 'Pending' | 'Upcoming';
export interface IPaymentRecord extends Document {
  paymentId: string;
  tutorId: mongoose.Types.ObjectId;
  classId?: string;
  className?: string;
  amount?: number;
  date?: Date;
  status?: PaymentStatus;
  paymentCycle?: string;
}

// Test Assignment (separate collection)
export interface ITestAssignment extends Document {
  testId: string;
  tutorId: mongoose.Types.ObjectId;
  classId?: string;
  studentName?: string;
  subject?: string;
  topic?: string;
  date?: Date;
  time?: string;
  location?: string;
  payment?: number;
  reportSubmitted?: boolean;
  testDetails?: string;
}

// Tutor main document
export interface ITutor extends Document {
  // Optional link to core User account to avoid duplication
  user?: mongoose.Types.ObjectId;

  personalDetails: IPersonalDetails;
  education?: IEducation;
  workExperience?: IWorkExperience;
  locationPreferences?: ILocationPreferences;
  documents?: IDocuments;
  assignedClasses?: IAssignedClass[];
  totalTeachingHours?: number;
  rating?: number;
  totalReviews?: number;
  createdAt: Date;
  updatedAt: Date;
}

interface ITutorModel extends Model<ITutor> {}

// Sub-schemas
const PersonalDetailsSchema = new Schema<IPersonalDetails>(
  {
    tutorId: { type: String, required: true, unique: true },
    fullName: String,
    whatsappNumber: String,
    alternateNumber: String,
    email: String,
    dateOfBirth: String,
    gender: String,
    profilePhoto: String,
  },
  { _id: false }
);

const EducationSchema = new Schema<IEducation>(
  {
    highestQualification: String,
    currentInstitution: String,
  },
  { _id: false }
);

const WorkExperienceSchema = new Schema<IWorkExperience>(
  {
    currentlyEmployed: Boolean,
    employerName: String,
    teachingExperience: String,
    subjects: [String],
    extracurricularActivities: [String],
    classesCanTeach: [String],
    educationBoards: [String],
  },
  { _id: false }
);

const LocationPreferencesSchema = new Schema<ILocationPreferences>(
  {
    fullAddress: String,
    pinCode: String,
    teachingMode: { type: String, enum: ['Online', 'Offline', 'Both'], default: 'Both' },
    cityCode: { type: String },
    city: { type: String },
    preferredLocations: [String],
    availableTimeSlots: [String],
  },
  { _id: false }
);

const DocumentsSchema = new Schema<IDocuments>(
  {
    profilePhoto: String,
    experienceProof: String,
    aadharCard: String,
    marksheet: String,
    paymentScreenshot: String,
  },
  { _id: false }
);

const AssignedClassSchema = new Schema<IAssignedClass>(
  {
    classId: { type: String, required: true },
    subject: String,
    grade: String,
    studentName: String,
    topic: String,
    schedule: String,
    duration: Number,
    totalSessions: Number,
    completedSessions: Number,
    nextSession: Date,
  },
  { _id: false }
);

const AttendanceSchema = new Schema<IAttendance>(
  {
    attendanceId: { type: String, required: true, unique: true },
    tutorId: { type: Schema.Types.ObjectId, ref: 'Tutor' },
    classId: { type: String, required: true },
    date: { type: Date, required: true },
    status: { type: String, enum: ['Pending', 'Present', 'Absent'], default: 'Pending' },
    duration: Number,
    topicsCovered: String,
    markedAt: Date,
  },
  { timestamps: true }
);
AttendanceSchema.index({ tutorId: 1, classId: 1, date: 1 }, { unique: true });

const PaymentRecordSchema = new Schema<IPaymentRecord>(
  {
    paymentId: { type: String, required: true, unique: true },
    tutorId: { type: Schema.Types.ObjectId, ref: 'Tutor' },
    classId: String,
    className: String,
    amount: Number,
    date: Date,
    status: { type: String, enum: ['Paid', 'Pending', 'Upcoming'] },
    paymentCycle: String,
  },
  { timestamps: true }
);

const TestAssignmentSchema = new Schema<ITestAssignment>(
  {
    testId: { type: String, required: true, unique: true },
    tutorId: { type: Schema.Types.ObjectId, ref: 'Tutor' },
    classId: String,
    studentName: String,
    subject: String,
    topic: String,
    date: Date,
    time: String,
    location: String,
    payment: Number,
    reportSubmitted: { type: Boolean, default: false },
    testDetails: String,
  },
  { timestamps: true }
);

const TutorSchema = new Schema<ITutor, ITutorModel>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', unique: true, sparse: true },
    personalDetails: { type: PersonalDetailsSchema, required: true },
    education: { type: EducationSchema, required: false },
    workExperience: { type: WorkExperienceSchema, required: false },
    locationPreferences: { type: LocationPreferencesSchema, required: false },
    documents: { type: DocumentsSchema, required: false },
    assignedClasses: { type: [AssignedClassSchema], default: [] },
    totalTeachingHours: { type: Number },
    rating: { type: Number },
    totalReviews: { type: Number },
  },
  { timestamps: true }
);

function deriveGenderCode(gender?: string): string {
  const g = String(gender || '').toLowerCase();
  if (g.startsWith('m')) return 'M';
  if (g.startsWith('f')) return 'F';
  return 'X';
}

function normalizeCityCode(code?: string, cityName?: string): string {
  // Prefer explicit code, else try mapping from city name, else fallback
  const direct = code?.trim();
  const mapped = getCityCodeFromName(cityName || undefined) || undefined;
  const chosen = (direct && direct.toUpperCase()) || mapped || '';
  const cleaned = chosen.toUpperCase().replace(/[^A-Z]/g, '');
  return cleaned.slice(0, 5) || 'XXX';
}

async function generateUniqueTutorId(doc: ITutor): Promise<string> {
  const genderCode = deriveGenderCode(doc.personalDetails?.gender);
  const cityCode = normalizeCityCode(doc.locationPreferences?.cityCode, doc.locationPreferences?.city);
  // 4-digit random from 1000-9999
  // Loop until unique
  // In practice, collisions are rare; cap attempts to avoid infinite loop
  for (let attempts = 0; attempts < 20; attempts += 1) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    const candidate = `T${genderCode}${cityCode}${rand}`;
    const exists = await Tutor.exists({ 'personalDetails.tutorId': candidate });
    if (!exists) return candidate;
  }
  // Fallback: include timestamp shard to reduce collisions further
  const fallback = `T${genderCode}${cityCode}${Date.now().toString().slice(-4)}`;
  return fallback;
}

// Generate tutorId automatically if missing, before validation
TutorSchema.pre('validate', async function (next) {
  try {
    const doc = this as ITutor;
    if (!doc.personalDetails) (doc as any).personalDetails = {};
    if (!doc.personalDetails.tutorId) {
      doc.personalDetails.tutorId = await generateUniqueTutorId(doc);
    }
    next();
  } catch (e) {
    next(e as any);
  }
});

export const Tutor = mongoose.model<ITutor, ITutorModel>('Tutor', TutorSchema);
export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);
export const PaymentRecord = mongoose.model<IPaymentRecord>('PaymentRecord', PaymentRecordSchema);
export const TestAssignment = mongoose.model<ITestAssignment>('TestAssignment', TestAssignmentSchema);

export default Tutor;


