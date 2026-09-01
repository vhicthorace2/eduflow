const Quiz = require('../models/Quiz');
const QuizAttempt = require('../models/QuizAttempt');
const Course = require('../models/Course');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

/**
 * Get all quizzes for a course
 * @route GET /api/courses/:courseId/quizzes
 */
exports.getQuizzes = async (req, res, next) => {
  try {
    const quizzes = await Quiz.findAll({
      where: { courseId: req.params.courseId, isActive: true },
      include: [{
        model: User,
        as: 'instructor',
        attributes: ['id', 'name', 'email']
      }]
    });

    // Remove correctAnswer from questions for security
    const sanitizedQuizzes = quizzes.map(quiz => {
      const quizData = quiz.toJSON();
      if (quizData.questions) {
        quizData.questions = quizData.questions.map(q => {
          const { correctAnswer, ...questionWithoutAnswer } = q;
          return questionWithoutAnswer;
        });
      }
      return quizData;
    });

    res.status(200).json({
      success: true,
      count: sanitizedQuizzes.length,
      quizzes: sanitizedQuizzes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single quiz by ID
 * @route GET /api/quizzes/:id
 */
exports.getQuizById = async (req, res, next) => {
  try {
    const quiz = await Quiz.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'instructor',
        attributes: ['id', 'name', 'email']
      }]
    });

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Remove correctAnswer from questions for security
    const quizData = quiz.toJSON();
    if (quizData.questions) {
      quizData.questions = quizData.questions.map(q => {
        const { correctAnswer, ...questionWithoutAnswer } = q;
        return questionWithoutAnswer;
      });
    }

    res.status(200).json({
      success: true,
      quiz: quizData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new quiz (instructor only)
 * @route POST /api/courses/:courseId/quizzes
 */
exports.createQuiz = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is the instructor or admin
    if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to create quizzes for this course' });
    }

    const { title, description, type, questions, timeLimit, maxAttempts, passingScore } = req.body;

    const quiz = await Quiz.create({
      title,
      description,
      type: type || 'quiz',
      courseId: req.params.courseId,
      instructorId: req.user.id,
      questions,
      timeLimit,
      maxAttempts: maxAttempts || 1,
      passingScore: passingScore || 70
    });

    res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      quiz
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update quiz (instructor only)
 * @route PUT /api/quizzes/:id
 */
exports.updateQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findByPk(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if user is the instructor or admin
    if (quiz.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this quiz' });
    }

    await quiz.update(req.body);

    res.status(200).json({
      success: true,
      message: 'Quiz updated successfully',
      quiz
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete quiz (instructor only)
 * @route DELETE /api/quizzes/:id
 */
exports.deleteQuiz = async (req, res, next) => {
  try {
    const quiz = await Quiz.findByPk(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if user is the instructor or admin
    if (quiz.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this quiz' });
    }

    // Delete all attempts
    await QuizAttempt.destroy({ where: { quizId: req.params.id } });

    await quiz.destroy();

    res.status(200).json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit quiz attempt (student only)
 * @route POST /api/quizzes/:quizId/submit
 */
exports.submitQuiz = async (req, res, next) => {
  try {
    const { answers, timeSpent } = req.body;

    const quiz = await Quiz.findByPk(req.params.quizId);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if student has exceeded max attempts
    const attemptCount = await QuizAttempt.count({
      where: {
        quizId: req.params.quizId,
        studentId: req.user.id
      }
    });

    if (attemptCount >= quiz.maxAttempts) {
      return res.status(400).json({ message: 'Maximum quiz attempts reached' });
    }

    // Calculate score with auto-grading
    let totalPoints = 0;
    let earnedPoints = 0;
    const processedAnswers = [];

    quiz.questions.forEach((question, index) => {
      totalPoints += question.points;
      const userAnswer = answers[index];
      const isCorrect = userAnswer === question.correctAnswer;
      
      if (isCorrect) {
        earnedPoints += question.points;
      }

      processedAnswers.push({
        questionIndex: index,
        selectedAnswer: userAnswer,
        isCorrect
      });
    });

    const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = percentage >= quiz.passingScore;

    const attempt = await QuizAttempt.create({
      quizId: req.params.quizId,
      studentId: req.user.id,
      courseId: quiz.courseId,
      answers: processedAnswers,
      score: earnedPoints,
      totalPoints,
      percentage,
      passed,
      timeSpent: timeSpent || 0
    });

    await ActivityLog.create({
      studentId: req.user.id,
      courseId: quiz.courseId,
      activityType: 'quiz_attempt',
      performedAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Quiz submitted successfully',
      attempt
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get quiz attempts for a quiz (instructor only)
 * @route GET /api/quizzes/:quizId/attempts
 */
exports.getQuizAttempts = async (req, res, next) => {
  try {
    const quiz = await Quiz.findByPk(req.params.quizId);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if user is the instructor or admin
    if (quiz.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view quiz attempts' });
    }

    const attempts = await QuizAttempt.findAll({
      where: { quizId: req.params.quizId },
      include: [{
        model: User,
        as: 'student',
        attributes: ['id', 'name', 'email']
      }],
      order: [['completedAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: attempts.length,
      attempts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student's quiz attempts
 * @route GET /api/quizzes/my-attempts
 */
exports.getMyQuizAttempts = async (req, res, next) => {
  try {
    const attempts = await QuizAttempt.findAll({
      where: { studentId: req.user.id },
      include: [{
        model: Quiz,
        as: 'quiz',
        attributes: ['id', 'title', 'passingScore']
      }],
      order: [['completedAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: attempts.length,
      attempts
    });
  } catch (error) {
    next(error);
  }
};
