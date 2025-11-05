import dotenv from 'dotenv';
import app from './app';
import connectDB, { disconnectDB } from './config/database';
import { verifyEmailConnection } from './config/email';
import logger from './config/logger';

dotenv.config();

const PORT = parseInt(process.env.PORT || '5000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

let server: ReturnType<typeof app.listen>;

async function startServer(): Promise<void> {
  try {
    await connectDB();
    logger.info('✅ Database connected successfully');

    // Verify email connection (non-blocking)
    try {
      await verifyEmailConnection();
    } catch (error) {
      logger.warn('⚠️ Email service not configured (notifications will be in-app only)');
    }

    server = app.listen(PORT, () => {
      const timestamp = new Date().toISOString();
      logger.info('🚀 Server running', { port: PORT, environment: NODE_ENV, timestamp });
    });
  } catch (error) {
    logger.error('❌ Failed to start server', { error: (error as any)?.message, stack: (error as any)?.stack });
    process.exit(1);
  }
}

void startServer();

// Unhandled promise rejections
process.on('unhandledRejection', async (reason: unknown) => {
  logger.error('UNHANDLED REJECTION', { reason });
  try {
    await disconnectDB();
  } finally {
    server?.close(() => process.exit(1));
  }
});

// Uncaught exceptions
process.on('uncaughtException', async (error: Error) => {
  logger.error('UNCAUGHT EXCEPTION', { error: error.message, stack: error.stack });
  try {
    await disconnectDB();
  } finally {
    process.exit(1);
  }
});

// Graceful shutdown on SIGTERM
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  try {
    await disconnectDB();
  } finally {
    server?.close(() => process.exit(0));
  }
});

// Database connection is established during startup via connectDB()

let exportedServer: typeof server | undefined = undefined;

// Export `exportedServer` so that it's undefined until assigned later.
// This avoids "used before assigned" lint and helps TypeScript with its checks.
export default exportedServer;

