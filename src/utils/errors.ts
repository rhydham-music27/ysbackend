/* eslint-disable max-classes-per-file */
// Custom error hierarchy for semantic, type-safe error handling

export abstract class AppError extends Error {
  public statusCode: number;

  public isOperational: boolean;

  public code?: string;

  constructor(message: string, statusCode: number, isOperational: boolean = true, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.name = new.target.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);
    }
  }
}

export class ValidationError extends AppError {
  public errors?: Array<{ field: string; message: string }>;

  constructor(message: string = 'Validation failed', errors?: Array<{ field: string; message: string }>) {
    super(message, 400, true, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, true, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied. Insufficient permissions.') {
    super(message, 403, true, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', message?: string) {
    super(message || `${resource} not found`, 404, true, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, true, 'CONFLICT_ERROR');
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400, true, 'BAD_REQUEST');
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', isOperational: boolean = false) {
    super(message, 500, isOperational, 'INTERNAL_SERVER_ERROR');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, true, 'SERVICE_UNAVAILABLE');
  }
}

export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}
