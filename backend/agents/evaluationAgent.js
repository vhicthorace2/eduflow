function evaluateAnswers(studentAnswers, correctAnswers) {
  let score = 0;

  studentAnswers.forEach((answer, index) => {
    if (answer === correctAnswers[index]) {
      score++;
    }
  });

  return score;
}

/**
 * Grade a full attempt with a per-question breakdown. Each result records the
 * question, the student's answer, whether it was correct, the correct answer
 * for misses, and the topic/module the question belongs to (used to surface
 * weak areas for the learner agent and module recommendations).
 */
function evaluateDetailed(studentAnswers, questions) {
  const list = Array.isArray(questions) ? questions : [];
  const answers = Array.isArray(studentAnswers) ? studentAnswers : [];

  const results = list.map((q, index) => {
    const selected = Object.prototype.hasOwnProperty.call(answers, index) ? answers[index] : null;
    const isCorrect = selected !== null && selected !== undefined && String(selected) === String(q.correctAnswer);
    return {
      question: q.question,
      options: q.options || [],
      topic: q.topic || null,
      moduleOrder: q.moduleOrder ?? null,
      moduleTitle: q.moduleTitle || null,
      selectedAnswer: selected,
      correctAnswer: q.correctAnswer,
      isCorrect
    };
  });

  const score = results.filter((r) => r.isCorrect).length;
  const total = results.length;
  const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

  return {
    score,
    total,
    percentage,
    results,
    weaknesses: results.filter((r) => !r.isCorrect)
  };
}

module.exports = { evaluateAnswers, evaluateDetailed };
