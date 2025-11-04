import { Request, Response, NextFunction } from 'express';
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

