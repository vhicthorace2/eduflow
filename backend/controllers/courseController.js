const Course = require('../models/Course');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Module = require('../models/Module');
const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Gradebook = require('../models/Gradebook');
const ActivityLog = require('../models/ActivityLog');
const { Op } = require('sequelize');
const { likeContains } = require('../utils/search');

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
 * Create new course (instructor or admin)
 * @route POST /api/courses
 */
exports.createCourse = async (req, res, next) => {
  try {
    const { title, description, thumbnail, category, difficulty, enrollmentLimit, instructorId } = req.body;

    let ownerId = req.user.id;
    if (req.user.role === 'admin' && instructorId) {
      const target = await User.findByPk(instructorId);
      if (!target || !['instructor', 'lecturer'].includes(target.role)) {
        return res.status(400).json({ message: 'instructorId must reference an instructor' });
      }
      ownerId = target.id;
    }

    const course = await Course.create({
      title,
      description,
      thumbnail,
      instructorId: ownerId,
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

    const [enrollment, created] = await Enrollment.findOrCreate({
      where: { courseId: course.id, studentId: req.user.id },
      defaults: { status: 'active', enrolledAt: new Date() }
    });

    res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Enrolled successfully' : 'Already enrolled in this course',
      enrollment
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
    const enrollments = await Enrollment.findAll({
      where: { studentId: req.user.id },
      include: [{
        model: Course,
        as: 'course',
        include: [{
          model: User,
          as: 'instructor',
          attributes: ['id', 'name', 'email']
        }]
      }],
      order: [['createdAt', 'DESC']]
    });

    const courses = enrollments
      .map((e) => e.course)
      .filter((course) => course && course.isActive);

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

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Compute the personalized learning path for a student in a course.
 * Pace is derived from performance (quiz attempts, graded assignments,
 * gradebook overall grade); each module gets a status the UI renders.
 * @route GET /api/courses/:courseId/learning-path
 */
exports.getLearningPath = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const modules = await Module.findAll({
      where: { courseId: req.params.courseId, isActive: true },
      order: [['order', 'ASC']]
    });

    const [quizzes, assignments] = await Promise.all([
      Quiz.findAll({ where: { courseId: req.params.courseId } }),
      Assignment.findAll({ where: { courseId: req.params.courseId } })
    ]);

    const quizIds = quizzes.map((q) => q.id);
    const assignmentIds = assignments.map((a) => a.id);

    const [attempts, submissions, gradebooks, activities] = await Promise.all([
      quizIds.length > 0
        ? QuizAttempt.findAll({
            where: { quizId: { [Op.in]: quizIds }, studentId: req.user.id }
          })
        : Promise.resolve([]),
      assignmentIds.length > 0
        ? Submission.findAll({
            where: { assignmentId: { [Op.in]: assignmentIds }, studentId: req.user.id },
            attributes: ['id', 'assignmentId', 'grade']
          })
        : Promise.resolve([]),
      Gradebook.findAll({
        where: { courseId: req.params.courseId, studentId: req.user.id },
        attributes: ['overallGrade']
      }),
      ActivityLog.findAll({
        where: { courseId: req.params.courseId, studentId: req.user.id },
        attributes: ['moduleId', 'performedAt']
      })
    ]);

    // Best percentage per quiz
    const bestByQuiz = {};
    attempts.forEach((attempt) => {
      const pct = Number(attempt.percentage);
      if (!bestByQuiz[attempt.quizId] || pct > bestByQuiz[attempt.quizId]) {
        bestByQuiz[attempt.quizId] = pct;
      }
    });

    const scoreParts = [];
    Object.values(bestByQuiz).forEach((pct) => scoreParts.push(pct));

    const maxPointsById = {};
    assignments.forEach((a) => { maxPointsById[a.id] = a.maxPoints; });
    submissions.filter((s) => s.grade != null).forEach((s) => {
      const max = maxPointsById[s.assignmentId] || 100;
      scoreParts.push(clamp((Number(s.grade) / max) * 100, 0, 100));
    });

    gradebooks.forEach((gb) => {
      if (gb.overallGrade != null) scoreParts.push(clamp(Number(gb.overallGrade), 0, 100));
    });

    const performanceScore = scoreParts.length > 0
      ? scoreParts.reduce((sum, v) => sum + v, 0) / scoreParts.length
      : null;

    let pace = 'steady';
    if (performanceScore != null && performanceScore < 55) pace = 'review';
    else if (performanceScore != null && performanceScore >= 80) pace = 'accelerated';

    const viewedModuleIds = new Set(
      activities.filter((a) => a.moduleId != null).map((a) => a.moduleId)
    );

    const reviewedModuleIds = pace === 'review'
      ? new Set(
          activities
            .filter((a) => a.moduleId != null)
            .map((a) => a.moduleId)
            .sort()
        )
      : new Set();

    const moduleRows = modules.map((module) => {
      let status = 'upcoming';
      if (viewedModuleIds.has(module.id)) {
        status = reviewedModuleIds.has(module.id) ? 'review' : 'completed';
      }
      return {
        id: module.id,
        order: module.order,
        title: module.title,
        description: module.description,
        status
      };
    });

    // Next recommended module: first module that isn't completed or review.
    // 'review' students redo the earliest non-completed module; others continue
    // forward; advanced students may skip a completed-free module.
    let nextModule = null;
    if (pace === 'accelerated') {
      nextModule = moduleRows.find((m) => m.status !== 'completed') || null;
    } else {
      nextModule = moduleRows.find((m) => m.status === 'upcoming') || null;
    }

    if (!nextModule) {
      nextModule = moduleRows.find((m) => m.status === 'review') || null;
    }

    const completedCount = moduleRows.filter((m) => m.status === 'completed').length;
    const progressPercent = modules.length > 0
      ? Math.round((completedCount / modules.length) * 100)
      : 0;

    const feedback = {
      accelerated: 'You are ahead of the pack. Keep up the momentum and jump to the next module.',
      steady: 'You are on a steady pace. Continue learning at your rhythm.',
      review: 'You would benefit from revisiting earlier lessons before moving on. Low scores were detected.'
    }[pace];

    res.status(200).json({
      success: true,
      path: {
        courseId: course.id,
        courseTitle: course.title,
        pace,
        performanceScore: performanceScore != null ? Math.round(performanceScore) : null,
        progressPercent,
        completedCount,
        totalModules: modules.length,
        viewedModuleCount: viewedModuleIds.size,
        recommendedModuleId: nextModule ? nextModule.id : null,
        recommendedModuleOrder: nextModule ? nextModule.order : null,
        nextModuleTitle: nextModule ? nextModule.title : null,
        feedback,
        modules: moduleRows
      }
    });
  } catch (error) {
    next(error);
  }
};
