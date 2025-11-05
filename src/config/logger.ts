import path from 'path';
import fs from 'fs';
import winston from 'winston';

const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_LEVEL = process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug');
const LOG_DIR = process.env.LOG_DIR
  ? path.isAbsolute(process.env.LOG_DIR)
    ? process.env.LOG_DIR
    : path.join(process.cwd(), process.env.LOG_DIR)
  : path.join(process.cwd(), 'logs');
const LOG_MAX_SIZE = parseInt(process.env.LOG_MAX_SIZE || '5242880', 10); // 5MB
const LOG_MAX_FILES = parseInt(process.env.LOG_MAX_FILES || '10', 10);
const ENABLE_FILE_LOGGING = String(process.env.ENABLE_FILE_LOGGING ?? 'true').toLowerCase() === 'true';

// Ensure log directory exists
if (ENABLE_FILE_LOGGING && !fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Formats
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf((info) => {
    const msg = typeof info.message === 'string' ? info.message : JSON.stringify(info.message);
    const stack = (info as any).stack ? `\n${(info as any).stack}` : '';
    const meta = info && Object.keys(info).length > 0 ? ` ${JSON.stringify({ ...info, level: undefined, message: undefined })}` : '';
    return `${info.timestamp} ${info.level}: ${msg}${meta}${stack}`;
  })
);

// Transports
const transports: winston.transport[] = [];

// Console transport in non-production (or if explicitly allowed)
if (NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: consoleFormat,
      silent: NODE_ENV === 'test',
    })
  );
}

if (ENABLE_FILE_LOGGING) {
  transports.push(
    new winston.transports.File({
      level: 'error',
      filename: path.join(LOG_DIR, 'error.log'),
      format: jsonFormat,
      maxsize: LOG_MAX_SIZE,
      maxFiles: Math.max(1, Math.min(LOG_MAX_FILES, 100)),
      tailable: true,
    })
  );

  transports.push(
    new winston.transports.File({
      level: 'info',
      filename: path.join(LOG_DIR, 'combined.log'),
      format: jsonFormat,
      maxsize: LOG_MAX_SIZE,
      maxFiles: LOG_MAX_FILES,
      tailable: true,
    })
  );

  transports.push(
    new winston.transports.File({
      level: 'http',
      filename: path.join(LOG_DIR, 'http.log'),
      format: jsonFormat,
      maxsize: LOG_MAX_SIZE,
      maxFiles: Math.min(LOG_MAX_FILES, 5),
      tailable: true,
    })
  );
}

const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: jsonFormat,
  transports,
  exitOnError: false,
  silent: NODE_ENV === 'test',
});

// Morgan stream integration
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

// Helper methods
export function logError(error: Error, context?: Record<string, any>) {
  logger.error(error.message, { ...context, stack: (error as any).stack });
}

export default logger;
