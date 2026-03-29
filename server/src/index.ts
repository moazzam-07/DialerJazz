import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { requireAuth, AuthenticatedRequest } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

import settingsRouter from './routes/settings.js';
import campaignsRouter from './routes/campaigns.js';
import leadsRouter from './routes/leads.js';
import statsRouter from './routes/stats.js';

dotenv.config({ path: '../.env' });

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
app.use(express.json());

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

// API Routes
app.use('/api/settings', settingsRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/stats', statsRouter);

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
httpServer.listen(PORT, () => {
  console.log(`🚀 Jazz Caller API running on http://localhost:${PORT}`);
});

export { app, io };
