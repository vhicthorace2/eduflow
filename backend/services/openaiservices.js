const OpenAI = require('openai');

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

// The provider has to follow the key that is actually present. Defaulting to 'groq'
// regardless meant a lone OPENAI_API_KEY was still sent to Groq's endpoint, which
// rejected it with a 401 that the callers' bare catch turned into the offline message.
const inferredProvider = process.env.GROQ_API_KEY ? 'groq' : 'openai';
const provider = (process.env.AI_PROVIDER || inferredProvider).trim().toLowerCase();
const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;

let baseURL;
if (process.env.AI_BASE_URL) {
  baseURL = process.env.AI_BASE_URL;
} else if (provider !== 'openai') {
  baseURL = GROQ_BASE_URL;
}

const client = apiKey ? new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) }) : null;

const defaultModel = () => {
  if (process.env.AI_MODEL) return process.env.AI_MODEL;
  if (provider === 'openai') return process.env.OPENAI_MODEL || 'gpt-5.5';
  return 'llama-3.3-70b-versatile';
};

module.exports = { client, defaultModel };