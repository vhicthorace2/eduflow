const fs = require('fs');
const client = require('../services/openaiservices.js');

const MIME_BY_EXT = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp'
};

const SYSTEM_PROMPT = [
  'You are Ifeanyi, a friendly, encouraging AI study assistant for the EduFlow learning platform.',
  'You help students understand course material, explain concepts, work through assignments, quizzes, and exam questions, and study effectively.',
  'When the student shares a photo or screenshot, read the question or material shown in the image carefully and answer it directly.',
  "Keep answers clear and structured with short paragraphs or bullet points, and use simple language a learner can understand.",
  'Never invent facts; if you are unsure, say so and suggest where the student can learn more.',
  'Sign off naturally as Ifeanyi when it fits the conversation.'
].join(' ');

function fallbackReply(content, hasImage) {
  const text = String(content || '').trim().toLowerCase();

  if (hasImage) {
    return "I can see you've shared a photo or screenshot, but I'm running in offline mode right now because the AI service isn't reachable, so I couldn't read it. Please try again in a moment — or type your question as text so I can still help.";
  }

  if (/^(hi|hello|hey|good (morning|afternoon|evening)|howdy)\b/.test(text)) {
    return "Hello! I'm Ifeanyi, your EduFlow study assistant. Ask me anything about your courses, or send me a photo or screenshot of a question and I'll help you work through it.";
  }

  if (text.includes('help') || text.includes('?') && text.length < 40) {
    return "I'm here to help! Tell me what you're working on — a topic from one of your courses, a specific question, or a screenshot of something you're stuck on — and I'll break it down for you.";
  }

  if (text.includes('course')) {
    return "I can help with any of your EduFlow courses — whether it's a concept you don't understand, a practice question, or knowing what to study next. What are you working on?";
  }

  return "I understand you're asking about something, but I'm currently in offline mode and can't reach the AI service. Please try again shortly and I'll answer fully — or rephrase your question and I'll do my best.";
}

function toDataUrl(imagePath) {
  const ext = String(imagePath.match(/(\.[^.]+)$/)?.[1] || '').toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) return null;
  try {
    const base64 = fs.readFileSync(imagePath).toString('base64');
    return `data:${mime};base64,${base64}`;
  } catch (error) {
    return null;
  }
}

function buildInput(history, text, imageDataUrl) {
  const messages = [];

  for (const entry of history) {
    const type = entry.role === 'assistant' ? 'output_text' : 'input_text';
    messages.push({ role: entry.role, content: [{ type, text: String(entry.content || '') }] });
  }

  const parts = [];
  if (text) parts.push({ type: 'input_text', text });
  if (imageDataUrl) parts.push({ type: 'input_image', image_url: imageDataUrl });

  if (parts.length > 0) {
    messages.push({ role: 'user', content: parts });
  }

  return messages;
}

async function generateReply({ content, imagePath, history }) {
  if (client) {
    try {
      const imageDataUrl = imagePath ? toDataUrl(imagePath) : null;
      const input = buildInput(Array.isArray(history) ? history : [], content, imageDataUrl);

      const response = await client.responses.create({
        model: process.env.OPENAI_MODEL || 'gpt-5.5',
        instructions: SYSTEM_PROMPT,
        input
      });

      const answer = (response.output_text || '').trim();
      if (answer) return answer;
    } catch (error) {
      // fall through to the offline responder below
    }
  }

  return fallbackReply(content, Boolean(imagePath));
}

module.exports = { generateReply, fallbackReply };