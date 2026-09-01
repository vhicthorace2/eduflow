const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * ActivityLog Model
 * Tracks student learning activity (module views, quiz attempts,
 * assignment submissions) so instructors can measure consistency.
 */
const ActivityLog = sequelize.define('ActivityLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Courses',
      key: 'id'
    }
  },
  moduleId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Modules',
      key: 'id'
    }
  },
  activityType: {
    type: DataTypes.ENUM('module_view', 'quiz_attempt', 'assignment_submit'),
    allowNull: false
  },
  timeSpent: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  performedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['studentId', 'courseId'] },
    { fields: ['courseId', 'performedAt'] },
    { fields: ['studentId', 'performedAt'] }
  ]
});

module.exports = ActivityLog;