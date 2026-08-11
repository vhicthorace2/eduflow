const express = require('express');
const router = express.Router();
const {
  getAssignments,
  getAssignmentById,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  submitAssignment,
  getSubmissions,
  gradeSubmission,
  getMySubmissions
} = require('../controllers/assignmentController');
const auth = require('../middleware/auth');
const { isInstructorOrAdmin } = require('../middleware/rbac');
const upload = require('../middleware/upload');

// Public routes
router.get('/course/:courseId', getAssignments);
router.get('/:id', getAssignmentById);

// Protected routes
router.post('/:assignmentId/submit', auth, upload.array('files', 5), submitAssignment);
router.get('/my-submissions', auth, getMySubmissions);

// Instructor only routes
router.post('/course/:courseId', auth, isInstructorOrAdmin, upload.array('attachments', 5), createAssignment);
router.put('/:id', auth, isInstructorOrAdmin, upload.array('attachments', 5), updateAssignment);
router.delete('/:id', auth, isInstructorOrAdmin, deleteAssignment);
router.get('/:assignmentId/submissions', auth, isInstructorOrAdmin, getSubmissions);
router.put('/submissions/:submissionId/grade', auth, isInstructorOrAdmin, gradeSubmission);

module.exports = router;
