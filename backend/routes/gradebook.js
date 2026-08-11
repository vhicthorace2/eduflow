const express = require('express');
const router = express.Router();
const {
  getCourseGradebook,
  updateGradebook,
  calculateGradebook,
  getMyGrades,
  getMyCgpa
} = require('../controllers/gradebookController');
const auth = require('../middleware/auth');
const { isInstructorOrAdmin } = require('../middleware/rbac');

// Protected routes
router.get('/my-grades', auth, getMyGrades);
router.get('/cgpa', auth, getMyCgpa);
router.get('/course/:courseId', auth, getCourseGradebook);

// Instructor only routes
router.put('/:id', auth, isInstructorOrAdmin, updateGradebook);
router.post('/course/:courseId/calculate', auth, isInstructorOrAdmin, calculateGradebook);

module.exports = router;
