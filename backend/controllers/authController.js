const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendPasswordResetEmail, sendWelcomeEmail, sendVerificationEmail } = require('../utils/email');
const { isGoogleConfigured, verifyGoogleIdToken } = require('../services/googleAuth');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

/**
 * Generate JWT Token
 */
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

/**
 * Emails are stored lowercase; look them up with a parameterized lower()
 * comparison so legacy mixed-case rows still match without LIKE wildcards.
 */
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const userByEmail = (email) =>
  User.findOne({ where: sequelize.where(sequelize.fn('lower', sequelize.col('email')), normalizeEmail(email)) });

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role
});

/**
 * Register new user
 * @route POST /api/auth/register
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    // Check if user already exists
    const existingUser = await userByEmail(normalizedEmail);
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Validate role
    const validRoles = ['student', 'instructor', 'lecturer', 'admin'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Create user unverified; login stays blocked until the emailed link is used.
    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: role || 'student',
      isEmailVerified: false
    });

    const verificationToken = user.createEmailVerificationToken();
    await user.save({ validate: false });

    try {
      await sendVerificationEmail(user.email, verificationToken, user.name);
    } catch (error) {
      // Without the email the account is unusable, so remove it and let the
      // user register again rather than trapping them behind "already exists".
      await user.destroy();
      return res.status(500).json({ message: 'Could not send the verification email. Please try again.' });
    }

    res.status(201).json({
      success: true,
      message: 'Account created. Check your email to verify your address.',
      requiresVerification: true,
      email: user.email
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user
    const user = await userByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Block unverified accounts; Google-verified and admin-created users pass.
    if (user.isEmailVerified === false) {
      return res.status(403).json({
        message: 'Please verify your email address before signing in.',
        requiresVerification: true,
        email: user.email
      });
    }

    // Update last login
    await user.updateLastLogin();

    // Generate token
    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current logged in user
 * @route GET /api/auth/me
 */
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        lastLogin: user.lastLogin,
        forumPostCount: user.forumPostCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Forgot password - send reset token
 * @route POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await userByEmail(email);

    // Respond identically whether or not the account exists so the endpoint
    // cannot be used to discover which emails are registered.
    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with that email, a reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validate: false });

    // Send email
    try {
      await sendPasswordResetEmail(user.email, resetToken);

      res.status(200).json({
        success: true,
        message: 'If an account exists with that email, a reset link has been sent.'
      });
    } catch (error) {
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      await user.save({ validate: false });

      return res.status(500).json({ message: 'Email could not be sent' });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password
 * @route POST /api/auth/reset-password/:token
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash token to compare with stored token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      where: {
        passwordResetToken: hashedToken,
        passwordResetExpires: { [Op.gt]: Date.now() }
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Set new password
    user.password = password;
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    // Generate new token
    const newToken = generateToken(user.id);

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      token: newToken
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify an email address from the link sent at registration
 * @route POST /api/auth/verify-email/:token
 */
exports.verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ message: 'Verification token is required' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      where: {
        emailVerificationToken: hashedToken,
        emailVerificationExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification link' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save({ validate: false });

    sendWelcomeEmail(user.email, user.name).catch(() => {});

    const authToken = generateToken(user.id);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      token: authToken,
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Resend the verification email for an unverified account
 * @route POST /api/auth/resend-verification
 */
exports.resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await userByEmail(email);

    if (user && user.isEmailVerified === false) {
      const verificationToken = user.createEmailVerificationToken();
      await user.save({ validate: false });

      try {
        await sendVerificationEmail(user.email, verificationToken, user.name);
      } catch (error) {
        console.error('[auth] verification email failed:', error.message || error);
      }
    }

    res.status(200).json({
      success: true,
      message: 'If an unverified account exists with that email, a verification link has been sent.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sign in (or register) with a Google ID token
 * @route POST /api/auth/google
 */
exports.googleAuth = async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    if (!isGoogleConfigured()) {
      return res.status(503).json({ message: 'Google sign-in is not configured on this server' });
    }

    let payload;
    try {
      payload = await verifyGoogleIdToken(credential);
    } catch (error) {
      const status = error.statusCode === 503 ? 503 : 401;
      return res.status(status).json({ message: error.statusCode === 503 ? error.message : 'Google authentication failed' });
    }

    const email = normalizeEmail(payload.email);
    if (!email || payload.email_verified === false) {
      return res.status(401).json({ message: 'Google account email is not verified' });
    }

    let user = await userByEmail(email);

    if (user) {
      if (!user.isActive) {
        return res.status(401).json({ message: 'Account is deactivated' });
      }
      // Link the Google account the first time it is used, and treat Google's
      // own verification as satisfying ours.
      if (!user.googleId || user.isEmailVerified === false) {
        await user.update({ googleId: payload.sub, isEmailVerified: true });
      }
    } else {
      // A random, unknowable password keeps the required-password column and its
      // validators intact for accounts that only ever sign in with Google; the
      // user can set a real one later via "Forgot password".
      const randomPassword = crypto.randomBytes(32).toString('hex');
      user = await User.create({
        name: payload.name || email.split('@')[0],
        email,
        password: randomPassword,
        role: 'student',
        googleId: payload.sub,
        isEmailVerified: true
      });
    }

    await user.updateLastLogin();

    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      message: 'Signed in with Google',
      token,
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Public auth configuration for the client (which sign-in methods are enabled)
 * @route GET /api/auth/config
 */
exports.getAuthConfig = async (req, res) => {
  res.status(200).json({
    success: true,
    googleEnabled: isGoogleConfigured(),
    googleClientId: process.env.GOOGLE_CLIENT_ID || null
  });
};

/**
 * Update password
 * @route PUT /api/auth/update-password
 */
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findByPk(req.user.id);

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Generate new token
    const token = generateToken(user.id);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      token
    });
  } catch (error) {
    next(error);
  }
};
