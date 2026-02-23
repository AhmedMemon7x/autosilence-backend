const express = require('express');
const router  = express.Router();
const {
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
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// ── Email signup flow ──
router.post('/register',    register);    // Step 1: save user, send OTP
router.post('/verify-otp',  verifyOTP);   // Step 2: verify OTP → account ready
router.post('/resend-otp',  resendOTP);   // resend if expired

// ── Login ──
router.post('/login',       login);

// ── Google flow ──
router.post('/google',          googleAuth);     // Step 1: verify token, send OTP
router.post('/google-complete', googleComplete); // Step 2: OTP + name → done

// ── Forgot/reset password ──
router.post('/forgot-password', forgotPassword); // send OTP
router.post('/reset-password',  resetPassword);  // OTP + new password

// ── Guest ──
router.post('/guest',       guestLogin);

// ── Protected ──
router.get('/me',           protect, getMe);

module.exports = router;
