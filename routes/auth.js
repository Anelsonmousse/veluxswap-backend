const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

console.log('🔧 Starting to load auth routes...');

const router = express.Router();

// Test route to verify routes are working
router.get('/', (req, res) => {
  console.log('Auth root route accessed');
  res.json({
    message: 'Auth routes are working!',
    availableRoutes: [
      'GET /',
      'GET /test',
      'POST /register',
      'POST /verify-otp', 
      'POST /resend-otp',
      'POST /resend-otp-email',
      'POST /login',
      'GET /profile'
    ],
    timestamp: new Date().toISOString()
  });
});

router.get('/test', (req, res) => {
  console.log('Auth test route accessed');
  res.json({
    message: 'Auth test route works!',
    timestamp: new Date().toISOString()
  });
});

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// Load email service with error handling
let emailService = null;
try {
  console.log('📧 Loading email service...');
  emailService = require('../services/emailService');
  console.log('✅ Email service loaded');
} catch (error) {
  console.error('❌ Failed to load email service:', error.message);
}

// REGISTRATION
router.post('/register', async (req, res) => {
  try {
    console.log('Registration attempt for:', req.body.email);
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ 
        message: 'Username, email, and password are required' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        message: 'Password must be at least 6 characters' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingUser) {
      if (existingUser.isEmailVerified) {
        return res.status(400).json({ 
          message: 'User with this email or username already exists' 
        });
      }
    }

    // If emailService is not available, create user without OTP verification
    if (!emailService) {
      console.warn('⚠️ Email service not available, creating user without OTP');
      
      const user = new User({ 
        username, 
        email, 
        password,
        isEmailVerified: true // Skip verification if no email service
      });

      await user.save();
      const token = generateToken(user._id);

      return res.status(201).json({
        message: 'User created successfully (Email verification skipped - email service unavailable)',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isEmailVerified: user.isEmailVerified
        }
      });
    }

    // Create user with OTP
    const otp = emailService.generateOTP();
    const otpExpiry = new Date(Date.now() + (process.env.OTP_EXPIRY || 10) * 60 * 1000);

    let user;
    if (existingUser && !existingUser.isEmailVerified) {
      // Update existing unverified user
      existingUser.emailOTP = otp;
      existingUser.otpExpiry = otpExpiry;
      existingUser.lastOtpSent = new Date();
      existingUser.registrationAttempts = (existingUser.registrationAttempts || 0) + 1;
      if (password) existingUser.password = password; // Update password if provided
      await existingUser.save();
      user = existingUser;
    } else {
      // Create new user
      user = new User({ 
        username, 
        email, 
        password,
        emailOTP: otp,
        otpExpiry: otpExpiry,
        lastOtpSent: new Date(),
        registrationAttempts: 1
      });
      await user.save();
    }

    // Send OTP email
    const emailResult = await emailService.sendOTP(email, otp, username);
    if (!emailResult.success) {
      console.error('Email sending failed:', emailResult.error);
      return res.status(500).json({
        message: 'Failed to send OTP email. Please try again.',
        error: emailResult.error
      });
    }

    res.status(201).json({
      message: 'Registration initiated. Please check your email for OTP.',
      userId: user._id,
      otpExpiry: otpExpiry
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Server error during registration', 
      error: error.message 
    });
  }
});

// VERIFY OTP
router.post('/verify-otp', async (req, res) => {
  try {
    console.log('OTP verification attempt');
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ 
        message: 'User ID and OTP are required' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found' 
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ 
        message: 'Email already verified' 
      });
    }

    // Check if OTP is valid
    if (!user.isOTPValid(otp)) {
      return res.status(400).json({ 
        message: 'Invalid or expired OTP' 
      });
    }

    // Verify user
    user.clearOTP();
    await user.save();

    // Send welcome email if service available
    if (emailService) {
      await emailService.sendWelcomeEmail(user.email, user.username);
    }

    const token = generateToken(user._id);

    res.status(200).json({
      message: 'Email verified successfully! Registration complete.',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified
      }
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ 
      message: 'Server error during OTP verification', 
      error: error.message 
    });
  }
});

// RESEND OTP (using email)
router.post('/resend-otp-email', async (req, res) => {
  try {
    console.log('Resend OTP via email attempt');
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        message: 'Email address is required' 
      });
    }

    if (!emailService) {
      return res.status(500).json({
        message: 'Email service not available'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(200).json({ 
        message: 'If an account with this email exists and is not verified, an OTP has been sent.',
        success: true
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ 
        message: 'This email is already verified. Please login instead.',
        isVerified: true
      });
    }

    // Generate new OTP
    const otp = emailService.generateOTP();
    const otpExpiry = new Date(Date.now() + (process.env.OTP_EXPIRY || 10) * 60 * 1000);

    user.emailOTP = otp;
    user.otpExpiry = otpExpiry;
    user.lastOtpSent = new Date();
    user.registrationAttempts = (user.registrationAttempts || 0) + 1;

    await user.save();

    const emailResult = await emailService.sendOTP(user.email, otp, user.username);
    if (!emailResult.success) {
      return res.status(500).json({
        message: 'Failed to send OTP email. Please try again later.',
        error: emailResult.error
      });
    }

    res.status(200).json({
      message: 'OTP sent successfully to your email address',
      success: true,
      otpExpiry: otpExpiry,
      userId: user._id
    });

  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ 
      message: 'Server error during OTP resend. Please try again later.',
      error: error.message
    });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    console.log('Login attempt for:', req.body.email);
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if email is verified (only if email service is available)
    if (emailService && !user.isEmailVerified) {
      return res.status(400).json({ 
        message: 'Please verify your email before logging in',
        userId: user._id,
        requiresVerification: true
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        isEmailVerified: user.isEmailVerified
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PROFILE
router.get('/profile', auth, async (req, res) => {
  res.json({
    user: {
      id: req.user._id,
      username: req.user.username,
      email: req.user.email,
      isEmailVerified: req.user.isEmailVerified
    }
  });
});

console.log('✅ Auth routes defined successfully');

module.exports = router;