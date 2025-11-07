import mongoose from 'mongoose';
import Attendance, { IAttendance } from '../models/Attendance';
import Class from '../models/Class';
import User from '../models/User';
import { AttendanceStatus, UserRole } from '../types/enums';

export interface MarkAttendanceParams {
  classId: string;
  studentId: string;
  date: Date;
  status: AttendanceStatus;
  markedBy: string;
  notes?: string;
}

export interface UpdateAttendanceParams {
  attendanceId: string;
  status?: AttendanceStatus;
  notes?: string;
  updatedBy: string;
}

export interface BulkMarkAttendanceParams {
  classId: string;
  attendanceRecords: Array<{ studentId: string; status: AttendanceStatus; notes?: string }>;
  date: Date;
  markedBy: string;
}

export async function validateMarker(userId: string): Promise<boolean> {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (![UserRole.TEACHER, UserRole.COORDINATOR].includes(user.role)) {
      throw new Error('Only teachers and coordinators can mark attendance');
    }

    if (user.isActive === false) {
      throw new Error('User account is not active');
    }

    return true;
  } catch (error) {
    throw error;
  }
}

export async function markAttendance(params: MarkAttendanceParams): Promise<IAttendance> {
  try {
    const { classId, studentId, date, status, markedBy, notes } = params;

    if (!mongoose.Types.ObjectId.isValid(classId)) throw new Error('Invalid class ID');
    if (!mongoose.Types.ObjectId.isValid(studentId)) throw new Error('Invalid student ID');
    if (!mongoose.Types.ObjectId.isValid(markedBy)) throw new Error('Invalid marker ID');

    await validateMarker(markedBy);

    const klass: any = await Class.findById(classId);
    if (!klass) throw new Error('Class not found');

    const student: any = await User.findById(studentId);
    if (!student) throw new Error('Student not found');
    if (student.role !== UserRole.STUDENT) throw new Error('User is not a student');

    if (typeof (klass as any).isAttending === 'function') {
      const enrolled = (klass as any).isAttending(studentId);
      if (!enrolled) throw new Error('Student is not enrolled in this class');
    }

    const existing = await Attendance.findOne({
      class: new mongoose.Types.ObjectId(classId),
      student: new mongoose.Types.ObjectId(studentId),
      date,
    });
    if (existing) {
      throw new Error('Attendance already marked for this student in this class on this date');
    }

    const created = await Attendance.create({
      class: classId,
      student: studentId,
      date,
      status,
      markedBy,
      markedAt: new Date(),
      notes,
    });

    await Attendance.populate(created as any, [
      { path: 'class' },
      { path: 'student', select: 'profile.firstName profile.lastName email' },
      { path: 'markedBy', select: 'profile.firstName profile.lastName' },
    ]);

    return created as unknown as IAttendance;
  } catch (error) {
    throw error;
  }
}

export async function updateAttendance(params: UpdateAttendanceParams): Promise<IAttendance> {
  try {
    const { attendanceId, status, notes, updatedBy } = params;
    if (!mongoose.Types.ObjectId.isValid(attendanceId)) throw new Error('Invalid attendance ID');
    if (!mongoose.Types.ObjectId.isValid(updatedBy)) throw new Error('Invalid updater ID');

    await validateMarker(updatedBy);

    const existing = await Attendance.findById(attendanceId);
    if (!existing) throw new Error('Attendance record not found');

    const updateObj: Partial<IAttendance> = {} as any;
    if (typeof status !== 'undefined') (updateObj as any).status = status;
    if (typeof notes !== 'undefined') (updateObj as any).notes = notes;

    const updated = await Attendance.findByIdAndUpdate(attendanceId, updateObj, {
      new: true,
      runValidators: true,
    })
      .populate('class')
      .populate('student', 'profile.firstName profile.lastName email')
      .populate('markedBy', 'profile.firstName profile.lastName');

    if (!updated) throw new Error('Attendance record not found');
    return updated as unknown as IAttendance;
  } catch (error) {
    throw error;
  }
}

export async function bulkMarkAttendance(
  params: BulkMarkAttendanceParams
): Promise<{ marked: IAttendance[]; failed: Array<{ studentId: string; reason: string }> }> {
  try {
    const { classId, attendanceRecords, date, markedBy } = params;

    if (!mongoose.Types.ObjectId.isValid(classId)) throw new Error('Invalid class ID');
    if (!mongoose.Types.ObjectId.isValid(markedBy)) throw new Error('Invalid marker ID');
    await validateMarker(markedBy);

    const klass = await Class.findById(classId);
    if (!klass) throw new Error('Class not found');

    const marked: IAttendance[] = [];
    const failed: Array<{ studentId: string; reason: string }> = [];

    for (const record of attendanceRecords) {
      try {
        const attendance = await markAttendance({
          classId,
          studentId: record.studentId,
          date,
          status: record.status,
          markedBy,
          notes: record.notes,
        });
        marked.push(attendance);
      } catch (err: any) {
        failed.push({ studentId: record.studentId, reason: err?.message || 'Failed to mark attendance' });
      }
    }

    return { marked, failed };
  } catch (error) {
    throw error;
  }
}

export async function getClassAttendance(classId: string, date?: Date): Promise<IAttendance[]> {
  try {
    if (!mongoose.Types.ObjectId.isValid(classId)) throw new Error('Invalid class ID');
    const query: Record<string, unknown> = { class: new mongoose.Types.ObjectId(classId) };
    if (date) query.date = date;
    const results = await Attendance.find(query)
      .populate('student', 'profile.firstName profile.lastName email')
      .populate('markedBy', 'profile.firstName profile.lastName')
      .sort({ date: -1, 'student.profile.firstName': 1 });
    return results;
  } catch (error) {
    throw error;
  }
}

export async function getStudentAttendance(
  studentId: string,
  startDate?: Date,
  endDate?: Date
): Promise<IAttendance[]> {
  try {
    if (!mongoose.Types.ObjectId.isValid(studentId)) throw new Error('Invalid student ID');
    const query: Record<string, unknown> = { student: new mongoose.Types.ObjectId(studentId) };
    if (startDate || endDate) {
      (query as any).date = {};
      if (startDate) (query as any).date.$gte = startDate;
      if (endDate) (query as any).date.$lte = endDate;
    }
    const results = await Attendance.find(query)
      .populate('class', 'title scheduledDate')
      .populate('markedBy', 'profile.firstName profile.lastName')
      .sort({ date: -1 });
    return results;
  } catch (error) {
    throw error;
  }
}

export async function getAttendanceStatistics(studentId: string): Promise<{
  total: number;
  present: number;
  absent: number;
  late: number;
  attendanceRate: number;
}> {
  try {
    if (!mongoose.Types.ObjectId.isValid(studentId)) throw new Error('Invalid student ID');
    const stats = await Attendance.getAttendanceStats(studentId);
    return stats;
  } catch (error) {
    throw error;
  }
}

export async function deleteAttendance(attendanceId: string, deletedBy: string): Promise<void> {
  try {
    if (!mongoose.Types.ObjectId.isValid(attendanceId)) throw new Error('Invalid attendance ID');
    if (!mongoose.Types.ObjectId.isValid(deletedBy)) throw new Error('Invalid deleter ID');
    await validateMarker(deletedBy);

    const existing = await Attendance.findById(attendanceId);
    if (!existing) throw new Error('Attendance record not found');

    await Attendance.findByIdAndDelete(attendanceId);
  } catch (error) {
    throw error;
  }
}

export { AttendanceStatus };


