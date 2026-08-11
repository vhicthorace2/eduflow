const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Assignment Model
 * Represents assignments with deadlines
 */
const Assignment = sequelize.define('Assignment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Assignment title is required' }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Assignment description is required' }
    }
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: ''
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
  dueDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  maxPoints: {
    type: DataTypes.INTEGER,
    defaultValue: 100
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: []
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['courseId', 'dueDate'] }
  ]
});

module.exports = Assignment;
