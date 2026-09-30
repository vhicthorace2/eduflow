const { buildLearnerModel } = require('../agents/learnerModellingAgent.js');
const { recommendResources } = require('../agents/contentResourceAgent.js');
const { User } = require('../models');

/**
 * Return the learner model for the authenticated student
 * @route GET /api/learner/model
 */
exports.getLearnerModel = async (req, res, next) => {
  try {
    const model = await buildLearnerModel(req.user.id);
    res.status(200).json({ success: true, model });
  } catch (error) {
    next(error);
  }
};

const VALID_MODES = ['text', 'audio', 'video'];

/**
 * Persist the student's preferred mode of learning
 * @route PUT /api/learner/preferences
 */
exports.setLearningMode = async (req, res, next) => {
  try {
    const { learningMode } = req.body;

    if (!learningMode || !VALID_MODES.includes(learningMode)) {
      return res.status(400).json({ message: 'learningMode must be one of: text, audio, video' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.preferences = {
      ...(user.preferences || { email: true, push: false, digest: true }),
      learningMode
    };
    await user.save();

    const model = await buildLearnerModel(req.user.id);
    res.status(200).json({ success: true, model, learningMode });
  } catch (error) {
    next(error);
  }
};

/**
 * Return materials recommended by the content/resource agent for the student
 * @route GET /api/learner/recommendations
 */
exports.getRecommendations = async (req, res, next) => {
  try {
    const learnerModel = await buildLearnerModel(req.user.id);
    const { recommendations, total } = await recommendResources({
      studentId: req.user.id,
      learnerModel
    });
    res.status(200).json({ success: true, model: learnerModel, recommendations, total });
  } catch (error) {
    next(error);
  }
};

/**
 * Return the structured performance report routed to the learner agent after
 * each timed assessment: weak modules, review topics, and aggregate pass rate.
 * @route GET /api/learner/insights
 */
exports.getAssessmentInsights = async (req, res, next) => {
  try {
    const model = await buildLearnerModel(req.user.id);
    res.status(200).json({
      success: true,
      report: {
        weaknessAreas: model.weaknessAreas,
        performance: {
          assessmentAttempts: model.performance.assessmentAttempts,
          averageAssessmentPercentage: model.performance.averageAssessmentPercentage,
          assessmentPassRate: model.performance.assessmentPassRate
        }
      }
    });
  } catch (error) {
    next(error);
  }
};