const express = require('express');
const router = express.Router();
const {
  startAssessment,
  submitAssessment,
  evaluateAssessment,
  recommendAssessment
} = require('../controllers/assessmentController');
const auth = require('../middleware/auth');

router.post('/start', auth, startAssessment);
router.post('/submit', auth, submitAssessment);
router.post('/evaluate', auth, evaluateAssessment);
router.post('/recommend', auth, recommendAssessment);

module.exports = router;
