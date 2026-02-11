const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize database
const db = require('./config/database');

// Import routes
const contactsRouter = require('./routes/contacts');
const groupsRouter = require('./routes/groups');
const eventsRouter = require('./routes/events');
const settingsRouter = require('./routes/settings');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  try {
    // Test database connection
    db.prepare('SELECT 1').get();
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// API Routes
app.use('/api/v1/contacts', contactsRouter);
app.use('/api/v1/groups', groupsRouter);
app.use('/api/v1/events', eventsRouter);
app.use('/api/v1/settings', settingsRouter);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`KontaktHub API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/v1/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  db.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  db.close();
  process.exit(0);
});
