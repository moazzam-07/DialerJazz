import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { requireAuth, AuthenticatedRequest } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

import settingsRouter from './routes/settings.js';
import campaignsRouter from './routes/campaigns.js';
import leadsRouter from './routes/leads.js';
import statsRouter from './routes/stats.js';
import callsRouter from './routes/calls.js';
import telnyxRouter from './routes/telnyx.js';
import twilioRouter from './routes/twilio.js';

// In dev, load .env from parent dir. In production (Docker), env vars are injected.
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '../.env' });
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175'
].filter(Boolean) as string[];

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  },
});

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Protected Route Example
app.get('/api/me', requireAuth, (req: AuthenticatedRequest, res, next) => {
  try {
    res.json({
      message: 'Authentication successful',
      user: req.user,
    });
  } catch(err) {
    next(err);
  }
});

// ─── Rate Limiting ─────────────────────────────────────────
// General: 100 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Too many requests. Please try again later.' } },
});

// Strict: 10 requests per minute for expensive operations
const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Too many requests for this endpoint.' } },
});

app.use('/api', apiLimiter);

// API Routes
app.use('/api/settings', settingsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/calls', callsRouter);
app.use('/api/telnyx/token', strictLimiter);  // Extra protection on token generation
app.use('/api/telnyx', telnyxRouter);
app.use('/api/twilio/token', strictLimiter);  // Extra protection on token generation
app.use('/api/twilio', twilioRouter);

// ─── Production: Serve Vite client as static files ─────────
if (process.env.NODE_ENV === 'production') {
  // In Docker, client/dist is at ../../client/dist relative to server/dist/index.js
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(express.static(clientDist));

  // SPA catch-all: any non-API route returns index.html
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Centralized Error handler (must be last middleware)
app.use(errorHandler);

// Socket.io connection
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Jazz Caller API running on http://localhost:${PORT}`);
  });
}

export { app, io };
