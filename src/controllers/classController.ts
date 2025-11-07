import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import Class from '../models/Class';
import Course from '../models/Course';
import User from '../models/User';
import { ClassStatus, UserRole } from '../types/enums';

export async function createClass(req: Request, res: Response, next: NextFunction) {
  try {
    const { course, teacher, coordinator } = req.body as { course: string; teacher: string; coordinator?: string };
    const courseDoc = await Course.findById(course);
    if (!courseDoc) return res.status(404).json({ success: false, message: 'Course not found' });

    const teacherDoc = await User.findById(teacher);
    if (!teacherDoc || (teacherDoc as any).role !== 'teacher') {
      return res.status(400).json({ success: false, message: 'Invalid teacher' });
    }

    if (coordinator) {
      const coordinatorDoc = await User.findById(coordinator);
      if (!coordinatorDoc || coordinatorDoc.role !== UserRole.COORDINATOR) {
        return res.status(400).json({ success: false, message: 'Invalid coordinator' });
      }
    }

    if (!req.body.maxStudents && courseDoc.maxStudents) {
      req.body.maxStudents = courseDoc.maxStudents;
    }

    const classDoc = await Class.create(req.body);
    await Class.populate(classDoc as any, [
      { path: 'course', select: 'name code' },
      { path: 'teacher', select: 'profile.firstName profile.lastName email' },
      { path: 'coordinator', select: 'profile.firstName profile.lastName email' },
    ]);

    res.status(201).json({ success: true, message: 'Class created successfully', data: { class: classDoc } });
  } catch (error) {
    next(error);
  }
}

export async function listClasses(req: Request, res: Response, next: NextFunction) {
  try {
    const { course, teacher, status, startDate, endDate } = req.query as Record<string, string>;
    const query: Record<string, unknown> = {};
    if (course) query.course = course;
    if (teacher) query.teacher = teacher;
    if (status) query.status = status;
    if (startDate || endDate) {
      const range: Record<string, unknown> = {};
      if (startDate) range.$gte = new Date(startDate);
      if (endDate) range.$lte = new Date(endDate);
      query.scheduledDate = range;
    }

    const classes = await Class.find(query)
      .populate('course', 'name code')
      .populate('teacher', 'profile.firstName profile.lastName email')
      .sort({ scheduledDate: 1 });
    res.status(200).json({ success: true, data: { classes, count: classes.length } });
  } catch (error) {
    next(error);
  }
}

export async function getClass(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const classDoc = await Class.findById(id)
      .populate('course', 'name code description')
      .populate('teacher', 'profile.firstName profile.lastName email')
      .populate('students', 'profile.firstName profile.lastName email');
    if (!classDoc) return res.status(404).json({ success: false, message: 'Class not found' });
    res.status(200).json({ success: true, data: { class: classDoc } });
  } catch (error) {
    next(error);
  }
}

export async function updateClass(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { coordinator } = req.body as { coordinator?: string };

    if (coordinator) {
      const coordinatorDoc = await User.findById(coordinator);
      if (!coordinatorDoc || coordinatorDoc.role !== UserRole.COORDINATOR) {
        return res.status(400).json({ success: false, message: 'Invalid coordinator' });
      }
    }

    const classDoc = await Class.findByIdAndUpdate(id, req.body, { new: true, runValidators: true })
      .populate('course', 'name code')
      .populate('teacher', 'profile.firstName profile.lastName email')
      .populate('coordinator', 'profile.firstName profile.lastName email');
    if (!classDoc) return res.status(404).json({ success: false, message: 'Class not found' });
    res.status(200).json({ success: true, message: 'Class updated successfully', data: { class: classDoc } });
  } catch (error) {
    next(error);
  }
}

export async function deleteClass(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const classDoc = await Class.findById(id);
    if (!classDoc) return res.status(404).json({ success: false, message: 'Class not found' });
    if ([ClassStatus.IN_PROGRESS, ClassStatus.COMPLETED].includes(classDoc.status)) {
      return res.status(400).json({ success: false, message: 'Cannot delete class that has started or completed' });
    }
    await Class.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Class deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function addStudentToClass(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { studentId } = req.body as { studentId: string };
    const classDoc = await Class.findById(id);
    if (!classDoc) return res.status(404).json({ success: false, message: 'Class not found' });

    if (!classDoc.canJoin()) return res.status(400).json({ success: false, message: 'Class is fully booked' });
    if (classDoc.isAttending(studentId)) {
      return res.status(400).json({ success: false, message: 'Student is already in this class' });
    }

    const student = await User.findById(studentId);
    if (!student || (student as any).role !== 'student') {
      return res.status(400).json({ success: false, message: 'Invalid student' });
    }

    classDoc.students.push(new mongoose.Types.ObjectId(studentId));
    await classDoc.save();
    await classDoc.populate('students', 'profile.firstName profile.lastName email');
    res.status(200).json({ success: true, message: 'Student added to class', data: { class: classDoc } });
  } catch (error) {
    next(error);
  }
}

export async function removeStudentFromClass(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { studentId } = req.body as { studentId: string };
    const classDoc = await Class.findById(id);
    if (!classDoc) return res.status(404).json({ success: false, message: 'Class not found' });

    if (!classDoc.isAttending(studentId)) {
      return res.status(400).json({ success: false, message: 'Student is not in this class' });
    }

    classDoc.students = classDoc.students.filter((sid) => sid.toString() !== studentId);
    await classDoc.save();
    res.status(200).json({ success: true, message: 'Student removed from class', data: { class: classDoc } });
  } catch (error) {
    next(error);
  }
}

export async function getMyClasses(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    const { upcoming } = req.query as Record<string, string>;
    let classes: any[] = [];
    if (user.role === 'teacher') {
      classes = await Class.findByTeacher(user._id.toString());
    } else if (user.role === 'student') {
      classes = await Class.findByStudent(user._id.toString());
    }
    if (upcoming === 'true') {
      const now = new Date();
      classes = classes.filter((c) => new Date((c as any).scheduledDate).getTime() >= now.getTime());
    }
    res.status(200).json({ success: true, data: { classes, count: classes.length } });
  } catch (error) {
    next(error);
  }
}

export async function getUpcomingClasses(_req: Request, res: Response, next: NextFunction) {
  try {
    const classes = await Class.findUpcoming();
    await Class.populate(classes, [
      { path: 'course', select: 'name code' },
      { path: 'teacher', select: 'profile.firstName profile.lastName email' },
    ]);
    res.status(200).json({ success: true, data: { classes, count: classes.length } });
  } catch (error) {
    next(error);
  }
}


