const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus
} = require('../controllers/adminController');
const auth = require('../middleware/auth');
const { isAdmin } = require('../middleware/rbac');

// Admin only routes
router.get('/users', auth, isAdmin, getAllUsers);
router.get('/users/:id', auth, isAdmin, getUserById);
router.post('/users', auth, isAdmin, createUser);
router.put('/users/:id', auth, isAdmin, updateUser);
router.delete('/users/:id', auth, isAdmin, deleteUser);
router.put('/users/:id/toggle-status', auth, isAdmin, toggleUserStatus);

module.exports = router;
