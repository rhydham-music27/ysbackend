import mongoose, { Document, Model, Schema } from 'mongoose';

export enum ClassStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface IAttendanceRecord {
  date: Date;
  present: boolean;
  durationMinutes?: number;
}

export interface IAttendanceSheet {
  monthLabel: string; // e.g., "July 2025"
  startDate: Date;
  endDate: Date;
  records: IAttendanceRecord[];
}

export interface ITestReport {
  monthLabel: string; // Month-wise report
  reportUrl?: string;
  notes?: string;
  uploadedAt: Date;
}

export interface IFinalClass extends Document {
  lead: mongoose.Types.ObjectId;
  classId: string; // CL-BPL-ABCD-12
  classStatus: ClassStatus;
  tutorAssigned?: mongoose.Types.ObjectId;
  tutorTier?: string;
  firstMonthStartDate?: Date;
  monthStartDate?: Date;
  monthRenewDate?: Date;
  daysLeftUntilRenewal?: number; // can be derived, stored for quick filters
  testDate?: Date;
  testTutorAssigned?: mongoose.Types.ObjectId;
  testReports: ITestReport[];
  attendanceSheets: IAttendanceSheet[];
  parentApprovedCurrentMonth?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface IFinalClassModel extends Model<IFinalClass> {}

const AttendanceRecordSchema = new Schema<IAttendanceRecord>(
  {
    date: { type: Date, required: true },
    present: { type: Boolean, required: true },
    durationMinutes: { type: Number },
  },
  { _id: false }
);

const AttendanceSheetSchema = new Schema<IAttendanceSheet>(
  {
    monthLabel: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    records: { type: [AttendanceRecordSchema], default: [] },
  },
  { _id: false }
);

const TestReportSchema = new Schema<ITestReport>(
  {
    monthLabel: { type: String, required: true, trim: true },
    reportUrl: { type: String, trim: true },
    notes: { type: String, trim: true },
    uploadedAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: false }
);

const FinalClassSchema = new Schema<IFinalClass, IFinalClassModel>(
  {
    lead: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    classId: { type: String, required: true, unique: true, trim: true },
    classStatus: { type: String, enum: Object.values(ClassStatus), default: ClassStatus.ACTIVE, index: true },
    tutorAssigned: { type: Schema.Types.ObjectId, ref: 'User' },
    tutorTier: { type: String, trim: true },
    firstMonthStartDate: { type: Date },
    monthStartDate: { type: Date },
    monthRenewDate: { type: Date },
    daysLeftUntilRenewal: { type: Number, min: 0 },
    testDate: { type: Date },
    testTutorAssigned: { type: Schema.Types.ObjectId, ref: 'User' },
    testReports: { type: [TestReportSchema], default: [] },
    attendanceSheets: { type: [AttendanceSheetSchema], default: [] },
    parentApprovedCurrentMonth: { type: Boolean, default: false },
  },
  { timestamps: true }
);

FinalClassSchema.index({ classId: 1 }, { unique: true });

const FinalClass = mongoose.model<IFinalClass, IFinalClassModel>('FinalClass', FinalClassSchema);

export default FinalClass;


