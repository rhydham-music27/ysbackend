import mongoose from 'mongoose';
import Class, { IClass } from '../models/Class';
import Attendance from '../models/Attendance';
import Schedule, { ISchedule } from '../models/Schedule';
import User from '../models/User';
import Course from '../models/Course';
import Notification from '../models/Notification';
import { UserRole, AttendanceStatus, NotificationType, NotificationCategory, NotificationPriority, ClassStatus } from '../types/enums';

export interface AssignCoordinatorParams {
  classId: string;
  coordinatorId: string;
  assignedBy: string;
}

export interface CoordinatorDashboardData {
  assignedClasses: number;
  upcomingClasses: number;
  totalStudents: number;
  attendanceToday: {
    total: number;
    marked: number;
    pending: number;
  };
  lowAttendanceStudents: Array<{
    studentId: string;
    studentName: string;
    attendanceRate: number;
  }>;
  recentClasses: IClass[];
}

export interface SendStudentCommunicationParams {
  classId: string;
  studentIds: string[];
  message: string;
  title: string;
  sentBy: string;
}

export async function validateCoordinator(userId: string): Promise<boolean> {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (user.role !== UserRole.COORDINATOR) {
      throw new Error('User is not a coordinator');
    }

    if (!user.isActive) {
      throw new Error('Coordinator account is not active');
    }

    return true;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to validate coordinator');
  }
}

export async function validateCoordinatorClassAccess(coordinatorId: string, classId: string): Promise<boolean> {
  try {
    if (!mongoose.Types.ObjectId.isValid(coordinatorId) || !mongoose.Types.ObjectId.isValid(classId)) {
      throw new Error('Invalid coordinator ID or class ID');
    }

    await validateCoordinator(coordinatorId);

    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      throw new Error('Class not found');
    }

    if (classDoc.coordinator?.toString() !== coordinatorId) {
      throw new Error('Coordinator is not assigned to this class');
    }

    return true;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to validate coordinator class access');
  }
}

export async function assignCoordinator(params: AssignCoordinatorParams): Promise<IClass> {
  try {
    if (!mongoose.Types.ObjectId.isValid(params.classId) || !mongoose.Types.ObjectId.isValid(params.coordinatorId) || !mongoose.Types.ObjectId.isValid(params.assignedBy)) {
      throw new Error('Invalid class ID, coordinator ID, or assigned by ID');
    }

    await validateCoordinator(params.coordinatorId);

    const classDoc = await Class.findById(params.classId);
    if (!classDoc) {
      throw new Error('Class not found');
    }

    classDoc.coordinator = new mongoose.Types.ObjectId(params.coordinatorId);
    await classDoc.save();
    await classDoc.populate('coordinator', 'profile.firstName profile.lastName email');

    return classDoc;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to assign coordinator');
  }
}

export async function getCoordinatorDashboard(coordinatorId: string): Promise<CoordinatorDashboardData> {
  try {
    if (!mongoose.Types.ObjectId.isValid(coordinatorId)) {
      throw new Error('Invalid coordinator ID');
    }

    const assignedClasses = await Class.find({ coordinator: coordinatorId });
    const totalAssignedClasses = assignedClasses.length;

    const now = new Date();
    const upcomingClasses = assignedClasses.filter(
      (c) => new Date(c.scheduledDate).getTime() >= now.getTime() && c.status === ClassStatus.SCHEDULED
    ).length;

    const uniqueStudents = new Set<string>();
    assignedClasses.forEach((c) => {
      c.students.forEach((studentId) => {
        uniqueStudents.add(studentId.toString());
      });
    });
    const totalStudents = uniqueStudents.size;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const classesToday = assignedClasses.filter((c) => {
      const classDate = new Date(c.scheduledDate);
      classDate.setHours(0, 0, 0, 0);
      return classDate.getTime() === today.getTime();
    });

    let totalAttendanceNeeded = 0;
    let markedAttendance = 0;

    if (classesToday.length > 0) {
      const classIds = classesToday.map((c) => c._id);
      classesToday.forEach((c) => {
        totalAttendanceNeeded += c.students.length;
      });

      const attendanceRecords = await Attendance.find({
        class: { $in: classIds },
        date: { $gte: today, $lt: tomorrow },
      });

      markedAttendance = attendanceRecords.length;
    }

    const pendingAttendance = totalAttendanceNeeded - markedAttendance;

    const lowAttendanceStudents: Array<{ studentId: string; studentName: string; attendanceRate: number }> = [];

    const attendanceAggregation = await Attendance.aggregate([
      {
        $match: {
          class: { $in: assignedClasses.map((c) => c._id) },
        },
      },
      {
        $group: {
          _id: '$student',
          total: { $sum: 1 },
          present: {
            $sum: {
              $cond: [{ $eq: ['$status', AttendanceStatus.PRESENT] }, 1, 0],
            },
          },
        },
      },
      {
        $addFields: {
          attendanceRate: {
            $multiply: [{ $divide: ['$present', '$total'] }, 100],
          },
        },
      },
      {
        $match: {
          attendanceRate: { $lt: 75 },
        },
      },
      {
        $sort: { attendanceRate: 1 },
      },
      {
        $limit: 10,
      },
    ]);

    for (const agg of attendanceAggregation) {
      const student = await User.findById(agg._id);
      if (student) {
        lowAttendanceStudents.push({
          studentId: agg._id.toString(),
          studentName: `${student.profile.firstName} ${student.profile.lastName}`,
          attendanceRate: Math.round(agg.attendanceRate * 100) / 100,
        });
      }
    }

    const recentClasses = assignedClasses
      .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
      .slice(0, 5);

    return {
      assignedClasses: totalAssignedClasses,
      upcomingClasses,
      totalStudents,
      attendanceToday: {
        total: totalAttendanceNeeded,
        marked: markedAttendance,
        pending: pendingAttendance,
      },
      lowAttendanceStudents,
      recentClasses,
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get coordinator dashboard');
  }
}

export async function getAssignedClasses(
  coordinatorId: string,
  filters?: { status?: string; startDate?: Date; endDate?: Date }
): Promise<IClass[]> {
  try {
    if (!mongoose.Types.ObjectId.isValid(coordinatorId)) {
      throw new Error('Invalid coordinator ID');
    }

    const query: any = { coordinator: coordinatorId };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.startDate || filters?.endDate) {
      query.scheduledDate = {};
      if (filters.startDate) {
        query.scheduledDate.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.scheduledDate.$lte = filters.endDate;
      }
    }

    const classes = await Class.find(query)
      .populate('course', 'name code')
      .populate('teacher', 'profile.firstName profile.lastName email')
      .populate('students', 'profile.firstName profile.lastName email')
      .sort({ scheduledDate: 1 });

    return classes;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get assigned classes');
  }
}

export async function getClassAttendanceOverview(
  coordinatorId: string,
  classId: string
): Promise<{
  class: IClass;
  attendanceRecords: any[];
  summary: {
    total: number;
    present: number;
    absent: number;
    late: number;
    unmarked: number;
    attendanceRate: number;
  };
}> {
  try {
    if (!mongoose.Types.ObjectId.isValid(coordinatorId) || !mongoose.Types.ObjectId.isValid(classId)) {
      throw new Error('Invalid coordinator ID or class ID');
    }

    await validateCoordinatorClassAccess(coordinatorId, classId);

    const classDoc = await Class.findById(classId).populate('students', 'profile.firstName profile.lastName email');
    if (!classDoc) {
      throw new Error('Class not found');
    }

    const attendanceRecords = await Attendance.findByClass(classId);

    const total = classDoc.students.length;
    const present = attendanceRecords.filter((a) => a.status === AttendanceStatus.PRESENT).length;
    const absent = attendanceRecords.filter((a) => a.status === AttendanceStatus.ABSENT).length;
    const late = attendanceRecords.filter((a) => a.status === AttendanceStatus.LATE).length;
    const unmarked = total - (present + absent + late);
    const attendanceRate = total > 0 ? (present / total) * 100 : 0;

    return {
      class: classDoc,
      attendanceRecords,
      summary: {
        total,
        present,
        absent,
        late,
        unmarked,
        attendanceRate: Math.round(attendanceRate * 100) / 100,
      },
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get class attendance overview');
  }
}

export async function sendStudentCommunication(params: SendStudentCommunicationParams): Promise<{ sent: number; failed: number }> {
  try {
    if (!mongoose.Types.ObjectId.isValid(params.classId) || !mongoose.Types.ObjectId.isValid(params.sentBy)) {
      throw new Error('Invalid class ID or coordinator ID');
    }

    await validateCoordinatorClassAccess(params.sentBy, params.classId);

    const classDoc = await Class.findById(params.classId);
    if (!classDoc) {
      throw new Error('Class not found');
    }

    let recipientIds: string[];

    if (params.studentIds && params.studentIds.length > 0) {
      const validStudentIds = params.studentIds.filter((id) => {
        return classDoc.students.some((studentId) => studentId.toString() === id);
      });
      if (validStudentIds.length === 0) {
        throw new Error('No valid student IDs provided');
      }
      recipientIds = validStudentIds;
    } else {
      recipientIds = classDoc.students.map((id) => id.toString());
    }

    let sent = 0;
    let failed = 0;

    for (const studentId of recipientIds) {
      try {
        await Notification.create({
          user: new mongoose.Types.ObjectId(studentId),
          type: NotificationType.BOTH,
          category: NotificationCategory.ANNOUNCEMENT,
          priority: NotificationPriority.MEDIUM,
          title: params.title,
          message: params.message,
          metadata: {
            classId: params.classId,
          },
        });
        sent++;
      } catch (error) {
        failed++;
      }
    }

    return { sent, failed };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send student communication');
  }
}

export async function getCoordinatorSchedule(coordinatorId: string): Promise<ISchedule[]> {
  try {
    if (!mongoose.Types.ObjectId.isValid(coordinatorId)) {
      throw new Error('Invalid coordinator ID');
    }

    const assignedClasses = await Class.find({ coordinator: coordinatorId });
    const courseIds = [...new Set(assignedClasses.map((c) => c.course.toString()))];

    const schedules = await Schedule.find({
      course: { $in: courseIds },
      isActive: true,
    })
      .populate('course', 'name code')
      .populate('teacher', 'profile.firstName profile.lastName email')
      .sort({ dayOfWeek: 1, startTime: 1 });

    return schedules;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to get coordinator schedule');
  }
}

