const crypto = require('crypto');
const { generateAssessment } = require('../.agents/assessmentAgent.js');
const { evaluateAnswers } = require('../.agents/evaluationAgent.js');
const { recommend } = require('../.agents/recommendationAgent.js');
const { Course, Module, Enrollment } = require('../models');

const activeAssessments = new Map();

const sanitizeQuestions = (questions) =>
  questions.map(({ correctAnswer, ...question }) => question);

/**
 * Generate assessment questions for a course and keep the answers server-side
 * @route POST /api/assessment/start
 */
exports.startAssessment = async (req, res, next) => {
  try {
    const { course, courseId } = req.body;

    if (!course || typeof course !== 'string') {
      return res.status(400).json({ message: 'Course topic is required' });
    }

    const questions = await generateAssessment(course);

    const assessmentId = crypto.randomUUID();
    activeAssessments.set(assessmentId, {
      course,
      courseId: courseId || null,
      questions,
      correctAnswers: questions.map((q) => q.correctAnswer)
    });

    res.status(200).json({
      success: true,
      assessmentId,
      course,
      questions: sanitizeQuestions(questions)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Evaluate student answers and recommend a level based on performance
 * @route POST /api/assessment/submit
 */
exports.submitAssessment = async (req, res, next) => {
  try {
    const { assessmentId, answers } = req.body;

    const assessment = activeAssessments.get(assessmentId);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found or expired. Please start again.' });
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: 'answers array is required' });
    }

    const score = evaluateAnswers(answers, assessment.correctAnswers);
    const total = assessment.correctAnswers.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

    let modules = [];
    let enrolled = false;
    try {
      const course = assessment.courseId
        ? await Course.findByPk(assessment.courseId)
        : await Course.findOne({ where: { title: assessment.course } });
      if (course) {
        const courseModules = await Module.findAll({
          where: { courseId: course.id, isActive: true },
          order: [['order', 'ASC']]
        });
        modules = courseModules.map((m) => m.title);

        if (req.user && req.user.id) {
          const [, created] = await Enrollment.findOrCreate({
            where: { courseId: course.id, studentId: req.user.id },
            defaults: { status: 'active', enrolledAt: new Date() }
          });
          enrolled = true;
          if (created) {
            console.log(`Enrolled student ${req.user.id} in course ${course.id}`);
          }
        }
      }
    } catch (error) {
      modules = [];
      enrolled = false;
    }

    const recommendation = recommend(percentage, modules);

    activeAssessments.delete(assessmentId);

    res.status(200).json({
      success: true,
      score,
      total,
      percentage,
      enrolled,
      ...recommendation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Evaluate student answers against correct answers (stateless, client-supplied)
 * @route POST /api/assessment/evaluate
 */
exports.evaluateAssessment = async (req, res, next) => {
  try {
    const { studentAnswers, correctAnswers } = req.body;

    if (!Array.isArray(studentAnswers) || !Array.isArray(correctAnswers)) {
      return res.status(400).json({ message: 'studentAnswers and correctAnswers arrays are required' });
    }

    const score = evaluateAnswers(studentAnswers, correctAnswers);
    const total = correctAnswers.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

    res.status(200).json({
      success: true,
      score,
      total,
      percentage
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Recommend a learning level and next lesson based on a score
 * @route POST /api/assessment/recommend
 */
exports.recommendAssessment = async (req, res, next) => {
  try {
    const { score } = req.body;

    if (typeof score !== 'number' || Number.isNaN(score)) {
      return res.status(400).json({ message: 'Score (number) is required' });
    }

    const recommendation = recommend(score);

    res.status(200).json({
      success: true,
      score,
      ...recommendation
    });
  } catch (error) {
    next(error);
  }
};
