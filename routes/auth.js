console.log('🔧 Loading minimal auth routes...');

const express = require('express');
const router = express.Router();

console.log('📍 Router created');

// Simple test route
router.get('/', (req, res) => {
  console.log('📍 Root auth route hit');
  res.json({ message: 'Minimal auth routes working!' });
});

router.get('/test', (req, res) => {
  console.log('📍 Test auth route hit');
  res.json({ message: 'Test route working!' });
});

router.post('/resend-otp-email', (req, res) => {
  console.log('📍 Resend OTP route hit');
  res.json({ 
    message: 'Resend OTP route working!',
    body: req.body 
  });
});

console.log('✅ Minimal auth routes defined');

module.exports = router;