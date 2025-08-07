const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

console.log('🚀 Starting VeluxSwap Backend...');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`📍 ${req.method} ${req.originalUrl}`);
  next();
});

// Basic routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'VeluxSwap Auth API is running!',
    timestamp: new Date().toISOString()
  });
});

// Load auth routes synchronously (not in MongoDB callback)
console.log('📁 Loading auth routes...');
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('✅ Auth routes loaded and mounted');
} catch (error) {
  console.error('❌ Failed to load auth routes:', error.message);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err.message));

// 404 handler (must be last)
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    method: req.method,
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🎉 Server running on port ${PORT}`);
});