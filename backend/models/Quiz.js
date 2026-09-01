const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Quiz Model
 * Represents quizzes with multiple-choice questions
 */
const Quiz = sequelize.define('Quiz', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Quiz title is required' }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: ''
  },
  type: {
    type: DataTypes.ENUM('quiz', 'test', 'exam'),
    allowNull: false,
    defaultValue: 'quiz'
  },
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Courses',
      key: 'id'
    }
  },
  instructorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  questions: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: []
  },
  timeLimit: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  maxAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  passingScore: {
    type: DataTypes.INTEGER,
    defaultValue: 70
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['courseId', 'isActive'] }
  ]
});

module.exports = Quiz;
