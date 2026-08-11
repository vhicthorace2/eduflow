const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Gradebook Model
 * Represents gradebook entries for courses
 */
const Gradebook = sequelize.define('Gradebook', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Courses',
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
  assignmentGrades: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  quizGrades: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  overallGrade: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  participationScore: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  lastUpdated: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: true,
  indexes: [
    { unique: true, fields: ['courseId', 'studentId'] },
    { fields: ['studentId'] }
  ]
});

module.exports = Gradebook;
