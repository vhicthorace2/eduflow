const express = require('express');
const router = express.Router();
const {
  getEnrollmentReport,
  getProgressReport,
  getParticipationReport,
  getInstructorDashboard,
  getAdminDashboard
} = require('../controllers/reportController');
const auth = require('../middleware/auth');
const { isInstructorOrAdmin, isAdmin } = require('../middleware/rbac');

// Instructor only routes
router.get('/courses/:courseId/enrollment', auth, isInstructorOrAdmin, getEnrollmentReport);
router.get('/courses/:courseId/progress', auth, isInstructorOrAdmin, getProgressReport);
router.get('/courses/:courseId/participation', auth, isInstructorOrAdmin, getParticipationReport);
router.get('/instructor/dashboard', auth, isInstructorOrAdmin, getInstructorDashboard);

// Admin only routes
router.get('/admin/dashboard', auth, isAdmin, getAdminDashboard);

module.exports = router;
