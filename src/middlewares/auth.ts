import { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import User, { IUser } from '../models/User';

export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
  const parts = authHeader.split(' ');
  if (parts.length !== 2) return null;
  return parts[1].trim();
}

async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const headerToken = extractTokenFromHeader(req.headers.authorization as string | undefined);
    const cookieToken = (req as any)?.cookies?.accessToken as string | undefined; // fallback if cookies are used
    const token = headerToken || cookieToken || null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or account deactivated' });
    }

    req.user = user as IUser;
    return next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to authenticate request' });
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const headerToken = extractTokenFromHeader(req.headers.authorization as string | undefined);
    const cookieToken = (req as any)?.cookies?.accessToken as string | undefined;
    const token = headerToken || cookieToken || null;

    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded) {
        const user = await User.findById(decoded.userId);
        if (user && user.isActive) {
          req.user = user as IUser;
        }
      }
    }
  } catch (_e) {
    // ignore errors for optional auth
  } finally {
    next();
  }
}

export default authenticate;


