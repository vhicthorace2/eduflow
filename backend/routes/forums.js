const express = require('express');
const router = express.Router();
const {
  getForums,
  createForum,
  getThreads,
  createThread,
  getThreadById,
  createReply,
  togglePinThread,
  toggleLockThread
} = require('../controllers/forumController');
const auth = require('../middleware/auth');
const { isInstructorOrAdmin } = require('../middleware/rbac');

// Public routes
router.get('/course/:courseId', getForums);
router.get('/:forumId/threads', getThreads);
router.get('/threads/:id', getThreadById);

// Protected routes
router.post('/:forumId/threads', auth, createThread);
router.post('/threads/:threadId/replies', auth, createReply);

// Instructor only routes
router.post('/course/:courseId', auth, isInstructorOrAdmin, createForum);
router.put('/threads/:id/pin', auth, isInstructorOrAdmin, togglePinThread);
router.put('/threads/:id/lock', auth, isInstructorOrAdmin, toggleLockThread);

module.exports = router;
