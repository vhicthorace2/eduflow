const express = require('express');
const router = express.Router();
const { getLearnerModel, getRecommendations, getAssessmentInsights, setLearningMode } = require('../controllers/learnerController');
const auth = require('../middleware/auth');
const { isStudent } = require('../middleware/rbac');

router.get('/model', auth, isStudent, getLearnerModel);
router.get('/recommendations', auth, isStudent, getRecommendations);
router.get('/insights', auth, isStudent, getAssessmentInsights);
router.put('/preferences', auth, isStudent, setLearningMode);

module.exports = router;