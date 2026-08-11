const Message = require('../models/Message');
const User = require('../models/User');
const { Op } = require('sequelize');

/**
 * Get all messages for current user (sent and received)
 * @route GET /api/messages
 */
exports.getMessages = async (req, res, next) => {
  try {
    const { folder } = req.query; // inbox, sent, all

    let where = {};

    if (folder === 'inbox') {
      where = {
        recipientId: req.user.id,
        isDeletedByRecipient: false
      };
    } else if (folder === 'sent') {
      where = {
        senderId: req.user.id,
        isDeletedBySender: false
      };
    } else {
      where = {
        [Op.or]: [
          { senderId: req.user.id, isDeletedBySender: false },
          { recipientId: req.user.id, isDeletedByRecipient: false }
        ]
      };
    }

    const messages = await Message.findAll({
      where,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'email', 'avatar']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'name', 'email', 'avatar']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      count: messages.length,
      messages
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single message by ID
 * @route GET /api/messages/:id
 */
exports.getMessageById = async (req, res, next) => {
  try {
    const message = await Message.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'email', 'avatar']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'name', 'email', 'avatar']
        }
      ]
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is sender or recipient
    if (message.senderId !== req.user.id && message.recipientId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to view this message' });
    }

    // Mark as read if recipient
    if (message.recipientId === req.user.id && !message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      await message.save();
    }

    res.status(200).json({
      success: true,
      message
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send new message
 * @route POST /api/messages
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const { recipientEmail, subject, content } = req.body;

    // Find recipient
    const recipient = await User.findOne({ where: { email: recipientEmail } });
    if (!recipient) {
      return res.status(404).json({ message: 'Recipient not found' });
    }

    // Check if recipient is the same as sender
    if (recipient.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot send message to yourself' });
    }

    const message = await Message.create({
      senderId: req.user.id,
      recipientId: recipient.id,
      subject,
      content
    });

    const populatedMessage = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: populatedMessage
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reply to a message
 * @route POST /api/messages/:id/reply
 */
exports.replyToMessage = async (req, res, next) => {
  try {
    const originalMessage = await Message.findByPk(req.params.id);

    if (!originalMessage) {
      return res.status(404).json({ message: 'Original message not found' });
    }

    // Check if user is recipient or sender
    if (originalMessage.recipientId !== req.user.id && originalMessage.senderId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to reply to this message' });
    }

    const { content } = req.body;

    // Determine recipient (the other person in the conversation)
    const recipientId = originalMessage.senderId === req.user.id 
      ? originalMessage.recipientId 
      : originalMessage.senderId;

    const subject = `Re: ${originalMessage.subject}`;

    const message = await Message.create({
      senderId: req.user.id,
      recipientId: recipientId,
      subject,
      content
    });

    const populatedMessage = await Message.findByPk(message.id, {
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'recipient',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Reply sent successfully',
      data: populatedMessage
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark message as read
 * @route PUT /api/messages/:id/read
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const message = await Message.findByPk(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is recipient
    if (message.recipientId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to mark this message as read' });
    }

    message.isRead = true;
    message.readAt = new Date();
    await message.save();

    res.status(200).json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete message
 * @route DELETE /api/messages/:id
 */
exports.deleteMessage = async (req, res, next) => {
  try {
    const message = await Message.findByPk(req.params.id);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Check if user is sender or recipient
    if (message.senderId !== req.user.id && message.recipientId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    // Soft delete based on user role
    if (message.senderId === req.user.id) {
      message.isDeletedBySender = true;
    }
    if (message.recipientId === req.user.id) {
      message.isDeletedByRecipient = true;
    }

    // Permanently delete if both deleted
    if (message.isDeletedBySender && message.isDeletedByRecipient) {
      await message.destroy();
    } else {
      await message.save();
    }

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get unread message count
 * @route GET /api/messages/unread-count
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await Message.count({
      where: {
        recipientId: req.user.id,
        isRead: false,
        isDeletedByRecipient: false
      }
    });

    res.status(200).json({
      success: true,
      count
    });
  } catch (error) {
    next(error);
  }
};
