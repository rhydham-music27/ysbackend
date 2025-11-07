import mongoose, { Document, Model, Schema } from 'mongoose';
import { DayOfWeek, RecurrenceType, ApprovalStatus } from '../types/enums';

export interface ISchedule extends Document {
  class: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  room?: string;
  building?: string;
  recurrenceType: RecurrenceType;
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  notes?: string;
  approvalStatus?: ApprovalStatus;
  approvedBy?: mongoose.Types.ObjectId;
  approvalDate?: Date;
  approvalNotes?: string;
  requiresApproval: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // virtuals
  duration: number;
  isCurrentlyActive: boolean;

  // instance methods
  overlaps(other: ISchedule): boolean;
  isValidTimeRange(): boolean;
  getTimeInMinutes(time: string): number;
  isPendingApproval(): boolean;
  isApproved(): boolean;
}

export interface IScheduleModel extends Model<ISchedule> {
  findByCourse(courseId: string): Promise<ISchedule[]>;
  findByTeacher(teacherId: string): Promise<ISchedule[]>;
  findByDayAndRoom(day: DayOfWeek, room: string): Promise<ISchedule[]>;
  findActiveSchedules(): Promise<ISchedule[]>;
  findPendingApproval(): Promise<ISchedule[]>;
  checkTeacherConflict(
    teacherId: string,
    day: DayOfWeek,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): Promise<ISchedule | null>;
  checkRoomConflict(
    room: string,
    day: DayOfWeek,
    startTime: string,
    endTime: string,
    excludeId?: string
  ): Promise<ISchedule | null>;
}

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

const ScheduleSchema = new Schema<ISchedule, IScheduleModel>(
  {
    class: { type: Schema.Types.ObjectId, ref: 'Class', required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dayOfWeek: { type: String, enum: Object.values(DayOfWeek), required: true, index: true },
    startTime: { type: String, required: true, match: [timeRegex, 'Invalid time format HH:MM'] },
    endTime: { type: String, required: true, match: [timeRegex, 'Invalid time format HH:MM'] },
    room: { type: String, trim: true, index: true },
    building: { type: String, trim: true },
    recurrenceType: {
      type: String,
      enum: Object.values(RecurrenceType),
      default: RecurrenceType.WEEKLY,
      required: true,
    },
    effectiveFrom: { type: Date, required: true, default: Date.now, index: true },
    effectiveTo: { type: Date },
    isActive: { type: Boolean, default: true, index: true },
    notes: { type: String, trim: true },
    approvalStatus: { type: String, enum: Object.values(ApprovalStatus), index: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvalDate: { type: Date },
    approvalNotes: { type: String, trim: true, maxlength: 500 },
    requiresApproval: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Compound indexes
ScheduleSchema.index({ teacher: 1, dayOfWeek: 1, startTime: 1 });
ScheduleSchema.index({ room: 1, dayOfWeek: 1, startTime: 1 });
ScheduleSchema.index({ course: 1, dayOfWeek: 1 });
ScheduleSchema.index({ isActive: 1, effectiveFrom: 1, effectiveTo: 1 });
ScheduleSchema.index({ approvalStatus: 1, createdAt: -1 });

// Instance helpers
ScheduleSchema.methods.getTimeInMinutes = function getTimeInMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

ScheduleSchema.methods.isValidTimeRange = function isValidTimeRange(): boolean {
  const self = this as ISchedule;
  return self.getTimeInMinutes(self.startTime) < self.getTimeInMinutes(self.endTime);
};

ScheduleSchema.methods.overlaps = function overlaps(other: ISchedule): boolean {
  const self = this as ISchedule;
  if (self.dayOfWeek !== other.dayOfWeek) return false;
  const startA = self.getTimeInMinutes(self.startTime);
  const endA = self.getTimeInMinutes(self.endTime);
  const startB = other.getTimeInMinutes(other.startTime);
  const endB = other.getTimeInMinutes(other.endTime);
  return startA < endB && endA > startB;
};

ScheduleSchema.methods.isPendingApproval = function (this: ISchedule): boolean {
  return this.approvalStatus === ApprovalStatus.PENDING;
};

ScheduleSchema.methods.isApproved = function (this: ISchedule): boolean {
  return this.approvalStatus === ApprovalStatus.APPROVED || this.approvalStatus === ApprovalStatus.AUTO_APPROVED;
};

// Virtuals
ScheduleSchema.virtual('duration').get(function duration(this: ISchedule) {
  const start = this.getTimeInMinutes(this.startTime);
  const end = this.getTimeInMinutes(this.endTime);
  return Math.max(0, end - start);
});

ScheduleSchema.virtual('isCurrentlyActive').get(function isCurrentlyActive(this: ISchedule) {
  const now = new Date();
  return (
    this.isActive &&
    this.effectiveFrom <= now &&
    (!this.effectiveTo || this.effectiveTo >= now)
  );
});

ScheduleSchema.set('toJSON', { virtuals: true });
ScheduleSchema.set('toObject', { virtuals: true });

// Pre-save validations
ScheduleSchema.pre('save', function preSave(next) {
  const doc = this as ISchedule;
  if (!doc.isValidTimeRange()) {
    return next(new Error('Start time must be before end time'));
  }
  if (doc.effectiveTo && doc.effectiveFrom && doc.effectiveTo <= doc.effectiveFrom) {
    return next(new Error('Effective to date must be after effective from date'));
  }
  return next();
});

// Static methods
ScheduleSchema.statics.findByCourse = function (courseId: string) {
  return this.find({ course: new mongoose.Types.ObjectId(courseId), isActive: true }).sort({ dayOfWeek: 1, startTime: 1 });
};

ScheduleSchema.statics.findByTeacher = function (teacherId: string) {
  return this.find({ teacher: new mongoose.Types.ObjectId(teacherId), isActive: true }).sort({ dayOfWeek: 1, startTime: 1 });
};

ScheduleSchema.statics.findByDayAndRoom = function (day: DayOfWeek, room: string) {
  return this.find({ dayOfWeek: day, room, isActive: true }).sort({ startTime: 1 });
};

ScheduleSchema.statics.findActiveSchedules = function () {
  const now = new Date();
  return this.find({
    isActive: true,
    effectiveFrom: { $lte: now },
    $or: [{ effectiveTo: { $exists: false } }, { effectiveTo: { $gte: now } }],
  });
};

ScheduleSchema.statics.findPendingApproval = function () {
  return this.find({ approvalStatus: ApprovalStatus.PENDING }).sort({ createdAt: 1 });
};

function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const [asH, asM] = aStart.split(':').map(Number);
  const [aeH, aeM] = aEnd.split(':').map(Number);
  const [bsH, bsM] = bStart.split(':').map(Number);
  const [beH, beM] = bEnd.split(':').map(Number);
  const as = asH * 60 + asM;
  const ae = aeH * 60 + aeM;
  const bs = bsH * 60 + bsM;
  const be = beH * 60 + beM;
  return as < be && ae > bs;
}

ScheduleSchema.statics.checkTeacherConflict = async function (
  teacherId: string,
  day: DayOfWeek,
  startTime: string,
  endTime: string,
  excludeId?: string
) {
  const query: any = { teacher: new mongoose.Types.ObjectId(teacherId), dayOfWeek: day, isActive: true };
  if (excludeId) {
    query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
  }
  const schedules: ISchedule[] = await this.find(query);
  for (const s of schedules) {
    if (timesOverlap(startTime, endTime, s.startTime, s.endTime)) {
      return s;
    }
  }
  return null;
};

ScheduleSchema.statics.checkRoomConflict = async function (
  room: string,
  day: DayOfWeek,
  startTime: string,
  endTime: string,
  excludeId?: string
) {
  const query: any = { room, dayOfWeek: day, isActive: true };
  if (excludeId) {
    query._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
  }
  const schedules: ISchedule[] = await this.find(query);
  for (const s of schedules) {
    if (timesOverlap(startTime, endTime, s.startTime, s.endTime)) {
      return s;
    }
  }
  return null;
};

const Schedule = mongoose.model<ISchedule, IScheduleModel>('Schedule', ScheduleSchema);

export { ISchedule };
export default Schedule;


