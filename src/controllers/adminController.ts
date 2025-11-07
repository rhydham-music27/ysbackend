import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import {
  createUserByAdmin,
  updateUserByAdmin,
  deleteUserByAdmin,
  assignRole,
  toggleUserStatus,
  bulkImportUsers,
  bulkEnrollStudents,
  getUserStatistics,
  getSystemSettings,
  updateSystemSetting,
  deleteSystemSetting,
  getAuditLogs,
  validateBulkUserData,
} from '../services/adminService';
import { UserRole } from '../types/enums';

// User Management Controllers
export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, role, profile, isActive } = req.body;
    const user = await createUserByAdmin({
      email,
      password,
      role,
      profile,
      isActive,
      createdBy: (req as any).user._id.toString(),
    });
    res.status(201).json({ success: true, message: 'User created successfully', data: { user } });
  } catch (err) {
    next(err);
  }
}

export async function listAllUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { role, isActive, search, page, limit } = req.query;
    const query: any = {};

    if (role) {
      query.role = role;
    }
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 20;
    const skip = (pageNum - 1) * limitNum;

    const users = await User.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users,
        count: users.length,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: { user } });
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const user = await updateUserByAdmin({
      userId: id,
      updates: req.body,
      updatedBy: (req as any).user._id.toString(),
    });
    res.status(200).json({ success: true, message: 'User updated successfully', data: { user } });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    await deleteUserByAdmin(id, (req as any).user._id.toString());
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    next(err);
  }
}

export async function assignUserRole(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const user = await assignRole({
      userId: id,
      newRole: role,
      assignedBy: (req as any).user._id.toString(),
    });
    res.status(200).json({ success: true, message: 'Role assigned successfully', data: { user } });
  } catch (err) {
    next(err);
  }
}

export async function activateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const user = await toggleUserStatus(id, true, (req as any).user._id.toString());
    res.status(200).json({ success: true, message: 'User activated successfully', data: { user } });
  } catch (err) {
    next(err);
  }
}

export async function deactivateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params;
    const user = await toggleUserStatus(id, false, (req as any).user._id.toString());
    res.status(200).json({ success: true, message: 'User deactivated successfully', data: { user } });
  } catch (err) {
    next(err);
  }
}

// Bulk Operations Controllers
export async function bulkImportUsersController(req: Request, res: Response, next: NextFunction) {
  try {
    const { users } = req.body;
    const validationResult = validateBulkUserData(users);

    if (!validationResult.valid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationResult.errors,
      });
    }

    const result = await bulkImportUsers({
      users,
      importedBy: (req as any).user._id.toString(),
    });

    res.status(201).json({
      success: true,
      message: 'Bulk import completed',
      data: {
        created: result.created,
        failed: result.failed,
        summary: {
          total: users.length,
          successful: result.created.length,
          failed: result.failed.length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function bulkEnrollStudentsController(req: Request, res: Response, next: NextFunction) {
  try {
    const { courseId, studentIds } = req.body;
    const result = await bulkEnrollStudents({
      courseId,
      studentIds,
      enrolledBy: (req as any).user._id.toString(),
    });

    res.status(200).json({
      success: true,
      message: 'Bulk enrollment completed',
      data: {
        enrolled: result.enrolled,
        failed: result.failed,
        summary: {
          total: studentIds.length,
          successful: result.enrolled.length,
          failed: result.failed.length,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// System Settings Controllers
export async function getSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const { category } = req.query;
    const settings = await getSystemSettings(category as string | undefined);
    res.status(200).json({ success: true, data: { settings, count: settings.length } });
  } catch (err) {
    next(err);
  }
}

export async function updateSetting(req: Request, res: Response, next: NextFunction) {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const setting = await updateSystemSetting(key, value, (req as any).user._id.toString());
    res.status(200).json({ success: true, message: 'Setting updated successfully', data: { setting } });
  } catch (err) {
    next(err);
  }
}

export async function deleteSetting(req: Request, res: Response, next: NextFunction) {
  try {
    const { key } = req.params;
    await deleteSystemSetting(key, (req as any).user._id.toString());
    res.status(200).json({ success: true, message: 'Setting deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// Audit Log Controllers
export async function getAuditLogsController(req: Request, res: Response, next: NextFunction) {
  try {
    const { adminId, action, targetUserId, startDate, endDate, limit } = req.query;

    const filters: any = {};
    if (adminId) filters.adminId = adminId as string;
    if (action) filters.action = action;
    if (targetUserId) filters.targetUserId = targetUserId as string;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (limit) filters.limit = parseInt(limit as string);

    const logs = await getAuditLogs(filters);
    res.status(200).json({ success: true, data: { logs, count: logs.length } });
  } catch (err) {
    next(err);
  }
}

export async function getMyAuditLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { action, startDate, endDate, limit } = req.query;

    const filters: any = {
      adminId: (req as any).user._id.toString(),
    };
    if (action) filters.action = action;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);
    if (limit) filters.limit = parseInt(limit as string);

    const logs = await getAuditLogs(filters);
    res.status(200).json({ success: true, data: { logs, count: logs.length } });
  } catch (err) {
    next(err);
  }
}

// Statistics Controllers
export async function getUserStats(req: Request, res: Response, next: NextFunction) {
  try {
    const stats = await getUserStatistics();
    res.status(200).json({ success: true, data: { stats } });
  } catch (err) {
    next(err);
  }
}

