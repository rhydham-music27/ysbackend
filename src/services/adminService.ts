import mongoose from 'mongoose';
import User, { IUser } from '../models/User';
import Course from '../models/Course';
import AuditLog, { IAuditLog } from '../models/AuditLog';
import SystemSettings, { ISystemSettings } from '../models/SystemSettings';
import { UserRole, AuditAction, OAuthProvider } from '../types/enums';

// TypeScript Interfaces
export interface CreateUserParams {
  email: string;
  password: string;
  role: UserRole;
  profile: { firstName: string; lastName: string; phone?: string };
  isActive?: boolean;
  createdBy: string;
}

export interface UpdateUserParams {
  userId: string;
  updates: Partial<IUser>;
  updatedBy: string;
}

export interface AssignRoleParams {
  userId: string;
  newRole: UserRole;
  assignedBy: string;
}

export interface BulkUserImportParams {
  users: Array<{
    email: string;
    password: string;
    role: UserRole;
    profile: { firstName: string; lastName: string; phone?: string };
  }>;
  importedBy: string;
}

export interface BulkEnrollmentParams {
  courseId: string;
  studentIds: string[];
  enrolledBy: string;
}

export interface AuditLogParams {
  action: AuditAction;
  performedBy: string;
  targetResource: string;
  targetResourceId?: string;
  description: string;
  metadata?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
}

// Audit Logging Function
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    if (!mongoose.Types.ObjectId.isValid(params.performedBy)) {
      return;
    }

    await AuditLog.create({
      action: params.action,
      performedBy: params.performedBy,
      targetResource: params.targetResource,
      targetResourceId: params.targetResourceId,
      description: params.description,
      metadata: params.metadata,
      success: params.success ?? true,
      errorMessage: params.errorMessage,
      timestamp: new Date(),
    });
  } catch (error) {
    // Don't throw error if audit log creation fails
    // eslint-disable-next-line no-console
    console.error('Failed to create audit log:', error);
  }
}

// User Management Functions
export async function createUserByAdmin(params: CreateUserParams): Promise<IUser> {
  try {
    // Validate email uniqueness
    const existingUser = await User.findOne({ email: params.email });
    if (existingUser) {
      throw new Error('User with this email already exists');
    }

    // Validate role
    if (!Object.values(UserRole).includes(params.role)) {
      throw new Error('Invalid role');
    }

    // Create user
    const user = await User.create({
      email: params.email,
      password: params.password,
      role: params.role,
      profile: params.profile,
      provider: OAuthProvider.LOCAL,
      isActive: params.isActive ?? true,
      isEmailVerified: false,
    });

    // Create audit log
    await createAuditLog({
      action: AuditAction.USER_CREATED,
      performedBy: params.createdBy,
      targetResource: 'User',
      targetResourceId: user._id.toString(),
      description: `Created user ${user.email} with role ${user.role}`,
      metadata: {
        targetUserId: user._id.toString(),
        targetUserEmail: user.email,
        newValue: { role: user.role, isActive: user.isActive },
      },
    });

    return user;
  } catch (error: any) {
    // Log audit even if user creation fails
    await createAuditLog({
      action: AuditAction.USER_CREATED,
      performedBy: params.createdBy,
      targetResource: 'User',
      description: `Failed to create user ${params.email}`,
      metadata: { targetUserEmail: params.email },
      success: false,
      errorMessage: error.message,
    });
    throw error;
  }
}

export async function updateUserByAdmin(params: UpdateUserParams): Promise<IUser> {
  try {
    if (!mongoose.Types.ObjectId.isValid(params.userId)) {
      throw new Error('Invalid user ID');
    }

    const user = await User.findById(params.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Store old values for audit log
    const oldRole = user.role;
    const oldIsActive = user.isActive;
    const oldEmail = user.email;

    // Check email uniqueness if email is being updated
    if (params.updates.email && params.updates.email !== user.email) {
      const emailExists = await User.findOne({
        email: params.updates.email,
        _id: { $ne: params.userId },
      });
      if (emailExists) {
        throw new Error('Email already in use');
      }
    }

    // Apply updates
    Object.assign(user, params.updates);
    await user.save();

    // Create audit log
    await createAuditLog({
      action: AuditAction.USER_UPDATED,
      performedBy: params.updatedBy,
      targetResource: 'User',
      targetResourceId: params.userId,
      description: `Updated user ${user.email}`,
      metadata: {
        targetUserId: params.userId,
        targetUserEmail: user.email,
        oldValue: { role: oldRole, isActive: oldIsActive, email: oldEmail },
        newValue: { role: user.role, isActive: user.isActive, email: user.email },
      },
    });

    return user;
  } catch (error: any) {
    await createAuditLog({
      action: AuditAction.USER_UPDATED,
      performedBy: params.updatedBy,
      targetResource: 'User',
      targetResourceId: params.userId,
      description: `Failed to update user`,
      success: false,
      errorMessage: error.message,
    });
    throw error;
  }
}

export async function deleteUserByAdmin(userId: string, deletedBy: string): Promise<void> {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is admin
    if (user.role === UserRole.ADMIN) {
      throw new Error('Cannot delete admin users. Deactivate instead.');
    }

    // Check for dependencies (simplified - can be enhanced)
    const enrolledCourses = await Course.countDocuments({ students: userId });
    if (enrolledCourses > 0) {
      throw new Error('Cannot delete user with existing data. Deactivate instead.');
    }

    // Store user info for audit log
    const userEmail = user.email;
    const userRole = user.role;

    // Delete user
    await User.findByIdAndDelete(userId);

    // Create audit log
    await createAuditLog({
      action: AuditAction.USER_DELETED,
      performedBy: deletedBy,
      targetResource: 'User',
      targetResourceId: userId,
      description: `Deleted user ${userEmail}`,
      metadata: {
        targetUserId: userId,
        targetUserEmail: userEmail,
        oldValue: { role: userRole, email: userEmail },
      },
    });
  } catch (error: any) {
    await createAuditLog({
      action: AuditAction.USER_DELETED,
      performedBy: deletedBy,
      targetResource: 'User',
      targetResourceId: userId,
      description: `Failed to delete user`,
      success: false,
      errorMessage: error.message,
    });
    throw error;
  }
}

export async function assignRole(params: AssignRoleParams): Promise<IUser> {
  try {
    if (!mongoose.Types.ObjectId.isValid(params.userId)) {
      throw new Error('Invalid user ID');
    }

    if (!Object.values(UserRole).includes(params.newRole)) {
      throw new Error('Invalid role');
    }

    const user = await User.findById(params.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const oldRole = user.role;

    if (user.role === params.newRole) {
      throw new Error('User already has this role');
    }

    user.role = params.newRole;
    await user.save();

    // Create audit log
    await createAuditLog({
      action: AuditAction.ROLE_ASSIGNED,
      performedBy: params.assignedBy,
      targetResource: 'User',
      targetResourceId: params.userId,
      description: `Assigned role ${params.newRole} to user ${user.email}`,
      metadata: {
        targetUserId: params.userId,
        targetUserEmail: user.email,
        oldValue: { role: oldRole },
        newValue: { role: params.newRole },
      },
    });

    return user;
  } catch (error: any) {
    await createAuditLog({
      action: AuditAction.ROLE_ASSIGNED,
      performedBy: params.assignedBy,
      targetResource: 'User',
      targetResourceId: params.userId,
      description: `Failed to assign role`,
      success: false,
      errorMessage: error.message,
    });
    throw error;
  }
}

export async function toggleUserStatus(userId: string, isActive: boolean, updatedBy: string): Promise<IUser> {
  try {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Prevent deactivating admin users
    if (!isActive && user.role === UserRole.ADMIN) {
      throw new Error('Cannot deactivate admin users');
    }

    user.isActive = isActive;
    await user.save();

    // Create audit log
    await createAuditLog({
      action: isActive ? AuditAction.USER_ACTIVATED : AuditAction.USER_DEACTIVATED,
      performedBy: updatedBy,
      targetResource: 'User',
      targetResourceId: userId,
      description: `${isActive ? 'Activated' : 'Deactivated'} user ${user.email}`,
      metadata: {
        targetUserId: userId,
        targetUserEmail: user.email,
        oldValue: { isActive: !isActive },
        newValue: { isActive },
      },
    });

    return user;
  } catch (error: any) {
    await createAuditLog({
      action: isActive ? AuditAction.USER_ACTIVATED : AuditAction.USER_DEACTIVATED,
      performedBy: updatedBy,
      targetResource: 'User',
      targetResourceId: userId,
      description: `Failed to ${isActive ? 'activate' : 'deactivate'} user`,
      success: false,
      errorMessage: error.message,
    });
    throw error;
  }
}

// Bulk Operations
export async function bulkImportUsers(
  params: BulkUserImportParams
): Promise<{ created: IUser[]; failed: Array<{ email: string; reason: string }> }> {
  try {
    if (!params.users || params.users.length === 0) {
      throw new Error('Users array cannot be empty');
    }

    const created: IUser[] = [];
    const failed: Array<{ email: string; reason: string }> = [];

    for (const userData of params.users) {
      try {
        const user = await createUserByAdmin({
          email: userData.email,
          password: userData.password,
          role: userData.role,
          profile: userData.profile,
          createdBy: params.importedBy,
        });
        created.push(user);
      } catch (error: any) {
        failed.push({
          email: userData.email,
          reason: error.message || 'Unknown error',
        });
      }
    }

    // Create audit log for bulk operation
    await createAuditLog({
      action: AuditAction.BULK_USER_IMPORT,
      performedBy: params.importedBy,
      targetResource: 'User',
      description: `Bulk imported ${created.length} users (${failed.length} failed)`,
      metadata: {
        bulkCount: params.users.length,
        successCount: created.length,
        failedCount: failed.length,
      },
    });

    return { created, failed };
  } catch (error: any) {
    await createAuditLog({
      action: AuditAction.BULK_USER_IMPORT,
      performedBy: params.importedBy,
      targetResource: 'User',
      description: 'Failed to bulk import users',
      success: false,
      errorMessage: error.message,
    });
    throw error;
  }
}

export async function bulkEnrollStudents(
  params: BulkEnrollmentParams
): Promise<{ enrolled: string[]; failed: Array<{ studentId: string; reason: string }> }> {
  try {
    if (!mongoose.Types.ObjectId.isValid(params.courseId)) {
      throw new Error('Invalid course ID');
    }

    const course = await Course.findById(params.courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    const enrolled: string[] = [];
    const failed: Array<{ studentId: string; reason: string }> = [];

    for (const studentId of params.studentIds) {
      try {
        if (!mongoose.Types.ObjectId.isValid(studentId)) {
          failed.push({ studentId, reason: 'Invalid student ID' });
          continue;
        }

        const student = await User.findById(studentId);
        if (!student) {
          failed.push({ studentId, reason: 'Student not found' });
          continue;
        }

        if (student.role !== UserRole.STUDENT) {
          failed.push({ studentId, reason: 'User is not a student' });
          continue;
        }

        if (course.students.includes(new mongoose.Types.ObjectId(studentId))) {
          failed.push({ studentId, reason: 'Already enrolled' });
          continue;
        }

        if (course.students.length >= course.maxStudents) {
          failed.push({ studentId, reason: 'Course is full' });
          continue;
        }

        course.students.push(new mongoose.Types.ObjectId(studentId));
        enrolled.push(studentId);
      } catch (error: any) {
        failed.push({
          studentId,
          reason: error.message || 'Unknown error',
        });
      }
    }

    await course.save();

    // Create audit log
    await createAuditLog({
      action: AuditAction.BULK_ENROLLMENT,
      performedBy: params.enrolledBy,
      targetResource: 'Course',
      targetResourceId: params.courseId,
      description: `Bulk enrolled ${enrolled.length} students in course`,
      metadata: {
        bulkCount: params.studentIds.length,
        successCount: enrolled.length,
        failedCount: failed.length,
      },
    });

    return { enrolled, failed };
  } catch (error: any) {
    await createAuditLog({
      action: AuditAction.BULK_ENROLLMENT,
      performedBy: params.enrolledBy,
      targetResource: 'Course',
      targetResourceId: params.courseId,
      description: 'Failed to bulk enroll students',
      success: false,
      errorMessage: error.message,
    });
    throw error;
  }
}

// Statistics
export async function getUserStatistics(): Promise<{
  totalUsers: number;
  usersByRole: Record<string, number>;
  activeUsers: number;
  inactiveUsers: number;
  recentRegistrations: number;
}> {
  try {
    const totalUsers = await User.countDocuments();

    const roleAggregation = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
        },
      },
    ]);

    const usersByRole: Record<string, number> = {};
    roleAggregation.forEach((item) => {
      usersByRole[item._id] = item.count;
    });

    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentRegistrations = await User.countDocuments({
      createdAt: { $gte: thirtyDaysAgo },
    });

    return {
      totalUsers,
      usersByRole,
      activeUsers,
      inactiveUsers,
      recentRegistrations,
    };
  } catch (error) {
    throw error;
  }
}

// System Settings Functions
export async function getSystemSettings(category?: string): Promise<ISystemSettings[]> {
  try {
    let settings: ISystemSettings[];
    if (category) {
      settings = await SystemSettings.findByCategory(category);
    } else {
      settings = await SystemSettings.find().sort({ category: 1, key: 1 });
    }

    await SystemSettings.populate(settings, {
      path: 'updatedBy',
      select: 'email profile.firstName profile.lastName',
    });

    return settings;
  } catch (error) {
    throw error;
  }
}

export async function updateSystemSetting(key: string, value: any, updatedBy: string): Promise<ISystemSettings> {
  try {
    if (!key) {
      throw new Error('Setting key is required');
    }

    if (!mongoose.Types.ObjectId.isValid(updatedBy)) {
      throw new Error('Invalid admin ID');
    }

    const existingSetting = await SystemSettings.findByKey(key);
    const oldValue = existingSetting?.value;

    const setting = await SystemSettings.setSetting(key, value, updatedBy);

    // Create audit log
    await createAuditLog({
      action: AuditAction.SETTINGS_UPDATED,
      performedBy: updatedBy,
      targetResource: 'SystemSettings',
      targetResourceId: setting._id.toString(),
      description: `Updated setting ${key}`,
      metadata: {
        oldValue,
        newValue: value,
      },
    });

    return setting;
  } catch (error: any) {
    await createAuditLog({
      action: AuditAction.SETTINGS_UPDATED,
      performedBy: updatedBy,
      targetResource: 'SystemSettings',
      description: `Failed to update setting ${key}`,
      success: false,
      errorMessage: error.message,
    });
    throw error;
  }
}

export async function deleteSystemSetting(key: string, deletedBy: string): Promise<void> {
  try {
    if (!key) {
      throw new Error('Setting key is required');
    }

    const setting = await SystemSettings.findByKey(key);
    if (!setting) {
      throw new Error('Setting not found');
    }

    const settingValue = setting.value;
    await SystemSettings.findOneAndDelete({ key });

    // Create audit log
    await createAuditLog({
      action: AuditAction.SYSTEM_CONFIG_CHANGED,
      performedBy: deletedBy,
      targetResource: 'SystemSettings',
      description: `Deleted setting ${key}`,
      metadata: {
        oldValue: settingValue,
      },
    });
  } catch (error: any) {
    await createAuditLog({
      action: AuditAction.SYSTEM_CONFIG_CHANGED,
      performedBy: deletedBy,
      targetResource: 'SystemSettings',
      description: `Failed to delete setting ${key}`,
      success: false,
      errorMessage: error.message,
    });
    throw error;
  }
}

// Audit Log Functions
export async function getAuditLogs(filters?: {
  adminId?: string;
  action?: AuditAction;
  targetUserId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<IAuditLog[]> {
  try {
    const query: any = {};

    if (filters?.adminId && mongoose.Types.ObjectId.isValid(filters.adminId)) {
      query.performedBy = new mongoose.Types.ObjectId(filters.adminId);
    }

    if (filters?.action) {
      query.action = filters.action;
    }

    if (filters?.targetUserId && mongoose.Types.ObjectId.isValid(filters.targetUserId)) {
      query['metadata.targetUserId'] = filters.targetUserId;
    }

    if (filters?.startDate || filters?.endDate) {
      query.timestamp = {};
      if (filters.startDate) {
        query.timestamp.$gte = filters.startDate;
      }
      if (filters.endDate) {
        query.timestamp.$lte = filters.endDate;
      }
    }

    const limit = filters?.limit || 100;
    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('performedBy', 'email profile.firstName profile.lastName');

    return logs;
  } catch (error) {
    throw error;
  }
}

// Validation Function
export function validateBulkUserData(users: Array<any>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const emailSet = new Set<string>();

  users.forEach((user, index) => {
    if (!user.email || typeof user.email !== 'string') {
      errors.push(`User ${index + 1}: Email is required`);
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(user.email)) {
        errors.push(`User ${index + 1}: Invalid email format`);
      }
      if (emailSet.has(user.email.toLowerCase())) {
        errors.push(`User ${index + 1}: Duplicate email in batch`);
      }
      emailSet.add(user.email.toLowerCase());
    }

    if (!user.password || typeof user.password !== 'string' || user.password.length < 8) {
      errors.push(`User ${index + 1}: Password must be at least 8 characters`);
    }

    if (!user.role || !Object.values(UserRole).includes(user.role)) {
      errors.push(`User ${index + 1}: Invalid role`);
    }

    if (!user.profile || !user.profile.firstName || !user.profile.lastName) {
      errors.push(`User ${index + 1}: First name and last name are required`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

