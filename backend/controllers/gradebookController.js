const Gradebook = require('../models/Gradebook');
const Course = require('../models/Course');
const Assignment = require('../models/Assignment');
const Quiz = require('../models/Quiz');
const Submission = require('../models/Submission');
const QuizAttempt = require('../models/QuizAttempt');
const User = require('../models/User');
const { Op } = require('sequelize');

/**
 * Get gradebook for a course (instructor - all, student - own)
 * @route GET /api/courses/:courseId/gradebook
 */
exports.getCourseGradebook = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    let gradebook;

    if (req.user.role === 'instructor' || req.user.role === 'admin' || req.user.role === 'lecturer') {
      // Instructors see all students' grades
      gradebook = await Gradebook.findAll({
        where: { courseId: req.params.courseId },
        include: [{
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email']
        }],
        order: [['overallGrade', 'DESC']]
      });
    } else {
      // Students see only their own grades
      gradebook = await Gradebook.findOne({
        where: {
          courseId: req.params.courseId,
          studentId: req.user.id
        },
        include: [{
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email']
        }]
      });
    }

    res.status(200).json({
      success: true,
      count: Array.isArray(gradebook) ? gradebook.length : (gradebook ? 1 : 0),
      gradebook
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update gradebook entry (instructor only)
 * @route PUT /api/gradebook/:id
 */
exports.updateGradebook = async (req, res, next) => {
  try {
    const gradebook = await Gradebook.findByPk(req.params.id);

    if (!gradebook) {
      return res.status(404).json({ message: 'Gradebook entry not found' });
    }

    // Check if user is instructor of the course
    const course = await Course.findByPk(gradebook.courseId);
    if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this gradebook' });
    }

    await gradebook.update(req.body);

    res.status(200).json({
      success: true,
      message: 'Gradebook updated successfully',
      gradebook
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Calculate and update gradebook for a student (instructor only)
 * @route POST /api/courses/:courseId/gradebook/calculate
 */
exports.calculateGradebook = async (req, res, next) => {
  try {
    const { studentId } = req.body;
    const course = await Course.findByPk(req.params.courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is instructor of the course
    if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to calculate gradebook' });
    }

    // Get all assignments and quizzes
    const assignments = await Assignment.findAll({ where: { courseId: req.params.courseId } });
    const quizzes = await Quiz.findAll({ where: { courseId: req.params.courseId } });

    // Get student's submissions and quiz attempts
    const assignmentIds = assignments.map(a => a.id);
    const quizIds = quizzes.map(q => q.id);

    const submissions = await Submission.findAll({
      where: {
        assignmentId: { [Op.in]: assignmentIds },
        studentId: studentId,
        grade: { [Op.ne]: null }
      }
    });

    const quizAttempts = await QuizAttempt.findAll({
      where: {
        quizId: { [Op.in]: quizIds },
        studentId: studentId
      }
    });

    // Calculate assignment grades
    const assignmentGrades = submissions.map(sub => ({
      assignmentId: sub.assignmentId,
      grade: sub.grade,
      feedback: sub.feedback,
      submittedAt: sub.submittedAt
    }));

    // Calculate quiz grades
    const quizGrades = quizAttempts.map(attempt => ({
      quizId: attempt.quizId,
      score: attempt.score,
      percentage: attempt.percentage,
      passed: attempt.passed,
      completedAt: attempt.completedAt
    }));

    // Calculate overall grade
    let totalPoints = 0;
    let earnedPoints = 0;

    assignments.forEach(assignment => {
      totalPoints += assignment.maxPoints;
    });

    submissions.forEach(submission => {
      earnedPoints += submission.grade || 0;
    });

    const overallGrade = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

    // Find or create gradebook entry
    let gradebook = await Gradebook.findOne({
      where: {
        courseId: req.params.courseId,
        studentId: studentId
      }
    });

    if (gradebook) {
      gradebook.assignmentGrades = assignmentGrades;
      gradebook.quizGrades = quizGrades;
      gradebook.overallGrade = overallGrade;
      gradebook.lastUpdated = new Date();
      await gradebook.save();
    } else {
      gradebook = await Gradebook.create({
        courseId: req.params.courseId,
        studentId: studentId,
        assignmentGrades,
        quizGrades,
        overallGrade
      });
    }

    res.status(200).json({
      success: true,
      message: 'Gradebook calculated successfully',
      gradebook
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student's overall grades across all courses
 * @route GET /api/gradebook/my-grades
 */
exports.getMyGrades = async (req, res, next) => {
  try {
    const gradebooks = await Gradebook.findAll({
      where: { studentId: req.user.id },
      include: [{
        model: Course,
        as: 'course',
        attributes: ['id', 'title', 'description']
      }],
      order: [['overallGrade', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: gradebooks.length,
      gradebooks
    });
  } catch (error) {
    next(error);
  }
};

const gradePoint = (percentage) => {
  if (percentage >= 70) return 5;
  if (percentage >= 60) return 4;
  if (percentage >= 50) return 3;
  if (percentage >= 45) return 2;
  if (percentage >= 40) return 1;
  return 0;
};

/**
 * Get student's CGPA (cumulative grade point average) on a 5.0 scale
 * @route GET /api/gradebook/cgpa
 */
exports.getMyCgpa = async (req, res, next) => {
  try {
    const gradebooks = await Gradebook.findAll({
      where: { studentId: req.user.id },
      include: [{
        model: Course,
        as: 'course',
        attributes: ['id', 'title', 'credits']
      }]
    });

    const gradedCourses = gradebooks
      .filter((gb) => gb.course && gb.overallGrade != null)
      .map((gb) => {
        const overallGrade = Number(gb.overallGrade);
        return {
          courseId: gb.course.id,
          title: gb.course.title,
          credits: gb.course.credits || 0,
          overallGrade,
          gradePoint: gradePoint(overallGrade)
        };
      });

    const totalCredits = gradedCourses.reduce((sum, c) => sum + (c.credits || 0), 0);
    const weightedPoints = gradedCourses.reduce((sum, c) => sum + (c.gradePoint * (c.credits || 0)), 0);
    const cgpa = totalCredits > 0 ? Math.round((weightedPoints / totalCredits) * 100) / 100 : null;

    res.status(200).json({
      success: true,
      cgpa,
      scale: '5.0',
      totalCredits,
      gradedCourses
    });
  } catch (error) {
    next(error);
  }
};
