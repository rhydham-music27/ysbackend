import mongoose, { Document, Model, Schema } from 'mongoose';
import { CourseStatus, ApprovalStatus } from '../types/enums';

export interface ICourseSchedule {
  daysOfWeek: string[];
  startTime: string;
  endTime: string;
  duration: number;
}

export interface ICourse extends Document {
  name: string;
  description: string;
  code?: string;
  teacher: mongoose.Types.ObjectId;
  students: mongoose.Types.ObjectId[];
  maxStudents: number;
  schedule?: ICourseSchedule;
  status: CourseStatus;
  startDate?: Date;
  endDate?: Date;
  tags: string[];
  prerequisites: string[];
  syllabus?: string;
  approvalStatus?: ApprovalStatus;
  approvedBy?: mongoose.Types.ObjectId;
  approvalDate?: Date;
  approvalNotes?: string;
  requiresApproval: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // virtuals
  enrolledCount: number;
  isFullyEnrolled: boolean;

  // instance methods
  canEnroll(): boolean;
  isEnrolled(studentId: string): boolean;
  isPendingApproval(): boolean;
  isApproved(): boolean;
}

export interface ICourseModel extends Model<ICourse> {
  findByTeacher(teacherId: string): Promise<ICourse[]>;
  findByStudent(studentId: string): Promise<ICourse[]>;
  findActiveCourses(): Promise<ICourse[]>;
  findPendingApproval(): Promise<ICourse[]>;
}

const CourseScheduleSchema = new Schema<ICourseSchedule>(
  {
    daysOfWeek: [{ type: String }],
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    duration: { type: Number, required: true },
  },
  { _id: false }
);

const CourseSchema = new Schema<ICourse, ICourseModel>(
  {
    name: { type: String, required: true, trim: true, minlength: 3, maxlength: 200 },
    description: { type: String, required: true, trim: true, minlength: 10 },
    code: { type: String, trim: true, uppercase: true, unique: true, sparse: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    students: { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
    maxStudents: { type: Number, default: 30, min: 1 },
    schedule: { type: CourseScheduleSchema, required: false },
    status: { type: String, enum: Object.values(CourseStatus), default: CourseStatus.DRAFT, index: true },
    startDate: { type: Date },
    endDate: { type: Date },
    tags: { type: [String], default: [] },
    prerequisites: { type: [String], default: [] },
    syllabus: { type: String },
    approvalStatus: { type: String, enum: Object.values(ApprovalStatus), index: true },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvalDate: { type: Date },
    approvalNotes: { type: String, trim: true, maxlength: 500 },
    requiresApproval: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Indexes
CourseSchema.index({ teacher: 1, status: 1 });
CourseSchema.index({ students: 1, status: 1 });
CourseSchema.index({ name: 'text', description: 'text' });
CourseSchema.index({ approvalStatus: 1, createdAt: -1 });

// Virtuals
CourseSchema.virtual('enrolledCount').get(function (this: ICourse) {
  return this.students?.length || 0;
});

CourseSchema.virtual('isFullyEnrolled').get(function (this: ICourse) {
  return (this.students?.length || 0) >= (this.maxStudents || 0);
});

CourseSchema.set('toJSON', { virtuals: true });
CourseSchema.set('toObject', { virtuals: true });

// Instance methods
CourseSchema.methods.canEnroll = function (this: ICourse): boolean {
  return this.status === CourseStatus.ACTIVE && !this.isFullyEnrolled;
};

CourseSchema.methods.isEnrolled = function (this: ICourse, studentId: string): boolean {
  return this.students.some((id) => id.toString() === studentId);
};

CourseSchema.methods.isPendingApproval = function (this: ICourse): boolean {
  return this.approvalStatus === ApprovalStatus.PENDING;
};

CourseSchema.methods.isApproved = function (this: ICourse): boolean {
  return this.approvalStatus === ApprovalStatus.APPROVED || this.approvalStatus === ApprovalStatus.AUTO_APPROVED;
};

// Static methods
CourseSchema.statics.findByTeacher = function (teacherId: string) {
  return this.find({ teacher: new mongoose.Types.ObjectId(teacherId) });
};

CourseSchema.statics.findByStudent = function (studentId: string) {
  return this.find({ students: new mongoose.Types.ObjectId(studentId) });
};

CourseSchema.statics.findActiveCourses = function () {
  return this.find({ status: CourseStatus.ACTIVE });
};

CourseSchema.statics.findPendingApproval = function () {
  return this.find({ approvalStatus: ApprovalStatus.PENDING }).sort({ createdAt: 1 });
};

const Course = mongoose.model<ICourse, ICourseModel>('Course', CourseSchema);

export default Course;


