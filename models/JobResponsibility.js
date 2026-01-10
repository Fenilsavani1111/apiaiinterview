const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const JobResponsibility = sequelize.define('JobResponsibility', {
    responsibility: { type: DataTypes.TEXT, allowNull: false },
  });
  return JobResponsibility;
};
