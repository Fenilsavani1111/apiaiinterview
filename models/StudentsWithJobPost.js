const { DataTypes } = require("sequelize");
module.exports = (sequelize) => {
  const StudentsWithJobPost = sequelize.define("StudentsWithJobPost", {
    name: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING, allowNull: false },
    mobile: { type: DataTypes.STRING },
    appliedDate: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
    interviewDate: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    },
    duration: { type: DataTypes.INTEGER },
    status: {
      type: DataTypes.ENUM("completed", "inprogress", "scheduled"),
      allowNull: false,
      defaultValue: "completed",
    },
    overallScore: { type: DataTypes.INTEGER },
    totalScore: { type: DataTypes.INTEGER },
    scores: {
      type: DataTypes.JSONB, // or DataTypes.JSON
      allowNull: true,
      defaultValue: {
        communication: 0,
        technical: 0,
        problemSolving: 0,
        leadership: 0,
        bodyLanguage: 0,
        confidence: 0,
      },
    },
    experienceLevel: { type: DataTypes.STRING },
    skills: { type: DataTypes.ARRAY(DataTypes.STRING) },
    resumeUrl: { type: DataTypes.STRING },
    linkedinUrl: { type: DataTypes.STRING },
    interviewVideoLink: { type: DataTypes.STRING },
    recommendation: { type: DataTypes.STRING },
    notes: { type: DataTypes.STRING },
    hasRecording: { type: DataTypes.BOOLEAN },
    designation: { type: DataTypes.STRING },
    location: { type: DataTypes.STRING },
  });
  return StudentsWithJobPost;
};
