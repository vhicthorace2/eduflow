const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * Reply Model
 * Represents replies to discussion threads
 */
const Reply = sequelize.define('Reply', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: { msg: 'Reply content is required' }
    }
  },
  authorId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  threadId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Threads',
      key: 'id'
    }
  },
  parentReplyId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Replies',
      key: 'id'
    }
  }
}, {
  timestamps: true,
  indexes: [
    { fields: ['threadId', 'createdAt'] }
  ]
});

module.exports = Reply;
