const jwt = require('jsonwebtoken');

// ── Generate JWT ──
const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
};

// ── Verify JWT ──
const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

// ── Build auth response (user + token) ──
const authResponse = (user, token) => ({
  token,
  user: {
    id:           user._id,
    name:         user.name,
    email:        user.email,
    avatar:       user.avatar,
    authProvider: user.authProvider,
    isGuest:      user.isGuest,
    isPremium:    user.isPremium,
    isEmailVerified: user.isEmailVerified,
  },
});

module.exports = { generateToken, verifyToken, authResponse };
