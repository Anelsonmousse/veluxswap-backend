const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

console.log('🚀 Starting VeluxSwap Backend...');

const app = express();

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`📍 Incoming request: ${req.method} ${req.originalUrl}`);
  next();
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Basic route
app.get('/', (req, res) => {
  console.log('📍 Root route hit');
  res.json({ 
    message: 'VeluxSwap Auth API with Email OTP is running!',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Test route to check if Express is working
app.get('/test-express', (req, res) => {
  console.log('📍 Express test route hit');
  res.json({ message: 'Express is working!' });
});

// Connect to MongoDB
console.log('🔗 Connecting to MongoDB...');
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    
    // Load routes AFTER MongoDB connection
    console.log('📁 Loading authentication routes...');
    
    try {
      // Try to require the auth routes
      const authRoutes = require('./routes/auth');
      console.log('📍 Auth routes required successfully, type:', typeof authRoutes);
      
      // Check if it's a valid router
      if (typeof authRoutes === 'function') {
        // Add debugging middleware before mounting auth routes
        app.use('/api/auth', (req, res, next) => {
          console.log(`📍 Auth middleware hit: ${req.method} ${req.originalUrl}`);
          console.log('📍 About to pass to auth router...');
          next();
        });
        
        app.use('/api/auth', authRoutes);
        console.log('✅ Auth routes mounted to /api/auth');
        
        // List all registered routes for debugging
        app._router.stack.forEach((middleware, index) => {
          if (middleware.route) {
            console.log(`📍 Route ${index}: ${Object.keys(middleware.route.methods)} ${middleware.route.path}`);
          } else if (middleware.name === 'router') {
            console.log(`📍 Router middleware ${index} mounted at: ${middleware.regexp}`);
          } else {
            console.log(`📍 Middleware ${index}: ${middleware.name || 'anonymous'}`);
          }
        });

        // Test auth routes after mounting
        setTimeout(() => {
          console.log('🧪 Testing internal route resolution...');
          
          // Try to manually resolve the route
          const testReq = { method: 'GET', url: '/api/auth/' };
          console.log('📍 Would route match for:', testReq);
        }, 1000);
        
      } else {
        console.error('❌ Auth routes is not a function:', typeof authRoutes);
      }
    } catch (error) {
      console.error('❌ Failed to load auth routes:');
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  });

// Add catch-all middleware before 404 handler
app.use('/api/auth/*', (req, res, next) => {
  console.log(`📍 Catch-all for /api/auth/*: ${req.method} ${req.originalUrl}`);
  console.log('📍 This should not be reached if routes are working');
  next();
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('💥 Unhandled Error:', error);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler with more details
app.use('*', (req, res) => {
  console.log(`❌ 404 Handler: ${req.method} ${req.originalUrl}`);
  
  // List all available routes
  const routes = [];
  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      routes.push(`${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`);
    } else if (middleware.name === 'router') {
      routes.push(`ROUTER ${middleware.regexp}`);
    }
  });
  
  res.status(404).json({ 
    message: 'Route not found',
    method: req.method,
    path: req.originalUrl,
    availableRoutes: routes,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🎉 Server running on port ${PORT}`);
  console.log(`📧 Email user: ${process.env.EMAIL_USER || 'Not configured'}`);
  console.log(`🗄️ MongoDB URI: ${process.env.MONGODB_URI ? 'Configured' : 'Not configured'}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'Configured' : 'Not configured'}`);
  
  // List final route configuration
  setTimeout(() => {
    console.log('📍 Final route configuration:');
    let routeCount = 0;
    app._router.stack.forEach((middleware, index) => {
      if (middleware.route) {
        console.log(`  Route ${routeCount++}: ${Object.keys(middleware.route.methods).join(',').toUpperCase()} ${middleware.route.path}`);
      } else if (middleware.name === 'router') {
        console.log(`  Router: ${middleware.regexp}`);
      }
    });
  }, 2000);
});