const { Op } = require('sequelize');
const { Course, Module, Material, ActivityLog } = require('../models');

const MAX_RECOMMENDATIONS = 8;
const DIFFICULTY_WEIGHT = 30;
const NEW_MATERIAL_WEIGHT = 20;
const ENROLLED_WEIGHT = 10;
const SEQUENCE_WEIGHT = 10;

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

  const materials = await Material.findAll({
    where: { isActive: true, courseId: { [Op.in]: [...engagedCourseIds] } },
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

      let score = 0;
      if (isDifficult) score += DIFFICULTY_WEIGHT;
      if (next) score += SEQUENCE_WEIGHT;
      if (!isStudied) score += NEW_MATERIAL_WEIGHT;
      if (isEnrolledScoped) score += ENROLLED_WEIGHT;

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
        reason: pickReason(module, isStudied, isEnrolledScoped, isDifficult, next),
        score
      };
    })
    .sort((a, b) => b.score - a.score || (a.moduleOrder || 0) - (b.moduleOrder || 0))
    .slice(0, MAX_RECOMMENDATIONS);

  return { recommendations: ranked, total: ranked.length };
}

module.exports = { recommendResources };