import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import scenariosRouter from './routes/scenarios.js';
import sessionsRouter from './routes/sessions.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/scenarios', scenariosRouter);
app.use('/api/sessions', sessionsRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('[App Error]:', err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

export default app;
