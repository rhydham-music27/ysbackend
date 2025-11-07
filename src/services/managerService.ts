import mongoose from 'mongoose';
import Course, { ICourse } from '../models/Course';
import Schedule, { ISchedule } from '../models/Schedule';
import Assignment from '../models/Assignment';
import Grade from '../models/Grade';
import User from '../models/User';
import { ApprovalStatus, UserRole, CourseStatus, SubmissionStatus } from '../types/enums';

export interface ApproveCourseParams {
  courseId: string;
  approvedBy: string;
  approvalNotes?: string;
  approve: boolean;
}

export interface ApproveScheduleParams {
  scheduleId: string;
  approvedBy: string;
  approvalNotes?: string;
  approve: boolean;
}

export interface TeacherPerformanceMetrics {
  teacherId: string;
  teacherName: string;
  totalCourses: number;
  totalStudents: number;
  averageClassSize: number;
  totalAssignments: number;
  gradingPending: number;
  averageGradeGiven: number;
  studentSatisfaction?: number;
}

export interface ManagerDashboardData {
  pendingCourseApprovals: number;
  pendingScheduleApprovals: number;
  totalTeachers: number;
  totalCourses: number;
  totalStudents: number;
  recentApprovals: Array<{
    type: 'course' | 'schedule';
    id: string;
    title: string;
    approvedAt: Date;
  }>;
  teacherPerformanceSummary: Array<{
    teacherId: string;
    teacherName: string;
    courseCount: number;
    studentCount: number;
    pendingGrading: number;
  }>;
}

export async function approveCourse(params: ApproveCourseParams): Promise<ICourse> {
  try {
    const { courseId, approvedBy, approvalNotes, approve } = params;

    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(approvedBy)) {
      throw new Error('Invalid course ID or manager ID');
    }

    const course = await Course.findById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    if (!course.requiresApproval) {
      throw new Error('Course does not require approval');
    }

    if (course.approvalStatus && course.approvalStatus !== ApprovalStatus.PENDING) {
      throw new Error('Course has already been approved/rejected');
    }

    if (approve) {
      course.approvalStatus = ApprovalStatus.APPROVED;
      course.approvedBy = new mongoose.Types.ObjectId(approvedBy);
      course.approvalDate = new Date();
      course.approvalNotes = approvalNotes;
      course.status = CourseStatus.ACTIVE;
    } else {
      course.approvalStatus = ApprovalStatus.REJECTED;
      course.approvedBy = new mongoose.Types.ObjectId(approvedBy);
      course.approvalDate = new Date();
      course.approvalNotes = approvalNotes;
      // Keep course as DRAFT when rejected
    }

    await course.save();
    await course.populate('approvedBy', 'profile.firstName profile.lastName email');
    await course.populate('teacher', 'profile.firstName profile.lastName email');
    await course.populate('createdBy', 'profile.firstName profile.lastName');

    return course;
  } catch (error) {
    throw error;
  }
}

export async function approveSchedule(params: ApproveScheduleParams): Promise<ISchedule> {
  try {
    const { scheduleId, approvedBy, approvalNotes, approve } = params;

    if (!mongoose.Types.ObjectId.isValid(scheduleId) || !mongoose.Types.ObjectId.isValid(approvedBy)) {
      throw new Error('Invalid schedule ID or manager ID');
    }

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      throw new Error('Schedule not found');
    }

    if (!schedule.requiresApproval) {
      throw new Error('Schedule does not require approval');
    }

    if (schedule.approvalStatus && schedule.approvalStatus !== ApprovalStatus.PENDING) {
      throw new Error('Schedule has already been approved/rejected');
    }

    if (approve) {
      schedule.approvalStatus = ApprovalStatus.APPROVED;
      schedule.approvedBy = new mongoose.Types.ObjectId(approvedBy);
      schedule.approvalDate = new Date();
      schedule.approvalNotes = approvalNotes;
      schedule.isActive = true;
    } else {
      schedule.approvalStatus = ApprovalStatus.REJECTED;
      schedule.approvedBy = new mongoose.Types.ObjectId(approvedBy);
      schedule.approvalDate = new Date();
      schedule.approvalNotes = approvalNotes;
      schedule.isActive = false;
    }

    await schedule.save();
    await schedule.populate('approvedBy', 'profile.firstName profile.lastName email');
    await schedule.populate('teacher', 'profile.firstName profile.lastName email');
    await schedule.populate('course', 'name code');
    await schedule.populate('createdBy', 'profile.firstName profile.lastName');

    return schedule;
  } catch (error) {
    throw error;
  }
}

export async function getPendingCourseApprovals(): Promise<ICourse[]> {
  try {
    const courses = await Course.findPendingApproval();
    await Course.populate(courses as any, [
      { path: 'teacher', select: 'profile.firstName profile.lastName email' },
      { path: 'createdBy', select: 'profile.firstName profile.lastName' },
    ]);
    // sort by createdAt ascending
    (courses as any).sort?.((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return courses as unknown as ICourse[];
  } catch (error) {
    throw error;
  }
}

export async function getPendingScheduleApprovals(): Promise<ISchedule[]> {
  try {
    const schedules = await Schedule.findPendingApproval();
    await Schedule.populate(schedules as any, [
      { path: 'teacher', select: 'profile.firstName profile.lastName email' },
      { path: 'course', select: 'name code' },
      { path: 'createdBy', select: 'profile.firstName profile.lastName' },
    ]);
    (schedules as any).sort?.((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return schedules as unknown as ISchedule[];
  } catch (error) {
    throw error;
  }
}

export async function getTeacherPerformanceMetrics(teacherId: string): Promise<TeacherPerformanceMetrics> {
  try {
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      throw new Error('Invalid teacher ID');
    }

    const teacher = await User.findById(teacherId);
    if (!teacher) {
      throw new Error('Teacher not found');
    }
    if (teacher.role !== UserRole.TEACHER) {
      throw new Error('User is not a teacher');
    }

    const courses = await Course.find({ teacher: teacherId });
    const totalCourses = courses.length;

    // Calculate total unique students across all courses
    const studentSet = new Set<string>();
    courses.forEach((course) => {
      course.students.forEach((studentId) => {
        studentSet.add(studentId.toString());
      });
    });
    const totalStudents = studentSet.size;
    const averageClassSize = totalCourses > 0 ? totalStudents / totalCourses : 0;

    // Get total assignments
    const totalAssignments = await Assignment.countDocuments({ teacher: teacherId });

    // Get pending grading count using aggregation
    const pendingGradingResult = await Assignment.aggregate([
      { $match: { teacher: new mongoose.Types.ObjectId(teacherId) } },
      { $unwind: { path: '$submissions', preserveNullAndEmptyArrays: true } },
      { $match: { 'submissions.status': SubmissionStatus.SUBMITTED } },
      { $count: 'count' },
    ]);
    const gradingPending = pendingGradingResult.length > 0 ? pendingGradingResult[0].count : 0;

    // Get average grade given using aggregation
    const avgGradeResult = await Grade.aggregate([
      { $match: { gradedBy: new mongoose.Types.ObjectId(teacherId) } },
      {
        $group: {
          _id: null,
          avgScore: { $avg: '$score' },
        },
      },
    ]);
    const averageGradeGiven = avgGradeResult.length > 0 && avgGradeResult[0].avgScore ? avgGradeResult[0].avgScore : 0;

    const teacherName = `${teacher.profile.firstName} ${teacher.profile.lastName}`.trim();

    return {
      teacherId,
      teacherName,
      totalCourses,
      totalStudents,
      averageClassSize,
      totalAssignments,
      gradingPending,
      averageGradeGiven,
    };
  } catch (error) {
    throw error;
  }
}

export async function getAllTeachersPerformance(): Promise<TeacherPerformanceMetrics[]> {
  try {
    const teachers = await User.find({ role: UserRole.TEACHER, isActive: true });
    const performanceList: TeacherPerformanceMetrics[] = [];

    for (const teacher of teachers) {
      try {
        const metrics = await getTeacherPerformanceMetrics(String((teacher as any)._id));
        performanceList.push(metrics);
      } catch (error) {
        // Skip teachers with errors, continue with others
        continue;
      }
    }

    // Sort by totalStudents descending (busiest teachers first)
    performanceList.sort((a, b) => b.totalStudents - a.totalStudents);

    return performanceList;
  } catch (error) {
    throw error;
  }
}

export async function getManagerDashboard(): Promise<ManagerDashboardData> {
  try {
    const pendingCourseApprovals = await Course.countDocuments({ approvalStatus: ApprovalStatus.PENDING });
    const pendingScheduleApprovals = await Schedule.countDocuments({ approvalStatus: ApprovalStatus.PENDING });
    const totalTeachers = await User.countDocuments({ role: UserRole.TEACHER, isActive: true });
    const totalCourses = await Course.countDocuments();
    const totalStudents = await User.countDocuments({ role: UserRole.STUDENT, isActive: true });

    // Get recent approvals (last 10) - courses and schedules
    const recentCourseApprovals = await Course.find({
      approvalStatus: { $in: [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED] },
    })
      .sort({ approvalDate: -1 })
      .limit(10)
      .select('name approvalDate _id');

    const recentScheduleApprovals = await Schedule.find({
      approvalStatus: { $in: [ApprovalStatus.APPROVED, ApprovalStatus.REJECTED] },
    })
      .populate('course', 'name')
      .sort({ approvalDate: -1 })
      .limit(10)
      .select('course approvalDate _id');

    const recentApprovals: ManagerDashboardData['recentApprovals'] = [];

    recentCourseApprovals.forEach((course) => {
      if (course.approvalDate) {
        recentApprovals.push({
          type: 'course',
          id: String((course as any)._id),
          title: course.name,
          approvedAt: course.approvalDate,
        });
      }
    });

    recentScheduleApprovals.forEach((schedule) => {
      if (schedule.approvalDate && schedule.course) {
        const courseName = (schedule.course as any).name || 'Schedule';
        recentApprovals.push({
          type: 'schedule',
          id: String((schedule as any)._id),
          title: courseName,
          approvedAt: schedule.approvalDate,
        });
      }
    });

    // Sort by approvalDate descending and limit to 10
    recentApprovals.sort((a, b) => b.approvedAt.getTime() - a.approvedAt.getTime());
    recentApprovals.splice(10);

    // Get teacher performance summary (top 5 by student count)
    const allTeachersPerformance = await getAllTeachersPerformance();
    const teacherPerformanceSummary = allTeachersPerformance.slice(0, 5).map((metrics) => ({
      teacherId: metrics.teacherId,
      teacherName: metrics.teacherName,
      courseCount: metrics.totalCourses,
      studentCount: metrics.totalStudents,
      pendingGrading: metrics.gradingPending,
    }));

    return {
      pendingCourseApprovals,
      pendingScheduleApprovals,
      totalTeachers,
      totalCourses,
      totalStudents,
      recentApprovals,
      teacherPerformanceSummary,
    };
  } catch (error) {
    throw error;
  }
}

export async function getCourseStatisticsForManager(): Promise<{
  totalCourses: number;
  activeCourses: number;
  pendingApproval: number;
  coursesByStatus: Record<string, number>;
  topCourses: Array<{
    courseId: string;
    courseName: string;
    enrollmentCount: number;
    teacherName: string;
  }>;
}> {
  try {
    const totalCourses = await Course.countDocuments();
    const activeCourses = await Course.countDocuments({ status: CourseStatus.ACTIVE });
    const pendingApproval = await Course.countDocuments({ approvalStatus: ApprovalStatus.PENDING });

    // Get courses by status using aggregation
    const statusAggregation = await Course.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const coursesByStatus: Record<string, number> = {};
    statusAggregation.forEach((item) => {
      coursesByStatus[item._id] = item.count;
    });

    // Get top courses by enrollment using aggregation
    const topCoursesAggregation = await Course.aggregate([
      {
        $project: {
          name: 1,
          enrollmentCount: { $size: { $ifNull: ['$students', []] } },
          teacher: 1,
        },
      },
      { $sort: { enrollmentCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: 'teacher',
          foreignField: '_id',
          as: 'teacherData',
        },
      },
      {
        $unwind: { path: '$teacherData', preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          courseId: { $toString: '$_id' },
          courseName: '$name',
          enrollmentCount: 1,
          teacherName: {
            $concat: [
              { $ifNull: ['$teacherData.profile.firstName', ''] },
              ' ',
              { $ifNull: ['$teacherData.profile.lastName', ''] },
            ],
          },
        },
      },
    ]);

    const topCourses = topCoursesAggregation.map((item) => ({
      courseId: item.courseId,
      courseName: item.courseName,
      enrollmentCount: item.enrollmentCount || 0,
      teacherName: (item.teacherName || '').trim() || 'Unknown Teacher',
    }));

    return {
      totalCourses,
      activeCourses,
      pendingApproval,
      coursesByStatus,
      topCourses,
    };
  } catch (error) {
    throw error;
  }
}

