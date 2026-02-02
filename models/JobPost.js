const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const JobPost = sequelize.define('JobPost', {
    jobTitle: {
      type: DataTypes.STRING,
      allowNull: false
    },
    company: {
      type: DataTypes.STRING,
      allowNull: false
    },
    department: {
      type: DataTypes.STRING,
      allowNull: false
    },
    location: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: []
    },
    jobType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    experienceLevel: {
      type: DataTypes.STRING,
      allowNull: false
    },
    jobDescription: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    salaryMin: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    salaryMax: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    salaryCurrency: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('draft', 'active', 'paused', 'closed'),
      defaultValue: 'draft',
      allowNull: false
    },
    createdBy: {
      type: DataTypes.STRING,
      defaultValue: 'admin',
      allowNull: false
    },
    shareableUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    applicants: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    interviews: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    activeJoinUser: {
      type: DataTypes.STRING,
      allowNull: true
    },
    activeJoinUserCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    enableVideoRecording: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    interviewStartDateTime: {
      type: DataTypes.DATE,
      allowNull: true
    },
    logoUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
  });
  return JobPost;
};
