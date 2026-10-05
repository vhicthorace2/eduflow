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

/**
 * Aggregate the questions the student actually missed into named weak areas, so
 * the result screen can name the gap instead of only listing wrong answers.
 *
 * Questions are grouped by their `topic` label, falling back to the module title
 * when the label is missing (LLM-generated questions carry no topic). Severity
 * comes from how many were missed and the miss rate within the group, which is
 * more honest than raw count: missing 2 of 2 is worse than missing 2 of 6.
 *
 * Each entry carries a `remedy` pointing at the module that covers it, so the UI
 * can offer to send the student straight there.
 */
function identifyWeaknesses(weaknesses, results, modules) {
  const missed = Array.isArray(weaknesses) ? weaknesses.filter(Boolean) : [];
  const all = Array.isArray(results) ? results.filter(Boolean) : [];
  const moduleList = Array.isArray(modules) ? modules.filter(Boolean) : [];

  if (missed.length === 0) return [];

  const labelOf = (w) => {
    const topic = typeof w.topic === 'string' ? w.topic.trim() : '';
    if (topic) return topic;
    const title = typeof w.moduleTitle === 'string' ? w.moduleTitle.trim() : '';
    return title || 'Untagged topic';
  };

  const groups = new Map();
  for (const w of missed) {
    const label = labelOf(w);
    const entry = groups.get(label) || {
      label,
      missed: 0,
      attempted: 0,
      moduleOrders: new Set(),
      moduleTitle: null,
      questions: []
    };
    entry.missed += 1;
    if (w.moduleOrder != null) entry.moduleOrders.add(w.moduleOrder);
    if (!entry.moduleTitle && typeof w.moduleTitle === 'string' && w.moduleTitle.trim()) {
      entry.moduleTitle = w.moduleTitle.trim();
    }
    entry.questions.push({
      question: w.question,
      options: Array.isArray(w.options) ? w.options : [],
      selectedAnswer: w.selectedAnswer ?? null,
      correctAnswer: w.correctAnswer ?? null,
      moduleOrder: w.moduleOrder ?? null,
      moduleTitle: w.moduleTitle ?? null
    });
    groups.set(label, entry);
  }

  // How many questions carried this same label, so the miss rate is per-topic
  // rather than against the whole assessment.
  for (const [label, entry] of groups) {
    entry.attempted = all.filter((r) => labelOf(r) === label).length || entry.missed;
  }

  const severityOf = (missedCount, attemptedCount) => {
    const rate = attemptedCount > 0 ? missedCount / attemptedCount : 0;
    if (missedCount >= 3 || rate >= 0.6) return 'critical';
    if (missedCount >= 2 || rate >= 0.4) return 'moderate';
    return 'minor';
  };

  const analysed = [...groups.values()].map((entry) => {
    const severity = severityOf(entry.missed, entry.attempted);
    const moduleOrder = entry.moduleOrders.size
      ? [...entry.moduleOrders].sort((a, b) => a - b)[0]
      : null;
    const module = moduleList.find((m) => m.order === moduleOrder);
    const moduleTitle = (module && module.title) || entry.moduleTitle;
    const missRate = entry.attempted > 0 ? Math.round((entry.missed / entry.attempted) * 100) : 0;

    return {
      label: entry.label,
      severity,
      missed: entry.missed,
      attempted: entry.attempted,
      missRate,
      moduleOrder,
      moduleTitle: moduleTitle || null,
      headline: severity === 'critical'
        ? `Your biggest gap right now is ${entry.label} — you missed ${entry.missed} of the ${entry.attempted} questions on it.`
        : `You missed ${entry.missed} of ${entry.attempted} questions on ${entry.label}.`,
      detail: moduleTitle
        ? `Covered in Module ${moduleOrder}: ${moduleTitle}.`
        : 'This topic could not be matched to a specific module.',
      questions: entry.questions,
      remedy: {
        type: moduleOrder != null ? 'study-module' : 'review-questions',
        moduleOrder,
        moduleTitle: moduleTitle || null
      }
    };
  });

  const rank = { critical: 0, moderate: 1, minor: 2 };
  return analysed
    .sort((a, b) => rank[a.severity] - rank[b.severity] || b.missed - a.missed || b.missRate - a.missRate)
    .slice(0, 3);
}

/**
 * One plain-language sentence for the result screen. Empty string when there is
 * nothing to fix, so the caller can show a positive message instead.
 */
function weaknessSummary(analysis) {
  const list = Array.isArray(analysis) ? analysis : [];
  if (list.length === 0) return '';

  const [top, ...rest] = list;
  const others = rest.map((w) => w.label);
  const tail = others.length
    ? ` Also shaky on ${others.join(' and ')}.`
    : '';

  return `${top.headline}${tail} Fixing ${top.label} first will move your score the most.`;
}

module.exports = { recommend, recommendModules, identifyWeaknesses, weaknessSummary };