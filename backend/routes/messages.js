const express = require('express');
const router = express.Router();
const {
  getMessages,
  getMessageById,
  sendMessage,
  replyToMessage,
  markAsRead,
  deleteMessage,
  getUnreadCount
} = require('../controllers/messageController');
const auth = require('../middleware/auth');

// Protected routes
router.get('/', auth, getMessages);
router.get('/unread-count', auth, getUnreadCount);
router.get('/:id', auth, getMessageById);
router.post('/', auth, sendMessage);
router.post('/:id/reply', auth, replyToMessage);
router.put('/:id/read', auth, markAsRead);
router.delete('/:id', auth, deleteMessage);

module.exports = router;
