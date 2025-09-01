const { DataTypes } = require("sequelize");
module.exports = (sequelize) => {
  const StudentInterviewAnswer = sequelize.define("StudentInterviewAnswer", {
    answer: { type: DataTypes.TEXT },
    aiEvaluation: { type: DataTypes.TEXT },
    score: { type: DataTypes.INTEGER },
    responseTime: { type: DataTypes.INTEGER },
    endTime: { type: DataTypes.INTEGER },
  });
  return StudentInterviewAnswer;
};
