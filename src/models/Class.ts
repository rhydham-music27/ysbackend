import mongoose, { Document, Model, Schema } from 'mongoose';
import { ClassStatus } from '../types/enums';

export interface IClassLocation {
  type: 'online' | 'offline';
  room?: string;
  building?: string;
  meetingLink?: string;
  meetingId?: string;
  meetingPassword?: string;
}

export interface IClass extends Document {
  course: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  teacher: mongoose.Types.ObjectId;
  coordinator?: mongoose.Types.ObjectId;
  students: mongoose.Types.ObjectId[];
  scheduledDate: Date;
  startTime: Date;
  endTime: Date;
  duration?: number;
  location: IClassLocation;
  status: ClassStatus;
  maxStudents?: number;
  topics: string[];
  materials: string[];
  recordingUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  // virtuals
  attendeeCount: number;
  isFullyBooked: boolean;

  // instance methods
  canJoin(): boolean;
  isAttending(studentId: string): boolean;
  hasStarted(): boolean;
  hasEnded(): boolean;
}

export interface IClassModel extends Model<IClass> {
  findByCourse(courseId: string): Promise<IClass[]>;
  findByTeacher(teacherId: string): Promise<IClass[]>;
  findByStudent(studentId: string): Promise<IClass[]>;
  findByCoordinator(coordinatorId: string): Promise<IClass[]>;
  findUpcoming(): Promise<IClass[]>;
}

const ClassLocationSchema = new Schema<IClassLocation>(
  {
    type: { type: String, required: true, enum: ['online', 'offline'] },
    room: { type: String },
    building: { type: String },
    meetingLink: { type: String },
    meetingId: { type: String },
    meetingPassword: { type: String },
  },
  { _id: false }
);

const ClassSchema = new Schema<IClass, IClassModel>(
  {
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 200 },
    description: { type: String, trim: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    coordinator: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    students: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    scheduledDate: { type: Date, required: true, index: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    duration: { type: Number },
    location: { type: ClassLocationSchema, required: true },
    status: { type: String, enum: Object.values(ClassStatus), default: ClassStatus.SCHEDULED, index: true },
    maxStudents: { type: Number, min: 1 },
    topics: { type: [String], default: [] },
    materials: { type: [String], default: [] },
    recordingUrl: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

// Pre-save to compute duration if not provided
ClassSchema.pre('save', function (next) {
  const doc = this as IClass;
  if (!doc.duration && doc.startTime && doc.endTime) {
    const diffMs = doc.endTime.getTime() - doc.startTime.getTime();
    doc.duration = Math.max(0, Math.floor(diffMs / (1000 * 60)));
  }
  next();
});

// Indexes
ClassSchema.index({ course: 1, scheduledDate: 1 });
ClassSchema.index({ teacher: 1, scheduledDate: 1 });
ClassSchema.index({ coordinator: 1, scheduledDate: 1 });
ClassSchema.index({ students: 1, scheduledDate: 1 });
ClassSchema.index({ status: 1, scheduledDate: 1 });

// Virtuals
ClassSchema.virtual('attendeeCount').get(function (this: IClass) {
  return this.students?.length || 0;
});

ClassSchema.virtual('isFullyBooked').get(function (this: IClass) {
  if (!this.maxStudents) return false;
  return (this.students?.length || 0) >= this.maxStudents;
});

ClassSchema.set('toJSON', { virtuals: true });
ClassSchema.set('toObject', { virtuals: true });

// Instance methods
ClassSchema.methods.canJoin = function (this: IClass): boolean {
  const joinable = [ClassStatus.SCHEDULED, ClassStatus.IN_PROGRESS].includes(this.status);
  return joinable && !this.isFullyBooked;
};

ClassSchema.methods.isAttending = function (this: IClass, studentId: string): boolean {
  return this.students.some((id) => id.toString() === studentId);
};

ClassSchema.methods.hasStarted = function (this: IClass): boolean {
  return new Date().getTime() >= new Date(this.startTime).getTime();
};

ClassSchema.methods.hasEnded = function (this: IClass): boolean {
  return new Date().getTime() >= new Date(this.endTime).getTime();
};

// Static methods
ClassSchema.statics.findByCourse = function (courseId: string) {
  return this.find({ course: new mongoose.Types.ObjectId(courseId) });
};

ClassSchema.statics.findByTeacher = function (teacherId: string) {
  return this.find({ teacher: new mongoose.Types.ObjectId(teacherId) });
};

ClassSchema.statics.findByStudent = function (studentId: string) {
  return this.find({ students: new mongoose.Types.ObjectId(studentId) });
};

ClassSchema.statics.findByCoordinator = function (coordinatorId: string) {
  return this.find({ coordinator: new mongoose.Types.ObjectId(coordinatorId) }).sort({ scheduledDate: 1 });
};

ClassSchema.statics.findUpcoming = function () {
  const now = new Date();
  return this.find({ status: ClassStatus.SCHEDULED, scheduledDate: { $gte: now } });
};

const Class = mongoose.model<IClass, IClassModel>('Class', ClassSchema);

export default Class;


