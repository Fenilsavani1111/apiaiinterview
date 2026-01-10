const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const JobRequirement = sequelize.define('JobRequirement', {
    requirement: { type: DataTypes.TEXT, allowNull: false },
  });
  return JobRequirement;
};
