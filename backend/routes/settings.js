const express = require('express');
const router = express.Router();
const { getSettings, updateSettings } = require('../controllers/settingsController');
const auth = require('../middleware/auth');

// Protected routes
router.get('/me', auth, getSettings);
router.put('/me', auth, updateSettings);

module.exports = router;
