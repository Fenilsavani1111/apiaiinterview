const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const InterviewAnswerPoint = sequelize.define('InterviewAnswerPoint', {
    answerPoint: { type: DataTypes.TEXT, allowNull: false },
  });
  return InterviewAnswerPoint;
};
