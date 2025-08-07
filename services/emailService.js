const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Generate 6-digit OTP
  generateOTP() {
    return crypto.randomInt(100000, 999999).toString();
  }

  // Send OTP email
  async sendOTP(email, otp, username) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Verify Your Email - Registration OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Email Verification</h1>
          </div>
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2 style="color: #333;">Hello ${username}!</h2>
            <p style="color: #666; line-height: 1.6;">
              Thank you for registering! Please use the following OTP to verify your email address:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: #667eea; color: white; font-size: 32px; font-weight: bold; padding: 15px 30px; border-radius: 8px; letter-spacing: 5px; display: inline-block;">
                ${otp}
              </div>
            </div>
            <p style="color: #666; line-height: 1.6;">
              This OTP will expire in ${process.env.OTP_EXPIRY || 10} minutes.
            </p>
            <p style="color: #999; font-size: 14px;">
              If you didn't request this, please ignore this email.
            </p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return { success: true };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Send welcome email after successful verification
  async sendWelcomeEmail(email, username) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Welcome to VeluxSwap!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Welcome to VeluxSwap!</h1>
          </div>
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2 style="color: #333;">Hello ${username}!</h2>
            <p style="color: #666; line-height: 1.6;">
              Your account has been successfully verified and created. You can now enjoy all the features of VeluxSwap!
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Start Using VeluxSwap
              </a>
            </div>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Welcome email failed:', error);
    }
  }
}

module.exports = new EmailService();