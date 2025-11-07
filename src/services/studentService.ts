import mongoose from 'mongoose';
import Course from '../models/Course';
import Assignment from '../models/Assignment';
import Grade from '../models/Grade';
import Attendance from '../models/Attendance';
import Class from '../models/Class';
import User from '../models/User';
import Notification from '../models/Notification';
import { enrollStudent, unenrollStudent } from './courseService';
import { UserRole, CourseStatus, AssignmentStatus, ClassStatus } from '../types/enums';

export interface StudentDashboardData {
  enrolledCourses: Array<{
    courseId: string;
    courseName: string;
    teacherName: string;
    enrollmentDate: Date;
    schedule?: any;
  }>;
  upcomingAssignments: Array<{
    assignmentId: string;
    title: string;
    courseName: string;
    dueDate: Date;
    status: string;
    isOverdue: boolean;
  }>;
  recentGrades: Array<{
    gradeId: string;
    courseName: string;
    score: number;
    maxScore: number;
    letterGrade: string;
    gradedAt: Date;
  }>;
  attendanceSummary: {
    totalClasses: number;
    present: number;
    absent: number;
    late: number;
    attendanceRate: number;
  };
  overallGPA: number;
  upcomingClasses: Array<{
    classId: string;
    title: string;
    courseName: string;
    scheduledDate: Date;
    startTime: Date;
    location: any;
  }>;
  notifications: {
    unreadCount: number;
    recentNotifications: any[];
  };
}

export interface EnrollInCourseParams {
  courseId: string;
  studentId: string;
}

export interface DropCourseParams {
  courseId: string;
  studentId: string;
}

export async function getStudentDashboard(studentId: string): Promise<StudentDashboardData> {
  try {
    // Validate studentId is valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      throw new Error('Invalid student ID');
    }

    // Find student using User.findById to verify existence
    const student = await User.findById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    // Get enrolled courses
    const enrolledCourses = await Course.find({
      students: studentId,
      status: CourseStatus.ACTIVE,
    })
      .populate('teacher', 'profile.firstName profile.lastName')
      .sort({ createdAt: -1 });

    const formattedCourses = enrolledCourses.map((course) => ({
      courseId: String((course as any)._id),
      courseName: course.name,
      teacherName: `${(course.teacher as any)?.profile?.firstName || ''} ${(course.teacher as any)?.profile?.lastName || ''}`.trim(),
      enrollmentDate: course.createdAt,
      schedule: course.schedule,
    }));

    // Get upcoming assignments using aggregation
    const enrolledCourseIds = enrolledCourses.map((c) => c._id);
    const now = new Date();

    const upcomingAssignments = await Assignment.aggregate([
      {
        $match: {
          course: { $in: enrolledCourseIds },
          status: AssignmentStatus.PUBLISHED,
          dueDate: { $gte: now },
        },
      },
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseInfo',
        },
      },
      {
        $unwind: '$courseInfo',
      },
      {
        $addFields: {
          studentSubmission: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$submissions',
                  as: 'sub',
                  cond: { $eq: ['$$sub.student', new mongoose.Types.ObjectId(studentId)] },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          courseName: '$courseInfo.name',
          dueDate: 1,
          status: {
            $cond: [
              { $ifNull: ['$studentSubmission', false] },
              '$studentSubmission.status',
              'not_submitted',
            ],
          },
          isOverdue: { $lt: ['$dueDate', now] },
        },
      },
      {
        $sort: { dueDate: 1 },
      },
      {
        $limit: 10,
      },
    ]);

    const formattedAssignments = upcomingAssignments.map((assignment) => ({
      assignmentId: assignment._id.toString(),
      title: assignment.title,
      courseName: assignment.courseName,
      dueDate: assignment.dueDate,
      status: assignment.status,
      isOverdue: assignment.isOverdue,
    }));

    // Get recent grades
    const recentGrades = await Grade.find({
      student: studentId,
      isPublished: true,
    })
      .populate('course', 'name')
      .sort({ gradedAt: -1 })
      .limit(10);

    const formattedGrades = recentGrades.map((grade) => ({
      gradeId: String((grade as any)._id),
      courseName: (grade.course as any)?.name || 'Unknown Course',
      score: grade.score,
      maxScore: grade.maxScore,
      letterGrade: String((grade as any).letterGrade || ''),
      gradedAt: grade.gradedAt || grade.createdAt,
    }));

    // Get attendance summary using static method
    const attendanceStats = await Attendance.getAttendanceStats(studentId);

    // Get overall GPA using static method
    const gpaData = await Grade.calculateStudentGPA(studentId);

    // Get upcoming classes
    const upcomingClasses = await Class.find({
      students: studentId,
      scheduledDate: { $gte: new Date() },
      status: { $in: [ClassStatus.SCHEDULED, ClassStatus.IN_PROGRESS] },
    })
      .populate('course', 'name')
      .sort({ scheduledDate: 1 })
      .limit(10);

    const formattedClasses = upcomingClasses.map((classDoc) => ({
      classId: String((classDoc as any)._id),
      title: classDoc.title,
      courseName: (classDoc.course as any)?.name || 'Unknown Course',
      scheduledDate: classDoc.scheduledDate,
      startTime: classDoc.startTime,
      location: classDoc.location,
    }));

    // Get unread notifications count using static method
    const unreadCount = await Notification.getUnreadCount(studentId);

    // Get recent notifications using static method
    const recentNotificationsAll = await Notification.findUnreadByUser(studentId);
    const recentNotifications = recentNotificationsAll.slice(0, 5);

    // Build and return StudentDashboardData object
    return {
      enrolledCourses: formattedCourses,
      upcomingAssignments: formattedAssignments,
      recentGrades: formattedGrades,
      attendanceSummary: {
        totalClasses: attendanceStats.total,
        present: attendanceStats.present,
        absent: attendanceStats.absent,
        late: attendanceStats.late,
        attendanceRate: attendanceStats.attendanceRate,
      },
      overallGPA: gpaData.gpa,
      upcomingClasses: formattedClasses,
      notifications: {
        unreadCount,
        recentNotifications: recentNotifications.map((n: any) => ({
          id: String(n._id),
          title: n.title,
          message: n.message,
          category: n.category,
          priority: n.priority,
          createdAt: n.createdAt,
          isRead: n.isRead,
        })),
      },
    };
  } catch (error) {
    throw error;
  }
}

export async function enrollInCourse(params: EnrollInCourseParams): Promise<any> {
  try {
    const { courseId, studentId } = params;

    // Validate courseId and studentId are valid ObjectIds
    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(studentId)) {
      throw new Error('Invalid course or student ID');
    }

    // Validate student exists and has STUDENT role
    const student = await User.findById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }
    if (student.role !== UserRole.STUDENT) {
      throw new Error('User is not a student');
    }

    // Check if course exists and is ACTIVE
    const course = await Course.findById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    // Reuse existing courseService.enrollStudent function
    const enrolledCourse = await enrollStudent({
      courseId: params.courseId,
      studentId: params.studentId,
      enrolledBy: params.studentId,
    });

    return enrolledCourse;
  } catch (error) {
    throw error;
  }
}

export async function dropCourse(params: DropCourseParams): Promise<any> {
  try {
    const { courseId, studentId } = params;

    // Validate courseId and studentId are valid ObjectIds
    if (!mongoose.Types.ObjectId.isValid(courseId) || !mongoose.Types.ObjectId.isValid(studentId)) {
      throw new Error('Invalid course or student ID');
    }

    // Validate student exists and has STUDENT role
    const student = await User.findById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }
    if (student.role !== UserRole.STUDENT) {
      throw new Error('User is not a student');
    }

    // Check if course exists
    const course = await Course.findById(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    // Check if student is enrolled in course
    if (!course.isEnrolled(studentId)) {
      throw new Error('Student is not enrolled in this course');
    }

    // Reuse existing courseService.unenrollStudent function
    const updatedCourse = await unenrollStudent({
      courseId: params.courseId,
      studentId: params.studentId,
      unenrolledBy: params.studentId,
    });

    return updatedCourse;
  } catch (error) {
    throw error;
  }
}

export async function getAvailableCourses(studentId: string): Promise<any[]> {
  try {
    // Validate studentId is valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      throw new Error('Invalid student ID');
    }

    // Find all active courses
    const activeCourses = await Course.find({ status: CourseStatus.ACTIVE }).populate('teacher', 'profile.firstName profile.lastName');

    // Filter out courses where student is already enrolled
    const notEnrolled = activeCourses.filter((c) => !c.students.includes(new mongoose.Types.ObjectId(studentId)));

    // Filter out courses that are fully enrolled (uses virtual method)
    const available = notEnrolled.filter((c) => c.canEnroll());

    // Sort by createdAt descending
    const sorted = available.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return sorted;
  } catch (error) {
    throw error;
  }
}

export async function getStudentProgress(
  studentId: string,
  courseId: string
): Promise<{
  course: any;
  assignments: any[];
  grades: any[];
  attendance: any;
  progress: {
    assignmentsCompleted: number;
    totalAssignments: number;
    averageGrade: number;
    attendanceRate: number;
  };
}> {
  try {
    // Validate studentId and courseId are valid ObjectIds
    if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(courseId)) {
      throw new Error('Invalid student or course ID');
    }

    // Find course by ID and verify student is enrolled
    const course = await Course.findById(courseId).populate('teacher', 'profile.firstName profile.lastName');
    if (!course) {
      throw new Error('Course not found');
    }

    if (!course.isEnrolled(studentId)) {
      throw new Error('Student is not enrolled in this course');
    }

    // Get assignments for course
    const assignments = await Assignment.find({
      course: courseId,
      status: AssignmentStatus.PUBLISHED,
    });

    // For each assignment, check student's submission status
    const assignmentsWithStatus = assignments.map((assignment) => {
      const submission = assignment.getSubmission(studentId);
      return {
        assignmentId: String((assignment as any)._id),
        title: assignment.title,
        dueDate: assignment.dueDate,
        status: assignment.status,
        submissionStatus: submission ? submission.status : 'not_submitted',
        hasSubmitted: assignment.hasSubmitted(studentId),
        grade: submission?.grade,
        maxGrade: submission?.maxGrade || assignment.maxGrade,
        feedback: submission?.feedback,
      };
    });

    // Get grades for course
    const grades = await Grade.find({
      student: studentId,
      course: courseId,
      isPublished: true,
    }).sort({ gradedAt: -1 });

    const formattedGrades = grades.map((grade) => ({
      gradeId: String((grade as any)._id),
      score: grade.score,
      maxScore: grade.maxScore,
      letterGrade: String((grade as any).letterGrade || ''),
      gradeType: grade.gradeType,
      gradedAt: grade.gradedAt || grade.createdAt,
      feedback: grade.feedback,
    }));

    // Get attendance for course classes using aggregation
    const attendanceData = await Attendance.aggregate([
      {
        $lookup: {
          from: 'classes',
          localField: 'class',
          foreignField: '_id',
          as: 'classInfo',
        },
      },
      {
        $unwind: '$classInfo',
      },
      {
        $match: {
          'classInfo.course': new mongoose.Types.ObjectId(courseId),
          student: new mongoose.Types.ObjectId(studentId),
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const attendanceStats = attendanceData.reduce(
      (acc, curr) => {
        acc.total += curr.count;
        if (curr._id === 'present') acc.present += curr.count;
        if (curr._id === 'absent') acc.absent += curr.count;
        if (curr._id === 'late') acc.late += curr.count;
        return acc;
      },
      { total: 0, present: 0, absent: 0, late: 0 }
    );

    const attendanceRate = attendanceStats.total > 0 ? (attendanceStats.present / attendanceStats.total) * 100 : 0;

    // Calculate progress metrics
    const assignmentsCompleted = assignmentsWithStatus.filter((a) => a.hasSubmitted).length;
    const totalAssignments = assignmentsWithStatus.length;
    const averageGrade =
      formattedGrades.length > 0
        ? formattedGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * 100, 0) / formattedGrades.length
        : 0;

    return {
      course: {
        courseId: String((course as any)._id),
        courseName: course.name,
        teacherName: `${(course.teacher as any)?.profile?.firstName || ''} ${(course.teacher as any)?.profile?.lastName || ''}`.trim(),
        description: course.description,
        schedule: course.schedule,
      },
      assignments: assignmentsWithStatus,
      grades: formattedGrades,
      attendance: {
        total: attendanceStats.total,
        present: attendanceStats.present,
        absent: attendanceStats.absent,
        late: attendanceStats.late,
        attendanceRate,
      },
      progress: {
        assignmentsCompleted,
        totalAssignments,
        averageGrade,
        attendanceRate,
      },
    };
  } catch (error) {
    throw error;
  }
}

