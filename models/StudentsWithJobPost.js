const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StudentsWithJobPost = sequelize.define(
    'StudentsWithJobPost',
    {
      // Primary key
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      // Basic student info
      firstName: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      lastName: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      mobile: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      dob: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      highestQualification: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      educations: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },

      // Job post association
      jobPostId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      // Interview/Candidate fields
      appliedDate: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },

      invitedDate: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },

      submissionStatus: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      interviewDate: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
      },

      duration: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM('completed', 'inprogress', 'scheduled'),
        allowNull: false,
        defaultValue: 'inprogress',
      },

      overallScore: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      totalScore: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      scores: {
        type: DataTypes.JSONB,
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

      experienceLevel: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      skills: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },

      resumeUrl: {
        type: DataTypes.STRING(2048),
        allowNull: true,
      },

      linkedinUrl: {
        type: DataTypes.STRING(2048),
        allowNull: true,
      },

      interviewVideoLink: {
        type: DataTypes.STRING(2048),
        allowNull: true,
      },

      photoUrl: {
        type: DataTypes.STRING(2048),
        allowNull: true,
      },

      notes: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      hasRecording: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },

      designation: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      location: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      residenceLocation: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      educationDetails: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      attemptedQuestions: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },

      grade: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      averageResponseTime: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },

      aiEvaluationSummary: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      performanceBreakdown: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      quickStats: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      recommendations: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      behavioral_analysis: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      video_analysis_insights: {
        type: DataTypes.JSON,
        allowNull: true,
      },

      // Government ID proof - array of { idProofType, value, verified }
      governmentProof: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of { idProofType, value, verified (boolean) }',
      },

      region: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      proctoringStatus: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      // Category Percentage - Overall + category-wise scores
      // Structure: { overallScore, totalScore, overallPercentage, categoryWisePercentage: { "Communication Skills": 50, "Reasoning Ability": 70, ... } }
      categoryPercentage: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment:
          'Overall Score, Overall %, Category-wise % (Communication Skills, Reasoning Ability, Costing, Accounting, FP&A, Excel (Advanced))',
      },
    },
    {
      tableName: 'StudentsWithJobPost',
      timestamps: true,
      underscored: false,
    }
  );

  return StudentsWithJobPost;
};
