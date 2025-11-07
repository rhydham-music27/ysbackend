import { Request, Response, NextFunction } from 'express';
import {
  markAttendance,
  updateAttendance,
  bulkMarkAttendance,
  getClassAttendance,
  getStudentAttendance,
  getAttendanceStatistics,
  deleteAttendance,
} from '../services/attendanceService';
import { notifyAttendanceMarked } from '../services/notificationService';
import Class from '../models/Class';

export async function markAttendanceForStudent(req: Request, res: Response, next: NextFunction) {
  try {
    const { classId, studentId, date, status, notes } = req.body;
    const markedBy = (req as any).user?._id?.toString();
    const parsedDate = date ? new Date(date) : new Date();

    const attendance = await markAttendance({
      classId,
      studentId,
      date: parsedDate,
      status,
      markedBy,
      notes,
    });

    // Trigger notification after successful attendance marking
    await attendance.populate('class', 'title scheduledDate');
    const className = (attendance.class as any)?.title || 'Class';
    notifyAttendanceMarked(
      attendance.student.toString(),
      String((attendance as any)._id),
      className,
      attendance.date,
      attendance.status
    ).catch((err) => console.error('Notification error:', err));

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: { attendance },
    });
  } catch (error) {
    next(error);
  }
}

export async function bulkMarkAttendanceForClass(req: Request, res: Response, next: NextFunction) {
  try {
    const { classId, attendanceRecords, date } = req.body;
    const markedBy = (req as any).user?._id?.toString();
    const parsedDate = date ? new Date(date) : new Date();

    if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      return res.status(400).json({ success: false, message: 'Attendance records must be a non-empty array' });
    }

    const result = await bulkMarkAttendance({ classId, attendanceRecords, date: parsedDate, markedBy });

    // Trigger notifications for each successfully marked attendance
    for (const attendance of result.marked) {
      await attendance.populate('class', 'title scheduledDate');
      const className = (attendance.class as any)?.title || 'Class';
      notifyAttendanceMarked(
        attendance.student.toString(),
        String((attendance as any)._id),
        className,
        attendance.date,
        attendance.status
      ).catch((err) => console.error('Notification error:', err));
    }

    res.status(201).json({
      success: true,
      message: 'Bulk attendance marked',
      data: {
        marked: result.marked,
        failed: result.failed,
        summary: {
          total: attendanceRecords.length,
          successful: result.marked.length,
          failed: result.failed.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAttendanceRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    const updatedBy = (req as any).user?._id?.toString();

    const attendance = await updateAttendance({ attendanceId: id, status, notes, updatedBy });
    res.status(200).json({ success: true, message: 'Attendance updated successfully', data: { attendance } });
  } catch (error) {
    next(error);
  }
}

export async function getAttendanceByClass(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { date } = req.query;
    const parsedDate = date ? new Date(date as string) : undefined;

    const attendance = await getClassAttendance(id, parsedDate);
    res.status(200).json({ success: true, data: { attendance, count: attendance.length } });
  } catch (error) {
    next(error);
  }
}

export async function getAttendanceByStudent(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : undefined;

    const attendance = await getStudentAttendance(id, parsedStartDate, parsedEndDate);
    res.status(200).json({ success: true, data: { attendance, count: attendance.length } });
  } catch (error) {
    next(error);
  }
}

export async function getMyAttendance(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?._id?.toString();
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };
    const parsedStartDate = startDate ? new Date(startDate) : undefined;
    const parsedEndDate = endDate ? new Date(endDate) : undefined;

    const attendance = await getStudentAttendance(userId, parsedStartDate, parsedEndDate);
    res.status(200).json({ success: true, data: { attendance, count: attendance.length } });
  } catch (error) {
    next(error);
  }
}

export async function getStudentAttendanceStats(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const stats = await getAttendanceStatistics(id);
    res.status(200).json({ success: true, data: { stats } });
  } catch (error) {
    next(error);
  }
}

export async function getMyAttendanceStats(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as any).user?._id?.toString();
    const stats = await getAttendanceStatistics(userId);
    res.status(200).json({ success: true, data: { stats } });
  } catch (error) {
    next(error);
  }
}

export async function deleteAttendanceRecord(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const deletedBy = (req as any).user?._id?.toString();
    await deleteAttendance(id, deletedBy);
    res.status(200).json({ success: true, message: 'Attendance record deleted successfully' });
  } catch (error) {
    next(error);
  }
}


