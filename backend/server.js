// Load environment variables FIRST, before any module that reads process.env
// at import time (e.g. the logger reads NODE_ENV / LOG_LEVEL on require).
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const logger = require('./utils/logger');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');
const { startScheduler } = require('./services/report/scheduler');
const { seedDefaults: seedPermissions } = require('./services/permissionService');
const { seedDefaults: seedEmailEvents } = require('./services/emailEvents');

connectDB();

const app = express();

// Behind a managed reverse proxy (Azure App Service, Nginx): trust the first
// hop so X-Forwarded-For is read correctly and rate limiting keys on the real
// client IP instead of the proxy.
app.set('trust proxy', 1);

// Security & parsing
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:80'],
    credentials: true,
  })
);
app.use(express.json());

// HTTP request logging → Winston (skip the noisy health endpoint)
app.use(
  morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    stream: logger.stream,
    skip: (req) => req.url === '/api/health',
  })
);

// Health check (no auth, no rate limit)
const startTime = Date.now();
app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  const mongoStates = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  const mongoStatus = mongoStates[mongoose.connection.readyState] || 'unknown';
  let aiStatus = 'unknown';
  try {
    const http = require('http');
    const aiUrl = process.env.AI_MODULE_URL || 'http://localhost:8001';
    await new Promise((resolve) => {
      const r = http.get(`${aiUrl}/`, { timeout: 3000 }, (resp) => {
        aiStatus = resp.statusCode === 200 ? 'reachable' : 'error';
        resp.resume();
        resolve();
      });
      r.on('error', () => {
        aiStatus = 'unreachable';
        resolve();
      });
      r.on('timeout', () => {
        r.destroy();
        aiStatus = 'timeout';
        resolve();
      });
    });
  } catch {
    aiStatus = 'unreachable';
  }
  res.json({
    status: mongoStatus === 'connected' ? 'healthy' : 'degraded',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    mongo: mongoStatus,
    aiModule: aiStatus,
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// Rate limiting
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/invoices', require('./routes/invoiceRoutes'));
app.use('/api/loans', require('./routes/loanRoutes'));
app.use('/api/assets', require('./routes/assetRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/presets', require('./routes/presetRoutes'));
app.use('/api/activity', require('./routes/activityRoutes'));
app.use('/api/forecast', require('./routes/forecastRoutes'));
app.use('/api/export', require('./routes/reportRoutes'));
app.use('/api/approvals', require('./routes/approvalRoutes'));
app.use('/api/rules', require('./routes/ruleRoutes'));
app.use('/api/dev', require('./routes/devRoutes'));
app.use('/api/verify', require('./routes/verifyRoutes')); // public — no auth
app.use('/api/audit', require('./routes/auditRoutes'));
app.use('/api/risk-memos', require('./routes/riskMemoRoutes'));
app.use('/api/investigations', require('./routes/investigationRoutes'));
app.use('/api/permissions', require('./routes/permissionRoutes'));
app.use('/api/email-events', require('./routes/emailEventRoutes'));

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, { env: process.env.NODE_ENV || 'development' });
  startScheduler();
  // Seed default permissions on first boot (idempotent — only inserts missing)
  seedPermissions().catch((e) => logger.error('[permissions] seed failed', { err: e.message }));
  seedEmailEvents().catch((e) => logger.error('[email-events] seed failed', { err: e.message }));
});

// Surface crashes through the logger instead of dying silently.
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : reason,
  });
});
process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { err: err.message, stack: err.stack });
});
