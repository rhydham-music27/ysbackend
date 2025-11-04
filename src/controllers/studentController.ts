import { Request, Response, NextFunction } from 'express';
import Course from '../models/Course';
import Assignment from '../models/Assignment';
import Grade from '../models/Grade';
import {
  getStudentDashboard,
  enrollInCourse,
  dropCourse,
  getAvailableCourses,
  getStudentProgress,
} from '../services/studentService';

export async function getDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract studentId from req.user._id (authenticated student)
    const dashboard = await getStudentDashboard((req as any).user._id.toString());

    // Return 200 status with response
    return res.status(200).json({ success: true, data: { dashboard } });
  } catch (error) {
    return next(error);
  }
}

export async function enrollInCourseController(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract courseId from req.params
    const { id } = req.params;

    // Extract studentId from req.user._id (authenticated student)
    const course = await enrollInCourse({ courseId: id, studentId: (req as any).user._id.toString() });

    // Return 200 status with response
    return res.status(200).json({ success: true, message: 'Successfully enrolled in course', data: { course } });
  } catch (error) {
    return next(error);
  }
}

export async function dropCourseController(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract courseId from req.params
    const { id } = req.params;

    // Extract studentId from req.user._id
    const course = await dropCourse({ courseId: id, studentId: (req as any).user._id.toString() });

    // Return 200 status with response
    return res.status(200).json({ success: true, message: 'Successfully dropped course', data: { course } });
  } catch (error) {
    return next(error);
  }
}

export async function getAvailableCoursesController(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract studentId from req.user._id
    const courses = await getAvailableCourses((req as any).user._id.toString());

    // Return 200 status with response
    return res.status(200).json({ success: true, data: { courses, count: courses.length } });
  } catch (error) {
    return next(error);
  }
}

export async function getCourseProgress(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract courseId from req.params
    const { id } = req.params;

    // Extract studentId from req.user._id
    const progress = await getStudentProgress((req as any).user._id.toString(), id);

    // Return 200 status with response
    return res.status(200).json({ success: true, data: { progress } });
  } catch (error) {
    return next(error);
  }
}

