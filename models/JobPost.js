const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const JobPost = sequelize.define('JobPost', {
    jobTitle: { type: DataTypes.STRING, allowNull: false },
    company: { type: DataTypes.STRING, allowNull: false },
    department: { type: DataTypes.STRING, allowNull: false },
    location: { type: DataTypes.STRING, allowNull: false },
    jobType: { type: DataTypes.STRING, allowNull: false },
    experienceLevel: { type: DataTypes.STRING, allowNull: false },
    jobDescription: { type: DataTypes.TEXT, allowNull: false },
    salaryMin: { type: DataTypes.INTEGER },
    salaryMax: { type: DataTypes.INTEGER },
    salaryCurrency: { type: DataTypes.STRING },
    status: { type: DataTypes.ENUM('draft', 'active', 'paused', 'closed'), defaultValue: 'draft' },
    createdBy: { type: DataTypes.STRING, defaultValue: 'admin' },
    shareableUrl: { type: DataTypes.STRING },
    applicants: { type: DataTypes.INTEGER, defaultValue: 0 },
    interviews: { type: DataTypes.INTEGER, defaultValue: 0 },
    activeJoinUser: { type: DataTypes.STRING },
    activeJoinUserCount: { type: DataTypes.INTEGER, defaultValue: 0 }
  });
  return JobPost;
}; 