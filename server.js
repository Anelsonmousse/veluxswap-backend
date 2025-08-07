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

// Basic route (test this first)
app.get('/', (req, res) => {
  res.json({ 
    message: 'VeluxSwap Auth API with Email OTP is running!',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    features: [
      'User Registration with Email OTP',
      'Email Verification',
      'Secure Login',
      'JWT Authentication'
    ]
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Connect to MongoDB first
console.log('🔗 Connecting to MongoDB...');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    
    // Load routes only after MongoDB connection is established
    try {
      console.log('📁 Loading authentication routes...');
      const authRoutes = require('./routes/auth');
      app.use('/api/auth', authRoutes);
      console.log('✅ Authentication routes loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load auth routes:', error.message);
      console.error('Stack:', error.stack);
    }
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  });

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('💥 Unhandled Error:', error);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'Route not found',
    path: req.originalUrl
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🎉 Server running on port ${PORT}`);
  console.log(`📧 Email user: ${process.env.EMAIL_USER || 'Not configured'}`);
  console.log(`🗄️ MongoDB URI: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'Not configured'}`);
});