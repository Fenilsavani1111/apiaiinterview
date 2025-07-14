const sequelize = require("../config/db");
const JobPost = require("./JobPost")(sequelize);
const JobRequirement = require("./JobRequirement")(sequelize);
const JobResponsibility = require("./JobResponsibility")(sequelize);
const JobSkill = require("./JobSkill")(sequelize);
const InterviewQuestion = require("./InterviewQuestion")(sequelize);
const InterviewAnswerPoint = require("./InterviewAnswerPoint")(sequelize);
const StudentsWithJobPost = require("./StudentsWithJobPost")(sequelize);

// Associations
JobPost.hasMany(JobRequirement, {
  as: "requirements",
  foreignKey: "jobPostId",
  onDelete: "CASCADE",
});
JobRequirement.belongsTo(JobPost, { foreignKey: "jobPostId" });

JobPost.hasMany(JobResponsibility, {
  as: "responsibilities",
  foreignKey: "jobPostId",
  onDelete: "CASCADE",
});
JobResponsibility.belongsTo(JobPost, { foreignKey: "jobPostId" });

JobPost.hasMany(JobSkill, {
  as: "skills",
  foreignKey: "jobPostId",
  onDelete: "CASCADE",
});
JobSkill.belongsTo(JobPost, { foreignKey: "jobPostId" });

JobPost.hasMany(InterviewQuestion, {
  as: "interviewQuestions",
  foreignKey: "jobPostId",
  onDelete: "CASCADE",
});
InterviewQuestion.belongsTo(JobPost, { foreignKey: "jobPostId" });

InterviewQuestion.hasMany(InterviewAnswerPoint, {
  as: "suggestedAnswerPoints",
  foreignKey: "questionId",
  onDelete: "CASCADE",
});
InterviewAnswerPoint.belongsTo(InterviewQuestion, { foreignKey: "questionId" });

JobPost.hasMany(StudentsWithJobPost, {
  as: "StudentsWithJobPost",
  foreignKey: "jobPostId",
  onDelete: "CASCADE",
});
StudentsWithJobPost.belongsTo(JobPost, { foreignKey: "jobPostId" });

module.exports = {
  sequelize,
  JobPost,
  JobRequirement,
  JobResponsibility,
  JobSkill,
  InterviewQuestion,
  InterviewAnswerPoint,
  StudentsWithJobPost,
};
