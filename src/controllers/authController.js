const crypto         = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const User                                   = require('../models/User');
const { generateToken, authResponse }        = require('../utils/jwt');
const { sendOTPEmail, sendPasswordResetEmail } = require('../utils/email');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ════════════════════════════════════════════════════════
//
//  EMAIL SIGNUP FLOW
//  ─────────────────
//  Step 1: POST /api/auth/register     → saves user (unverified), sends OTP
//  Step 2: POST /api/auth/verify-otp   → verifies OTP, marks email verified
//  Step 3: POST /api/auth/resend-otp   → resend if expired
//
//  GOOGLE SIGNUP FLOW
//  ──────────────────
//  Step 1: POST /api/auth/google       → verifies Google token,
//                                        if new user: asks for name + sends OTP
//                                        if existing: logs in directly
//  Step 2: POST /api/auth/google-complete → OTP + name confirmed, creates account
//
//  LOGIN FLOW
//  ──────────
//  POST /api/auth/login                → email + password → JWT
//
//  FORGOT PASSWORD FLOW
//  ────────────────────
//  Step 1: POST /api/auth/forgot-password → sends OTP to email
//  Step 2: POST /api/auth/reset-password  → OTP + new password
//
// ════════════════════════════════════════════════════════


// ════════════════════════════════════════
// STEP 1 — POST /api/auth/register
// Saves user as unverified, sends OTP
// ════════════════════════════════════════
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email and password are required.',
      });
    }

    // Check if a VERIFIED user already exists with this email
    const existing = await User.findOne({ email });
    if (existing && existing.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists. Please log in.',
      });
    }

    let user;

    if (existing && !existing.isEmailVerified) {
      // User started signup before but never verified — update and resend OTP
      existing.name     = name;
      existing.password = password; // will be re-hashed by pre-save hook
      user = existing;
    } else {
      // Brand new user
      user = new User({
        name,
        email,
        password,
        authProvider:    'email',
        isEmailVerified: false,
      });
    }

    // Generate OTP and save
    const otp = user.generateOTP('email_verify');
    await user.save();

    // Send OTP to email
    await sendOTPEmail(email, name, otp, 'email_verify');

    res.status(200).json({
      success: true,
      message: `A 6-digit verification code has been sent to ${email}. Enter it to complete registration.`,
      email, // send back so Flutter knows where to show OTP screen
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ════════════════════════════════════════
// STEP 2 — POST /api/auth/verify-otp
// Verifies OTP for email signup
// Body: { email, otp, purpose }
// ════════════════════════════════════════
const verifyOTP = async (req, res) => {
  try {
    const { email, otp, purpose } = req.body;

    if (!email || !otp || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'Email, OTP and purpose are required.',
      });
    }

    // Find user — must include otp field (select: false by default)
    const user = await User.findOne({ email }).select('+otp');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email.',
      });
    }

    // Check OTP
    const result = user.checkOTP(otp, purpose);
    if (!result.valid) {
      await user.save(); // save updated otpAttempts
      return res.status(400).json({ success: false, message: result.reason });
    }

    // ── OTP is valid ──
    if (purpose === 'email_verify') {
      user.isEmailVerified = true;
    }

    user.clearOTP();
    await user.save();

    const token = generateToken(user._id);
    res.status(200).json({
      success: true,
      message: purpose === 'email_verify'
        ? 'Email verified! Your account is ready.'
        : 'OTP verified successfully.',
      ...authResponse(user, token),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ════════════════════════════════════════
// POST /api/auth/resend-otp
// Resend OTP for any purpose
// Body: { email, purpose }
// ════════════════════════════════════════
const resendOTP = async (req, res) => {
  try {
    const { email, purpose } = req.body;

    const user = await User.findOne({ email }).select('+otp');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email.',
      });
    }

    // Prevent spamming — must wait if OTP was sent less than 60s ago
    if (user.otpExpires) {
      const secondsLeft = (user.otpExpires - Date.now()) / 1000;
      if (secondsLeft > 9 * 60) { // still has more than 9 min left = sent < 1min ago
        return res.status(429).json({
          success: false,
          message: 'Please wait at least 1 minute before requesting a new code.',
        });
      }
    }

    const otp = user.generateOTP(purpose);
    await user.save();
    await sendOTPEmail(email, user.name, otp, purpose);

    res.status(200).json({
      success: true,
      message: `A new code has been sent to ${email}.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ════════════════════════════════════════
// POST /api/auth/login
// Standard email + password login
// ════════════════════════════════════════
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !user.password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      // Resend OTP and tell them to verify
      const otp = user.generateOTP('email_verify');
      await user.save();
      await sendOTPEmail(email, user.name, otp, 'email_verify');

      return res.status(403).json({
        success:         false,
        needsVerification: true,
        email,
        message: 'Your email is not verified. A new code has been sent to your email.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = generateToken(user._id);
    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      ...authResponse(user, token),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ════════════════════════════════════════
// POST /api/auth/google
//
// Case A — existing user → login directly
// Case B — new user      → ask for name, send OTP to verify gmail
// ════════════════════════════════════════
const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token is required.',
      });
    }

    // Verify token with Google servers
    const ticket  = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload  = ticket.getPayload();
    const googleId = payload.sub;
    const email    = payload.email;
    const name     = payload.name;    // Google provides full name
    const picture  = payload.picture;

    // ── Case A: User already exists ──
    const existing = await User.findOne({
      $or: [{ googleId }, { email }],
    });

    if (existing && existing.isEmailVerified) {
      // Already registered — just log them in
      if (!existing.googleId) {
        existing.googleId = googleId;
        if (!existing.avatar && picture) existing.avatar = picture;
        await existing.save({ validateBeforeSave: false });
      }

      const token = generateToken(existing._id);
      return res.status(200).json({
        success: true,
        message: 'Logged in with Google.',
        ...authResponse(existing, token),
      });
    }

    // ── Case B: New Google user ──
    // Save pending google data and send OTP to verify ownership of gmail

    // Find or create temp unverified user
    let user = existing || new User({
      name:            name, // from Google — user can change it on next step
      email,
      authProvider:    'google',
      isEmailVerified: false,
    });

    // Store Google data temporarily until OTP confirmed
    user.pendingGoogle = { googleId, name, avatar: picture || null };

    const otp = user.generateOTP('google_verify');
    await user.save({ validateBeforeSave: false });

    // Send OTP to their Gmail
    await sendOTPEmail(email, name, otp, 'google_verify');

    return res.status(200).json({
      success:       true,
      needsOTP:      true,   // Flutter should show OTP screen
      needsName:     false,  // Google already gives us name
      googleName:    name,   // Show pre-filled name that user can edit
      email,
      message:       `A verification code has been sent to ${email}. Enter it to complete sign-in.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ════════════════════════════════════════
// POST /api/auth/google-complete
// Confirm OTP for Google signup
// Body: { email, otp, name }
// User can edit the pre-filled name here
// ════════════════════════════════════════
const googleComplete = async (req, res) => {
  try {
    const { email, otp, name } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required.',
      });
    }

    const user = await User.findOne({ email }).select('+otp');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No pending signup found for this email.',
      });
    }

    const result = user.checkOTP(otp, 'google_verify');
    if (!result.valid) {
      await user.save();
      return res.status(400).json({ success: false, message: result.reason });
    }

    // ── OTP confirmed — finalize the account ──
    user.googleId        = user.pendingGoogle?.googleId;
    user.avatar          = user.pendingGoogle?.avatar || null;
    user.authProvider    = 'google';
    user.isEmailVerified = true;

    // Use the name the user typed (or keep Google name if they didn't change it)
    if (name && name.trim().length > 0) {
      user.name = name.trim();
    } else if (user.pendingGoogle?.name) {
      user.name = user.pendingGoogle.name;
    }

    user.clearOTP();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      message: 'Google account verified! Welcome to AutoSilence.',
      ...authResponse(user, token),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ════════════════════════════════════════
// POST /api/auth/forgot-password
// Sends OTP to email for password reset
// ════════════════════════════════════════
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    // Always return success (don't reveal if email exists)
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If that email exists, a reset code has been sent.',
      });
    }

    if (user.authProvider !== 'email') {
      return res.status(400).json({
        success: false,
        message: `This account uses ${user.authProvider} sign-in. No password to reset.`,
      });
    }

    const otp = user.generateOTP('forgot');
    await user.save({ validateBeforeSave: false });
    await sendOTPEmail(email, user.name, otp, 'forgot');

    res.status(200).json({
      success: true,
      email,
      message: `A reset code has been sent to ${email}.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ════════════════════════════════════════
// POST /api/auth/reset-password
// OTP + new password
// Body: { email, otp, password }
// ════════════════════════════════════════
const resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    const user = await User.findOne({ email }).select('+otp');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email.',
      });
    }

    const result = user.checkOTP(otp, 'forgot');
    if (!result.valid) {
      await user.save();
      return res.status(400).json({ success: false, message: result.reason });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters.',
      });
    }

    user.password = password; // pre-save hook will hash it
    user.clearOTP();
    await user.save();

    const token = generateToken(user._id);
    res.status(200).json({
      success: true,
      message: 'Password reset successful. You are now logged in.',
      ...authResponse(user, token),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// ════════════════════════════════════════
// POST /api/auth/guest
// ════════════════════════════════════════
const guestLogin = async (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Continuing as guest.',
    user: {
      id:           'guest',
      name:         'Guest',
      email:        null,
      avatar:       null,
      authProvider: 'guest',
      isGuest:      true,
      isPremium:    false,
    },
    token: null,
  });
};


// ════════════════════════════════════════
// GET /api/auth/me  (protected)
// ════════════════════════════════════════
const getMe = async (req, res) => {
  res.status(200).json({
    success: true,
    user: {
      id:              req.user._id,
      name:            req.user.name,
      email:           req.user.email,
      avatar:          req.user.avatar,
      authProvider:    req.user.authProvider,
      isGuest:         req.user.isGuest,
      isPremium:       req.user.isPremium,
      isEmailVerified: req.user.isEmailVerified,
      createdAt:       req.user.createdAt,
    },
  });
};


module.exports = {
  register,
  verifyOTP,
  resendOTP,
  login,
  googleAuth,
  googleComplete,
  forgotPassword,
  resetPassword,
  guestLogin,
  getMe,
};
