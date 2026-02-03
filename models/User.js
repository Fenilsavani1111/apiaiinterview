const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
          notEmpty: true,
        },
      },
      phoneNumber: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'phone_number',
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
        },
      },
      llmKey: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      jobPostLlmKey: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'jobpost_llm_key',
      },
    },
    {
      tableName: 'users',
      timestamps: true,
    }
  );

  return User;
};
