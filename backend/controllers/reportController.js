const Course = require('../models/Course');
const User = require('../models/User');
const Gradebook = require('../models/Gradebook');
const Submission = require('../models/Submission');
const QuizAttempt = require('../models/QuizAttempt');
const Assignment = require('../models/Assignment');
const Quiz = require('../models/Quiz');
const Enrollment = require('../models/Enrollment');
const { Op } = require('sequelize');

/**
 * Get enrollment report for a course (instructor only)
 * @route GET /api/reports/courses/:courseId/enrollment
 */
exports.getEnrollmentReport = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is instructor or admin
    if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this report' });
    }

    // Note: Enrollment functionality requires junction table setup
    res.status(200).json({
      success: true,
      message: 'Enrollment report requires junction table setup',
      report: {
        course: {
          id: course.id,
          title: course.title,
          totalEnrolled: 0
        },
        students: []
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get progress report for a course (instructor only)
 * @route GET /api/reports/courses/:courseId/progress
 */
exports.getProgressReport = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is instructor or admin
    if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this report' });
    }

    // Get gradebook entries for the course
    const gradebooks = await Gradebook.findAll({
      where: { courseId: req.params.courseId },
      include: [{
        model: User,
        as: 'student',
        attributes: ['id', 'name', 'email']
      }]
    });

    // Get total assignments and quizzes for the course
    const totalAssignments = await Assignment.count({ where: { courseId: req.params.courseId } });
    const totalQuizzes = await Quiz.count({ where: { courseId: req.params.courseId } });

    const studentProgress = gradebooks.map(gb => {
      const completedAssignments = gb.assignmentGrades ? gb.assignmentGrades.length : 0;
      const completedQuizzes = gb.quizGrades ? gb.quizGrades.length : 0;

      return {
        student: {
          id: gb.student.id,
          name: gb.student.name,
          email: gb.student.email
        },
        progress: {
          assignmentsCompleted: completedAssignments,
          assignmentsTotal: totalAssignments,
          assignmentsPercentage: totalAssignments > 0 
            ? (completedAssignments / totalAssignments) * 100 
            : 0,
          quizzesCompleted: completedQuizzes,
          quizzesTotal: totalQuizzes,
          quizzesPercentage: totalQuizzes > 0 
            ? (completedQuizzes / totalQuizzes) * 100 
            : 0,
          overallGrade: gb.overallGrade
        }
      };
    });

    const report = {
      course: {
        id: course.id,
        title: course.title
      },
      totalStudents: gradebooks.length,
      averageGrade: gradebooks.length > 0 
        ? gradebooks.reduce((sum, gb) => sum + gb.overallGrade, 0) / gradebooks.length 
        : 0,
      students: studentProgress
    };

    res.status(200).json({
      success: true,
      report
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get participation report for a course (instructor only)
 * @route GET /api/reports/courses/:courseId/participation
 */
exports.getParticipationReport = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is instructor or admin
    if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this report' });
    }

    // Note: Enrollment functionality requires junction table setup
    res.status(200).json({
      success: true,
      message: 'Participation report requires junction table setup',
      report: {
        course: {
          id: course.id,
          title: course.title
        },
        summary: {
          totalStudents: 0,
          activeStudents: 0,
          inactiveStudents: 0,
          activityRate: 0
        },
        students: []
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get instructor dashboard summary
 * @route GET /api/reports/instructor/dashboard
 */
exports.getInstructorDashboard = async (req, res, next) => {
  try {
    if (req.user.role !== 'instructor' && req.user.role !== 'admin' && req.user.role !== 'lecturer') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const courses = await Course.findAll({ where: { instructorId: req.user.id } });
    const courseIds = courses.map(c => c.id);

    // Real enrollment counts now that the Enrollment junction table exists
    const enrollments = courseIds.length > 0
      ? await Enrollment.findAll({
          where: { courseId: { [Op.in]: courseIds } },
          attributes: ['courseId', 'studentId']
        })
      : [];

    const studentsByCourse = {};
    enrollments.forEach((enrollment) => {
      if (!studentsByCourse[enrollment.courseId]) studentsByCourse[enrollment.courseId] = 0;
      studentsByCourse[enrollment.courseId] += 1;
    });
    const totalStudents = new Set(enrollments.map((e) => e.studentId)).size;

    // Get recent submissions
    const recentSubmissions = await Submission.findAll({
      where: { courseId: { [Op.in]: courseIds } },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Assignment,
          as: 'assignment',
          attributes: ['id', 'title']
        }
      ],
      order: [['submittedAt', 'DESC']],
      limit: 10
    });

    // Get recent quiz attempts
    const recentQuizAttempts = await QuizAttempt.findAll({
      where: { courseId: { [Op.in]: courseIds } },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Quiz,
          as: 'quiz',
          attributes: ['id', 'title']
        }
      ],
      order: [['completedAt', 'DESC']],
      limit: 10
    });

    const dashboard = {
      summary: {
        totalCourses: courses.length,
        totalStudents,
        totalAssignments: await Assignment.count({ where: { courseId: { [Op.in]: courseIds } } }),
        totalQuizzes: await Quiz.count({ where: { courseId: { [Op.in]: courseIds } } })
      },
      courses: courses.map(course => ({
        id: course.id,
        title: course.title,
        enrolledStudents: studentsByCourse[course.id] || 0,
        isActive: course.isActive
      })),
      recentActivity: {
        submissions: recentSubmissions,
        quizAttempts: recentQuizAttempts
      }
    };

    res.status(200).json({
      success: true,
      dashboard
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get admin dashboard summary
 * @route GET /api/reports/admin/dashboard
 */
exports.getAdminDashboard = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const totalUsers = await User.count();
    const totalCourses = await Course.count();
    const totalStudents = await User.count({ where: { role: 'student' } });
    const totalInstructors = await User.count({ where: { role: 'instructor' } });

    const dashboard = {
      summary: {
        totalUsers,
        totalCourses,
        totalStudents,
        totalInstructors
      },
      userDistribution: {
        students: totalStudents,
        instructors: totalInstructors,
        admins: await User.count({ where: { role: 'admin' } })
      }
    };

    res.status(200).json({
      success: true,
      dashboard
    });
  } catch (error) {
    next(error);
  }
};
