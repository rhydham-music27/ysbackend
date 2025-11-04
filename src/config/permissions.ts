import { UserRole } from '../types/enums';

/**
 * Role hierarchy levels used for minimum-role checks.
 * Note: TEACHER and COORDINATOR are parallel at the same level.
 */
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [UserRole.ADMIN]: 5,
  [UserRole.MANAGER]: 4,
  [UserRole.TEACHER]: 3,
  [UserRole.COORDINATOR]: 3,
  [UserRole.STUDENT]: 1,
};

export type ResourcePermission = 'create' | 'read' | 'update' | 'delete';
export type Permission = string; // e.g., 'courses:read', 'assignments:create'

/**
 * Permissions mapped per role. Supports wildcard entries per resource and global '*'.
 * Phase 5 primarily uses role checks; these are future-ready for fine-grained control.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: ['*'],
  [UserRole.MANAGER]: ['users:read', 'users:update', 'courses:*', 'reports:*', 'attendance:*'],
  [UserRole.TEACHER]: ['courses:read', 'courses:update', 'attendance:create', 'attendance:update', 'assignments:*', 'grades:*'],
  [UserRole.COORDINATOR]: ['courses:read', 'attendance:*', 'schedules:*', 'students:read'],
  [UserRole.STUDENT]: ['courses:read', 'assignments:read', 'assignments:create', 'grades:read', 'attendance:read'],
};

export function getRoleLevel(role: UserRole): number {
  return ROLE_HIERARCHY[role] ?? 0;
}

export function hasMinimumRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

export function isHigherRole(userRole: UserRole, compareRole: UserRole): boolean {
  return getRoleLevel(userRole) > getRoleLevel(compareRole);
}

/**
 * Check if a role has a specific permission.
 * Supports global '*' and resource wildcards like 'courses:*'.
 */
export function hasPermission(userRole: UserRole, permission: string): boolean {
  const rolePerms = ROLE_PERMISSIONS[userRole] || [];
  if (rolePerms.includes('*')) return true;

  // exact match
  if (rolePerms.includes(permission)) return true;

  // wildcard resource match: e.g., 'courses:*' matches 'courses:create'
  const [resource, action = ''] = permission.split(':');
  const wildcard = `${resource}:*`;
  if (rolePerms.includes(wildcard)) return true;

  // support MANAGE as wildcard action if present in future (e.g., 'courses:manage')
  const manage = `${resource}:manage`;
  if (rolePerms.includes(manage)) return true;

  return false;
}

/**
 * Runtime guard to validate role strings.
 */
export function isValidRole(role: string): role is UserRole {
  return (Object.values(UserRole) as string[]).includes(role);
}

export default {
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  getRoleLevel,
  hasMinimumRole,
  isHigherRole,
  hasPermission,
  isValidRole,
};


