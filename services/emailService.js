const nodemailer = require('nodemailer');
const crypto = require('crypto');

console.log('📧 Initializing Email Service...');
console.log('Email config check:', {
  user: process.env.EMAIL_USER || 'Not set',
  pass: process.env.EMAIL_PASS ? 'Set' : 'Not set',
  from: process.env.EMAIL_FROM || 'Not set'
});

class EmailService {
  constructor() {
    try {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      console.log('✅ Email transporter created successfully');
    } catch (error) {
      console.error('❌ Failed to create email transporter:', error.message);
      throw error;
    }
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
      subject: 'Verify Your Email - VeluxSwap Registration OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Email Verification</h1>
          </div>
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2 style="color: #333;">Hello ${username}!</h2>
            <p style="color: #666; line-height: 1.6;">
              Thank you for registering with VeluxSwap! Please use the following OTP to verify your email address:
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
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated email from VeluxSwap. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    };

    try {
      console.log(`📧 Sending OTP email to ${email}...`);
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ OTP email sent successfully to ${email}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Email sending failed to ${email}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  // Send welcome email after successful verification
  async sendWelcomeEmail(email, username) {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'Welcome to VeluxSwap! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">Welcome to VeluxSwap! 🎉</h1>
          </div>
          <div style="padding: 30px; background-color: #f9f9f9;">
            <h2 style="color: #333;">Hello ${username}!</h2>
            <p style="color: #666; line-height: 1.6;">
              🎉 Congratulations! Your account has been successfully verified and created. 
              You can now enjoy all the features of VeluxSwap!
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="#" style="background: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Start Using VeluxSwap
              </a>
            </div>
            <div style="background: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #333; margin-top: 0;">What's next?</h3>
              <ul style="color: #666; line-height: 1.6;">
                <li>Complete your profile</li>
                <li>Explore our features</li>
                <li>Connect with other users</li>
                <li>Start swapping!</li>
              </ul>
            </div>
            <p style="color: #666; line-height: 1.6;">
              If you have any questions, feel free to contact our support team.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated email from VeluxSwap. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    };

    try {
      console.log(`📧 Sending welcome email to ${email}...`);
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Welcome email sent successfully to ${email}`);
    } catch (error) {
      console.error(`❌ Welcome email failed to ${email}:`, error.message);
      // Don't throw error for welcome email failures
    }
  }

  // Test email connection
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return { success: true };
    } catch (error) {
      console.error('❌ Email service connection failed:', error.message);
      return { success: false, error: error.message };
    }
  }
}

console.log('✅ Email Service class defined');

module.exports = new EmailService();