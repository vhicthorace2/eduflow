const crypto = require('crypto');
const { generateAssessment } = require('../.agents/assessmentAgent.js');
const { evaluateAnswers } = require('../.agents/evaluationAgent.js');
const { recommend } = require('../.agents/recommendationAgent.js');

const activeAssessments = new Map();

const sanitizeQuestions = (questions) =>
  questions.map(({ correctAnswer, ...question }) => question);

/**
 * Generate assessment questions for a course and keep the answers server-side
 * @route POST /api/assessment/start
 */
exports.startAssessment = async (req, res, next) => {
  try {
    const { course } = req.body;

    if (!course || typeof course !== 'string') {
      return res.status(400).json({ message: 'Course topic is required' });
    }

    const questions = await generateAssessment(course);

    const assessmentId = crypto.randomUUID();
    activeAssessments.set(assessmentId, {
      course,
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
    const recommendation = recommend(percentage);

    activeAssessments.delete(assessmentId);

    res.status(200).json({
      success: true,
      score,
      total,
      percentage,
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
