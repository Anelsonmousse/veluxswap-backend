console.log('🔧 Starting ultra debug auth routes...');

try {
  console.log('📍 Step 1: Requiring express...');
  const express = require('express');
  console.log('✅ Express required successfully');

  console.log('📍 Step 2: Creating router...');
  const router = express.Router();
  console.log('✅ Router created successfully, type:', typeof router);

  console.log('📍 Step 3: Defining routes...');

  // Test route 1
  console.log('📍 Step 3a: Defining GET / route...');
  router.get('/', function(req, res) {
    console.log('📍 GET / route handler executed');
    res.json({ 
      message: 'Ultra debug auth routes working!',
      timestamp: new Date().toISOString()
    });
  });
  console.log('✅ GET / route defined');

  // Test route 2
  console.log('📍 Step 3b: Defining GET /test route...');
  router.get('/test', function(req, res) {
    console.log('📍 GET /test route handler executed');
    res.json({ 
      message: 'Test route working!',
      timestamp: new Date().toISOString()
    });
  });
  console.log('✅ GET /test route defined');

  // Test route 3
  console.log('📍 Step 3c: Defining POST /resend-otp-email route...');
  router.post('/resend-otp-email', function(req, res) {
    console.log('📍 POST /resend-otp-email route handler executed');
    res.json({ 
      message: 'Resend OTP route working!',
      body: req.body,
      timestamp: new Date().toISOString()
    });
  });
  console.log('✅ POST /resend-otp-email route defined');

  console.log('📍 Step 4: Checking router stack...');
  console.log('Router stack length:', router.stack ? router.stack.length : 'undefined');
  if (router.stack) {
    router.stack.forEach((layer, index) => {
      console.log(`Route ${index}:`, layer.route ? layer.route.path : 'middleware');
    });
  }

  console.log('✅ All routes defined successfully');

  console.log('📍 Step 5: Exporting router...');
  module.exports = router;
  console.log('✅ Router exported successfully');

} catch (error) {
  console.error('❌ Error in auth routes:');
  console.error('Error name:', error.name);
  console.error('Error message:', error.message);
  console.error('Error stack:', error.stack);
  
  // Export a basic router as fallback
  const express = require('express');
  const fallbackRouter = express.Router();
  
  fallbackRouter.get('/', (req, res) => {
    res.json({ message: 'Fallback router working', error: error.message });
  });
  
  module.exports = fallbackRouter;
}