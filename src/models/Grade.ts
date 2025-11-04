import mongoose, { Document, Model, Schema } from 'mongoose';
import { GradeType, LetterGrade } from '../types/enums';

export interface IGrade extends Document {
  student: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  assignment?: mongoose.Types.ObjectId;
  gradeType: GradeType;
  score: number;
  maxScore: number;
  percentage: number;
  letterGrade?: LetterGrade;
  weight?: number;
  feedback?: string;
  gradedBy: mongoose.Types.ObjectId;
  gradedAt: Date;
  term?: string;
  isPublished: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;

  calculateLetterGrade(): LetterGrade;
  calculateGPA(): number;
}

export interface IGradeModel extends Model<IGrade> {
  findByStudent(studentId: string): Promise<IGrade[]>;
  findByCourse(courseId: string): Promise<IGrade[]>;
  findByStudentAndCourse(studentId: string, courseId: string): Promise<IGrade[]>;
  calculateCourseGrade(
    studentId: string,
    courseId: string
  ): Promise<{ averageScore: number; letterGrade: LetterGrade; gpa: number; totalGrades: number }>;
  calculateStudentGPA(
    studentId: string
  ): Promise<{ gpa: number; totalCourses: number; totalGrades: number }>;
}

const GradeSchema = new Schema<IGrade, IGradeModel>(
  {
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    course: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    assignment: { type: Schema.Types.ObjectId, ref: 'Assignment', index: true },
    gradeType: {
      type: String,
      enum: Object.values(GradeType),
      required: true,
      default: GradeType.MANUAL,
    },
    score: { type: Number, required: true, min: 0 },
    maxScore: { type: Number, required: true, min: 1, default: 100 },
    weight: { type: Number, min: 0, max: 10, default: 1.0 },
    feedback: { type: String, trim: true },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    gradedAt: { type: Date, required: true, default: Date.now },
    term: { type: String, trim: true },
    isPublished: { type: Boolean, default: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Indexes
GradeSchema.index({ student: 1, course: 1, gradeType: 1 });
GradeSchema.index({ course: 1, gradedAt: 1 });
GradeSchema.index({ student: 1, gradedAt: 1 });
GradeSchema.index({ assignment: 1 });
GradeSchema.index({ gradedBy: 1 });

// Virtuals
GradeSchema.virtual('percentage').get(function (this: IGrade) {
  if (!this.maxScore || this.maxScore === 0) return 0;
  return (this.score / this.maxScore) * 100;
});

GradeSchema.virtual('letterGrade').get(function (this: IGrade) {
  return this.calculateLetterGrade();
});

GradeSchema.virtual('isPassing').get(function (this: IGrade) {
  return this.percentage >= 60;
});

// Instance methods
GradeSchema.methods.calculateLetterGrade = function (this: IGrade): LetterGrade {
  const pct = (this.score / this.maxScore) * 100;
  if (pct >= 97) return LetterGrade.A_PLUS;
  if (pct >= 93) return LetterGrade.A;
  if (pct >= 90) return LetterGrade.A_MINUS;
  if (pct >= 87) return LetterGrade.B_PLUS;
  if (pct >= 83) return LetterGrade.B;
  if (pct >= 80) return LetterGrade.B_MINUS;
  if (pct >= 77) return LetterGrade.C_PLUS;
  if (pct >= 73) return LetterGrade.C;
  if (pct >= 70) return LetterGrade.C_MINUS;
  if (pct >= 60) return LetterGrade.D;
  return LetterGrade.F;
};

GradeSchema.methods.calculateGPA = function (this: IGrade): number {
  const letter = this.calculateLetterGrade();
  switch (letter) {
    case LetterGrade.A_PLUS:
    case LetterGrade.A:
      return 4.0;
    case LetterGrade.A_MINUS:
      return 3.7;
    case LetterGrade.B_PLUS:
      return 3.3;
    case LetterGrade.B:
      return 3.0;
    case LetterGrade.B_MINUS:
      return 2.7;
    case LetterGrade.C_PLUS:
      return 2.3;
    case LetterGrade.C:
      return 2.0;
    case LetterGrade.C_MINUS:
      return 1.7;
    case LetterGrade.D:
      return 1.0;
    case LetterGrade.F:
    default:
      return 0.0;
  }
};

// Statics
GradeSchema.statics.findByStudent = function (this: IGradeModel, studentId: string) {
  return this.find({ student: new mongoose.Types.ObjectId(studentId) })
    .sort({ gradedAt: -1 })
    .populate('course', 'name code')
    .populate('gradedBy', 'profile.firstName profile.lastName');
};

GradeSchema.statics.findByCourse = function (this: IGradeModel, courseId: string) {
  return this.find({ course: new mongoose.Types.ObjectId(courseId) })
    .sort({ gradedAt: -1 })
    .populate('student', 'profile.firstName profile.lastName email')
    .populate('gradedBy', 'profile.firstName profile.lastName');
};

GradeSchema.statics.findByStudentAndCourse = function (
  this: IGradeModel,
  studentId: string,
  courseId: string
) {
  return this.find({
    student: new mongoose.Types.ObjectId(studentId),
    course: new mongoose.Types.ObjectId(courseId),
  })
    .sort({ gradedAt: -1 })
    .populate('assignment', 'title')
    .populate('gradedBy', 'profile.firstName profile.lastName');
};

GradeSchema.statics.calculateCourseGrade = async function (
  this: IGradeModel,
  studentId: string,
  courseId: string
) {
  const grades: IGrade[] = await this.find({
    student: new mongoose.Types.ObjectId(studentId),
    course: new mongoose.Types.ObjectId(courseId),
  });

  const totalGrades = grades.length;
  if (totalGrades === 0) {
    return { averageScore: 0, letterGrade: LetterGrade.F, gpa: 0, totalGrades: 0 };
  }

  let weightedSum = 0;
  let weightedMax = 0;
  for (const g of grades) {
    const w = typeof g.weight === 'number' ? g.weight : 1.0;
    weightedSum += g.score * w;
    weightedMax += g.maxScore * w;
  }

  const averageScore = weightedMax > 0 ? (weightedSum / weightedMax) * 100 : 0;

  // Build a temp doc to reuse conversion helpers
  const temp = new this({
    student: grades[0].student,
    course: grades[0].course,
    gradedBy: grades[0].gradedBy,
    gradedAt: new Date(),
    score: weightedSum,
    maxScore: weightedMax || 1,
    gradeType: GradeType.MANUAL,
  });
  const letterGrade = temp.calculateLetterGrade();
  const gpa = temp.calculateGPA();

  return { averageScore, letterGrade, gpa, totalGrades };
};

GradeSchema.statics.calculateStudentGPA = async function (this: IGradeModel, studentId: string) {
  const grades: IGrade[] = await this.find({ student: new mongoose.Types.ObjectId(studentId) });
  if (grades.length === 0) {
    return { gpa: 0, totalCourses: 0, totalGrades: 0 };
  }

  // Group by course id string
  const courseIdToGrades = new Map<string, IGrade[]>();
  for (const g of grades) {
    const key = g.course.toString();
    const arr = courseIdToGrades.get(key) || [];
    arr.push(g);
    courseIdToGrades.set(key, arr);
  }

  let totalGPA = 0;
  for (const [courseId] of courseIdToGrades) {
    const cg = await (this as IGradeModel).calculateCourseGrade(studentId, courseId);
    totalGPA += cg.gpa;
  }

  const totalCourses = courseIdToGrades.size;
  const overallGPA = totalCourses > 0 ? totalGPA / totalCourses : 0;

  return { gpa: overallGPA, totalCourses, totalGrades: grades.length };
};

const Grade = mongoose.model<IGrade, IGradeModel>('Grade', GradeSchema);

export { Grade };
export default Grade;


