import mongoose from 'mongoose';
import Attendance from '../models/Attendance';
import { Grade } from '../models/Grade';
import Course from '../models/Course';
import { Assignment } from '../models/Assignment';
import Class from '../models/Class';
import User from '../models/User';
import { AttendanceStatus, SubmissionStatus, UserRole } from '../types/enums';

// TypeScript Interfaces

export interface StudentPerformanceReport {
  studentId: string;
  studentName: string;
  email: string;
  overallGPA: number;
  totalCourses: number;
  coursePerformance: Array<{
    courseId: string;
    courseName: string;
    averageGrade: number;
    letterGrade: string;
    attendanceRate: number;
    assignmentsCompleted: number;
    totalAssignments: number;
  }>;
  attendanceStats: {
    total: number;
    present: number;
    absent: number;
    late: number;
    attendanceRate: number;
  };
  assignmentStats: {
    total: number;
    submitted: number;
    graded: number;
    averageScore: number;
    submissionRate: number;
  };
}

export interface TeacherWorkloadReport {
  teacherId: string;
  teacherName: string;
  email: string;
  totalCourses: number;
  totalStudents: number;
  totalClasses: number;
  totalAssignments: number;
  gradingPending: number;
  averageClassSize: number;
  courseDetails: Array<{
    courseId: string;
    courseName: string;
    studentCount: number;
    assignmentCount: number;
    classCount: number;
  }>;
}

export interface CourseEnrollmentTrendsReport {
  totalCourses: number;
  activeCourses: number;
  totalEnrollments: number;
  averageEnrollmentPerCourse: number;
  enrollmentByMonth: Array<{
    month: string;
    enrollments: number;
  }>;
  topCourses: Array<{
    courseId: string;
    courseName: string;
    enrollmentCount: number;
    capacity: number;
    utilizationRate: number;
  }>;
  coursesByStatus: Record<string, number>;
}

export interface AttendanceStatisticsReport {
  totalRecords: number;
  overallAttendanceRate: number;
  statusDistribution: Record<AttendanceStatus, number>;
  attendanceByMonth: Array<{
    month: string;
    present: number;
    absent: number;
    late: number;
    rate: number;
  }>;
  attendanceByClass: Array<{
    classId: string;
    className: string;
    totalRecords: number;
    attendanceRate: number;
  }>;
  lowAttendanceStudents: Array<{
    studentId: string;
    studentName: string;
    attendanceRate: number;
    totalClasses: number;
  }>;
}

// Service Functions

export async function getStudentPerformanceReport(
  studentId: string,
  startDate?: Date,
  endDate?: Date
): Promise<StudentPerformanceReport> {
  try {
    // Validate studentId is valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      throw new Error('Invalid student ID');
    }

    // Find student using User.findById to get name and email
    const student = await User.findById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    const studentName = `${student.profile.firstName} ${student.profile.lastName}`;
    const email = student.email;

    // Get overall GPA using Grade.calculateStudentGPA (existing static method)
    const gpaResult = await Grade.calculateStudentGPA(studentId);
    const overallGPA = gpaResult.gpa;

    // Get enrolled courses using Course.find({ students: studentId })
    const courses = await Course.find({ students: new mongoose.Types.ObjectId(studentId) });

    // Build date filter for time-based reports
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = startDate;
      if (endDate) dateFilter.date.$lte = endDate;
    }

    // For each course, calculate performance
    const coursePerformance = await Promise.all(
      courses.map(async (course) => {
        // Use Grade.calculateCourseGrade for grade data
        const gradeData = await Grade.calculateCourseGrade(studentId, (course._id as mongoose.Types.ObjectId).toString());
        const averageGrade = gradeData.averageScore;
        const letterGrade = gradeData.letterGrade;

        // Get course classes
        const courseClasses = await Class.find({ course: course._id });
        const classIds = courseClasses.map((c) => c._id);

        // Use aggregation on Attendance to get course attendance rate
        const attendanceMatch: any = {
          student: new mongoose.Types.ObjectId(studentId),
          class: { $in: classIds },
        };
        if (dateFilter.date) {
          attendanceMatch.date = dateFilter.date;
        }

        const attendanceStats = await Attendance.aggregate([
          { $match: attendanceMatch },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ]);

        const attendanceTotals = attendanceStats.reduce(
          (acc, curr) => {
            acc.total += curr.count;
            if (curr._id === AttendanceStatus.PRESENT) acc.present = curr.count;
            if (curr._id === AttendanceStatus.ABSENT) acc.absent = curr.count;
            if (curr._id === AttendanceStatus.LATE) acc.late = curr.count;
            return acc;
          },
          { total: 0, present: 0, absent: 0, late: 0 }
        );

        const attendanceRate = attendanceTotals.total > 0 ? (attendanceTotals.present / attendanceTotals.total) * 100 : 0;

        // Use aggregation on Assignment to get assignment completion
        const assignmentMatch: any = { course: course._id };
        if (dateFilter.date) {
          assignmentMatch.dueDate = dateFilter.date;
        }

        const assignmentStats = await Assignment.aggregate([
          { $match: assignmentMatch },
          { $unwind: { path: '$submissions', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              submitted: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$submissions.student', new mongoose.Types.ObjectId(studentId)] },
                        { $ne: ['$submissions.status', SubmissionStatus.NOT_SUBMITTED] },
                      ],
                    },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ]);

        const totalAssignments = await Assignment.countDocuments(assignmentMatch);
        const assignmentsCompleted = assignmentStats.length > 0 ? assignmentStats[0].submitted : 0;

        return {
          courseId: (course._id as mongoose.Types.ObjectId).toString(),
          courseName: course.name,
          averageGrade,
          letterGrade,
          attendanceRate: Math.round(attendanceRate * 100) / 100,
          assignmentsCompleted,
          totalAssignments,
        };
      })
    );

    // Get overall attendance stats using Attendance.getAttendanceStats (existing static method)
    const attendanceStatsData = await Attendance.getAttendanceStats(studentId);

    // Get assignment stats using aggregation
    const studentCourseIds = courses.map((c) => c._id);
    const assignmentMatchOverall: any = { course: { $in: studentCourseIds } };
    if (dateFilter.date) {
      assignmentMatchOverall.dueDate = dateFilter.date;
    }

    const allAssignments = await Assignment.find(assignmentMatchOverall);
    let totalAssignments = 0;
    let submittedAssignments = 0;
    let gradedAssignments = 0;
    let totalScore = 0;
    let gradedCount = 0;

    allAssignments.forEach((assignment) => {
      totalAssignments++;
      const submission = assignment.submissions.find((s) => s.student.toString() === studentId);
      if (submission && submission.status !== SubmissionStatus.NOT_SUBMITTED) {
        submittedAssignments++;
        if (submission.status === SubmissionStatus.GRADED && typeof submission.grade === 'number') {
          gradedAssignments++;
          totalScore += submission.grade;
          gradedCount++;
        }
      }
    });

    const averageScore = gradedCount > 0 ? totalScore / gradedCount : 0;
    const submissionRate = totalAssignments > 0 ? (submittedAssignments / totalAssignments) * 100 : 0;

    const assignmentStats = {
      total: totalAssignments,
      submitted: submittedAssignments,
      graded: gradedAssignments,
      averageScore: Math.round(averageScore * 100) / 100,
      submissionRate: Math.round(submissionRate * 100) / 100,
    };

    // Build and return StudentPerformanceReport object
    return {
      studentId,
      studentName,
      email,
      overallGPA: Math.round(overallGPA * 100) / 100,
      totalCourses: courses.length,
      coursePerformance,
      attendanceStats: attendanceStatsData,
      assignmentStats,
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to generate student performance report');
  }
}

export async function getTeacherWorkloadReport(
  teacherId: string,
  startDate?: Date,
  endDate?: Date
): Promise<TeacherWorkloadReport> {
  try {
    // Validate teacherId is valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      throw new Error('Invalid teacher ID');
    }

    // Find teacher using User.findById to get name and email
    const teacher = await User.findById(teacherId);
    if (!teacher) {
      throw new Error('Teacher not found');
    }

    const teacherName = `${teacher.profile.firstName} ${teacher.profile.lastName}`;
    const email = teacher.email;

    // Build date filter
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = startDate;
      if (endDate) dateFilter.createdAt.$lte = endDate;
    }

    // Get courses taught using Course.find({ teacher: teacherId })
    const courses = await Course.find({ teacher: new mongoose.Types.ObjectId(teacherId) });

    // Calculate total students across all courses (use Set to avoid duplicates)
    const studentSet = new Set<string>();
    courses.forEach((course) => {
      course.students.forEach((studentId) => {
        studentSet.add(studentId.toString());
      });
    });
    const totalStudents = studentSet.size;

    // Get total classes using aggregation on Class model
    const classMatch: any = { teacher: new mongoose.Types.ObjectId(teacherId) };
    if (dateFilter.createdAt) {
      classMatch.createdAt = dateFilter.createdAt;
    }
    const totalClassesResult = await Class.aggregate([{ $match: classMatch }, { $count: 'total' }]);
    const totalClasses = totalClassesResult.length > 0 ? totalClassesResult[0].total : 0;

    // Get total assignments using aggregation on Assignment model
    const assignmentMatch: any = { teacher: new mongoose.Types.ObjectId(teacherId) };
    if (dateFilter.createdAt) {
      assignmentMatch.createdAt = dateFilter.createdAt;
    }
    const totalAssignmentsResult = await Assignment.aggregate([{ $match: assignmentMatch }, { $count: 'total' }]);
    const totalAssignments = totalAssignmentsResult.length > 0 ? totalAssignmentsResult[0].total : 0;

    // Calculate grading pending using aggregation on Assignment
    const gradingPendingResult = await Assignment.aggregate([
      { $match: { teacher: new mongoose.Types.ObjectId(teacherId) } },
      { $unwind: { path: '$submissions', preserveNullAndEmptyArrays: false } },
      { $match: { 'submissions.status': SubmissionStatus.SUBMITTED } },
      { $count: 'total' },
    ]);
    const gradingPending = gradingPendingResult.length > 0 ? gradingPendingResult[0].total : 0;

    // Calculate average class size: totalStudents / totalCourses
    const averageClassSize = courses.length > 0 ? totalStudents / courses.length : 0;

    // For each course, get detailed stats
    const courseDetails = await Promise.all(
      courses.map(async (course) => {
        const studentCount = course.students.length;
        const assignmentCount = await Assignment.countDocuments({ course: course._id });
        const classCount = await Class.countDocuments({ course: course._id, teacher: new mongoose.Types.ObjectId(teacherId) });

        return {
          courseId: (course._id as mongoose.Types.ObjectId).toString(),
          courseName: course.name,
          studentCount,
          assignmentCount,
          classCount,
        };
      })
    );

    // Build and return TeacherWorkloadReport object
    return {
      teacherId,
      teacherName,
      email,
      totalCourses: courses.length,
      totalStudents,
      totalClasses,
      totalAssignments,
      gradingPending,
      averageClassSize: Math.round(averageClassSize * 100) / 100,
      courseDetails,
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to generate teacher workload report');
  }
}

export async function getCourseEnrollmentTrendsReport(
  startDate?: Date,
  endDate?: Date
): Promise<CourseEnrollmentTrendsReport> {
  try {
    // Build date filter
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = startDate;
      if (endDate) dateFilter.createdAt.$lte = endDate;
    }

    // Get total courses using Course.countDocuments()
    const totalCourses = await Course.countDocuments(dateFilter);

    // Get active courses using Course.countDocuments({ status: ACTIVE })
    const activeCoursesMatch: any = { status: 'active', ...dateFilter };
    const activeCourses = await Course.countDocuments(activeCoursesMatch);

    // Calculate total enrollments using aggregation on Course
    const enrollmentAggregation = await Course.aggregate([
      ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
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

    // Calculate average enrollment per course: totalEnrollments / totalCourses
    const averageEnrollmentPerCourse = totalCourses > 0 ? totalEnrollments / totalCourses : 0;

    // Get enrollment by month using aggregation on Course
    const enrollmentByMonthData = await Course.aggregate([
      ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
      { $unwind: { path: '$students', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          enrollments: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    const enrollmentByMonth = enrollmentByMonthData.map((item) => {
      const date = new Date(item._id.year, item._id.month - 1);
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      return {
        month: `${monthNames[date.getMonth()]} ${date.getFullYear()}`,
        enrollments: item.enrollments,
      };
    });

    // Get top courses by enrollment using aggregation
    const topCoursesData = await Course.aggregate([
      ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
      {
        $project: {
          name: 1,
          enrollmentCount: { $size: { $ifNull: ['$students', []] } },
          maxStudents: 1,
        },
      },
      { $sort: { enrollmentCount: -1 } },
      { $limit: 10 },
    ]);

    const topCourses = topCoursesData.map((course) => {
      const utilizationRate = course.maxStudents > 0 ? (course.enrollmentCount / course.maxStudents) * 100 : 0;
      return {
        courseId: course._id.toString(),
        courseName: course.name,
        enrollmentCount: course.enrollmentCount,
        capacity: course.maxStudents,
        utilizationRate: Math.round(utilizationRate * 100) / 100,
      };
    });

    // Get courses by status using aggregation
    const coursesByStatusData = await Course.aggregate([
      ...(Object.keys(dateFilter).length > 0 ? [{ $match: dateFilter }] : []),
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const coursesByStatus: Record<string, number> = {
      draft: 0,
      active: 0,
      archived: 0,
      completed: 0,
    };

    coursesByStatusData.forEach((item) => {
      coursesByStatus[item._id] = item.count;
    });

    // Build and return CourseEnrollmentTrendsReport object
    return {
      totalCourses,
      activeCourses,
      totalEnrollments,
      averageEnrollmentPerCourse: Math.round(averageEnrollmentPerCourse * 100) / 100,
      enrollmentByMonth,
      topCourses,
      coursesByStatus,
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to generate course enrollment trends report');
  }
}

export async function getAttendanceStatisticsReport(filters?: {
  courseId?: string;
  teacherId?: string;
  classId?: string;
  startDate?: Date;
  endDate?: Date;
}): Promise<AttendanceStatisticsReport> {
  try {
    // Build match query based on filters
    const matchQuery: any = {};

    if (filters?.classId) {
      matchQuery.class = new mongoose.Types.ObjectId(filters.classId);
    }

    if (filters?.courseId) {
      // Get classes for this course
      const courseClasses = await Class.find({ course: new mongoose.Types.ObjectId(filters.courseId) });
      const classIds = courseClasses.map((c) => c._id);
      matchQuery.class = { $in: classIds };
    }

    if (filters?.teacherId) {
      // Get classes for this teacher
      const teacherClasses = await Class.find({ teacher: new mongoose.Types.ObjectId(filters.teacherId) });
      const classIds = teacherClasses.map((c) => c._id);
      matchQuery.class = { $in: classIds };
    }

    if (filters?.startDate || filters?.endDate) {
      matchQuery.date = {};
      if (filters.startDate) matchQuery.date.$gte = filters.startDate;
      if (filters.endDate) matchQuery.date.$lte = filters.endDate;
    }

    // Get total attendance records using Attendance.countDocuments(matchQuery)
    const totalRecords = await Attendance.countDocuments(matchQuery);

    // Calculate overall attendance rate using aggregation
    const statusDistributionData = await Attendance.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statusDistribution: Record<AttendanceStatus, number> = {
      [AttendanceStatus.PRESENT]: 0,
      [AttendanceStatus.ABSENT]: 0,
      [AttendanceStatus.LATE]: 0,
      [AttendanceStatus.EXCUSED]: 0,
    };

    statusDistributionData.forEach((item) => {
      statusDistribution[item._id as AttendanceStatus] = item.count;
    });

    const presentCount = statusDistribution[AttendanceStatus.PRESENT];
    const overallAttendanceRate = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;

    // Get attendance by month using aggregation
    const attendanceByMonthData = await Attendance.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            status: '$status',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Group by month
    const monthMap = new Map<string, { present: number; absent: number; late: number }>();
    attendanceByMonthData.forEach((item) => {
      const date = new Date(item._id.year, item._id.month - 1);
      const monthNames = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
      const existing = monthMap.get(monthKey) || { present: 0, absent: 0, late: 0 };
      if (item._id.status === AttendanceStatus.PRESENT) existing.present += item.count;
      if (item._id.status === AttendanceStatus.ABSENT) existing.absent += item.count;
      if (item._id.status === AttendanceStatus.LATE) existing.late += item.count;
      monthMap.set(monthKey, existing);
    });

    const attendanceByMonth = Array.from(monthMap.entries()).map(([month, counts]) => {
      const total = counts.present + counts.absent + counts.late;
      const rate = total > 0 ? (counts.present / total) * 100 : 0;
      return {
        month,
        present: counts.present,
        absent: counts.absent,
        late: counts.late,
        rate: Math.round(rate * 100) / 100,
      };
    });

    // Get attendance by class using aggregation
    const attendanceByClassData = await Attendance.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$class',
          totalRecords: { $sum: 1 },
          present: {
            $sum: {
              $cond: [{ $eq: ['$status', AttendanceStatus.PRESENT] }, 1, 0],
            },
          },
        },
      },
      {
        $lookup: {
          from: 'classes',
          localField: '_id',
          foreignField: '_id',
          as: 'classInfo',
        },
      },
      { $unwind: { path: '$classInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          classId: { $toString: '$_id' },
          className: { $ifNull: ['$classInfo.title', 'Unknown'] },
          totalRecords: 1,
          attendanceRate: {
            $cond: [
              { $gt: ['$totalRecords', 0] },
              { $multiply: [{ $divide: ['$present', '$totalRecords'] }, 100] },
              0,
            ],
          },
        },
      },
      { $sort: { attendanceRate: 1 } },
    ]);

    const attendanceByClass = attendanceByClassData.map((item) => ({
      classId: item.classId,
      className: item.className,
      totalRecords: item.totalRecords,
      attendanceRate: Math.round(item.attendanceRate * 100) / 100,
    }));

    // Get low attendance students using aggregation
    const lowAttendanceStudentsData = await Attendance.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$student',
          totalClasses: { $sum: 1 },
          present: {
            $sum: {
              $cond: [{ $eq: ['$status', AttendanceStatus.PRESENT] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          studentId: { $toString: '$_id' },
          totalClasses: 1,
          attendanceRate: {
            $cond: [
              { $gt: ['$totalClasses', 0] },
              { $multiply: [{ $divide: ['$present', '$totalClasses'] }, 100] },
              0,
            ],
          },
        },
      },
      { $match: { attendanceRate: { $lt: 75 } } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'studentInfo',
        },
      },
      { $unwind: { path: '$studentInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          studentId: 1,
          studentName: {
            $concat: [
              { $ifNull: ['$studentInfo.profile.firstName', ''] },
              ' ',
              { $ifNull: ['$studentInfo.profile.lastName', ''] },
            ],
          },
          attendanceRate: 1,
          totalClasses: 1,
        },
      },
      { $sort: { attendanceRate: 1 } },
      { $limit: 20 },
    ]);

    const lowAttendanceStudents = lowAttendanceStudentsData.map((item) => ({
      studentId: item.studentId,
      studentName: item.studentName.trim() || 'Unknown',
      attendanceRate: Math.round(item.attendanceRate * 100) / 100,
      totalClasses: item.totalClasses,
    }));

    // Build and return AttendanceStatisticsReport object
    return {
      totalRecords,
      overallAttendanceRate: Math.round(overallAttendanceRate * 100) / 100,
      statusDistribution,
      attendanceByMonth,
      attendanceByClass,
      lowAttendanceStudents,
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to generate attendance statistics report');
  }
}

export async function getCourseAnalyticsReport(courseId: string): Promise<{
  course: any;
  enrollmentStats: any;
  assignmentStats: any;
  gradeStats: any;
  attendanceStats: any;
}> {
  try {
    // Validate courseId is valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      throw new Error('Invalid course ID');
    }

    // Find course by ID with populated fields
    const course = await Course.findById(courseId).populate('teacher', 'profile.firstName profile.lastName email');
    if (!course) {
      throw new Error('Course not found');
    }

    // Get enrollment stats
    const currentEnrollment = course.students.length;
    const capacity = course.maxStudents;
    const utilizationRate = capacity > 0 ? (currentEnrollment / capacity) * 100 : 0;

    const enrollmentStats = {
      currentEnrollment,
      capacity,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
    };

    // Get assignment stats using aggregation on Assignment
    const assignmentStatsData = await Assignment.aggregate([
      { $match: { course: new mongoose.Types.ObjectId(courseId) } },
      {
        $project: {
          totalAssignments: 1,
          submissionCount: { $size: { $ifNull: ['$submissions', []] } },
          gradedCount: {
            $size: {
              $filter: {
                input: { $ifNull: ['$submissions', []] },
                as: 'sub',
                cond: { $eq: ['$$sub.status', SubmissionStatus.GRADED] },
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalAssignments: { $sum: 1 },
          totalSubmissions: { $sum: '$submissionCount' },
          totalGraded: { $sum: '$gradedCount' },
        },
      },
    ]);

    const assignmentStats = assignmentStatsData.length > 0
      ? {
          totalAssignments: assignmentStatsData[0].totalAssignments,
          totalSubmissions: assignmentStatsData[0].totalSubmissions,
          averageSubmissionsPerAssignment:
            assignmentStatsData[0].totalAssignments > 0
              ? assignmentStatsData[0].totalSubmissions / assignmentStatsData[0].totalAssignments
              : 0,
          gradedSubmissions: assignmentStatsData[0].totalGraded,
        }
      : {
          totalAssignments: 0,
          totalSubmissions: 0,
          averageSubmissionsPerAssignment: 0,
          gradedSubmissions: 0,
        };

    // Get grade stats using aggregation on Grade
    const gradeStatsData = await Grade.aggregate([
      { $match: { course: new mongoose.Types.ObjectId(courseId) } },
      {
        $group: {
          _id: null,
          averageScore: { $avg: '$percentage' },
          totalGrades: { $sum: 1 },
          passingGrades: {
            $sum: {
              $cond: [{ $gte: ['$percentage', 60] }, 1, 0],
            },
          },
        },
      },
    ]);

    const gradeDistributionData = await Grade.aggregate([
      { $match: { course: new mongoose.Types.ObjectId(courseId) } },
      {
        $group: {
          _id: '$letterGrade',
          count: { $sum: 1 },
        },
      },
    ]);

    const letterGradeDistribution: Record<string, number> = {};
    gradeDistributionData.forEach((item) => {
      letterGradeDistribution[item._id] = item.count;
    });

    const gradeStats = gradeStatsData.length > 0
      ? {
          averageScore: Math.round(gradeStatsData[0].averageScore * 100) / 100,
          totalGrades: gradeStatsData[0].totalGrades,
          passingRate:
            gradeStatsData[0].totalGrades > 0
              ? Math.round((gradeStatsData[0].passingGrades / gradeStatsData[0].totalGrades) * 100 * 100) / 100
              : 0,
          letterGradeDistribution,
        }
      : {
          averageScore: 0,
          totalGrades: 0,
          passingRate: 0,
          letterGradeDistribution: {},
        };

    // Get attendance stats using aggregation on Attendance
    const courseClasses = await Class.find({ course: new mongoose.Types.ObjectId(courseId) });
    const classIds = courseClasses.map((c) => c._id);

    const attendanceStatsData = await Attendance.aggregate([
      { $match: { class: { $in: classIds } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const attendanceTotals = attendanceStatsData.reduce(
      (acc, curr) => {
        acc.total += curr.count;
        if (curr._id === AttendanceStatus.PRESENT) acc.present = curr.count;
        if (curr._id === AttendanceStatus.ABSENT) acc.absent = curr.count;
        if (curr._id === AttendanceStatus.LATE) acc.late = curr.count;
        return acc;
      },
      { total: 0, present: 0, absent: 0, late: 0 }
    );

    const attendanceRate = attendanceTotals.total > 0 ? (attendanceTotals.present / attendanceTotals.total) * 100 : 0;

    const attendanceStats = {
      totalRecords: attendanceTotals.total,
      present: attendanceTotals.present,
      absent: attendanceTotals.absent,
      late: attendanceTotals.late,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
    };

    // Build and return comprehensive course analytics object
    return {
      course: {
        id: (course._id as mongoose.Types.ObjectId).toString(),
        name: course.name,
        code: course.code,
        teacher: course.teacher,
        status: course.status,
      },
      enrollmentStats,
      assignmentStats,
      gradeStats,
      attendanceStats,
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to generate course analytics report');
  }
}

export async function getClassPerformanceReport(classId: string): Promise<{
  class: any;
  attendanceStats: any;
  studentList: Array<{
    studentId: string;
    studentName: string;
    attendanceStatus: string;
    attendanceCount: number;
  }>;
}> {
  try {
    // Validate classId
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      throw new Error('Invalid class ID');
    }

    // Find class by ID with populated fields
    const classDoc = await Class.findById(classId)
      .populate('course', 'name code')
      .populate('teacher', 'profile.firstName profile.lastName')
      .populate('students', 'profile.firstName profile.lastName email');

    if (!classDoc) {
      throw new Error('Class not found');
    }

    // Get attendance for class using Attendance.findByClass(classId)
    const attendanceRecords = await Attendance.findByClass(classId);

    // Group attendance by student
    const studentAttendanceMap = new Map<
      string,
      {
        studentId: string;
        studentName: string;
        present: number;
        absent: number;
        late: number;
        total: number;
      }
    >();

    attendanceRecords.forEach((record) => {
      const studentId = record.student.toString();
      const student = (record as any).student;
      const studentName = student
        ? `${student.profile?.firstName || ''} ${student.profile?.lastName || ''}`.trim()
        : 'Unknown';

      if (!studentAttendanceMap.has(studentId)) {
        studentAttendanceMap.set(studentId, {
          studentId,
          studentName,
          present: 0,
          absent: 0,
          late: 0,
          total: 0,
        });
      }

      const stats = studentAttendanceMap.get(studentId)!;
      stats.total++;
      if (record.status === AttendanceStatus.PRESENT) stats.present++;
      if (record.status === AttendanceStatus.ABSENT) stats.absent++;
      if (record.status === AttendanceStatus.LATE) stats.late++;
    });

    // Build student list with attendance summary
    const studentList = Array.from(studentAttendanceMap.values()).map((stats) => {
      let attendanceStatus = 'No Records';
      if (stats.total > 0) {
        const rate = (stats.present / stats.total) * 100;
        if (rate >= 75) attendanceStatus = 'Good';
        else if (rate >= 50) attendanceStatus = 'Fair';
        else attendanceStatus = 'Poor';
      }

      return {
        studentId: stats.studentId,
        studentName: stats.studentName,
        attendanceStatus,
        attendanceCount: stats.total,
      };
    });

    // Calculate overall attendance stats
    const totalRecords = attendanceRecords.length;
    const presentCount = attendanceRecords.filter((r) => r.status === AttendanceStatus.PRESENT).length;
    const absentCount = attendanceRecords.filter((r) => r.status === AttendanceStatus.ABSENT).length;
    const lateCount = attendanceRecords.filter((r) => r.status === AttendanceStatus.LATE).length;
    const attendanceRate = totalRecords > 0 ? (presentCount / totalRecords) * 100 : 0;

    const attendanceStats = {
      totalRecords,
      present: presentCount,
      absent: absentCount,
      late: lateCount,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
    };

    // Return class performance report
    return {
      class: {
        id: (classDoc._id as mongoose.Types.ObjectId).toString(),
        title: classDoc.title,
        course: classDoc.course,
        teacher: classDoc.teacher,
        scheduledDate: classDoc.scheduledDate,
        status: classDoc.status,
      },
      attendanceStats,
      studentList,
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to generate class performance report');
  }
}
