const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Submission Model
 * Represents student assignment submissions
 */
const Submission = sequelize.define('Submission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  assignmentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Assignments',
      key: 'id'
    }
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
  files: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  comments: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: ''
  },
  grade: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: ''
  },
  gradedById: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  gradedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  submittedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  isLate: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['assignmentId', 'studentId'] },
    { fields: ['studentId'] }
  ]
});

module.exports = Submission;
