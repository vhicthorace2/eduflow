const express = require('express');
const router = express.Router();
const {
  logActivity,
  getMyActivity,
  getCourseConsistency
} = require('../controllers/activityController');
const auth = require('../middleware/auth');

// Student routes
router.post('/', auth, logActivity);
router.get('/my', auth, getMyActivity);

module.exports = router;