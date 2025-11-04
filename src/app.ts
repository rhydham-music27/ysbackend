import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import finalClassRoutes from './routes/finalClassRoutes';
import leadRoutes from './routes/leadRoutes';
import courseRoutes from './routes/courseRoutes';
import classRoutes from './routes/classRoutes';
import passport from 'passport';
import { initializePassport } from './config/passport';

dotenv.config();

const app = express();

// Security headers
app.use(helmet());

// CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  })
);

// HTTP request logger (development only)
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Passport (stateless JWT auth) - No passport.session()
initializePassport();
app.use(passport.initialize());

// Health check routes
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

const apiVersion = process.env.API_VERSION || 'v1';
app.get(`/api/${apiVersion}/health`, (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', version: apiVersion, timestamp: new Date() });
});

// Import routes here (authRoutes, courseRoutes, etc.)
app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/classes`, finalClassRoutes);
app.use(`/api/${apiVersion}/leads`, leadRoutes);
app.use(`/api/${apiVersion}/courses`, courseRoutes);
app.use(`/api/${apiVersion}/classes-sessions`, classRoutes);
// Future routes: attendance, assignments, grades, schedules, etc.

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handling middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const response: Record<string, unknown> = {
    success: false,
    message: err.message || 'Internal Server Error',
  };

  if (process.env.NODE_ENV !== 'production') {
    response.stack = err.stack;
  }

  if (process.env.NODE_ENV !== 'production') {
    // Basic logging in development
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(statusCode).json(response);
});

export default app;


