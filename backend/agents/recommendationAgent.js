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

/**
 * Rank course modules by how many questions the student missed in each,
 * producing the specific module(s) to review. Modules with more misses come
 * first (ties broken by module order). On a perfect score the fallback is the
 * level-based module pick (Advanced -> most advanced module).
 */
function recommendModules(weaknesses, modules, level) {
  const list = Array.isArray(modules) ? modules.filter(Boolean) : [];
  const byOrder = new Map();

  for (const w of weaknesses) {
    if (w.moduleOrder == null) continue;
    const entry = byOrder.get(w.moduleOrder) || { moduleOrder: w.moduleOrder, missed: 0, topics: [] };
    entry.missed += 1;
    if (w.topic && !entry.topics.includes(w.topic)) entry.topics.push(w.topic);
    byOrder.set(w.moduleOrder, entry);
  }

  let ranked = [...byOrder.values()].sort((a, b) => b.missed - a.missed || a.moduleOrder - b.moduleOrder);

  if (ranked.length === 0) {
    const titles = list.map((m) => m.title);
    const levelPick = pickModule(titles, level);
    const module = list.find((m) => m.order === levelPick.recommendedModuleOrder);
    if (module) {
      ranked = [{ moduleOrder: module.order, missed: 0, topics: [] }];
    }
  }

  return ranked.slice(0, 3).map((entry) => {
    const module = list.find((m) => m.order === entry.moduleOrder);
    return {
      moduleOrder: entry.moduleOrder,
      moduleTitle: module ? module.title : (entry.moduleTitle || 'Course module'),
      missed: entry.missed,
      topics: entry.topics
    };
  });
}

module.exports = { recommend, recommendModules };