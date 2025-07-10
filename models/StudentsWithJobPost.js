const { DataTypes } = require("sequelize");
module.exports = (sequelize) => {
  const StudentsWithJobPost = sequelize.define("StudentsWithJobPost", {
    name: { type: DataTypes.STRING, allowNull: true },
    email: { type: DataTypes.STRING, allowNull: false },
    resumeUrl: { type: DataTypes.STRING, allowNull: true },
    mobile: { type: DataTypes.BIGINT, allowNull: true },
    experienceLevel: { type: DataTypes.STRING, allowNull: true },
    designation: { type: DataTypes.STRING, allowNull: true },
    location: { type: DataTypes.STRING, allowNull: true },
    skills: { type: DataTypes.ARRAY(DataTypes.STRING), allowNull: true },
  });
  return StudentsWithJobPost;
};
