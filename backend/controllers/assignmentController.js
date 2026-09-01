const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Course = require('../models/Course');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

/**
 * Get all assignments for a course
 * @route GET /api/courses/:courseId/assignments
 */
exports.getAssignments = async (req, res, next) => {
  try {
    const assignments = await Assignment.findAll({
      where: { courseId: req.params.courseId, isActive: true },
      include: [{
        model: User,
        as: 'instructor',
        attributes: ['id', 'name', 'email']
      }],
      order: [['dueDate', 'ASC']]
    });

    res.status(200).json({
      success: true,
      count: assignments.length,
      assignments
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single assignment by ID
 * @route GET /api/assignments/:id
 */
exports.getAssignmentById = async (req, res, next) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'instructor',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Submission,
          as: 'submissions'
        }
      ]
    });

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    res.status(200).json({
      success: true,
      assignment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new assignment (instructor only)
 * @route POST /api/courses/:courseId/assignments
 */
exports.createAssignment = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is the instructor or admin
    if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to create assignments for this course' });
    }

    const { title, description, instructions, dueDate, maxPoints } = req.body;
    const attachments = req.files ? req.files.map(f => f.path) : [];

    const assignment = await Assignment.create({
      title,
      description,
      instructions,
      courseId: req.params.courseId,
      instructorId: req.user.id,
      dueDate,
      maxPoints: maxPoints || 100,
      attachments
    });

    res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      assignment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update assignment (instructor only)
 * @route PUT /api/assignments/:id
 */
exports.updateAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if user is the instructor or admin
    if (assignment.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this assignment' });
    }

    const updateData = { ...req.body };
    if (req.files) {
      updateData.attachments = req.files.map(f => f.path);
    }

    await assignment.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Assignment updated successfully',
      assignment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete assignment (instructor only)
 * @route DELETE /api/assignments/:id
 */
exports.deleteAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findByPk(req.params.id);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if user is the instructor or admin
    if (assignment.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this assignment' });
    }

    // Delete all submissions
    await Submission.destroy({ where: { assignmentId: req.params.id } });

    await assignment.destroy();

    res.status(200).json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit assignment (student only)
 * @route POST /api/assignments/:assignmentId/submit
 */
exports.submitAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findByPk(req.params.assignmentId);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if already submitted
    const existingSubmission = await Submission.findOne({
      where: {
        assignmentId: req.params.assignmentId,
        studentId: req.user.id
      }
    });

    if (existingSubmission) {
      return res.status(400).json({ message: 'Assignment already submitted' });
    }

    const { comments } = req.body;
    const files = req.files ? req.files.map(f => ({
      filename: f.originalname,
      fileUrl: f.path,
      fileSize: f.size
    })) : [];

    // Check if submission is late
    const isLate = new Date() > new Date(assignment.dueDate);

    const submission = await Submission.create({
      assignmentId: req.params.assignmentId,
      studentId: req.user.id,
      courseId: assignment.courseId,
      files,
      comments,
      isLate
    });

    await ActivityLog.create({
      studentId: req.user.id,
      courseId: assignment.courseId,
      activityType: 'assignment_submit',
      performedAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Assignment submitted successfully',
      submission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get submissions for an assignment (instructor only)
 * @route GET /api/assignments/:assignmentId/submissions
 */
exports.getSubmissions = async (req, res, next) => {
  try {
    const assignment = await Assignment.findByPk(req.params.assignmentId);

    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found' });
    }

    // Check if user is the instructor or admin
    if (assignment.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view submissions' });
    }

    const submissions = await Submission.findAll({
      where: { assignmentId: req.params.assignmentId },
      include: [{
        model: User,
        as: 'student',
        attributes: ['id', 'name', 'email']
      }],
      order: [['submittedAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: submissions.length,
      submissions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Grade submission (instructor only)
 * @route PUT /api/submissions/:submissionId/grade
 */
exports.gradeSubmission = async (req, res, next) => {
  try {
    const { grade, feedback } = req.body;

    const submission = await Submission.findByPk(req.params.submissionId, {
      include: [{
        model: Assignment,
        as: 'assignment'
      }]
    });

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check if user is the instructor or admin
    if (submission.assignment.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to grade this submission' });
    }

    submission.grade = grade;
    submission.feedback = feedback;
    submission.gradedById = req.user.id;
    submission.gradedAt = new Date();

    await submission.save();

    res.status(200).json({
      success: true,
      message: 'Submission graded successfully',
      submission
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get student's submissions
 * @route GET /api/submissions/my-submissions
 */
exports.getMySubmissions = async (req, res, next) => {
  try {
    const submissions = await Submission.findAll({
      where: { studentId: req.user.id },
      include: [{
        model: Assignment,
        as: 'assignment',
        attributes: ['id', 'title', 'dueDate', 'maxPoints']
      }],
      order: [['submittedAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: submissions.length,
      submissions
    });
  } catch (error) {
    next(error);
  }
};
