import { NextFunction, Request, Response } from 'express';
import Course from '../models/Course';
import User from '../models/User';
import {
  enrollStudent,
  unenrollStudent,
  checkCourseCapacity,
  validateTeacherAssignment,
} from '../services/courseService';

export async function createCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const { teacher } = req.body as { teacher: string };
    await validateTeacherAssignment(teacher);
    const course = await Course.create({ ...req.body, createdBy: (req as any).user._id });
    await course.populate('teacher', 'profile.firstName profile.lastName email');
    res.status(201).json({ success: true, message: 'Course created successfully', data: { course } });
  } catch (error) {
    next(error);
  }
}

export async function listCourses(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, teacher, search } = req.query as Record<string, string>;
    const query: Record<string, unknown> = {};
    if (status) query.status = status;
    if (teacher) query.teacher = teacher;
    if (search) (query as any).$text = { $search: search };

    const courses = await Course.find(query)
      .populate('teacher', 'profile.firstName profile.lastName email')
      .populate('createdBy', 'profile.firstName profile.lastName')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { courses, count: courses.length } });
  } catch (error) {
    next(error);
  }
}

export async function getCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const course = await Course.findById(id)
      .populate('teacher', 'profile.firstName profile.lastName email')
      .populate('students', 'profile.firstName profile.lastName email')
      .populate('createdBy', 'profile.firstName profile.lastName');
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.status(200).json({ success: true, data: { course } });
  } catch (error) {
    next(error);
  }
}

export async function updateCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    if (req.body && req.body.teacher) {
      await validateTeacherAssignment(req.body.teacher);
    }
    const course = await Course.findByIdAndUpdate(id, req.body, { new: true, runValidators: true })
      .populate('teacher', 'profile.firstName profile.lastName email');
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.status(200).json({ success: true, message: 'Course updated successfully', data: { course } });
  } catch (error) {
    next(error);
  }
}

export async function deleteCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    if ((course.students?.length || 0) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete course with enrolled students. Unenroll students first.',
      });
    }
    await Course.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    next(error);
  }
}

export async function enrollStudentInCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { studentId } = req.body as { studentId: string };
    const course = await enrollStudent({ courseId: id, studentId, enrolledBy: (req as any).user._id.toString() });
    await course.populate('students', 'profile.firstName profile.lastName email');
    res.status(200).json({ success: true, message: 'Student enrolled successfully', data: { course } });
  } catch (error) {
    next(error);
  }
}

export async function unenrollStudentFromCourse(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { studentId } = req.body as { studentId: string };
    const course = await unenrollStudent({ courseId: id, studentId, unenrolledBy: (req as any).user._id.toString() });
    res.status(200).json({ success: true, message: 'Student unenrolled successfully', data: { course } });
  } catch (error) {
    next(error);
  }
}

export async function getCourseCapacity(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const capacity = await checkCourseCapacity({ courseId: id });
    res.status(200).json({ success: true, data: { capacity } });
  } catch (error) {
    next(error);
  }
}

export async function getMyCourses(req: Request, res: Response, next: NextFunction) {
  try {
    const user = (req as any).user;
    let courses: any[] = [];
    if (user.role === 'teacher') {
      courses = await Course.findByTeacher(user._id.toString());
    } else if (user.role === 'student') {
      courses = await Course.findByStudent(user._id.toString());
    }
    res.status(200).json({ success: true, data: { courses, count: courses.length } });
  } catch (error) {
    next(error);
  }
}


