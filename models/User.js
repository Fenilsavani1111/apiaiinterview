// apiaiinterview/models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id'
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'name'
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'email',
    validate: {
      isEmail: true,
      notEmpty: true
    }
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'phone_number'
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'password',
    validate: {
      notEmpty: true
    }
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'createdAt',
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'updatedAt',
    defaultValue: DataTypes.NOW
  }
}, {
  sequelize,
  tableName: 'users',
  timestamps: true,
  underscored: false,
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
});

module.exports = User;