import { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import logger, { logError } from '../config/logger';
import {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BadRequestError,
  InternalServerError,
  ServiceUnavailableError,
  isAppError,
} from '../utils/errors';

interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
  errors?: Array<{ field: string; message: string }>;
  stack?: string;
  timestamp: string;
  path: string;
  method: string;
}

function handleMongooseValidationError(err: any): ValidationError {
  const errorsArray = Object.values(err.errors || {}).map((e: any) => ({
    field: e?.path || 'unknown',
    message: e?.message || 'Invalid value',
  }));
  return new ValidationError('Validation failed', errorsArray);
}

function handleMongooseCastError(err: any): NotFoundError {
  const resource = err?.path || 'Resource';
  return new NotFoundError(resource, `Invalid ${resource} ID`);
}

function handleMongooseDuplicateKeyError(err: any): ConflictError {
  const key = err?.keyValue ? Object.keys(err.keyValue)[0] : 'resource';
  const message = `${key} already exists`;
  return new ConflictError(message);
}

function handleJWTError(err: any): AuthenticationError {
  if (err?.name === 'TokenExpiredError') return new AuthenticationError('Token expired');
  if (err?.name === 'NotBeforeError') return new AuthenticationError('Token not yet valid');
  return new AuthenticationError('Invalid token');
}

function handleMulterError(err: any): BadRequestError {
  if (err?.code === 'LIMIT_FILE_SIZE') return new BadRequestError('File size exceeds limit');
  if (err?.code === 'LIMIT_FILE_COUNT') return new BadRequestError('Too many files uploaded');
  if (err?.code === 'LIMIT_UNEXPECTED_FILE') return new BadRequestError('Unexpected file field');
  return new BadRequestError('File upload error');
}

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  const error = new NotFoundError('Route', `Route ${req.method} ${req.path} not found`);
  next(error);
}

export default function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  const method = req.method;
  const path = req.path;
  const ip = req.ip;
  const userId = (req as any)?.user?._id?.toString?.();

  let handledError: AppError;

  // Normalize known library errors
  if (err?.name === 'ValidationError' && err?.errors) {
    handledError = handleMongooseValidationError(err);
  } else if (err?.name === 'CastError') {
    handledError = handleMongooseCastError(err);
  } else if (err?.code === 11000) {
    handledError = handleMongooseDuplicateKeyError(err);
  } else if (['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(err?.name)) {
    handledError = handleJWTError(err);
  } else if (err?.name === 'MulterError' || err?.code?.startsWith?.('LIMIT_')) {
    handledError = handleMulterError(err);
  } else if (isAppError(err)) {
    handledError = err as AppError;
  } else {
    handledError = new InternalServerError(err?.message || 'Internal Server Error', false);
  }

  const statusCode = (handledError as any).statusCode || 500;
  const response: ErrorResponse = {
    success: false,
    message: handledError.message || 'Internal Server Error',
    code: (handledError as any).code,
    errors: (handledError as any).errors,
    stack: process.env.NODE_ENV !== 'production' ? handledError.stack : undefined,
    timestamp: new Date().toISOString(),
    path,
    method,
  };

  const context = { statusCode, path, method, ip, userId, isOperational: (handledError as any).isOperational === true };

  if ((handledError as any).isOperational === false) {
    // programming/unknown error
    logger.error(handledError.message, { ...context, stack: handledError.stack });
  } else {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    if (level === 'error') logger.error(handledError.message, context);
    else logger.warn(handledError.message, context);
  }

  res.status(statusCode).json(response);
}
