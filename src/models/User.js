const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, 'Name is required'],
      trim:      true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },

    email: {
      type:      String,
      required:  [true, 'Email is required'],
      unique:    true,
      lowercase: true,
      trim:      true,
      match:     [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },

    password: {
      type:      String,
      minlength: [6, 'Password must be at least 6 characters'],
      select:    false, // never returned by default
    },

    avatar:   { type: String,  default: null },
    googleId: { type: String,  default: null },
    appleId:  { type: String,  default: null },

    authProvider: {
      type:    String,
      enum:    ['email', 'google', 'apple', 'guest'],
      default: 'email',
    },

    isGuest:         { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },

    // ══════════════════════════════════════
    // OTP FIELDS
    // ══════════════════════════════════════
    otp:         { type: String, default: null, select: false }, // hashed
    otpExpires:  { type: Date,   default: null },
    otpAttempts: { type: Number, default: 0    }, // wrong guess counter
    otpPurpose:  {
      type:    String,
      // email_verify  → new email signup OTP
      // google_verify → new Google signup OTP
      // forgot        → password reset OTP
      enum:    ['email_verify', 'google_verify', 'forgot'],
      default: null,
    },

    // Temp storage for Google data before OTP confirmed
    pendingGoogle: {
      googleId: { type: String, default: null },
      name:     { type: String, default: null },
      avatar:   { type: String, default: null },
    },

    // ── Premium ──
    isPremium:        { type: Boolean, default: false },
    premiumExpiresAt: { type: Date,    default: null  },

    // ── Password Reset (token based) ──
    resetPasswordToken:   { type: String, default: null },
    resetPasswordExpires: { type: Date,   default: null },
  },
  { timestamps: true }
);

// ── Hash password before saving ──
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ── Compare entered password with hash ──
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// ── Generate 6-digit OTP, store hashed, return plain ──
userSchema.methods.generateOTP = function (purpose) {
  const plain      = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp         = crypto.createHash('sha256').update(plain).digest('hex');
  this.otpExpires  = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  this.otpPurpose  = purpose;
  this.otpAttempts = 0;
  return plain; // ← send this in email, never store plain
};

// ── Check OTP — returns { valid, reason } ──
userSchema.methods.checkOTP = function (candidate, purpose) {
  if (!this.otp || !this.otpExpires) {
    return { valid: false, reason: 'No OTP found. Please request a new one.' };
  }
  if (this.otpPurpose !== purpose) {
    return { valid: false, reason: 'OTP mismatch. Please request a new one.' };
  }
  if (new Date() > this.otpExpires) {
    return { valid: false, reason: 'OTP has expired. Please request a new one.' };
  }
  if (this.otpAttempts >= 5) {
    return { valid: false, reason: 'Too many wrong attempts. Request a new OTP.' };
  }

  const hashed = crypto.createHash('sha256').update(candidate).digest('hex');
  if (hashed !== this.otp) {
    this.otpAttempts += 1;
    return { valid: false, reason: `Wrong OTP. ${5 - this.otpAttempts} attempts left.` };
  }

  return { valid: true };
};

// ── Clear all OTP fields after successful verify ──
userSchema.methods.clearOTP = function () {
  this.otp            = undefined;
  this.otpExpires     = undefined;
  this.otpPurpose     = undefined;
  this.otpAttempts    = 0;
  this.pendingGoogle  = {};
};

module.exports = mongoose.model('User', userSchema);
