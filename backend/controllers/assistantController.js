const { AssistantMessage } = require('../models');
const { generateReply } = require('../agents/assistantAgent.js');

const HISTORY_FOR_CONTEXT = 8;

async function getContextHistory(studentId) {
  const recent = await AssistantMessage.findAll({
    where: { studentId },
    attributes: ['role', 'content'],
    order: [['createdAt', 'DESC']],
    limit: HISTORY_FOR_CONTEXT * 2
  });

  return recent.reverse().map((m) => ({ role: m.role, content: m.content }));
}

exports.sendMessage = async (req, res, next) => {
  try {
    const content = req.body && typeof req.body.content === 'string' ? req.body.content.trim() : '';
    const imageFile = req.file || null;

    if (!content && !imageFile) {
      return res.status(400).json({ message: 'Please provide a question or an image' });
    }

    const history = await getContextHistory(req.user.id);

    const answer = await generateReply({
      content,
      imagePath: imageFile ? imageFile.path : null,
      history
    });

    const userMessage = await AssistantMessage.create({
      studentId: req.user.id,
      role: 'user',
      content: content || 'Shared an image',
      imageUrl: imageFile ? `/uploads/${imageFile.filename}` : null
    });

    const assistantMessage = await AssistantMessage.create({
      studentId: req.user.id,
      role: 'assistant',
      content: answer
    });

    res.status(201).json({
      success: true,
      userMessage,
      message: assistantMessage
    });
  } catch (error) {
    next(error);
  }
};

exports.getHistory = async (req, res, next) => {
  try {
    const messages = await AssistantMessage.findAll({
      where: { studentId: req.user.id },
      order: [['createdAt', 'ASC']],
      limit: 100
    });

    res.status(200).json({ success: true, messages });
  } catch (error) {
    next(error);
  }
};