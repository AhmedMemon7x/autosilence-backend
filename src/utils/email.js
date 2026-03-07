const SibApiV3Sdk = require('@getbrevo/brevo');

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
apiInstance.setApiKey(
  SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

const sendOTPEmail = async (email, name, otp, purpose) => {
  const purposeText = {
    email_verify:  'verify your email address',
    google_verify: 'verify your Google account',
    forgot:        'reset your password',
  }[purpose] || 'verify your account';

  const sendSmtpEmail = {
    to:      [{ email, name }],
    sender:  { email: 'ahmedazeemmemon@gmail.com', name: 'AutoSilence' },
    subject: `AutoSilence — Your verification code is ${otp}`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
                  background: #f8f9fb; padding: 32px; border-radius: 16px;">
        <h2 style="color: #0f172a; text-align: center;">AutoSilence</h2>
        <p style="color: #0f172a; font-size: 16px;">Hi <strong>${name}</strong>,</p>
        <p style="color: #64748b; margin-bottom: 28px;">
          Use the code below to ${purposeText}. Expires in <strong>10 minutes</strong>.
        </p>
        <div style="background: #ffffff; border: 2px solid #e2e8f0;
                    border-radius: 16px; padding: 32px; text-align: center;">
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
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 24px;">
          If you didn't request this, please ignore this email.
        </p>
      </div>
    `,
  };

  await apiInstance.sendTransacEmail(sendSmtpEmail);
};

const sendPasswordResetEmail = async (email, name, resetToken) => {
  const webUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  const sendSmtpEmail = {
    to:      [{ email, name }],
    sender:  { email: 'ahmedazeemmemon@gmail.com', name: 'AutoSilence' },
    subject: 'AutoSilence — Reset Your Password',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;
                  background: #f8f9fb; padding: 32px; border-radius: 16px;">
        <h2 style="color: #0f172a;">Reset Your Password</h2>
        <p style="color: #64748b;">Hi ${name}, click below to reset your password.</p>
        <a href="${webUrl}"
           style="display: inline-block; background: #1d4ed8;
                  color: white; padding: 14px 28px; border-radius: 12px;
                  text-decoration: none; font-weight: bold; margin: 16px 0;">
          Reset Password
        </a>
        <p style="color: #94a3b8; font-size: 12px;">
          This link expires in 10 minutes.
        </p>
      </div>
    `,
  };

  await apiInstance.sendTransacEmail(sendSmtpEmail);
};

module.exports = { sendOTPEmail, sendPasswordResetEmail };
```

---

**Step 4 — Add to Railway variables**
```
BREVO_API_KEY = your_api_key_from_brevo
