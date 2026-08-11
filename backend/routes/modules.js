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

// Public routes
router.get('/course/:courseId', getModules);
router.get('/:id', getModuleById);

// Instructor only routes
router.post('/course/:courseId', auth, isInstructorOrAdmin, createModule);
router.put('/:id', auth, isInstructorOrAdmin, updateModule);
router.delete('/:id', auth, isInstructorOrAdmin, deleteModule);

module.exports = router;
