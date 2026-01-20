const { DataTypes } = require('sequelize');
module.exports = (sequelize) => {
  const InterviewQuestion = sequelize.define(
    'InterviewQuestion',
    {
      question: { type: DataTypes.TEXT, allowNull: false },
      type: { type: DataTypes.STRING },
      difficulty: { type: DataTypes.STRING },
      duration: { type: DataTypes.INTEGER },
      category: { type: DataTypes.STRING },
      options: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
        defaultValue: [],
      },
      rightAnswer: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isInOptions(value) {
            if (value == null || value === '') return;
            const opts = this.options;
            if (!Array.isArray(opts) || opts.length === 0) {
              throw new Error('rightAnswer can only be set when options are provided');
            }
            const trimmed = opts.map((o) => String(o || '').trim()).filter(Boolean);
            if (!trimmed.includes(String(value).trim())) {
              throw new Error('rightAnswer must be one of the option values');
            }
          },
        },
      },
    }
  );
  return InterviewQuestion;
};
