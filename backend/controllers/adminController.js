const User = require('../models/User');
const Course = require('../models/Course');
const { Op } = require('sequelize');
const { likeContains } = require('../utils/search');

/**
 * Get all users (admin only)
 * @route GET /api/admin/users
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;
    
    let where = {};
    if (role) where.role = role;
    if (search) {
      where[Op.or] = [
        likeContains('name', search),
        likeContains('email', search)
      ];
    }

    const users = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single user by ID (admin only)
 * @route GET /api/admin/users/:id
 */
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new user (admin only)
 * @route POST /api/admin/users
 */
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: role || 'student'
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user (admin only)
 * @route PUT /api/admin/users/:id
 */
exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent updating own role
    if (req.params.id === req.user.id && req.body.role) {
      return res.status(400).json({ message: 'Cannot update your own role' });
    }

    await user.update(req.body);

    // Fetch updated user without password
    const updatedUser = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] }
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user (admin only)
 * @route DELETE /api/admin/users/:id
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deleting own account
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await user.destroy();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Activate/deactivate user (admin only)
 * @route PUT /api/admin/users/:id/toggle-status
 */
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent deactivating own account
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all courses including inactive (admin only)
 * @route GET /api/admin/courses
 */
exports.getAllCoursesAdmin = async (req, res, next) => {
  try {
    const { search } = req.query;

    let where = {};
    if (search) {
      where[Op.or] = [
        likeContains('title', search),
        likeContains('description', search)
      ];
    }

    const courses = await Course.findAll({
      where,
      include: [{
        model: User,
        as: 'instructor',
        attributes: ['id', 'name', 'email']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: courses.length,
      courses
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign a course to an instructor (admin only)
 * @route PUT /api/admin/courses/:id/assign
 */
exports.assignInstructor = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const { instructorId } = req.body;
    if (!instructorId) {
      return res.status(400).json({ message: 'instructorId is required' });
    }

    const instructor = await User.findByPk(instructorId);
    if (!instructor) {
      return res.status(404).json({ message: 'Instructor not found' });
    }

    if (!['instructor', 'lecturer'].includes(instructor.role)) {
      return res.status(400).json({ message: 'Target user is not an instructor' });
    }

    course.instructorId = instructor.id;
    await course.save();

    const updated = await Course.findByPk(course.id, {
      include: [{
        model: User,
        as: 'instructor',
        attributes: ['id', 'name', 'email']
      }]
    });

    res.status(200).json({
      success: true,
      message: `Course assigned to ${instructor.name}`,
      course: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Activate/deactivate a course (admin only)
 * @route PUT /api/admin/courses/:id/status
 */
exports.toggleCourseStatus = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    course.isActive = !course.isActive;
    await course.save();

    res.status(200).json({
      success: true,
      message: `Course ${course.isActive ? 'activated' : 'deactivated'} successfully`,
      course: {
        id: course.id,
        title: course.title,
        isActive: course.isActive
      }
    });
  } catch (error) {
    next(error);
  }
};
