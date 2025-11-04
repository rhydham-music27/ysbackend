import { NextFunction, Request, Response } from 'express';
import { UserRole } from '../types/enums';
import { IUser } from '../models/User';
import { hasMinimumRole, getRoleLevel, hasPermission } from '../config/permissions';

export type RoleOrRoles = UserRole | UserRole[];

function shouldLogFailures(): boolean {
  const flag = process.env.LOG_AUTH_FAILURES;
  return String(flag).toLowerCase() === 'true';
}

function sendAuthorizationError(res: Response, message: string, statusCode: number = 403) {
  return res.status(statusCode).json({ success: false, message, statusCode });
}

function getUserFromRequest(req: Request): IUser | null {
  return (req as any).user ?? null;
}

// Exact role match
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = getUserFromRequest(req);
      if (!user) return sendAuthorizationError(res, 'Authentication required', 401);

      const isAllowed = allowedRoles.includes(user.role);
      if (!isAllowed) {
        if (shouldLogFailures()) {
          // eslint-disable-next-line no-console
          console.log('[AUTHZ] deny exact-role', {
            userId: user._id?.toString?.(),
            role: user.role,
            allowedRoles,
            path: req.path,
            method: req.method,
            at: new Date().toISOString(),
          });
        }
        return sendAuthorizationError(res, 'Access denied. Insufficient permissions.');
      }
      return next();
    } catch (_err) {
      return sendAuthorizationError(res, 'Authorization check failed');
    }
  };
}

// Minimum role level
export function authorizeMinRole(minimumRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = getUserFromRequest(req);
      if (!user) return sendAuthorizationError(res, 'Authentication required', 401);

      const ok = hasMinimumRole(user.role, minimumRole);
      if (!ok) {
        if (shouldLogFailures()) {
          // eslint-disable-next-line no-console
          console.log('[AUTHZ] deny min-role', {
            userId: user._id?.toString?.(),
            role: user.role,
            roleLevel: getRoleLevel(user.role),
            requiredRole: minimumRole,
            requiredLevel: getRoleLevel(minimumRole),
            path: req.path,
            method: req.method,
            at: new Date().toISOString(),
          });
        }
        return sendAuthorizationError(res, 'Access denied. Insufficient role level.');
      }
      return next();
    } catch (_err) {
      return sendAuthorizationError(res, 'Authorization check failed');
    }
  };
}

// Permission based (future-ready)
export function authorizePermission(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = getUserFromRequest(req);
      if (!user) return sendAuthorizationError(res, 'Authentication required', 401);

      const allOk = requiredPermissions.every((perm) => hasPermission(user.role, perm));
      if (!allOk) {
        if (shouldLogFailures()) {
          // eslint-disable-next-line no-console
          console.log('[AUTHZ] deny permission', {
            userId: user._id?.toString?.(),
            role: user.role,
            missingAnyOf: requiredPermissions,
            path: req.path,
            method: req.method,
            at: new Date().toISOString(),
          });
        }
        return sendAuthorizationError(res, 'Access denied. Missing required permissions.');
      }
      return next();
    } catch (_err) {
      return sendAuthorizationError(res, 'Authorization check failed');
    }
  };
}

// Resource ownership (future-ready)
export function authorizeOwnership(resourceUserIdField: string = 'userId') {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = getUserFromRequest(req);
      if (!user) return sendAuthorizationError(res, 'Authentication required', 401);

      const fromParams = (req.params as any)?.[resourceUserIdField];
      const fromBody = (req.body as any)?.[resourceUserIdField];
      const fromQuery = (req.query as any)?.[resourceUserIdField];
      const resourceUserId = (fromParams || fromBody || fromQuery)?.toString?.();

      const isAdmin = user.role === UserRole.ADMIN;
      const isOwner = resourceUserId && user._id?.toString?.() === resourceUserId;

      if (isAdmin || isOwner) return next();

      if (shouldLogFailures()) {
        // eslint-disable-next-line no-console
        console.log('[AUTHZ] deny ownership', {
          userId: user._id?.toString?.(),
          role: user.role,
          resourceUserIdField,
          resourceUserId,
          path: req.path,
          method: req.method,
          at: new Date().toISOString(),
        });
      }
      return sendAuthorizationError(res, 'Access denied. You can only access your own resources.');
    } catch (_err) {
      return sendAuthorizationError(res, 'Authorization check failed');
    }
  };
}

// Admin-only shortcut
export function adminOnly() {
  return authorize(UserRole.ADMIN);
}

// Combined: passes if any provided middleware authorizes
export function authorizeAny(...middlewares: Array<(req: Request, res: Response, next: NextFunction) => void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    let finished = false;
    let remaining = middlewares.length;

    const done = () => {
      if (!finished) {
        finished = true;
        next();
      }
    };

    const fail = () => {
      remaining -= 1;
      if (remaining === 0 && !finished) {
        sendAuthorizationError(res, 'Access denied. Authorization conditions not met.');
      }
    };

    middlewares.forEach((mw) => {
      try {
        mw(req, res, (err?: any) => {
          if (err) return fail();
          if (!finished) return done();
          return undefined;
        });
      } catch (_e) {
        fail();
      }
    });
  };
}

export default authorize;


