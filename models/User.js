const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  // New OTP fields
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailOTP: {
    type: String,
    default: null
  },
  otpExpiry: {
    type: Date,
    default: null
  },
  // Track registration attempts
  registrationAttempts: {
    type: Number,
    default: 0
  },
  lastOtpSent: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

// Check if OTP is valid
userSchema.methods.isOTPValid = function(otp) {
  return this.emailOTP === otp && this.otpExpiry > new Date();
};

// Clear OTP data
userSchema.methods.clearOTP = function() {
  this.emailOTP = null;
  this.otpExpiry = null;
  this.isEmailVerified = true;
};

module.exports = mongoose.model('User', userSchema);