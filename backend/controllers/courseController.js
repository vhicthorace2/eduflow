const Course = require('../models/Course');
const User = require('../models/User');
const { Op } = require('sequelize');

/**
 * Get all courses
 * @route GET /api/courses
 */
exports.getAllCourses = async (req, res, next) => {
  try {
    const { category, difficulty, search } = req.query;
    
    let where = { isActive: true };

    if (category) where.category = category;
    if (difficulty) where.difficulty = difficulty;
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
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
 * Get single course by ID
 * @route GET /api/courses/:id
 */
exports.getCourseById = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'instructor',
        attributes: ['id', 'name', 'email']
      }]
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    res.status(200).json({
      success: true,
      course
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new course (instructor only)
 * @route POST /api/courses
 */
exports.createCourse = async (req, res, next) => {
  try {
    const { title, description, thumbnail, category, difficulty, enrollmentLimit } = req.body;

    const course = await Course.create({
      title,
      description,
      thumbnail,
      instructorId: req.user.id,
      category: category || 'General',
      difficulty: difficulty || 'beginner',
      enrollmentLimit
    });

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update course (instructor only)
 * @route PUT /api/courses/:id
 */
exports.updateCourse = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is the instructor or admin
    if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this course' });
    }

    await course.update(req.body);

    res.status(200).json({
      success: true,
      message: 'Course updated successfully',
      course
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete course (instructor only)
 * @route DELETE /api/courses/:id
 */
exports.deleteCourse = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is the instructor or admin
    if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this course' });
    }

    await course.destroy();

    res.status(200).json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Enroll in course (student only)
 * @route POST /api/courses/:id/enroll
 */
exports.enrollCourse = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Note: Enrollment requires a junction table (CourseEnrollment) to be properly implemented
    // For now, this is a simplified version
    res.status(200).json({
      success: true,
      message: 'Enrollment functionality requires junction table setup'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get enrolled courses for current user
 * @route GET /api/courses/my-courses
 */
exports.getMyCourses = async (req, res, next) => {
  try {
    // Note: This requires a junction table to be properly implemented
    res.status(200).json({
      success: true,
      courses: [],
      message: 'Enrollment functionality requires junction table setup'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get instructor's courses
 * @route GET /api/courses/instructor-courses
 */
exports.getInstructorCourses = async (req, res, next) => {
  try {
    const courses = await Course.findAll({
      where: { instructorId: req.user.id },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      courses
    });
  } catch (error) {
    next(error);
  }
};
