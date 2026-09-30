const express = require('express');
const router = express.Router();
const {
  getModules,
  getModuleById,
  createModule,
  updateModule,
  deleteModule
} = require('../controllers/moduleController');
const auth = require('../middleware/auth');
const { isInstructorOrAdmin } = require('../middleware/rbac');

// Public routes (optionally personalized for signed-in students)
router.get('/course/:courseId', auth.authOptional, getModules);
router.get('/:id', auth.authOptional, getModuleById);

// Instructor only routes
router.post('/course/:courseId', auth, isInstructorOrAdmin, createModule);
router.put('/:id', auth, isInstructorOrAdmin, updateModule);
router.delete('/:id', auth, isInstructorOrAdmin, deleteModule);

module.exports = router;
