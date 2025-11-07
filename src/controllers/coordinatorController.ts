import { Request, Response, NextFunction } from 'express';
import Class from '../models/Class';
import Attendance from '../models/Attendance';
import Schedule from '../models/Schedule';
import {
  assignCoordinator,
  getCoordinatorDashboard,
  getAssignedClasses,
  getClassAttendanceOverview,
  sendStudentCommunication,
  getCoordinatorSchedule,
  validateCoordinatorClassAccess,
} from '../services/coordinatorService';

export async function getCoordinatorDashboardController(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?._id?.toString();
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const dashboard = await getCoordinatorDashboard(userId);
    res.status(200).json({ success: true, data: { dashboard } });
  } catch (error) {
    next(error);
  }
}

export async function getMyAssignedClasses(req: Request, res: Response, next: NextFunction) {
  try {
    const coordinatorId = (req as any).user?._id?.toString();
    if (!coordinatorId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const { status, startDate, endDate } = req.query as Record<string, string>;

    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;

    if (startDate) {
      parsedStartDate = new Date(startDate);
    }
    if (endDate) {
      parsedEndDate = new Date(endDate);
    }

    const classes = await getAssignedClasses(coordinatorId, {
      status,
      startDate: parsedStartDate,
      endDate: parsedEndDate,
    });

    res.status(200).json({ success: true, data: { classes, count: classes.length } });
  } catch (error) {
    next(error);
  }
}

export async function getMySchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const coordinatorId = (req as any).user?._id?.toString();
    if (!coordinatorId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const schedules = await getCoordinatorSchedule(coordinatorId);
    res.status(200).json({ success: true, data: { schedules, count: schedules.length } });
  } catch (error) {
    next(error);
  }
}

export async function getClassAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const coordinatorId = (req as any).user?._id?.toString();
    if (!coordinatorId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const overview = await getClassAttendanceOverview(coordinatorId, id);
    res.status(200).json({ success: true, data: { overview } });
  } catch (error) {
    next(error);
  }
}

export async function getClassStudents(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const coordinatorId = (req as any).user?._id?.toString();
    if (!coordinatorId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    await validateCoordinatorClassAccess(coordinatorId, id);

    const classDoc = await Class.findById(id).populate('students', 'profile.firstName profile.lastName email profile.phone');
    if (!classDoc) {
      return res.status(404).json({ success: false, message: 'Class not found' });
    }

    res.status(200).json({ success: true, data: { students: classDoc.students, count: classDoc.students.length } });
  } catch (error) {
    next(error);
  }
}

export async function sendClassAnnouncement(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { title, message, studentIds } = req.body;
    const coordinatorId = (req as any).user?._id?.toString();
    if (!coordinatorId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const result = await sendStudentCommunication({
      classId: id,
      studentIds,
      message,
      title,
      sentBy: coordinatorId,
    });

    res.status(200).json({
      success: true,
      message: 'Announcement sent successfully',
      data: { sent: result.sent, failed: result.failed },
    });
  } catch (error) {
    next(error);
  }
}

export async function assignCoordinatorToClass(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { coordinatorId } = req.body;
    const assignedBy = (req as any).user?._id?.toString();
    if (!assignedBy) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const classDoc = await assignCoordinator({
      classId: id,
      coordinatorId,
      assignedBy,
    });

    res.status(200).json({
      success: true,
      message: 'Coordinator assigned successfully',
      data: { class: classDoc },
    });
  } catch (error) {
    next(error);
  }
}

