const express = require('express');
const router = express.Router();
const {
  getMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  deleteMaterial
} = require('../controllers/materialController');
const auth = require('../middleware/auth');
const { isInstructorOrAdmin } = require('../middleware/rbac');
const upload = require('../middleware/upload');

// Public routes
router.get('/module/:moduleId', getMaterials);
router.get('/:id', getMaterialById);

// Instructor only routes
router.post('/module/:moduleId', auth, isInstructorOrAdmin, upload.single('file'), createMaterial);
router.put('/:id', auth, isInstructorOrAdmin, upload.single('file'), updateMaterial);
router.delete('/:id', auth, isInstructorOrAdmin, deleteMaterial);

module.exports = router;
