import mongoose, { Document, Model, Schema } from 'mongoose';
import { AssignmentStatus, SubmissionStatus } from '../types/enums';

export interface ISubmission {
  _id?: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  submittedAt?: Date;
  status: SubmissionStatus;
  attachments?: string[];
  content?: string;
  grade?: number;
  maxGrade?: number;
  feedback?: string;
  gradedBy?: mongoose.Types.ObjectId;
  gradedAt?: Date;
  isLate?: boolean;
}

export interface IAssignment extends Document {
  title: string;
  description: string;
  course: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  dueDate: Date;
  publishDate?: Date;
  maxGrade: number;
  attachments: string[];
  instructions?: string;
  allowLateSubmission: boolean;
  lateSubmissionPenalty?: number;
  status: AssignmentStatus;
  submissions: ISubmission[];
  createdAt: Date;
  updatedAt: Date;
  // virtuals
  submissionCount: number;
  gradedCount: number;
  averageGrade: number;
  isOverdue: boolean;
  isPublished: boolean;
  // methods
  canSubmit(studentId: string): boolean;
  hasSubmitted(studentId: string): boolean;
  getSubmission(studentId: string): ISubmission | undefined;
  isGraded(): boolean;
}

export interface IAssignmentModel extends Model<IAssignment> {
  findByCourse(courseId: string): Promise<IAssignment[]>;
  findByTeacher(teacherId: string): Promise<IAssignment[]>;
  findByStudent(studentId: string): Promise<IAssignment[]>;
  findUpcoming(courseId?: string): Promise<IAssignment[]>;
  findOverdue(courseId?: string): Promise<IAssignment[]>;
}

const SubmissionSchema = new Schema<ISubmission>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    submittedAt: { type: Date },
    status: {
      type: String,
      enum: Object.values(SubmissionStatus),
      default: SubmissionStatus.NOT_SUBMITTED,
      required: true,
    },
    attachments: { type: [String], default: [] },
    content: { type: String },
    grade: { type: Number, min: 0 },
    maxGrade: { type: Number, min: 0 },
    feedback: { type: String },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    gradedAt: { type: Date },
    isLate: { type: Boolean },
  },
  { _id: true, id: false, timestamps: false }
);

const AssignmentSchema = new Schema<IAssignment, IAssignmentModel>(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 200 },
    description: { type: String, required: true, trim: true, minlength: 10 },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    dueDate: { type: Date, required: true, index: true },
    publishDate: { type: Date },
    maxGrade: { type: Number, required: true, default: 100, min: 0 },
    attachments: { type: [String], default: [] },
    instructions: { type: String },
    allowLateSubmission: { type: Boolean, default: false },
    lateSubmissionPenalty: { type: Number, min: 0, max: 100 },
    status: {
      type: String,
      enum: Object.values(AssignmentStatus),
      default: AssignmentStatus.DRAFT,
      index: true,
    },
    submissions: { type: [SubmissionSchema], default: [] },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Indexes
AssignmentSchema.index({ course: 1, dueDate: 1 });
AssignmentSchema.index({ teacher: 1, status: 1 });
AssignmentSchema.index({ status: 1, dueDate: 1 });
AssignmentSchema.index({ 'submissions.student': 1, course: 1 });
AssignmentSchema.index({ title: 'text', description: 'text' });

// Virtuals
AssignmentSchema.virtual('submissionCount').get(function (this: IAssignment) {
  return this.submissions?.length || 0;
});

AssignmentSchema.virtual('gradedCount').get(function (this: IAssignment) {
  return (this.submissions || []).filter((s) => s.status === SubmissionStatus.GRADED).length || 0;
});

AssignmentSchema.virtual('averageGrade').get(function (this: IAssignment) {
  const graded = (this.submissions || []).filter((s) => typeof s.grade === 'number');
  if (graded.length === 0) return 0;
  const sum = graded.reduce((acc, s) => acc + (s.grade || 0), 0);
  return sum / graded.length;
});

AssignmentSchema.virtual('isOverdue').get(function (this: IAssignment) {
  return new Date() > this.dueDate;
});

AssignmentSchema.virtual('isPublished').get(function (this: IAssignment) {
  const visibleSince = this.publishDate || this.createdAt;
  return this.status === AssignmentStatus.PUBLISHED && visibleSince <= new Date();
});

// Methods
AssignmentSchema.methods.canSubmit = function (this: IAssignment, studentId: string): boolean {
  if (this.status !== AssignmentStatus.PUBLISHED) return false;
  const now = new Date();
  const overdue = now > this.dueDate;
  if (overdue && !this.allowLateSubmission) return false;
  const existing = this.submissions.find((s) => s.student.toString() === studentId && s.status !== SubmissionStatus.NOT_SUBMITTED);
  if (existing) return true; // allow resubmission if present; service will decide status
  return true;
};

AssignmentSchema.methods.hasSubmitted = function (this: IAssignment, studentId: string): boolean {
  return (this.submissions || []).some(
    (s) => s.student.toString() === studentId && s.status !== SubmissionStatus.NOT_SUBMITTED
  );
};

AssignmentSchema.methods.getSubmission = function (this: IAssignment, studentId: string): ISubmission | undefined {
  return (this.submissions || []).find((s) => s.student.toString() === studentId);
};

AssignmentSchema.methods.isGraded = function (this: IAssignment): boolean {
  const subs = this.submissions || [];
  if (subs.length === 0) return false;
  return subs.every((s) => s.status === SubmissionStatus.GRADED);
};

// Hooks
AssignmentSchema.pre('save', function (next) {
  const doc = this as IAssignment;
  if (!doc.publishDate && (doc as any).isNew) {
    doc.publishDate = doc.createdAt || new Date();
  }

  const now = new Date();
  const allGraded = (doc.submissions || []).length > 0 && (doc.submissions || []).every((s) => s.status === SubmissionStatus.GRADED);
  if (doc.status === AssignmentStatus.PUBLISHED && allGraded) {
    doc.status = AssignmentStatus.GRADED;
  }
  if (doc.status === AssignmentStatus.PUBLISHED && doc.dueDate < now && !doc.allowLateSubmission) {
    doc.status = AssignmentStatus.CLOSED;
  }
  next();
});

// Statics
AssignmentSchema.statics.findByCourse = function (courseId: string) {
  return this.find({ course: new mongoose.Types.ObjectId(courseId) }).sort({ dueDate: 1 });
};

AssignmentSchema.statics.findByTeacher = function (teacherId: string) {
  return this.find({ teacher: new mongoose.Types.ObjectId(teacherId) }).sort({ dueDate: 1 });
};

AssignmentSchema.statics.findByStudent = async function (studentId: string) {
  // Select assignments where student's id appears in submissions or in the related course enrollment
  // For simplicity, rely on course enrollment lookup via Course aggregation
  const Course = mongoose.model('Course');
  const courses = await Course.find({ students: new mongoose.Types.ObjectId(studentId) }, { _id: 1 }).lean();
  const courseIds = courses.map((c: any) => c._id);
  return this.find({ course: { $in: courseIds } }).sort({ dueDate: 1 });
};

AssignmentSchema.statics.findUpcoming = function (courseId?: string) {
  const now = new Date();
  const query: Record<string, unknown> = { dueDate: { $gte: now } };
  if (courseId) query.course = new mongoose.Types.ObjectId(courseId);
  return this.find(query).sort({ dueDate: 1 });
};

AssignmentSchema.statics.findOverdue = function (courseId?: string) {
  const now = new Date();
  const query: Record<string, unknown> = { dueDate: { $lt: now }, status: { $ne: AssignmentStatus.CLOSED } };
  if (courseId) query.course = new mongoose.Types.ObjectId(courseId);
  return this.find(query).sort({ dueDate: 1 });
};

const Assignment = mongoose.model<IAssignment, IAssignmentModel>('Assignment', AssignmentSchema);

export { Assignment };
export default Assignment;

