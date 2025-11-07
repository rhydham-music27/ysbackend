import { Request, Response, NextFunction } from 'express';
import {
  getStudentPerformanceReport,
  getTeacherWorkloadReport,
  getCourseEnrollmentTrendsReport,
  getAttendanceStatisticsReport,
  getCourseAnalyticsReport,
  getClassPerformanceReport,
} from '../services/reportService';
import { UserRole } from '../types/enums';

export async function getStudentPerformance(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const parsedStartDate = startDate ? new Date(startDate as string) : undefined;
    const parsedEndDate = endDate ? new Date(endDate as string) : undefined;

    const report = await getStudentPerformanceReport(id, parsedStartDate, parsedEndDate);

    res.status(200).json({ success: true, data: { report } });
  } catch (error: any) {
    next(error);
  }
}

export async function getMyPerformance(req: Request, res: Response, next: NextFunction) {
  try {
    const studentId = (req as any).user._id.toString();
    const { startDate, endDate } = req.query;

    const parsedStartDate = startDate ? new Date(startDate as string) : undefined;
    const parsedEndDate = endDate ? new Date(endDate as string) : undefined;

    const report = await getStudentPerformanceReport(studentId, parsedStartDate, parsedEndDate);

    res.status(200).json({ success: true, data: { report } });
  } catch (error: any) {
    next(error);
  }
}

export async function getTeacherWorkload(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const parsedStartDate = startDate ? new Date(startDate as string) : undefined;
    const parsedEndDate = endDate ? new Date(endDate as string) : undefined;

    const report = await getTeacherWorkloadReport(id, parsedStartDate, parsedEndDate);

    res.status(200).json({ success: true, data: { report } });
  } catch (error: any) {
    next(error);
  }
}

export async function getMyWorkload(req: Request, res: Response, next: NextFunction) {
  try {
    const teacherId = (req as any).user._id.toString();
    const { startDate, endDate } = req.query;

    const parsedStartDate = startDate ? new Date(startDate as string) : undefined;
    const parsedEndDate = endDate ? new Date(endDate as string) : undefined;

    const report = await getTeacherWorkloadReport(teacherId, parsedStartDate, parsedEndDate);

    res.status(200).json({ success: true, data: { report } });
  } catch (error: any) {
    next(error);
  }
}

export async function getCourseEnrollmentTrends(req: Request, res: Response, next: NextFunction) {
  try {
    const { startDate, endDate } = req.query;

    const parsedStartDate = startDate ? new Date(startDate as string) : undefined;
    const parsedEndDate = endDate ? new Date(endDate as string) : undefined;

    const report = await getCourseEnrollmentTrendsReport(parsedStartDate, parsedEndDate);

    res.status(200).json({ success: true, data: { report } });
  } catch (error: any) {
    next(error);
  }
}

export async function getAttendanceStatistics(req: Request, res: Response, next: NextFunction) {
  try {
    const { courseId, teacherId, classId, startDate, endDate } = req.query;

    const parsedStartDate = startDate ? new Date(startDate as string) : undefined;
    const parsedEndDate = endDate ? new Date(endDate as string) : undefined;

    const filters = {
      courseId: courseId as string | undefined,
      teacherId: teacherId as string | undefined,
      classId: classId as string | undefined,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
    };

    const report = await getAttendanceStatisticsReport(filters);

    res.status(200).json({ success: true, data: { report } });
  } catch (error: any) {
    next(error);
  }
}

export async function getCourseAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const report = await getCourseAnalyticsReport(id);

    res.status(200).json({ success: true, data: { report } });
  } catch (error: any) {
    next(error);
  }
}

export async function getClassPerformance(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;

    const report = await getClassPerformanceReport(id);

    res.status(200).json({ success: true, data: { report } });
  } catch (error: any) {
    next(error);
  }
}

export async function getDashboardSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    const role = user.role;

    let dashboard: any = {};

    if (role === UserRole.ADMIN || role === UserRole.MANAGER) {
      // ADMIN/MANAGER: total users, total courses, total enrollments, recent activity
      const User = (await import('../models/User')).default;
      const Course = (await import('../models/Course')).default;

      const totalUsers = await User.countDocuments();
      const totalCourses = await Course.countDocuments();
      
      const enrollmentAggregation = await Course.aggregate([
        {
          $project: {
            studentCount: { $size: { $ifNull: ['$students', []] } },
          },
        },
        {
          $group: {
            _id: null,
            totalEnrollments: { $sum: '$studentCount' },
          },
        },
      ]);

      const totalEnrollments = enrollmentAggregation.length > 0 ? enrollmentAggregation[0].totalEnrollments : 0;

      dashboard = {
        totalUsers,
        totalCourses,
        totalEnrollments,
        recentActivity: [], // Can be enhanced with actual activity log
      };
    } else if (role === UserRole.TEACHER) {
      // TEACHER: my courses count, my students count, pending grading count, upcoming classes
      const Course = (await import('../models/Course')).default;
      const { Assignment } = await import('../models/Assignment');
      const Class = (await import('../models/Class')).default;
      const { SubmissionStatus } = await import('../types/enums');

      const myCourses = await Course.find({ teacher: user._id });
      const myCoursesCount = myCourses.length;

      const studentSet = new Set<string>();
      myCourses.forEach((course) => {
        course.students.forEach((studentId) => {
          studentSet.add(studentId.toString());
        });
      });
      const myStudentsCount = studentSet.size;

      const gradingPendingResult = await Assignment.aggregate([
        { $match: { teacher: user._id } },
        { $unwind: { path: '$submissions', preserveNullAndEmptyArrays: false } },
        { $match: { 'submissions.status': SubmissionStatus.SUBMITTED } },
        { $count: 'total' },
      ]);
      const gradingPending = gradingPendingResult.length > 0 ? gradingPendingResult[0].total : 0;

      const now = new Date();
      const upcomingClasses = await Class.find({
        teacher: user._id,
        scheduledDate: { $gte: now },
      }).limit(5);

      dashboard = {
        myCoursesCount,
        myStudentsCount,
        gradingPending,
        upcomingClasses: upcomingClasses.map((c) => ({
          id: String((c as any)._id),
          title: c.title,
          scheduledDate: c.scheduledDate,
        })),
      };
    } else if (role === UserRole.STUDENT) {
      // STUDENT: enrolled courses count, upcoming assignments count, recent grades, attendance rate
      const Course = (await import('../models/Course')).default;
      const { Assignment } = await import('../models/Assignment');
      const Grade = (await import('../models/Grade')).default;
      const Attendance = (await import('../models/Attendance')).default;

      const enrolledCourses = await Course.find({ students: user._id });
      const enrolledCoursesCount = enrolledCourses.length;

      const courseIds = enrolledCourses.map((c) => c._id);
      const now = new Date();
      const upcomingAssignments = await Assignment.find({
        course: { $in: courseIds },
        dueDate: { $gte: now },
      }).limit(5);

      const recentGrades = await Grade.find({ student: user._id })
        .sort({ gradedAt: -1 })
        .limit(5)
        .populate('course', 'name');

      const attendanceStats = await Attendance.getAttendanceStats(user._id.toString());

      dashboard = {
        enrolledCoursesCount,
        upcomingAssignmentsCount: upcomingAssignments.length,
        upcomingAssignments: upcomingAssignments.map((a) => ({
          id: String((a as any)._id),
          title: a.title,
          dueDate: a.dueDate,
        })),
        recentGrades: recentGrades.map((g) => ({
          id: String((g as any)._id),
          course: (g.course as any)?.name || 'Unknown',
          score: g.score,
          maxScore: g.maxScore,
          percentage: (g as any).percentage,
          letterGrade: (g as any).letterGrade,
        })),
        attendanceRate: attendanceStats.attendanceRate,
      };
    }

    res.status(200).json({ success: true, data: { dashboard } });
  } catch (error: any) {
    next(error);
  }
}

