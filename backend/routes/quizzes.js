const express = require('express');
const router = express.Router();
const {
  getQuizzes,
  getQuizById,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  submitQuiz,
  getQuizAttempts,
  getMyQuizAttempts
} = require('../controllers/quizController');
const auth = require('../middleware/auth');
const { isInstructorOrAdmin } = require('../middleware/rbac');

// Public routes
router.get('/course/:courseId', getQuizzes);

// Protected routes
router.get('/my-attempts', auth, getMyQuizAttempts);
router.post('/:quizId/submit', auth, submitQuiz);
router.get('/:id', getQuizById);

// Instructor only routes
router.post('/course/:courseId', auth, isInstructorOrAdmin, createQuiz);
router.put('/:id', auth, isInstructorOrAdmin, updateQuiz);
router.delete('/:id', auth, isInstructorOrAdmin, deleteQuiz);
router.get('/:quizId/attempts', auth, isInstructorOrAdmin, getQuizAttempts);

module.exports = router;
