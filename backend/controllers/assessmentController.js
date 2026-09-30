const crypto = require('crypto');
const { generateStudentTest } = require('../agents/assessmentAgent.js');
const { evaluateAnswers, evaluateDetailed } = require('../agents/evaluationAgent.js');
const { recommend, recommendModules } = require('../agents/recommendationAgent.js');
const { Course, Module, Enrollment, AssessmentAttempt } = require('../models');
const { activeAssessments, sanitizeQuestions } = require('../agents/assessmentStore.js');

const ASSESSMENT_TIME_LIMIT = 120; // seconds (2-minute quiz window)
const PASS_THRESHOLD = 50;

/**
 * Generate a timed assessment for a course and keep the answers server-side
 * @route POST /api/assessment/start
 */
exports.startAssessment = async (req, res, next) => {
  try {
    const { course, courseId } = req.body;

    if (!course || typeof course !== 'string') {
      return res.status(400).json({ message: 'Course topic is required' });
    }

    let courseRow = null;
    let modules = [];
    try {
      courseRow = courseId ? await Course.findByPk(courseId) : await Course.findOne({ where: { title: course } });
      if (courseRow) {
        modules = await Module.findAll({
          where: { courseId: courseRow.id, isActive: true },
          order: [['order', 'ASC']]
        });
      }
    } catch (error) {
      courseRow = null;
      modules = [];
    }

    const test = await generateStudentTest(courseRow ? courseRow.title : course, modules);

    const assessmentId = crypto.randomUUID();
    activeAssessments.set(assessmentId, {
      course: courseRow ? courseRow.title : course,
      courseId: courseRow ? courseRow.id : (courseId || null),
      modules: test.modules,
      questions: test.questions,
      correctAnswers: test.correctAnswers,
      startedAt: Date.now(),
      timeLimit: ASSESSMENT_TIME_LIMIT
    });

    res.status(200).json({
      success: true,
      assessmentId,
      course: courseRow ? courseRow.title : course,
      timeLimit: ASSESSMENT_TIME_LIMIT,
      moduleCount: test.modules.length,
      questions: sanitizeQuestions(test.questions)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Grade a timed assessment at completion or time expiry, give per-question
 * feedback, derive weak areas + module recommendations, and route the
 * structured report to the learner agent via an AssessmentAttempt record.
 * @route POST /api/assessment/submit
 */
exports.submitAssessment = async (req, res, next) => {
  try {
    const { assessmentId, answers, timeSpent } = req.body;

    const assessment = activeAssessments.get(assessmentId);
    if (!assessment) {
      return res.status(404).json({ message: 'Assessment not found or expired. Please start again.' });
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: 'answers array is required' });
    }

    const { score, total, percentage, results, weaknesses } = evaluateDetailed(answers, assessment.questions);

    const moduleTitles = assessment.modules.map((m) => m.title);
    const levelInfo = recommend(percentage, moduleTitles);
    const moduleRecommendations = recommendModules(weaknesses, assessment.modules, levelInfo.level);
    const primary = moduleRecommendations[0];

    const elapsed = Math.max(0, Math.round((Date.now() - (assessment.startedAt || Date.now())) / 1000));
    const usedSeconds = Number.isInteger(timeSpent) ? Math.min(timeSpent, assessment.timeLimit) : elapsed;

    let course = null;
    let enrolled = false;
    let attempt = null;
    try {
      course = assessment.courseId
        ? await Course.findByPk(assessment.courseId)
        : await Course.findOne({ where: { title: assessment.course } });
      if (course && req.user && req.user.id) {
        const [, created] = await Enrollment.findOrCreate({
          where: { courseId: course.id, studentId: req.user.id },
          defaults: { status: 'active', enrolledAt: new Date() }
        });
        enrolled = true;
        if (created) {
          console.log(`Enrolled student ${req.user.id} in course ${course.id}`);
        }

        try {
          attempt = await AssessmentAttempt.create({
            studentId: req.user.id,
            courseId: course.id,
            answers,
            results,
            weaknesses,
            moduleRecommendations,
            score,
            total,
            percentage,
            passed: percentage >= PASS_THRESHOLD,
            level: levelInfo.level,
            timeSpent: usedSeconds
          });
        } catch (error) {
          attempt = null;
        }
      }
    } catch (error) {
      course = null;
      enrolled = false;
    }

    activeAssessments.delete(assessmentId);

    res.status(200).json({
      success: true,
      score,
      total,
      percentage,
      passed: percentage >= PASS_THRESHOLD,
      enrolled,
      timeSpent: usedSeconds,
      timeExpired: usedSeconds >= assessment.timeLimit,
      level: levelInfo.level,
      results,
      weakAreas: weaknesses,
      moduleRecommendations,
      recommendedModule: primary ? primary.moduleTitle : levelInfo.recommendedModule,
      recommendedModuleOrder: primary ? primary.moduleOrder : (levelInfo.recommendedModuleOrder ?? null),
      recommendedModules: moduleRecommendations.map((r) => ({ order: r.moduleOrder, title: r.moduleTitle })),
      attemptId: attempt ? attempt.id : null
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Evaluate student answers against correct answers (stateless, client-supplied)
 * @route POST /api/assessment/evaluate
 */
exports.evaluateAssessment = async (req, res, next) => {
  try {
    const { studentAnswers, correctAnswers } = req.body;

    if (!Array.isArray(studentAnswers) || !Array.isArray(correctAnswers)) {
      return res.status(400).json({ message: 'studentAnswers and correctAnswers arrays are required' });
    }

    const score = evaluateAnswers(studentAnswers, correctAnswers);
    const total = correctAnswers.length;
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0;

    res.status(200).json({
      success: true,
      score,
      total,
      percentage
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Recommend a learning level and next lesson based on a score
 * @route POST /api/assessment/recommend
 */
exports.recommendAssessment = async (req, res, next) => {
  try {
    const { score } = req.body;

    if (typeof score !== 'number' || Number.isNaN(score)) {
      return res.status(400).json({ message: 'Score (number) is required' });
    }

    const recommendation = recommend(score);

    res.status(200).json({
      success: true,
      score,
      ...recommendation
    });
  } catch (error) {
    next(error);
  }
};
