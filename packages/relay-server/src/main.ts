import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { config } from './config.js';
import { authMiddleware } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { wsService } from './services/ws.service.js';
import authRoutes from './routes/auth.routes.js';
import tasksRoutes from './routes/tasks.routes.js';

const app = express();
const server = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Health check (no auth required)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes (auth required)
app.use('/api/v1/auth', authMiddleware, authRoutes);
app.use('/api/v1/tasks', authMiddleware, tasksRoutes);

// Error handler
app.use(errorHandler);

// Initialize WebSocket
wsService.init(server);

// Start server
server.listen(config.port, config.host, () => {
  console.log(`Merge relay server running on http://${config.host}:${config.port}`);
  console.log(`WebSocket available at ws://${config.host}:${config.port}/ws`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  wsService.destroy();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  wsService.destroy();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
