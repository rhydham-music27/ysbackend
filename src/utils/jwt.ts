import jwt, { JsonWebTokenError, NotBeforeError, TokenExpiredError } from 'jsonwebtoken';
import dotenv from 'dotenv';
import { IUser } from '../models/User';
import { UserRole } from '../types/enums';

dotenv.config();

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function generateAccessToken(user: IUser): string {
  try {
    const payload: JwtPayload = {
      userId: String(user._id),
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, getEnv('JWT_SECRET'), {
      expiresIn: process.env.JWT_EXPIRES_IN || '1h',
      issuer: 'yourshikshak-api',
      audience: 'yourshikshak-users',
    });

    return token;
  } catch (error) {
    throw new Error('Failed to generate access token');
  }
}

export function generateRefreshToken(user: IUser): string {
  try {
    const payload = { userId: String(user._id) } as Partial<JwtPayload>;

    const token = jwt.sign(payload, getEnv('JWT_REFRESH_SECRET'), {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
      issuer: 'yourshikshak-api',
      audience: 'yourshikshak-users',
    });

    return token;
  } catch (error) {
    throw new Error('Failed to generate refresh token');
  }
}

export function generateTokenPair(user: IUser): TokenPair {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, getEnv('JWT_SECRET'), {
      issuer: 'yourshikshak-api',
      audience: 'yourshikshak-users',
    });
    return decoded as JwtPayload;
  } catch (error) {
    if (
      error instanceof JsonWebTokenError ||
      error instanceof TokenExpiredError ||
      error instanceof NotBeforeError
    ) {
      return null;
    }
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    const decoded = jwt.verify(token, getEnv('JWT_REFRESH_SECRET'), {
      issuer: 'yourshikshak-api',
      audience: 'yourshikshak-users',
    }) as Partial<JwtPayload>;
    if (decoded && decoded.userId) {
      return { userId: decoded.userId };
    }
    return null;
  } catch (error) {
    if (
      error instanceof JsonWebTokenError ||
      error instanceof TokenExpiredError ||
      error instanceof NotBeforeError
    ) {
      return null;
    }
    return null;
  }
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.decode(token) as JwtPayload | null;
    return decoded || null;
  } catch (_e) {
    return null;
  }
}

export default {
  generateAccessToken,
  generateRefreshToken,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
};


