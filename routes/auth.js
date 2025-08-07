const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const emailService = require('../services/emailService');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

// STEP 1: Initial Registration (sends OTP)
router.post('/register', async (req, res) => {
  try {
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
      } else {
        // User exists but not verified, update and resend OTP
        const now = new Date();
        const timeSinceLastOtp = existingUser.lastOtpSent ? 
          (now - existingUser.lastOtpSent) / 1000 : Infinity;

        // Rate limiting: Allow new OTP only after 1 minute
        if (timeSinceLastOtp < 60) {
          return res.status(429).json({
            message: 'Please wait before requesting a new OTP',
            waitTime: Math.ceil(60 - timeSinceLastOtp)
          });
        }

        const otp = emailService.generateOTP();
        const otpExpiry = new Date(Date.now() + (process.env.OTP_EXPIRY || 10) * 60 * 1000);

        existingUser.emailOTP = otp;
        existingUser.otpExpiry = otpExpiry;
        existingUser.lastOtpSent = now;
        existingUser.registrationAttempts += 1;

        // Update password if provided
        if (password !== existingUser.password) {
          existingUser.password = password;
        }

        await existingUser.save();

        // Send OTP
        const emailResult = await emailService.sendOTP(email, otp, username);
        if (!emailResult.success) {
          return res.status(500).json({
            message: 'Failed to send OTP email',
            error: emailResult.error
          });
        }

        return res.status(200).json({
          message: 'OTP sent to your email. Please verify to complete registration.',
          userId: existingUser._id,
          otpExpiry: otpExpiry
        });
      }
    }

    // Create new user
    const otp = emailService.generateOTP();
    const otpExpiry = new Date(Date.now() + (process.env.OTP_EXPIRY || 10) * 60 * 1000);

    const user = new User({ 
      username, 
      email, 
      password,
      emailOTP: otp,
      otpExpiry: otpExpiry,
      lastOtpSent: new Date(),
      registrationAttempts: 1
    });

    await user.save();

    // Send OTP email
    const emailResult = await emailService.sendOTP(email, otp, username);
    if (!emailResult.success) {
      // Delete user if email failed
      await User.findByIdAndDelete(user._id);
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
    res.status(500).json({ 
      message: 'Server error during registration', 
      error: error.message 
    });
  }
});

// STEP 2: Verify OTP and Complete Registration
router.post('/verify-otp', async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ 
        message: 'User ID and OTP are required' 
      });
    }

    // Find user
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

    // Send welcome email
    await emailService.sendWelcomeEmail(user.email, user.username);

    // Generate token
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
    res.status(500).json({ 
      message: 'Server error during OTP verification', 
      error: error.message 
    });
  }
});

// Resend OTP
router.post('/resend-otp', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        message: 'User ID is required' 
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

    // Rate limiting
    const now = new Date();
    const timeSinceLastOtp = user.lastOtpSent ? 
      (now - user.lastOtpSent) / 1000 : Infinity;

    if (timeSinceLastOtp < 60) {
      return res.status(429).json({
        message: 'Please wait before requesting a new OTP',
        waitTime: Math.ceil(60 - timeSinceLastOtp)
      });
    }

    // Generate and send new OTP
    const otp = emailService.generateOTP();
    const otpExpiry = new Date(Date.now() + (process.env.OTP_EXPIRY || 10) * 60 * 1000);

    user.emailOTP = otp;
    user.otpExpiry = otpExpiry;
    user.lastOtpSent = now;
    user.registrationAttempts += 1;

    await user.save();

    const emailResult = await emailService.sendOTP(user.email, otp, user.username);
    if (!emailResult.success) {
      return res.status(500).json({
        message: 'Failed to send OTP email',
        error: emailResult.error
      });
    }

    res.status(200).json({
      message: 'New OTP sent to your email',
      otpExpiry: otpExpiry
    });

  } catch (error) {
    res.status(500).json({ 
      message: 'Server error during OTP resend', 
      error: error.message 
    });
  }
});

// Updated Login route (only verified users can login)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(400).json({ 
        message: 'Please verify your email before logging in',
        userId: user._id,
        requiresVerification: true
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
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
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user profile (protected route)
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

module.exports = router;