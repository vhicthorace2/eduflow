function recommend(score) {
  if (score >= 80) {
    return {
      level: 'Advanced',
      nextLesson: 'React Hooks'
    };
  }

  if (score >= 50) {
    return {
      level: 'Intermediate',
      nextLesson: 'JavaScript ES6'
    };
  }

  return {
    level: 'Beginner',
    nextLesson: 'HTML Fundamentals'
  };
}

module.exports = { recommend };
