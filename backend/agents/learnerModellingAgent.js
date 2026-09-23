const { Op } = require('sequelize');
const {
  User,
  Course,
  Enrollment,
  QuizAttempt,
  Submission,
  ActivityLog
} = require('../models');

const PASS_RATE = 50;
const MASTERY_RATE = 80;

/**
 * Learner-Modelling Agent
 *
 * Maintains a snapshot of the learner's prior knowledge, performance,
 * learning activities, preferences, and areas of difficulty so other agents
 * (e.g. the content/resource agent) can make individualized decisions.
 * Pure data aggregation; deterministic, no external model calls.
 */
async function buildLearnerModel(studentId) {
  const [user, enrollments, quizAttempts, submissions, activityLogs] = await Promise.all([
    User.findByPk(studentId),
    Enrollment.findAll({
      where: { studentId, status: 'active' },
      include: [
        {
          model: Course,
          as: 'course',
          attributes: ['id', 'title', 'description']
        }
      ]
    }),
    QuizAttempt.findAll({
      where: { studentId },
      order: [['completedAt', 'DESC']]
    }),
    Submission.findAll({
      where: { studentId },
      order: [['gradedAt', 'DESC']]
    }),
    ActivityLog.findAll({
      where: { studentId },
      order: [['performedAt', 'DESC']]
    })
  ]);

  const gradedSubmissions = submissions.filter((s) => s.grade !== null && s.grade !== undefined);
  const quizPercentages = quizAttempts.map((attempt) => Number(attempt.percentage));
  const averageQuizPercentage = quizPercentages.length
    ? Math.round(quizPercentages.reduce((sum, value) => sum + value, 0) / quizPercentages.length)
    : null;
  const passedCount = quizAttempts.filter((attempt) => attempt.passed).length;

  const performanceByCourse = quizAttempts.reduce((map, attempt) => {
    if (!map.has(attempt.courseId)) map.set(attempt.courseId, []);
    map.get(attempt.courseId).push(Number(attempt.percentage));
    return map;
  }, new Map());

  const enrolledCourseIds = enrollments.map((enrollment) => enrollment.courseId);

  const difficultyAreas = [...performanceByCourse.entries()]
    .map(([courseId, percentages]) => {
      const average = Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length);
      return { courseId, averagePercentage: average, attempts: percentages.length };
    })
    .filter((entry) => entry.averagePercentage < PASS_RATE)
    .sort((a, b) => a.averagePercentage - b.averagePercentage)
    .map((entry) => {
      const enrollment = enrollments.find((e) => e.courseId === entry.courseId);
      return {
        courseId: entry.courseId,
        title: enrollment?.course?.title || null,
        averagePercentage: entry.averagePercentage,
        attempts: entry.attempts,
        recommendation: 'Revisit the fundamentals of this course'
      };
    });

  const completedCourses = [...performanceByCourse.entries()]
    .map(([courseId, percentages]) => {
      const average = Math.round(percentages.reduce((sum, value) => sum + value, 0) / percentages.length);
      return { courseId, averagePercentage: average };
    })
    .filter((entry) => entry.averagePercentage >= MASTERY_RATE)
    .map((entry) => {
      const enrollment = enrollments.find((e) => e.courseId === entry.courseId);
      return {
        courseId: entry.courseId,
        title: enrollment?.course?.title || null,
        averagePercentage: entry.averagePercentage
      };
    });

  const activityByType = activityLogs.reduce((map, log) => {
    map[log.activityType] = (map[log.activityType] || 0) + 1;
    return map;
  }, {});

  const totalTimeSpent = activityLogs.reduce((sum, log) => sum + (Number(log.timeSpent) || 0), 0);
  const modulesTouched = new Set(activityLogs.filter((log) => log.moduleId).map((log) => log.moduleId)).size;
  const activeDays = new Set(activityLogs.map((log) => new Date(log.performedAt).toISOString().slice(0, 10))).size;
  const totalActivities = activityLogs.length;

  let engagement = 'low';
  if (totalActivities >= 10 || totalTimeSpent >= 60 * 60) engagement = 'active';
  else if (totalActivities >= 3 || totalTimeSpent >= 15 * 60) engagement = 'steady';

  const averageAssignmentGrade = gradedSubmissions.length
    ? Math.round(gradedSubmissions.reduce((sum, s) => sum + (Number(s.grade) || 0), 0) / gradedSubmissions.length)
    : null;

  return {
    studentId,
    profile: {
      name: user?.name || 'Student',
      preferences: user?.preferences || { email: true, push: false, digest: true },
      engagement
    },
    priorKnowledge: {
      enrolledCourses: enrollments.map((enrollment) => ({
        courseId: enrollment.courseId,
        title: enrollment.course?.title || 'Untitled course'
      })),
      completedCourses,
      totalEnrolled: enrolledCourseIds.length
    },
    performance: {
      quizAttempts: quizAttempts.length,
      averageQuizPercentage,
      passedQuizzes: passedCount,
      quizPassRate: quizAttempts.length ? Math.round((passedCount / quizAttempts.length) * 100) : null,
      gradedSubmissions: gradedSubmissions.length,
      averageAssignmentGrade
    },
    activities: {
      byType: activityByType,
      totalActivities,
      totalTimeSpent,
      modulesTouched,
      activeDays,
      lastActiveAt: activityLogs.length ? activityLogs[0].performedAt : null
    },
    difficultyAreas
  };
}

module.exports = { buildLearnerModel };