import { Request, Response, NextFunction } from 'express';
import Notification from '../models/Notification';
import { NotificationCategory, NotificationPriority, NotificationType } from '../types/enums';
import ClassModel from '../models/Class';
import {
  approveCourse,
  approveSchedule,
  getPendingCourseApprovals,
  getPendingScheduleApprovals,
  getTeacherPerformanceMetrics,
  getAllTeachersPerformance,
  getManagerDashboard,
  getCourseStatisticsForManager,
} from '../services/managerService';

export async function approveCourseController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body;
    const approvedBy = (req as any).user._id.toString();

    const course = await approveCourse({
      courseId: id,
      approvedBy,
      approvalNotes,
      approve: true,
    });

    res.status(200).json({
      success: true,
      message: 'Course approved successfully',
      data: { course },
    });
  } catch (error) {
    next(error);
  }
}

export async function rejectCourseController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body;
    const approvedBy = (req as any).user._id.toString();

    const course = await approveCourse({
      courseId: id,
      approvedBy,
      approvalNotes,
      approve: false,
    });

    res.status(200).json({
      success: true,
      message: 'Course rejected',
      data: { course },
    });
  } catch (error) {
    next(error);
  }
}

export async function approveScheduleController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body;
    const approvedBy = (req as any).user._id.toString();

    const schedule = await approveSchedule({
      scheduleId: id,
      approvedBy,
      approvalNotes,
      approve: true,
    });

    res.status(200).json({
      success: true,
      message: 'Schedule approved successfully',
      data: { schedule },
    });
  } catch (error) {
    next(error);
  }
}

export async function rejectScheduleController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body;
    const approvedBy = (req as any).user._id.toString();

    const schedule = await approveSchedule({
      scheduleId: id,
      approvedBy,
      approvalNotes,
      approve: false,
    });

    res.status(200).json({
      success: true,
      message: 'Schedule rejected',
      data: { schedule },
    });
  } catch (error) {
    next(error);
  }
}

export async function getPendingApprovals(req: Request, res: Response, next: NextFunction) {
  try {
    const courses = await getPendingCourseApprovals();
    const schedules = await getPendingScheduleApprovals();

    res.status(200).json({
      success: true,
      data: {
        courses,
        schedules,
        summary: {
          totalPending: courses.length + schedules.length,
          pendingCourses: courses.length,
          pendingSchedules: schedules.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getTeacherPerformance(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const metrics = await getTeacherPerformanceMetrics(id);

    res.status(200).json({
      success: true,
      data: { performance: metrics },
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllTeachersPerformanceController(req: Request, res: Response, next: NextFunction) {
  try {
    const performanceList = await getAllTeachersPerformance();

    res.status(200).json({
      success: true,
      data: {
        teachers: performanceList,
        count: performanceList.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getManagerDashboardController(req: Request, res: Response, next: NextFunction) {
  try {
    const dashboard = await getManagerDashboard();

    res.status(200).json({
      success: true,
      data: { dashboard },
    });
  } catch (error) {
    next(error);
  }
}

export async function getCourseStats(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await getCourseStatisticsForManager();

    res.status(200).json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    next(error);
  }
}

// Notify the assigned teacher for a class to select weekdays
export async function notifyTeacherOfClassAssignment(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params; // class id
    const { teacherId } = req.body as { teacherId?: string };

    const cls = await ClassModel.findById(id).populate('teacher');
    if (!cls) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }
    const recipient = teacherId || (cls as any).teacher?._id?.toString();
    if (!recipient) {
      return res.status(400).json({ success: false, message: 'No teacher assigned to this class' });
    }

    const title = 'Class assigned to you';
    const message = `Please set your weekly days for the class "${cls.title}".`;
    const notification = await Notification.create({
      user: recipient,
      type: NotificationType.IN_APP,
      category: NotificationCategory.CLASS_SCHEDULED,
      priority: NotificationPriority.MEDIUM,
      title,
      message,
      metadata: { classId: (cls as any)._id.toString(), actionUrl: `/teacher/classes/${(cls as any)._id.toString()}` },
    });

    res.status(201).json({ success: true, message: 'Notification sent to teacher', data: { notification } });
  } catch (error) {
    next(error);
  }
}

