const User = require('./User');
const Course = require('./Course');
const Module = require('./Module');
const Material = require('./Material');
const Forum = require('./Forum');
const Thread = require('./Thread');
const Reply = require('./Reply');
const Assignment = require('./Assignment');
const Submission = require('./Submission');
const Quiz = require('./Quiz');
const QuizAttempt = require('./QuizAttempt');
const Gradebook = require('./Gradebook');
const Message = require('./Message');
const Enrollment = require('./Enrollment');
const ActivityLog = require('./ActivityLog');

// Define associations

// User associations
User.hasMany(Course, { foreignKey: 'instructorId', as: 'instructedCourses' });
Course.belongsTo(User, { foreignKey: 'instructorId', as: 'instructor' });

// Course associations
Course.hasMany(Module, { foreignKey: 'courseId', as: 'modules' });
Module.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

Course.hasMany(Forum, { foreignKey: 'courseId', as: 'forums' });
Forum.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

Course.hasMany(Assignment, { foreignKey: 'courseId', as: 'assignments' });
Assignment.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

Course.hasMany(Quiz, { foreignKey: 'courseId', as: 'quizzes' });
Quiz.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });

// Module associations
Module.hasMany(Material, { foreignKey: 'moduleId', as: 'materials' });
Material.belongsTo(Module, { foreignKey: 'moduleId', as: 'module' });

// Forum associations
Forum.hasMany(Thread, { foreignKey: 'forumId', as: 'threads' });
Thread.belongsTo(Forum, { foreignKey: 'forumId', as: 'forum' });

// Thread associations
Thread.hasMany(Reply, { foreignKey: 'threadId', as: 'replies' });
Reply.belongsTo(Thread, { foreignKey: 'threadId', as: 'thread' });

Thread.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
User.hasMany(Thread, { foreignKey: 'authorId', as: 'threads' });

// Reply associations
Reply.belongsTo(User, { foreignKey: 'authorId', as: 'author' });
User.hasMany(Reply, { foreignKey: 'authorId', as: 'replies' });

Reply.belongsTo(Reply, { foreignKey: 'parentReplyId', as: 'parentReply' });
Reply.hasMany(Reply, { foreignKey: 'parentReplyId', as: 'replies' });

// Assignment associations
Assignment.hasMany(Submission, { foreignKey: 'assignmentId', as: 'submissions' });
Submission.belongsTo(Assignment, { foreignKey: 'assignmentId', as: 'assignment' });

Assignment.belongsTo(User, { foreignKey: 'instructorId', as: 'instructor' });

// Submission associations
Submission.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
User.hasMany(Submission, { foreignKey: 'studentId', as: 'submissions' });

Submission.belongsTo(User, { foreignKey: 'gradedById', as: 'gradedBy' });

// Quiz associations
Quiz.hasMany(QuizAttempt, { foreignKey: 'quizId', as: 'attempts' });
QuizAttempt.belongsTo(Quiz, { foreignKey: 'quizId', as: 'quiz' });

Quiz.belongsTo(User, { foreignKey: 'instructorId', as: 'instructor' });

// QuizAttempt associations
QuizAttempt.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
User.hasMany(QuizAttempt, { foreignKey: 'studentId', as: 'quizAttempts' });

// Gradebook associations
Gradebook.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
Gradebook.belongsTo(User, { foreignKey: 'studentId', as: 'student' });

// Message associations
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });

Message.belongsTo(User, { foreignKey: 'recipientId', as: 'recipient' });
User.hasMany(Message, { foreignKey: 'recipientId', as: 'receivedMessages' });

// Enrollment associations
Enrollment.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
Course.hasMany(Enrollment, { foreignKey: 'courseId', as: 'enrollments' });

Enrollment.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
User.hasMany(Enrollment, { foreignKey: 'studentId', as: 'enrollments' });

// ActivityLog associations
ActivityLog.belongsTo(User, { foreignKey: 'studentId', as: 'student' });
User.hasMany(ActivityLog, { foreignKey: 'studentId', as: 'activityLogs' });

ActivityLog.belongsTo(Course, { foreignKey: 'courseId', as: 'course' });
Course.hasMany(ActivityLog, { foreignKey: 'courseId', as: 'activityLogs' });

module.exports = {
  User,
  Course,
  Module,
  Material,
  Forum,
  Thread,
  Reply,
  Assignment,
  Submission,
  Quiz,
  QuizAttempt,
  Gradebook,
  Message,
  Enrollment,
  ActivityLog
};
