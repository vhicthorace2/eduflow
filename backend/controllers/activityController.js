const ActivityLog = require('../models/ActivityLog');
const Course = require('../models/Course');
const User = require('../models/User');
const Module = require('../models/Module');
const Enrollment = require('../models/Enrollment');

const DAY_MS = 24 * 60 * 60 * 1000;

const dayKey = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const dayFromKey = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Summarize a set of activity logs into consistency metrics.
 */
const summarizeActivity = (logs) => {
  const days = new Set(logs.map((log) => dayKey(log.performedAt)));
  const sortedDays = [...days].sort();

  let currentStreak = 0;
  let cursor = new Date();
  if (!days.has(dayKey(cursor))) {
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  while (days.has(dayKey(cursor))) {
    currentStreak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  let longestStreak = 0;
  let run = 0;
  let prev = null;
  for (const key of sortedDays) {
    if (prev && dayFromKey(prev).getTime() + DAY_MS === dayFromKey(key).getTime()) {
      run += 1;
    } else {
      run = 1;
    }
    longestStreak = Math.max(longestStreak, run);
    prev = key;
  }

  const now = new Date();
  const start7 = new Date(now.getTime() - 6 * DAY_MS);
  const start30 = new Date(now.getTime() - 29 * DAY_MS);
  const daysActive7 = sortedDays.filter((key) => dayFromKey(key) >= start7).length;
  const daysActive30 = sortedDays.filter((key) => dayFromKey(key) >= start30).length;

  const recent14 = [];
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(now.getTime() - i * DAY_MS);
    const key = dayKey(d);
    recent14.push({
      date: key,
      label: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      count: logs.filter((log) => dayKey(log.performedAt) === key).length,
      active: days.has(key)
    });
  }

  const byType = {};
  logs.forEach((log) => {
    byType[log.activityType] = (byType[log.activityType] || 0) + 1;
  });

  const score = Math.min(
    100,
    Math.round((daysActive7 / 7) * 50 + (daysActive30 / 30) * 30 + Math.min(currentStreak / 21, 1) * 20)
  );

  return {
    totalActivities: logs.length,
    daysActive: days.size,
    daysActive7,
    daysActive30,
    currentStreak,
    longestStreak,
    lastActive: sortedDays.length > 0 ? sortedDays[sortedDays.length - 1] : null,
    recent14,
    byType,
    score
  };
};

/**
 * Log a student learning activity
 * @route POST /api/activity
 */
exports.logActivity = async (req, res, next) => {
  try {
    const { courseId, moduleId, activityType, timeSpent } = req.body;

    if (!courseId || !['module_view', 'quiz_attempt', 'assignment_submit'].includes(activityType)) {
      return res.status(400).json({ message: 'courseId and a valid activityType are required' });
    }

    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (moduleId) {
      const module = await Module.findByPk(moduleId);
      if (!module) {
        return res.status(404).json({ message: 'Module not found' });
      }
    }

    let duration = 0;
    if (typeof timeSpent === 'number' && Number.isFinite(timeSpent) && timeSpent > 0) {
      duration = Math.max(0, Math.min(Math.round(timeSpent), 24 * 60 * 60));
    }

    const log = await ActivityLog.create({
      studentId: req.user.id,
      courseId,
      moduleId: moduleId || null,
      activityType,
      timeSpent: duration,
      performedAt: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Activity recorded',
      activity: log
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get authenticated student's own consistency summary
 * @route GET /api/activity/my
 */
exports.getMyActivity = async (req, res, next) => {
  try {
    const logs = await ActivityLog.findAll({
      where: { studentId: req.user.id }
    });

    res.status(200).json({
      success: true,
      summary: summarizeActivity(logs)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get consistency report for a course (instructor only)
 * @route GET /api/reports/courses/:courseId/consistency
 */
exports.getCourseConsistency = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.courseId, {
      include: [{ model: Module, as: 'modules', attributes: ['id', 'title', 'order'] }]
    });

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this report' });
    }

    const enrollments = await Enrollment.findAll({
      where: { courseId: req.params.courseId },
      include: [{
        model: User,
        as: 'student',
        attributes: ['id', 'name', 'email']
      }]
    });

    const studentIds = enrollments.map((en) => en.studentId);
    const logs = await ActivityLog.findAll({ where: { courseId: req.params.courseId } });

    const logsByStudent = {};
    logs.forEach((log) => {
      if (!logsByStudent[log.studentId]) logsByStudent[log.studentId] = [];
      logsByStudent[log.studentId].push(log);
    });

    const totalModules = course.modules?.length || 0;

    const students = enrollments.map((enrollment) => {
      const studentLogs = logsByStudent[enrollment.student.id] || [];
      const summary = summarizeActivity(studentLogs);
      const viewedModuleIds = new Set(
        studentLogs.filter((log) => log.activityType === 'module_view' && log.moduleId).map((log) => log.moduleId)
      );

      return {
        student: {
          id: enrollment.student.id,
          name: enrollment.student.name,
          email: enrollment.student.email,
          status: enrollment.status
        },
        ...summary,
        modulesViewed: viewedModuleIds.size,
        modulesTotal: totalModules,
        modulesPercent: totalModules > 0 ? Math.round((viewedModuleIds.size / totalModules) * 100) : 0
      };
    });

    const scored = students.filter((s) => s.score > 0);
    const averageScore = scored.length > 0
      ? Math.round(scored.reduce((sum, s) => sum + s.score, 0) / scored.length)
      : 0;

    res.status(200).json({
      success: true,
      report: {
        course: {
          id: course.id,
          title: course.title,
          totalModules
        },
        summary: {
          totalStudents: students.length,
          activeStudents: students.filter((s) => s.daysActive > 0).length,
          engagedStudents: students.filter((s) => s.daysActive7 > 0).length,
          averageScore,
          averageModules: students.length > 0
            ? Math.round(students.reduce((sum, s) => sum + s.modulesPercent, 0) / students.length)
            : 0
        },
        students
      }
    });
  } catch (error) {
    next(error);
  }
};