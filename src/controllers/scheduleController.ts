import { NextFunction, Request, Response } from 'express';
import Schedule from '../models/Schedule';
import {
  createSchedule,
  updateSchedule,
  deleteSchedule,
  checkScheduleConflicts,
  getSchedulesByTeacher,
  getSchedulesByCourse,
  getSchedulesByDay,
  getWeeklySchedule,
  generateClassInstances,
} from '../services/scheduleService';
import { DayOfWeek } from '../types/enums';

export async function createScheduleController(req: Request, res: Response, next: NextFunction) {
  try {
    const {
      class: classId,
      course,
      teacher,
      dayOfWeek,
      startTime,
      endTime,
      room,
      building,
      recurrenceType,
      effectiveFrom,
      effectiveTo,
      notes,
    } = req.body;

    const schedule = await createSchedule({
      class: classId,
      course,
      teacher,
      dayOfWeek,
      startTime,
      endTime,
      room,
      building,
      recurrenceType,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
      effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined,
      notes,
      createdBy: (req as any).user._id.toString(),
    });

    return res.status(201).json({ success: true, message: 'Schedule created successfully', data: { schedule } });
  } catch (err) {
    return next(err);
  }
}

export async function listSchedules(req: Request, res: Response, next: NextFunction) {
  try {
    const { course, teacher, dayOfWeek, room, isActive } = req.query as Record<string, string>;
    const query: any = {};
    if (course) query.course = course;
    if (teacher) query.teacher = teacher;
    if (dayOfWeek) query.dayOfWeek = dayOfWeek;
    if (room) query.room = room;
    if (typeof isActive !== 'undefined') query.isActive = isActive === 'true';

    const schedules = await Schedule.find(query)
      .populate('course', 'name code')
      .populate('teacher', 'profile.firstName profile.lastName email')
      .populate('class', 'title')
      .populate('createdBy', 'profile.firstName profile.lastName')
      .sort({ dayOfWeek: 1, startTime: 1 });

    return res.status(200).json({ success: true, data: { schedules, count: schedules.length } });
  } catch (err) {
    return next(err);
  }
}

export async function getSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const schedule = await Schedule.findById(id)
      .populate('course', 'name code description')
      .populate('teacher', 'profile.firstName profile.lastName email')
      .populate('class', 'title')
      .populate('createdBy', 'profile.firstName profile.lastName');

    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }
    return res.status(200).json({ success: true, data: { schedule } });
  } catch (err) {
    return next(err);
  }
}

export async function updateScheduleController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { dayOfWeek, startTime, endTime, room, building, effectiveFrom, effectiveTo, isActive, notes } = req.body;

    const schedule = await updateSchedule({
      scheduleId: id,
      dayOfWeek,
      startTime,
      endTime,
      room,
      building,
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : undefined,
      effectiveTo: effectiveTo ? new Date(effectiveTo) : undefined,
      isActive,
      notes,
      updatedBy: (req as any).user._id.toString(),
    });

    return res.status(200).json({ success: true, message: 'Schedule updated successfully', data: { schedule } });
  } catch (err) {
    return next(err);
  }
}

export async function deleteScheduleController(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await deleteSchedule(id, (req as any).user._id.toString());
    return res.status(200).json({ success: true, message: 'Schedule deleted successfully' });
  } catch (err) {
    return next(err);
  }
}

export async function getTeacherSchedules(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const schedules = await getSchedulesByTeacher(id);
    return res.status(200).json({ success: true, data: { schedules, count: schedules.length } });
  } catch (err) {
    return next(err);
  }
}

export async function getMySchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const schedules = await getSchedulesByTeacher((req as any).user._id.toString());
    return res.status(200).json({ success: true, data: { schedules, count: schedules.length } });
  } catch (err) {
    return next(err);
  }
}

export async function getCourseSchedules(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const schedules = await getSchedulesByCourse(id);
    return res.status(200).json({ success: true, data: { schedules, count: schedules.length } });
  } catch (err) {
    return next(err);
  }
}

export async function getDaySchedules(req: Request, res: Response, next: NextFunction) {
  try {
    const { day } = req.params;
    const { room } = req.query as Record<string, string>;
    if (!Object.values(DayOfWeek).includes(day as DayOfWeek)) {
      return res.status(400).json({ success: false, message: 'Invalid day of week' });
    }
    const schedules = await getSchedulesByDay(day as DayOfWeek, room);
    return res.status(200).json({ success: true, data: { schedules, count: schedules.length } });
  } catch (err) {
    return next(err);
  }
}

export async function getWeeklyTimetable(req: Request, res: Response, next: NextFunction) {
  try {
    const { teacher, course, room } = req.query as Record<string, string>;
    const timetable = await getWeeklySchedule({ teacher, course, room });
    return res.status(200).json({ success: true, data: { timetable } });
  } catch (err) {
    return next(err);
  }
}

export async function checkConflicts(req: Request, res: Response, next: NextFunction) {
  try {
    const { teacher, dayOfWeek, startTime, endTime, room, excludeId } = req.body;
    const conflict = await checkScheduleConflicts({ teacher, dayOfWeek, startTime, endTime, room, excludeId });
    return res.status(200).json({ success: true, data: { conflict } });
  } catch (err) {
    return next(err);
  }
}

export async function generateClasses(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.body as { startDate: string | Date; endDate: string | Date };
    const count = await generateClassInstances(id, new Date(startDate), new Date(endDate));
    return res.status(200).json({ success: true, message: `Generated ${count} class instances`, data: { count } });
  } catch (err) {
    return next(err);
  }
}


