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
import attendanceRoutes from './routes/attendanceRoutes';
import assignmentRoutes from './routes/assignmentRoutes';
import gradeRoutes from './routes/gradeRoutes';
import scheduleRoutes from './routes/scheduleRoutes';
import notificationRoutes from './routes/notificationRoutes';
import reportRoutes from './routes/reportRoutes';
import adminRoutes from './routes/adminRoutes';
import managerRoutes from './routes/managerRoutes';
import coordinatorRoutes from './routes/coordinatorRoutes';
import studentRoutes from './routes/studentRoutes';
import passport from 'passport';
import { initializePassport } from './config/passport';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import logger, { stream as morganStream } from './config/logger';
import errorHandler, { notFoundHandler } from './middlewares/errorHandler';

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

// HTTP request logger
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: morganStream as any }));
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

// Swagger API Documentation
// Access at: http://localhost:5000/api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

// Serve OpenAPI JSON spec
app.get('/api-docs.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Import routes here (authRoutes, courseRoutes, etc.)
app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/classes`, finalClassRoutes);
app.use(`/api/${apiVersion}/leads`, leadRoutes);
app.use(`/api/${apiVersion}/courses`, courseRoutes);
app.use(`/api/${apiVersion}/classes-sessions`, classRoutes);
app.use(`/api/${apiVersion}/attendance`, attendanceRoutes);
app.use(`/api/${apiVersion}/assignments`, assignmentRoutes);
app.use(`/api/${apiVersion}/grades`, gradeRoutes);
app.use(`/api/${apiVersion}/schedules`, scheduleRoutes);
app.use(`/api/${apiVersion}/notifications`, notificationRoutes);
app.use(`/api/${apiVersion}/reports`, reportRoutes);
app.use(`/api/${apiVersion}/admin`, adminRoutes);
app.use(`/api/${apiVersion}/manager`, managerRoutes);
app.use(`/api/${apiVersion}/coordinator`, coordinatorRoutes);
app.use(`/api/${apiVersion}/student`, studentRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware
app.use(errorHandler);

export default app;


