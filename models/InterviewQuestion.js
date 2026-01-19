const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const InterviewQuestion = sequelize.define('InterviewQuestion', {
    question: { type: DataTypes.TEXT, allowNull: false },
    type: { type: DataTypes.STRING },
    difficulty: { type: DataTypes.STRING },
    duration: { type: DataTypes.INTEGER },
    category: { type: DataTypes.STRING },
    options: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
      defaultValue: null,
    },
  });
  return InterviewQuestion;
};
