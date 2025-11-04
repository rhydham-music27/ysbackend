import mongoose from 'mongoose';
import Schedule, { ISchedule } from '../models/Schedule';
import Class from '../models/Class';
import Course from '../models/Course';
import User from '../models/User';
import { DayOfWeek, RecurrenceType, UserRole } from '../types/enums';

export interface CreateScheduleParams {
  class: string;
  course: string;
  teacher: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  room?: string;
  building?: string;
  recurrenceType?: RecurrenceType;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  notes?: string;
  createdBy: string;
}

export interface UpdateScheduleParams {
  scheduleId: string;
  dayOfWeek?: DayOfWeek;
  startTime?: string;
  endTime?: string;
  room?: string;
  building?: string;
  effectiveFrom?: Date;
  effectiveTo?: Date;
  isActive?: boolean;
  notes?: string;
  updatedBy: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  conflictType?: 'teacher' | 'room';
  conflictingSchedule?: ISchedule | null;
  message?: string;
}

export async function validateScheduleCreator(userId: string): Promise<boolean> {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    if (![UserRole.ADMIN, UserRole.MANAGER, UserRole.COORDINATOR].includes(user.role)) {
      throw new Error('Only admins, managers, and coordinators can manage schedules');
    }
    if (!user.isActive) {
      throw new Error('User account is not active');
    }
    return true;
  } catch (err) {
    throw err;
  }
}

export async function checkScheduleConflicts(params: {
  teacher: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  room?: string;
  excludeId?: string;
}): Promise<ConflictCheckResult> {
  try {
    const { teacher, dayOfWeek, startTime, endTime, room, excludeId } = params;

    if (!mongoose.Types.ObjectId.isValid(teacher)) {
      throw new Error('Invalid teacher ID');
    }
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      throw new Error('Invalid time format. Use HH:MM (e.g., 09:00)');
    }

    const teacherConflict = await Schedule.checkTeacherConflict(teacher, dayOfWeek, startTime, endTime, excludeId);
    if (teacherConflict) {
      return {
        hasConflict: true,
        conflictType: 'teacher',
        conflictingSchedule: teacherConflict,
        message: 'Teacher has another class at this time',
      };
    }

    if (room) {
      const roomConflict = await Schedule.checkRoomConflict(room, dayOfWeek, startTime, endTime, excludeId);
      if (roomConflict) {
        return {
          hasConflict: true,
          conflictType: 'room',
          conflictingSchedule: roomConflict,
          message: 'Room is already booked at this time',
        };
      }
    }

    return { hasConflict: false };
  } catch (err) {
    throw err;
  }
}

export async function createSchedule(params: CreateScheduleParams): Promise<ISchedule> {
  try {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!mongoose.Types.ObjectId.isValid(params.class)) throw new Error('Invalid class ID');
    if (!mongoose.Types.ObjectId.isValid(params.course)) throw new Error('Invalid course ID');
    if (!mongoose.Types.ObjectId.isValid(params.teacher)) throw new Error('Invalid teacher ID');
    if (!mongoose.Types.ObjectId.isValid(params.createdBy)) throw new Error('Invalid creator ID');

    await validateScheduleCreator(params.createdBy);

    if (!timeRegex.test(params.startTime) || !timeRegex.test(params.endTime)) {
      throw new Error('Invalid time format. Use HH:MM (e.g., 09:00)');
    }

    const course = await Course.findById(params.course);
    if (!course) throw new Error('Course not found');

    const teacher = await User.findById(params.teacher);
    if (!teacher) throw new Error('Teacher not found');
    if (teacher.role !== UserRole.TEACHER) throw new Error('User is not a teacher');

    if (course.teacher.toString() !== params.teacher) {
      throw new Error('Teacher is not assigned to this course');
    }

    const conflict = await checkScheduleConflicts({
      teacher: params.teacher,
      dayOfWeek: params.dayOfWeek,
      startTime: params.startTime,
      endTime: params.endTime,
      room: params.room,
    });

    if (conflict.hasConflict) {
      const cs = conflict.conflictingSchedule!;
      throw new Error(
        `${conflict.message}. Conflicting schedule: ${cs.course} on ${cs.dayOfWeek} at ${cs.startTime}-${cs.endTime}`
      );
    }

    const schedule = await Schedule.create({
      class: new mongoose.Types.ObjectId(params.class),
      course: new mongoose.Types.ObjectId(params.course),
      teacher: new mongoose.Types.ObjectId(params.teacher),
      dayOfWeek: params.dayOfWeek,
      startTime: params.startTime,
      endTime: params.endTime,
      room: params.room,
      building: params.building,
      recurrenceType: params.recurrenceType || RecurrenceType.WEEKLY,
      effectiveFrom: params.effectiveFrom || new Date(),
      effectiveTo: params.effectiveTo,
      notes: params.notes,
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(params.createdBy),
    });

    return schedule;
  } catch (err) {
    throw err;
  }
}

export async function updateSchedule(params: UpdateScheduleParams): Promise<ISchedule> {
  try {
    const { scheduleId, updatedBy } = params;
    if (!mongoose.Types.ObjectId.isValid(scheduleId)) throw new Error('Invalid schedule ID');
    if (!mongoose.Types.ObjectId.isValid(updatedBy)) throw new Error('Invalid updater ID');

    await validateScheduleCreator(updatedBy);

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) throw new Error('Schedule not found');

    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (params.startTime && !timeRegex.test(params.startTime)) throw new Error('Invalid time format');
    if (params.endTime && !timeRegex.test(params.endTime)) throw new Error('Invalid time format');

    const newDay = params.dayOfWeek ?? schedule.dayOfWeek;
    const newStart = params.startTime ?? schedule.startTime;
    const newEnd = params.endTime ?? schedule.endTime;
    const newRoom = params.room ?? schedule.room;

    if (params.dayOfWeek || params.startTime || params.endTime || params.room) {
      const conflict = await checkScheduleConflicts({
        teacher: schedule.teacher.toString(),
        dayOfWeek: newDay as DayOfWeek,
        startTime: newStart,
        endTime: newEnd,
        room: newRoom,
        excludeId: scheduleId,
      });
      if (conflict.hasConflict) {
        const cs = conflict.conflictingSchedule!;
        throw new Error(
          `${conflict.message}. Conflicting schedule: ${cs.course} on ${cs.dayOfWeek} at ${cs.startTime}-${cs.endTime}`
        );
      }
    }

    const updateObj: any = {};
    if (params.dayOfWeek !== undefined) updateObj.dayOfWeek = params.dayOfWeek;
    if (params.startTime !== undefined) updateObj.startTime = params.startTime;
    if (params.endTime !== undefined) updateObj.endTime = params.endTime;
    if (params.room !== undefined) updateObj.room = params.room;
    if (params.building !== undefined) updateObj.building = params.building;
    if (params.effectiveFrom !== undefined) updateObj.effectiveFrom = params.effectiveFrom;
    if (params.effectiveTo !== undefined) updateObj.effectiveTo = params.effectiveTo;
    if (params.isActive !== undefined) updateObj.isActive = params.isActive;
    if (params.notes !== undefined) updateObj.notes = params.notes;

    const updated = await Schedule.findByIdAndUpdate(scheduleId, updateObj, { new: true, runValidators: true });
    if (!updated) throw new Error('Schedule not found');
    return updated;
  } catch (err) {
    throw err;
  }
}

export async function deleteSchedule(scheduleId: string, deletedBy: string): Promise<void> {
  try {
    if (!mongoose.Types.ObjectId.isValid(scheduleId)) throw new Error('Invalid schedule ID');
    if (!mongoose.Types.ObjectId.isValid(deletedBy)) throw new Error('Invalid user ID');

    await validateScheduleCreator(deletedBy);

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) throw new Error('Schedule not found');

    await Schedule.findByIdAndUpdate(scheduleId, { isActive: false }, { new: true });
  } catch (err) {
    throw err;
  }
}

export async function getSchedulesByTeacher(teacherId: string): Promise<ISchedule[]> {
  try {
    if (!mongoose.Types.ObjectId.isValid(teacherId)) throw new Error('Invalid teacher ID');
    const schedules = await Schedule.findByTeacher(teacherId)
      .populate('course', 'name code')
      .populate('class', 'title');
    return schedules;
  } catch (err) {
    throw err;
  }
}

export async function getSchedulesByCourse(courseId: string): Promise<ISchedule[]> {
  try {
    if (!mongoose.Types.ObjectId.isValid(courseId)) throw new Error('Invalid course ID');
    const schedules = await Schedule.findByCourse(courseId)
      .populate('teacher', 'profile.firstName profile.lastName email')
      .populate('class', 'title');
    return schedules;
  } catch (err) {
    throw err;
  }
}

export async function getSchedulesByDay(day: DayOfWeek, room?: string): Promise<ISchedule[]> {
  try {
    const query = room
      ? Schedule.findByDayAndRoom(day, room)
      : Schedule.find({ dayOfWeek: day, isActive: true }).sort({ startTime: 1 });
    const schedules = await query
      .populate('teacher', 'profile.firstName profile.lastName email')
      .populate('course', 'name code')
      .populate('class', 'title');
    return schedules as unknown as ISchedule[];
  } catch (err) {
    throw err;
  }
}

export async function getWeeklySchedule(filters?: {
  teacher?: string;
  course?: string;
  room?: string;
}): Promise<Record<DayOfWeek, ISchedule[]>> {
  try {
    const query: any = { isActive: true };
    if (filters?.teacher) {
      if (!mongoose.Types.ObjectId.isValid(filters.teacher)) throw new Error('Invalid teacher ID');
      query.teacher = new mongoose.Types.ObjectId(filters.teacher);
    }
    if (filters?.course) {
      if (!mongoose.Types.ObjectId.isValid(filters.course)) throw new Error('Invalid course ID');
      query.course = new mongoose.Types.ObjectId(filters.course);
    }
    if (filters?.room) {
      query.room = filters.room;
    }

    const schedules = await Schedule.find(query).sort({ dayOfWeek: 1, startTime: 1 });

    const grouped: Record<DayOfWeek, ISchedule[]> = {
      [DayOfWeek.MONDAY]: [],
      [DayOfWeek.TUESDAY]: [],
      [DayOfWeek.WEDNESDAY]: [],
      [DayOfWeek.THURSDAY]: [],
      [DayOfWeek.FRIDAY]: [],
      [DayOfWeek.SATURDAY]: [],
      [DayOfWeek.SUNDAY]: [],
    } as any;

    for (const s of schedules) {
      grouped[s.dayOfWeek].push(s);
    }

    for (const day of Object.values(DayOfWeek)) {
      grouped[day as DayOfWeek] = grouped[day as DayOfWeek].sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
    }

    return grouped;
  } catch (err) {
    throw err;
  }
}

export async function generateClassInstances(scheduleId: string, startDate: Date, endDate: Date): Promise<number> {
  try {
    if (!mongoose.Types.ObjectId.isValid(scheduleId)) throw new Error('Invalid schedule ID');
    if (!(startDate instanceof Date) || isNaN(startDate.getTime())) throw new Error('Invalid start date');
    if (!(endDate instanceof Date) || isNaN(endDate.getTime())) throw new Error('Invalid end date');
    if (endDate <= startDate) throw new Error('End date must be after start date');

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) throw new Error('Schedule not found');

    let count = 0;
    const current = new Date(startDate);

    const dayToIndex: Record<DayOfWeek, number> = {
      [DayOfWeek.SUNDAY]: 0,
      [DayOfWeek.MONDAY]: 1,
      [DayOfWeek.TUESDAY]: 2,
      [DayOfWeek.WEDNESDAY]: 3,
      [DayOfWeek.THURSDAY]: 4,
      [DayOfWeek.FRIDAY]: 5,
      [DayOfWeek.SATURDAY]: 6,
    } as any;

    const targetDow = dayToIndex[schedule.dayOfWeek];

    while (current <= endDate) {
      if (current.getDay() === targetDow) {
        const [startH, startM] = schedule.startTime.split(':').map(Number);
        const [endH, endM] = schedule.endTime.split(':').map(Number);

        const start = new Date(current);
        start.setHours(startH, startM, 0, 0);
        const end = new Date(current);
        end.setHours(endH, endM, 0, 0);

        await Class.create({
          course: schedule.course,
          title: `Class for ${schedule.course.toString()} on ${schedule.dayOfWeek}`,
          teacher: schedule.teacher,
          students: [],
          scheduledDate: new Date(current),
          startTime: start,
          endTime: end,
          location: { type: 'offline', room: schedule.room, building: schedule.building },
          status: 'scheduled',
          topics: [],
          materials: [],
        } as any);
        count += 1;
      }
      current.setDate(current.getDate() + 1);
    }

    return count;
  } catch (err) {
    throw err;
  }
}


