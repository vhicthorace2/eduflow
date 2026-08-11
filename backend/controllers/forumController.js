const Forum = require('../models/Forum');
const Thread = require('../models/Thread');
const Reply = require('../models/Reply');
const Course = require('../models/Course');
const User = require('../models/User');

/**
 * Get all forums for a course
 * @route GET /api/courses/:courseId/forums
 */
exports.getForums = async (req, res, next) => {
  try {
    const forums = await Forum.findAll({
      where: { courseId: req.params.courseId, isActive: true },
      include: [{
        model: Thread,
        as: 'threads'
      }]
    });

    res.status(200).json({
      success: true,
      count: forums.length,
      forums
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new forum (instructor only)
 * @route POST /api/courses/:courseId/forums
 */
exports.createForum = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is the instructor or admin
    if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to create forums for this course' });
    }

    const { title, description } = req.body;

    const forum = await Forum.create({
      title,
      description,
      courseId: req.params.courseId
    });

    res.status(201).json({
      success: true,
      message: 'Forum created successfully',
      forum
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all threads for a forum
 * @route GET /api/forums/:forumId/threads
 */
exports.getThreads = async (req, res, next) => {
  try {
    const threads = await Thread.findAll({
      where: { forumId: req.params.forumId },
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'email', 'avatar']
        },
        {
          model: Reply,
          as: 'replies',
          include: [{
            model: User,
            as: 'author',
            attributes: ['id', 'name', 'email', 'avatar']
          }]
        }
      ],
      order: [['isPinned', 'DESC'], ['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: threads.length,
      threads
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new thread
 * @route POST /api/forums/:forumId/threads
 */
exports.createThread = async (req, res, next) => {
  try {
    const forum = await Forum.findByPk(req.params.forumId);

    if (!forum) {
      return res.status(404).json({ message: 'Forum not found' });
    }

    const { title, content } = req.body;

    const thread = await Thread.create({
      title,
      content,
      authorId: req.user.id,
      forumId: req.params.forumId,
      courseId: forum.courseId
    });

    // Increment user's forum post count
    const user = await User.findByPk(req.user.id);
    await user.incrementForumPosts();

    res.status(201).json({
      success: true,
      message: 'Thread created successfully',
      thread
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single thread by ID
 * @route GET /api/threads/:id
 */
exports.getThreadById = async (req, res, next) => {
  try {
    const thread = await Thread.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'author',
          attributes: ['id', 'name', 'email', 'avatar']
        },
        {
          model: Reply,
          as: 'replies',
          include: [{
            model: User,
            as: 'author',
            attributes: ['id', 'name', 'email', 'avatar']
          }],
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    // Increment view count
    thread.viewCount += 1;
    await thread.save();

    res.status(200).json({
      success: true,
      thread
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reply to a thread
 * @route POST /api/threads/:threadId/replies
 */
exports.createReply = async (req, res, next) => {
  try {
    const thread = await Thread.findByPk(req.params.threadId);

    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    if (thread.isLocked) {
      return res.status(400).json({ message: 'Thread is locked' });
    }

    const { content, parentReply } = req.body;

    const reply = await Reply.create({
      content,
      authorId: req.user.id,
      threadId: req.params.threadId,
      parentReplyId: parentReply || null
    });

    // Increment user's forum post count
    const user = await User.findByPk(req.user.id);
    await user.incrementForumPosts();

    res.status(201).json({
      success: true,
      message: 'Reply created successfully',
      reply
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Pin/Unpin thread (instructor only)
 * @route PUT /api/threads/:id/pin
 */
exports.togglePinThread = async (req, res, next) => {
  try {
    const thread = await Thread.findByPk(req.params.id);

    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    // Check if user is instructor of the course
    const course = await Course.findByPk(thread.courseId);
    if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to pin this thread' });
    }

    thread.isPinned = !thread.isPinned;
    await thread.save();

    res.status(200).json({
      success: true,
      message: `Thread ${thread.isPinned ? 'pinned' : 'unpinned'} successfully`,
      thread
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Lock/Unlock thread (instructor only)
 * @route PUT /api/threads/:id/lock
 */
exports.toggleLockThread = async (req, res, next) => {
  try {
    const thread = await Thread.findByPk(req.params.id);

    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    // Check if user is instructor of the course
    const course = await Course.findByPk(thread.courseId);
    if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to lock this thread' });
    }

    thread.isLocked = !thread.isLocked;
    await thread.save();

    res.status(200).json({
      success: true,
      message: `Thread ${thread.isLocked ? 'locked' : 'unlocked'} successfully`,
      thread
    });
  } catch (error) {
    next(error);
  }
};
