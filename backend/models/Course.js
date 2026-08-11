const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Course Model
 * Represents courses created by instructors
 */
const Course = sequelize.define('Course', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Course title is required' }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Course description is required' }
    }
  },
  thumbnail: {
    type: DataTypes.STRING,
    allowNull: true
  },
  instructorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  category: {
    type: DataTypes.STRING,
    defaultValue: 'General'
  },
  difficulty: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    defaultValue: 'beginner'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  enrollmentLimit: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  credits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3,
    validate: {
      min: { msg: 'Credits must be at least 1', args: [1] },
      max: { msg: 'Credits must be at most 8', args: [8] }
    }
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['instructorId', 'isActive'] }
  ]
});

module.exports = Course;
