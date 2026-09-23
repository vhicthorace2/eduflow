const { buildLearnerModel } = require('../agents/learnerModellingAgent.js');
const { recommendResources } = require('../agents/contentResourceAgent.js');

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