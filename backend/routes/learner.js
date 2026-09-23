const express = require('express');
const router = express.Router();
const { getLearnerModel, getRecommendations } = require('../controllers/learnerController');
const auth = require('../middleware/auth');
const { isStudent } = require('../middleware/rbac');

router.get('/model', auth, isStudent, getLearnerModel);
router.get('/recommendations', auth, isStudent, getRecommendations);

module.exports = router;