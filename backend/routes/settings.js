const express = require('express');
const router = express.Router();
const { getSettings, updateSettings, updateAvatar } = require('../controllers/settingsController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

// Protected routes
router.get('/me', auth, getSettings);
router.put('/me', auth, updateSettings);
router.put('/me/avatar', auth, upload.uploadAvatar.single('avatar'), updateAvatar);

module.exports = router;
