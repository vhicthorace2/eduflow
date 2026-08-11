const User = require('../models/User');
const { Op } = require('sequelize');

const DEFAULT_PREFERENCES = { email: true, push: false, digest: true };

const serializeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
  preferences: user.preferences || DEFAULT_PREFERENCES
});

/**
 * Get current user's settings
 * @route GET /api/settings/me
 */
exports.getSettings = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    res.status(200).json({ success: true, user: serializeUser(user) });
  } catch (error) {
    next(error);
  }
};

/**
 * Update current user's settings (name, email, password, notification preferences)
 * @route PUT /api/settings/me
 */
exports.updateSettings = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    const { name, email, password, preferences } = req.body;

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) {
        const err = new Error('Name cannot be empty');
        err.statusCode = 400;
        return next(err);
      }
      user.name = trimmed;
    }

    if (email !== undefined) {
      const trimmedEmail = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        const err = new Error('Please provide a valid email');
        err.statusCode = 400;
        return next(err);
      }
      if (trimmedEmail !== user.email) {
        const existing = await User.findOne({ where: { email: trimmedEmail, id: { [Op.ne]: user.id } } });
        if (existing) {
          const err = new Error('Email is already in use');
          err.statusCode = 400;
          return next(err);
        }
        user.email = trimmedEmail;
      }
    }

    if (password !== undefined && password !== '') {
      if (String(password).length < 6) {
        const err = new Error('Password must be at least 6 characters');
        err.statusCode = 400;
        return next(err);
      }
      const { currentPassword } = req.body;
      if (!currentPassword || !(await user.comparePassword(currentPassword))) {
        const err = new Error('Current password is incorrect');
        err.statusCode = 401;
        return next(err);
      }
      user.password = password;
    }

    if (preferences !== undefined) {
      user.preferences = {
        ...DEFAULT_PREFERENCES,
        ...(preferences && typeof preferences === 'object' ? preferences : {})
      };
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      user: serializeUser(user)
    });
  } catch (error) {
    next(error);
  }
};
