const express = require('express');
const router = express.Router();
const { sendMessage, getHistory } = require('../controllers/assistantController');
const auth = require('../middleware/auth');
const { isStudent } = require('../middleware/rbac');
const upload = require('../middleware/upload');

router.post('/chat', auth, isStudent, upload.uploadAvatar.single('image'), sendMessage);
router.get('/history', auth, isStudent, getHistory);

module.exports = router;