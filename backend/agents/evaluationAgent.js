function evaluateAnswers(studentAnswers, correctAnswers) {
  let score = 0;

  studentAnswers.forEach((answer, index) => {
    if (answer === correctAnswers[index]) {
      score++;
    }
  });

  return score;
}

module.exports = { evaluateAnswers };
