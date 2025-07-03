const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const JobSkill = sequelize.define('JobSkill', {
    skill: { type: DataTypes.STRING, allowNull: false },
  });
  return JobSkill;
}; 