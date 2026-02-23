const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST,
  port:   parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ════════════════════════════════════════
// Send OTP Email — used for both
// email signup verification and google verify
// ════════════════════════════════════════
const sendOTPEmail = async (email, name, otp, purpose) => {
  const purposeText = {
    email_verify:  'verify your email address',
    google_verify: 'verify your Google account',
    forgot:        'reset your password',
  }[purpose] || 'verify your account';

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      email,
    subject: `AutoSilence — Your verification code is ${otp}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
                  background: #f8f9fb; padding: 32px; border-radius: 16px;">

        <!-- Header -->
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #06b6d4);
                      padding: 16px 20px; border-radius: 16px; font-size: 28px;">
            🔕
          </div>
          <h2 style="color: #0f172a; margin: 12px 0 4px;">AutoSilence</h2>
        </div>

        <p style="color: #0f172a; font-size: 16px; margin-bottom: 6px;">
          Hi <strong>${name}</strong>,
        </p>
        <p style="color: #64748b; margin-bottom: 28px;">
          Use the code below to ${purposeText}. This code expires in <strong>10 minutes</strong>.
        </p>

        <!-- OTP Box -->
        <div style="background: #ffffff; border: 2px solid #e2e8f0;
                    border-radius: 16px; padding: 32px; text-align: center;
                    margin-bottom: 24px;">
          <p style="color: #64748b; font-size: 13px; margin: 0 0 12px;">
            Your verification code
          </p>
          <div style="font-size: 42px; font-weight: 800; letter-spacing: 12px;
                      color: #1d4ed8; font-family: monospace;">
            ${otp}
          </div>
          <p style="color: #94a3b8; font-size: 11px; margin: 16px 0 0;">
            Expires in 10 minutes
          </p>
        </div>

        <p style="color: #94a3b8; font-size: 12px; text-align: center;">
          If you didn't request this, please ignore this email.<br/>
          Never share this code with anyone.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #cbd5e1; font-size: 11px; text-align: center; margin: 0;">
          AutoSilence · Your smart silence scheduler
        </p>
      </div>
    `,
  });
};

// ════════════════════════════════════════
// Send Password Reset Email (link based)
// ════════════════════════════════════════
const sendPasswordResetEmail = async (email, name, resetToken) => {
  const webUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM,
    to:      email,
    subject: 'AutoSilence — Reset Your Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
                  background: #f8f9fb; padding: 32px; border-radius: 16px;">
        <h2 style="color: #0f172a;">Reset Your Password</h2>
        <p style="color: #64748b;">Hi ${name}, click the button below to reset your password.</p>
        <a href="${webUrl}"
           style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #06b6d4);
                  color: white; padding: 14px 28px; border-radius: 12px;
                  text-decoration: none; font-weight: bold; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #94a3b8; font-size: 12px;">
          This link expires in 10 minutes. If you didn't request this, ignore this email.
        </p>
      </div>
    `,
  });
};

module.exports = { sendOTPEmail, sendPasswordResetEmail };
