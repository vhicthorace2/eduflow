/**
 * Recommendation agent: maps a performance percentage to a learning level and,
 * when given the course's ordered module titles, to the specific module the
 * student should start with.
 *
 * Mapping: Beginner (0-49) -> first module, Intermediate (50-79) -> middle
 * module, Advanced (80-100) -> most advanced / final module.
 */
function pickModule(modules, level) {
  const list = Array.isArray(modules) ? modules.filter(Boolean) : [];

  if (list.length === 0) {
    const fallback = {
      Advanced: 'Capstone / most advanced module',
      Intermediate: 'A middle-level module',
      Beginner: 'The introductory module'
    };
    return {
      recommendedModule: fallback[level] || 'The introductory module',
      recommendedModuleOrder: null
    };
  }

  if (level === 'Beginner') {
    return { recommendedModule: list[0], recommendedModuleOrder: 1 };
  }

  if (level === 'Advanced') {
    return { recommendedModule: list[list.length - 1], recommendedModuleOrder: list.length };
  }

  return {
    recommendedModule: list[Math.floor(list.length / 2)],
    recommendedModuleOrder: Math.floor(list.length / 2) + 1
  };
}

function recommend(score, modules) {
  let level;

  if (score >= 80) {
    level = 'Advanced';
  } else if (score >= 50) {
    level = 'Intermediate';
  } else {
    level = 'Beginner';
  }

  return {
    level,
    nextLesson: '',
    ...pickModule(modules, level)
  };
}

module.exports = { recommend };