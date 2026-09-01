const express = require('express');
const router = express.Router();
const { getLeaderboard } = require('../controllers/leaderboardController');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', auth, authorize('student', 'instructor', 'lecturer', 'admin'), getLeaderboard);

module.exports = router;
