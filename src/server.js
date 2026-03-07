require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const connectDB = require('./config/db');

const app = express();

// ── Connect MongoDB ──
connectDB();

// ── Middleware ──
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Increase limit for base64 image uploads
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// ── Routes ──
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/schedules', require('./routes/schedules'));
app.use('/api/user',      require('./routes/user'));
app.use('/api/stats',     require('./routes/stats'));

// ── Health check ──
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'AutoSilence API is running',
    version: '1.0.0',
    endpoints: {
      auth:      '/api/auth',
      schedules: '/api/schedules',
      user:      '/api/user',
    },
  });
});

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ── Global error handler ──
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error.' });
});

// ── Start server ──
const PORT = process.env.PORT || 5000;
app.listen(PORT,'0.0.0.0', () => {
  console.log(`🚀 AutoSilence API running on http://localhost:${PORT}`);
});
