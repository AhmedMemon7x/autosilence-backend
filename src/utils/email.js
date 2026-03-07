// Uses Brevo REST API directly — no SDK needed
const https = require('https');

const sendEmail = (to, toName, subject, htmlContent) => {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      sender:      { email: process.env.EMAIL_USER, name: 'AutoSilence' },
      to:          [{ email: to, name: toName }],
      subject,
      htmlContent,
    });

    const options = {
      hostname: 'api.brevo.com',
      path:     '/v3/smtp/email',
      method:   'POST',
      headers: {
        'accept':       'application/json',
        'content-type': 'application/json',
        'api-key':      process.env.BREVO_API_KEY,
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data);
        } else {
          reject(new Error(`Brevo error ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

// ════════════════════════════════════════
// Send OTP Email
// ════════════════════════════════════════
const sendOTPEmail = async (email, name, otp, purpose) => {
  const purposeText = {
    email_verify:  'verify your email address',
    google_verify: 'verify your Google account',
    forgot:        'reset your password',
  }[purpose] || 'verify your account';

  const subject = `AutoSilence — Your verification code is ${otp}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
                background: #f8f9fb; padding: 32px; border-radius: 16px;">

      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #0f172a; margin: 12px 0 4px;">AutoSilence</h2>
      </div>

      <p style="color: #0f172a; font-size: 16px; margin-bottom: 6px;">
        Hi <strong>${name}</strong>,
      </p>
      <p style="color: #64748b; margin-bottom: 28px;">
        Use the code below to ${purposeText}. This code expires in <strong>10 minutes</strong>.
      </p>

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
  `;

  await sendEmail(email, name, subject, htmlContent);
};

// ════════════════════════════════════════
// Send Password Reset Email
// ════════════════════════════════════════
const sendPasswordResetEmail = async (email, name, resetToken) => {
  const webUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  const subject = 'AutoSilence — Reset Your Password';
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
                background: #f8f9fb; padding: 32px; border-radius: 16px;">
      <h2 style="color: #0f172a;">Reset Your Password</h2>
      <p style="color: #64748b;">Hi ${name}, click the button below to reset your password.</p>
      <a href="${webUrl}"
         style="display: inline-block; background: #1d4ed8;
                color: white; padding: 14px 28px; border-radius: 12px;
                text-decoration: none; font-weight: bold; margin: 16px 0;">
        Reset Password
      </a>
      <p style="color: #94a3b8; font-size: 12px;">
        This link expires in 10 minutes. If you didn't request this, ignore this email.
      </p>
    </div>
  `;

  await sendEmail(email, name, subject, htmlContent);
};

module.exports = { sendOTPEmail, sendPasswordResetEmail };