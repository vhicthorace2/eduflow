const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * AssessmentAttempt Model
 * Stores a timed placement-assessment attempt together with the per-question
 * feedback and weak-area/module recommendations that are routed to the
 * learner agent on completion.
 */
const AssessmentAttempt = sequelize.define('AssessmentAttempt', {
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
  answers: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  results: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  weaknesses: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  moduleRecommendations: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  total: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  percentage: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false
  },
  passed: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  },
  level: {
    type: DataTypes.STRING,
    allowNull: true
  },
  timeSpent: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  completedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['studentId', 'courseId'] },
    { fields: ['studentId'] }
  ]
});

module.exports = AssessmentAttempt;