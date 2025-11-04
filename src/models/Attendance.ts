import mongoose, { Document, Model, Schema } from 'mongoose';
import { AttendanceStatus } from '../types/enums';

export interface IAttendance extends Document {
  class: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  date: Date;
  status: AttendanceStatus;
  markedBy: mongoose.Types.ObjectId;
  markedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  isPresent(): boolean;
  isAbsent(): boolean;
  isLate(): boolean;
}

export interface IAttendanceModel extends Model<IAttendance> {
  findByClass(classId: string): Promise<IAttendance[]>;
  findByStudent(studentId: string): Promise<IAttendance[]>;
  findByClassAndStudent(classId: string, studentId: string): Promise<IAttendance | null>;
  getAttendanceStats(
    studentId: string
  ): Promise<{ total: number; present: number; absent: number; late: number; attendanceRate: number }>;
}

const AttendanceSchema = new Schema<IAttendance, IAttendanceModel>(
  {
    class: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    date: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: Object.values(AttendanceStatus),
      required: true,
      default: AttendanceStatus.PRESENT,
    },
    markedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    markedAt: { type: Date },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Unique compound index to prevent duplicates
AttendanceSchema.index({ class: 1, student: 1, date: 1 }, { unique: true });

// Additional indexes for common queries
AttendanceSchema.index({ student: 1, date: 1 });
AttendanceSchema.index({ class: 1, date: 1 });
AttendanceSchema.index({ markedBy: 1, date: 1 });

// Pre-save hook to set markedAt when creating if not set
AttendanceSchema.pre('save', function (next) {
  if (this.isNew && !this.markedAt) {
    this.markedAt = new Date();
  }
  next();
});

// Instance methods
AttendanceSchema.methods.isPresent = function (): boolean {
  return this.status === AttendanceStatus.PRESENT;
};

AttendanceSchema.methods.isAbsent = function (): boolean {
  return this.status === AttendanceStatus.ABSENT;
};

AttendanceSchema.methods.isLate = function (): boolean {
  return this.status === AttendanceStatus.LATE;
};

// Virtuals
AttendanceSchema.virtual('statusLabel').get(function (this: IAttendance) {
  switch (this.status) {
    case AttendanceStatus.PRESENT:
      return 'Present';
    case AttendanceStatus.ABSENT:
      return 'Absent';
    case AttendanceStatus.LATE:
      return 'Late';
    default:
      return this.status.charAt(0).toUpperCase() + this.status.slice(1);
  }
});

AttendanceSchema.set('toJSON', { virtuals: true });
AttendanceSchema.set('toObject', { virtuals: true });

// Static methods
AttendanceSchema.statics.findByClass = function (classId: string) {
  return this.find({ class: new mongoose.Types.ObjectId(classId) })
    .populate('student', 'profile.firstName profile.lastName email')
    .populate('markedBy', 'profile.firstName profile.lastName')
    .sort({ date: -1 });
};

AttendanceSchema.statics.findByStudent = function (studentId: string) {
  return this.find({ student: new mongoose.Types.ObjectId(studentId) })
    .populate('class', 'title scheduledDate')
    .populate('markedBy', 'profile.firstName profile.lastName')
    .sort({ date: -1 });
};

AttendanceSchema.statics.findByClassAndStudent = function (classId: string, studentId: string) {
  return this.findOne({
    class: new mongoose.Types.ObjectId(classId),
    student: new mongoose.Types.ObjectId(studentId),
  });
};

AttendanceSchema.statics.getAttendanceStats = async function (studentId: string) {
  const results: Array<{ _id: AttendanceStatus; count: number }> = await this.aggregate([
    { $match: { student: new mongoose.Types.ObjectId(studentId) } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const totals = results.reduce(
    (acc, curr) => {
      acc.total += curr.count;
      if (curr._id === AttendanceStatus.PRESENT) acc.present = curr.count;
      if (curr._id === AttendanceStatus.ABSENT) acc.absent = curr.count;
      if (curr._id === AttendanceStatus.LATE) acc.late = curr.count;
      return acc;
    },
    { total: 0, present: 0, absent: 0, late: 0 }
  );

  const attendanceRate = totals.total > 0 ? (totals.present / totals.total) * 100 : 0;

  return { ...totals, attendanceRate };
};

const Attendance = mongoose.model<IAttendance, IAttendanceModel>('Attendance', AttendanceSchema);

export default Attendance;


