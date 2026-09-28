/**
 * Shared in-memory store for active placement assessments.
 * Used by both the assessment controller and the course enrollment gate so an
 * assessment started when enrolling can be completed via
 * POST /api/assessment/submit. In-memory by design (matches the original
 * single-process Express server); lost on restart.
 */
const activeAssessments = new Map();

const sanitizeQuestions = (questions) =>
  questions.map(({ correctAnswer, ...question }) => question);

module.exports = { activeAssessments, sanitizeQuestions };