const express = require("express");
const { Op } = require("sequelize");
const router = express.Router();

const {
  JobPost,
  StudentsWithJobPost,
  StudentInterviewAnswer,
  InterviewQuestion,
  JobSkill,
} = require("../models"); // adjust path

const PASS_THRESHOLD = 60;

const getJobPerformanceJS = async ({ days = 30, jobId = null, userId = null }) => {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const whereJob = jobId ? { id: jobId } : {};

  // Fetch jobs with student interviews and answers
  const jobs = await JobPost.findAll({
    where: { ...whereJob, userId: userId },
    include: [
      {
        model: StudentsWithJobPost,
        as: "StudentsWithJobPost",
        required: false,
        where: { createdAt: { [Op.gte]: since } },
        include: [
          {
            model: StudentInterviewAnswer,
            as: "StudentInterviewAnswer",
            required: false,
            include: [
              {
                model: InterviewQuestion,
                as: "Question",
                attributes: ["id", "skillName"],
              },
            ],
          },
        ],
      },
      {
        model: JobSkill,
        as: "skills",
        required: false,
      },
    ],
  });

  const final = jobs.map((job) => {
    const students = job.StudentsWithJobPost || [];
    const totalInterviews = students.length;

    let sumStudentAvg = 0;
    let sumDurations = 0;
    let passCount = 0;
    const skillScoreBuckets = {}; // skillName => [scores]

    students.forEach((sw) => {
      const answers = sw.StudentInterviewAnswer || [];
      const answerScores = answers.map((a) => Number(a.score || 0));
      const studentAvg = answerScores.length
        ? answerScores.reduce((s, v) => s + v, 0) / answerScores.length
        : 0;

      sumStudentAvg += studentAvg;
      sumDurations += Number(sw.duration || 0);

      if (studentAvg >= PASS_THRESHOLD) passCount++;

      answers.forEach((ans) => {
        const skill = ans.Question?.skillName || "Unknown";
        if (!skillScoreBuckets[skill]) skillScoreBuckets[skill] = [];
        skillScoreBuckets[skill].push(Number(ans.score || 0));
      });
    });

    const topSkillScores = {};
    Object.keys(skillScoreBuckets).forEach((skill) => {
      const arr = skillScoreBuckets[skill];
      const avg = arr.length
        ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)
        : 0;
      topSkillScores[skill] = avg;
    });

    return {
      jobId: String(job.id),
      title: job.title,
      company: job.company,
      totalInterviews,
      averageScore: totalInterviews
        ? +(sumStudentAvg / totalInterviews).toFixed(1)
        : 0,
      passRate: totalInterviews
        ? +((passCount / totalInterviews) * 100).toFixed(1)
        : 0,
      averageDuration: totalInterviews
        ? +(sumDurations / totalInterviews).toFixed(1)
        : 0,
      qualified: passCount,
      topSkillScores,
    };
  });

  return final;
};

router.get("/job-performance", async (req, res) => {
  try {
    const days = req.query.days ? Number(req.query.days) : 30;
    const jobId = req.query.jobId || null;
    const userId = req.user?.id;
    const data = await getJobPerformanceJS({ days, jobId, userId });
    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
