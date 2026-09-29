const { Op } = require('sequelize');
const { Course, Module, Material, ActivityLog } = require('../models');

const MAX_RECOMMENDATIONS = 8;
const DIFFICULTY_WEIGHT = 30;
const NEW_MATERIAL_WEIGHT = 20;
const ENROLLED_WEIGHT = 10;
const SEQUENCE_WEIGHT = 10;
const PREFERENCE_WEIGHT = 25;

const YOUTUBE_SEARCH_URL = 'https://www.youtube.com/results?search_query=';
const YOUTUBE_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const PREFERRED_TYPES = {
  text: ['document', 'link'],
  audio: ['audio', 'link'],
  video: ['video']
};

/**
 * Content / Resource Agent
 *
 * Manages the instructional resource catalogue and recommends materials based
 * on the learner model: it prioritizes resources that target the learner's
 * areas of difficulty, then new material in courses they are working through.
 * Deterministic scoring; no external model calls.
 */
function pickReason(module, isStudied, courseIdInScope, isDifficult, isNextInSequence) {
  if (isDifficult) return 'Targets an area you have found difficult';
  if (isNextInSequence) return 'Next material in your course sequence';
  if (isStudied) return 'Review material from a course you are studying';
  if (courseIdInScope) return 'Recommended for your active courses';
  return 'Recommended learning material';
}

async function recommendResources({ studentId, learnerModel } = {}) {
  const model = learnerModel || {};
  const priorKnowledge = model.priorKnowledge || {};
  const difficultyAreas = Array.isArray(model.difficultyAreas) ? model.difficultyAreas : [];

  const enrolledCourseIds = (priorKnowledge.enrolledCourses || []).map((course) => course.courseId);
  const difficultyCourseIds = difficultyAreas.map((area) => area.courseId);
  const learningMode = (model.profile && model.profile.learningMode) || null;
  const preferredTypes = PREFERRED_TYPES[learningMode] || null;
  const engagedCourseIds = new Set([
    ...enrolledCourseIds,
    ...difficultyCourseIds
  ]);

  const activityLogs = await ActivityLog.findAll({
    where: { studentId },
    attributes: ['moduleId', 'courseId', 'activityType', 'performedAt'],
    order: [['performedAt', 'DESC']]
  });

  if (engagedCourseIds.size === 0) {
    activityLogs.forEach((log) => {
      if (log.courseId) engagedCourseIds.add(log.courseId);
    });
  }

  const studiedModuleIds = new Set(
    activityLogs.filter((log) => log.activityType === 'module_view' && log.moduleId).map((log) => log.moduleId)
  );

  if (engagedCourseIds.size === 0) {
    return { recommendations: [], total: 0 };
  }

  const whereClause = { isActive: true, courseId: { [Op.in]: [...engagedCourseIds] } };
  if (preferredTypes) whereClause.type = { [Op.in]: preferredTypes };

  const materials = await Material.findAll({
    where: whereClause,
    include: [
      {
        model: Module,
        as: 'module',
        attributes: ['id', 'title', 'order', 'description'],
        include: [
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'title']
          }
        ]
      }
    ],
    order: [
      ['order', 'ASC'],
      ['id', 'ASC']
    ],
    limit: 300
  });

  const firstUnstudiedModuleByCourse = new Map();
  [...engagedCourseIds].forEach((courseId) => {
    firstUnstudiedModuleByCourse.set(courseId, null);
  });

  const ranked = materials
    .map((material) => {
      const module = material.module || {};
      const course = module.course || {};
      const isDifficult = difficultyCourseIds.includes(course.id);
      const isEnrolledScoped = enrolledCourseIds.includes(course.id);
      const isStudied = Boolean(module.id && studiedModuleIds.has(module.id));

      let next = false;
      if (!isStudied && isEnrolledScoped && firstUnstudiedModuleByCourse.get(course.id) === null) {
        firstUnstudiedModuleByCourse.set(course.id, module.id || null);
        next = true;
      }

      const fitsPreference = Boolean(preferredTypes && preferredTypes.includes(material.type));

      let score = 0;
      if (isDifficult) score += DIFFICULTY_WEIGHT;
      if (next) score += SEQUENCE_WEIGHT;
      if (!isStudied) score += NEW_MATERIAL_WEIGHT;
      if (isEnrolledScoped) score += ENROLLED_WEIGHT;
      if (fitsPreference) score += PREFERENCE_WEIGHT;

      let reason = pickReason(module, isStudied, isEnrolledScoped, isDifficult, next);
      if (fitsPreference && (reason === 'Recommended learning material' || reason.startsWith('Review'))) {
        reason = `Matches your ${learningMode} learning style`;
      }

      return {
        materialId: material.id,
        title: material.title,
        type: material.type,
        fileUrl: material.fileUrl,
        videoUrl: material.videoUrl,
        linkUrl: material.linkUrl,
        description: material.description,
        moduleId: module.id,
        moduleTitle: module.title || 'Untitled module',
        moduleOrder: module.order,
        courseId: course.id,
        courseTitle: course.title || 'Untitled course',
        reason,
        score
      };
    })
    .sort((a, b) => b.score - a.score || (a.moduleOrder || 0) - (b.moduleOrder || 0))
    .slice(0, MAX_RECOMMENDATIONS);

  return { recommendations: ranked, total: ranked.length };
}

/**
 * Resolve the top real YouTube video for a search query (no API key needed).
 * Fetches the search page and extracts the first embedded video ID, returning
 * a canonical `https://www.youtube.com/watch?v=<id>` URL — or null when the
 * video cannot be resolved (network blocked, no results).
 */
async function resolveYouTubeVideo(searchQuery) {
  try {
    const url = YOUTUBE_SEARCH_URL + encodeURIComponent(searchQuery);
    const res = await fetch(url, {
      headers: { 'User-Agent': YOUTUBE_UA, 'Accept-Language': 'en-US,en;q=0.9' },
      redirect: 'follow'
    });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/"videoId":"([\w-]{11})"/);
    return match ? `https://www.youtube.com/watch?v=${match[1]}` : null;
  } catch (error) {
    return null;
  }
}

/**
 * Persist a watch URL on a module's video material, retrying transient pool
 * errors (e.g. a slow cold Neon connection) so one failure never aborts the
 * rest of the course run.
 */
async function updateVideoMaterial(module, watchUrl) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const [affected] = await Material.update(
        { videoUrl: watchUrl, linkUrl: watchUrl },
        { where: { moduleId: module.id, type: 'video' } }
      );
      return { updated: Number(affected) > 0, error: null };
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  return { updated: false, error: lastError };
}

/**
 * Attach a real YouTube video to every module's "Video Lesson" material for a
 * course, searched by module topic ("<course title> <module title> tutorial").
 * Persists the watch URL into the material's videoUrl + linkUrl so the
 * frontend embeds it directly. Falls back to the existing value when YouTube
 * is unreachable, keeping any material that already has a playable video.
 */
async function attachCourseVideos(course) {
  const modules = await Module.findAll({
    where: { courseId: course.id, isActive: true },
    order: [['order', 'ASC']]
  });

  const videos = await Material.findAll({
    where: { moduleId: { [Op.in]: modules.map((m) => m.id) }, type: 'video' }
  });
  const existingByModule = new Map(videos.map((m) => [m.moduleId, m.videoUrl]));
  const isReal = (url) => url && /(youtube\.com\/watch\?|youtu\.be\/)/.test(url);

  const pending = modules.filter((m) => !isReal(existingByModule.get(m.id)));

  const batchSize = 5;
  const results = [];
  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize);
    const watchUrls = await Promise.all(
      batch.map((module) => resolveYouTubeVideo(`${course.title} ${module.title} tutorial`))
    );

    for (let j = 0; j < batch.length; j++) {
      const module = batch[j];
      const watchUrl = watchUrls[j];
      const persist = watchUrl
        ? await updateVideoMaterial(module, watchUrl)
        : { updated: false, error: null };

      results.push({
        courseId: course.id,
        courseTitle: course.title,
        moduleId: module.id,
        moduleTitle: module.title,
        videoUrl: watchUrl,
        updated: persist.updated,
        error: persist.error ? persist.error.message : null
      });
    }
  }

  return results;
}

async function attachAllCourseVideos() {
  const courses = await Course.findAll({ where: { isActive: true }, order: [['title', 'ASC']] });
  const results = [];
  for (const course of courses) {
    results.push(...(await attachCourseVideos(course)));
  }
  return results;
}

module.exports = { recommendResources, resolveYouTubeVideo, attachCourseVideos, attachAllCourseVideos };