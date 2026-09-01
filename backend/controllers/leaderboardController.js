const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const QuizAttempt = require('../models/QuizAttempt');
const Submission = require('../models/Submission');
const Assignment = require('../models/Assignment');
const Quiz = require('../models/Quiz');
const Gradebook = require('../models/Gradebook');
const { Op } = require('sequelize');

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/**
 * Get the top 5 students ranked by engagement and academic performance.
 * Engagement = total seconds spent on content (ActivityLog.timeSpent).
 * Academic = average of each student's best quiz percentage, graded
 * assignment percentage, and gradebook overall grade.
 * Composite is 50% normalized engagement + 50% academics.
 * @route GET /api/leaderboard
 */
exports.getLeaderboard = async (req, res, next) => {
  try {
    const students = await User.findAll({
      where: { role: 'student', isActive: true },
      attributes: ['id', 'name', 'email', 'avatar']
    });

    const studentIds = students.map((s) => s.id);

    const [activities, attempts, submissions, gradebooks] = await Promise.all([
      ActivityLog.findAll({
        where: { studentId: { [Op.in]: studentIds } },
        attributes: ['studentId', 'timeSpent']
      }),
      QuizAttempt.findAll({
        where: { studentId: { [Op.in]: studentIds } },
        attributes: ['id', 'studentId', 'quizId', 'percentage']
      }),
      Submission.findAll({
        where: { studentId: { [Op.in]: studentIds }, grade: { [Op.ne]: null } },
        attributes: ['id', 'studentId', 'assignmentId', 'grade']
      }),
      Gradebook.findAll({
        where: { studentId: { [Op.in]: studentIds } },
        attributes: ['id', 'studentId', 'overallGrade']
      })
    ]);

    const [assignments, quizzes] = await Promise.all([
      Assignment.findAll({ attributes: ['id', 'maxPoints'] }),
      Quiz.findAll({ attributes: ['id'] })
    ]);

    const maxPointsById = {};
    assignments.forEach((a) => { maxPointsById[a.id] = a.maxPoints; });

    const quizBestByStudent = {};
    attempts.forEach((attempt) => {
      const pct = Number(attempt.percentage);
      const current = quizBestByStudent[attempt.studentId];
      if (current == null || pct > current) {
        quizBestByStudent[attempt.studentId] = pct;
      }
    });

    const rows = students.map((student) => {
      const totalTimeSpent = activities
        .filter((a) => a.studentId === student.id)
        .reduce((sum, a) => sum + (Number(a.timeSpent) || 0), 0);

      const quizScores = quizBestByStudent[student.id] != null
        ? [quizBestByStudent[student.id]]
        : [];

      const assignmentScores = submissions
        .filter((s) => s.studentId === student.id)
        .map((s) => clamp((Number(s.grade) / (maxPointsById[s.assignmentId] || 100)) * 100, 0, 100));

      const gradebookScores = gradebooks
        .filter((g) => g.studentId === student.id && g.overallGrade != null)
        .map((g) => clamp(Number(g.overallGrade), 0, 100));

      const academicParts = [...quizScores, ...assignmentScores, ...gradebookScores];
      const academicScore = academicParts.length > 0
        ? academicParts.reduce((sum, v) => sum + v, 0) / academicParts.length
        : 0;

      return {
        student: {
          id: student.id,
          name: student.name,
          email: student.email,
          avatar: student.avatar
        },
        totalTimeSpent,
        quizzesTaken: quizScores.length,
        assignmentsGraded: assignmentScores.length,
        academicScore: Math.round(academicScore * 100) / 100,
        composite: 0
      };
    });

    // Normalize engagement so the top time maps toward 100, then blend 50/50.
    const maxTime = rows.reduce((m, r) => Math.max(m, r.totalTimeSpent), 0);
    rows.forEach((row) => {
      const engagement = maxTime > 0 ? (row.totalTimeSpent / maxTime) * 100 : 0;
      row.composite = Math.round((engagement * 0.5 + row.academicScore * 0.5) * 100) / 100;
    });

    rows.sort((a, b) => {
      if (b.composite !== a.composite) return b.composite - a.composite;
      if (b.academicScore !== a.academicScore) return b.academicScore - a.academicScore;
      return a.student.name.localeCompare(b.student.name);
    });

    const top = rows.slice(0, 5);

    res.status(200).json({
      success: true,
      count: top.length,
      leaderboard: top.map((row, index) => ({ rank: index + 1, ...row }))
    });
  } catch (error) {
    next(error);
  }
};
