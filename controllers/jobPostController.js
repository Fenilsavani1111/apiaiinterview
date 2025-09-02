const {
  JobPost,
  JobRequirement,
  JobResponsibility,
  JobSkill,
  InterviewQuestion,
  InterviewAnswerPoint,
  sequelize,
  StudentsWithJobPost,
  StudentInterviewAnswer,
} = require("../models");
const jwt = require("jsonwebtoken");
const { sendJobLinkEmail } = require("../utils/mailService");
const { Op, fn, col, literal } = require("sequelize");
const {
  startOfWeek,
  subWeeks,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  getMonth,
  getYear,
} = require("date-fns");
const { getPercentage } = require("../utils/helper");
const SECRET = process.env.LINK_TOKEN_SECRET || "your-very-secret-key";

// Helper to include all nested data
const fullInclude = [
  { model: JobRequirement, as: "requirements" },
  { model: JobResponsibility, as: "responsibilities" },
  { model: JobSkill, as: "skills" },
  {
    model: InterviewQuestion,
    as: "interviewQuestions",
    include: [{ model: InterviewAnswerPoint, as: "suggestedAnswerPoints" }],
  },
];

// Helper function to transform backend data to frontend format
const transformJobPostForFrontend = (jobPost) => {
  if (!jobPost) return null;

  const transformed = {
    id: jobPost.id,
    title: jobPost.jobTitle,
    company: jobPost.company,
    department: jobPost.department,
    location: jobPost.location,
    type: jobPost.jobType,
    experience: jobPost.experienceLevel,
    description: jobPost.jobDescription,
    salary:
      jobPost.salaryMin && jobPost.salaryMax
        ? {
            min: jobPost.salaryMin,
            max: jobPost.salaryMax,
            currency: jobPost.salaryCurrency,
          }
        : undefined,
    requirements: jobPost.requirements?.map((r) => r.requirement) || [],
    responsibilities:
      jobPost.responsibilities?.map((r) => r.responsibility) || [],
    skills: jobPost.skills?.map((s) => s.skill) || [],
    questions:
      jobPost.interviewQuestions?.map((q) => ({
        id: q.id,
        question: q.question,
        type: q.type,
        difficulty: q.difficulty,
        expectedDuration: q.duration,
        category: q.category,
        suggestedAnswers:
          q.suggestedAnswerPoints?.map((ap) => ap.answerPoint) || [],
        isRequired: true,
        order: q.id,
      })) || [],
    status: jobPost.status || "draft",
    createdAt: jobPost.createdAt,
    updatedAt: jobPost.updatedAt,
    createdBy: jobPost.createdBy || "admin",
    shareableUrl: jobPost.shareableUrl,
    applicants: jobPost.applicants || 0,
    interviews: jobPost.interviews || 0,
    activeJoinUser: jobPost.activeJoinUser || 0,
    activeJoinUserCount: jobPost.activeJoinUserCount || 0,
  };

  return transformed;
};

// CREATE
exports.createJobPost = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      title,
      company,
      department,
      location,
      type,
      experience,
      description,
      salary,
      status,
      createdBy,
      requirements = [],
      responsibilities = [],
      skills = [],
      questions = [],
    } = req.body;

    // Map frontend field names to backend field names
    const jobPostData = {
      jobTitle: title,
      company,
      department,
      location,
      jobType: type,
      experienceLevel: experience,
      jobDescription: description,
      salaryMin: salary?.min,
      salaryMax: salary?.max,
      salaryCurrency: salary?.currency,
      status: status,
      createdBy: createdBy,
      // shareableUrl
    };

    const jobPost = await JobPost.create(jobPostData, { transaction: t });

    // Requirements
    if (requirements.length) {
      await JobRequirement.bulkCreate(
        requirements.map((r) => ({ requirement: r, jobPostId: jobPost.id })),
        { transaction: t }
      );
    }
    // Responsibilities
    if (responsibilities.length) {
      await JobResponsibility.bulkCreate(
        responsibilities.map((r) => ({
          responsibility: r,
          jobPostId: jobPost.id,
        })),
        { transaction: t }
      );
    }
    // Skills
    if (skills.length) {
      await JobSkill.bulkCreate(
        skills.map((s) => ({ skill: s, jobPostId: jobPost.id })),
        { transaction: t }
      );
    }
    // Interview Questions (with answer points)
    for (const q of questions) {
      const {
        question,
        type,
        difficulty,
        expectedDuration,
        category,
        suggestedAnswers = [],
      } = q;
      const iq = await InterviewQuestion.create(
        {
          question,
          type,
          difficulty,
          duration: expectedDuration,
          category,
          jobPostId: jobPost.id,
        },
        { transaction: t }
      );
      if (suggestedAnswers.length) {
        await InterviewAnswerPoint.bulkCreate(
          suggestedAnswers.map((ap) => ({
            answerPoint: ap,
            questionId: iq.id,
          })),
          { transaction: t }
        );
      }
    }
    await t.commit();
    const created = await JobPost.findByPk(jobPost.id, {
      include: fullInclude,
    });
    res.status(201).json(transformJobPostForFrontend(created));
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

// GET ALL
exports.getAllJobPosts = async (req, res) => {
  try {
    const posts = await JobPost.findAll({ include: fullInclude });
    let damiposts = posts.map(transformJobPostForFrontend);
    damiposts = damiposts.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    res.json(damiposts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET ONE
exports.getJobPostById = async (req, res) => {
  try {
    const post = await JobPost.findByPk(req.params.id, {
      include: fullInclude,
    });
    const candidates = await StudentsWithJobPost.findAll({
      where: { jobPostId: req.params.id },
    });
    if (!post) return res.status(404).json({ error: "Job post not found" });
    res.json({
      post: transformJobPostForFrontend(post),
      candidates: candidates,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
exports.updateJobPost = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const id = req.params.id;
    const {
      title,
      company,
      department,
      location,
      type,
      experience,
      description,
      salary,
      requirements = [],
      responsibilities = [],
      skills = [],
      questions = [],
    } = req.body;

    const jobPost = await JobPost.findByPk(id);
    if (!jobPost) return res.status(404).json({ error: "Job post not found" });

    // Map frontend field names to backend field names
    const jobPostData = {
      jobTitle: title,
      company,
      department,
      location,
      jobType: type,
      experienceLevel: experience,
      jobDescription: description,
      salaryMin: salary?.min,
      salaryMax: salary?.max,
      salaryCurrency: salary?.currency,
    };

    await jobPost.update(jobPostData, { where: { id } }, { transaction: t });

    // Remove old nested data
    await Promise.all([
      JobRequirement.destroy({ where: { jobPostId: id }, transaction: t }),
      JobResponsibility.destroy({ where: { jobPostId: id }, transaction: t }),
      JobSkill.destroy({ where: { jobPostId: id }, transaction: t }),
      InterviewAnswerPoint.destroy({
        where: {},
        transaction: t,
        include: [{ model: InterviewQuestion, where: { jobPostId: id } }],
      }),
      InterviewQuestion.destroy({ where: { jobPostId: id }, transaction: t }),
    ]);

    // Re-create nested data
    if (requirements.length) {
      await JobRequirement.bulkCreate(
        requirements.map((r) => ({ requirement: r, jobPostId: id })),
        { transaction: t }
      );
    }
    if (responsibilities.length) {
      await JobResponsibility.bulkCreate(
        responsibilities.map((r) => ({ responsibility: r, jobPostId: id })),
        { transaction: t }
      );
    }
    if (skills.length) {
      await JobSkill.bulkCreate(
        skills.map((s) => ({ skill: s, jobPostId: id })),
        { transaction: t }
      );
    }
    for (const q of questions) {
      const {
        question,
        type,
        difficulty,
        expectedDuration,
        category,
        suggestedAnswers = [],
      } = q;
      const iq = await InterviewQuestion.create(
        {
          question,
          type,
          difficulty,
          duration: expectedDuration,
          category,
          jobPostId: id,
        },
        { transaction: t }
      );
      if (suggestedAnswers.length) {
        await InterviewAnswerPoint.bulkCreate(
          suggestedAnswers.map((ap) => ({
            answerPoint: ap,
            questionId: iq.id,
          })),
          { transaction: t }
        );
      }
    }
    await t.commit();
    const updated = await JobPost.findByPk(id, { include: fullInclude });
    res.json(transformJobPostForFrontend(updated));
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: err.message });
  }
};

// DELETE
exports.deleteJobPost = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await JobPost.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: "Job post not found" });
    res.json({ message: "Job post deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// LINK share with mail
exports.linkShareJobPost = async (req, res) => {
  const { jobId, email } = req.body;
  const t = await sequelize.transaction();
  if (!jobId || !email) {
    return res.status(400).json({ error: "jobId and email are required" });
  }
  try {
    // Verify job exists
    const job = await JobPost.findByPk(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job post not found" });
    }
    // Generate token
    const token = jwt.sign({ jobId }, SECRET, { expiresIn: "2d" });

    // Send email with token
    await sendJobLinkEmail(email, token);
    res.json({ message: "Email sent successfully" });
  } catch (err) {
    await t.rollback();
    console.log("err", err);
    res
      .status(500)
      .json({ error: "Failed to send email", details: err.message });
  }
};

// get job post with token
exports.getJobpostbyToken = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "token is required" });
  }
  const t = await sequelize.transaction();
  try {
    const decoded = jwt.verify(token, SECRET);
    const jobId = decoded.jobId;

    const job = await JobPost.findByPk(jobId, {
      include: fullInclude,
    });
    if (!job) {
      return res.status(404).json({ error: "Job post not found" });
    }
    await t.commit();
    res.json({
      message: "Job post found",
      job: job,
    });
  } catch (err) {
    await t.rollback();
    console.log("err", err);
    res
      .status(400)
      .json({ error: "Invalid or expired token", details: err.message });
  }
};

// join job post interview with token
exports.joinJobPostWithToken = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "token is required" });
  }
  const t = await sequelize.transaction();
  try {
    const decoded = jwt.verify(token, SECRET);
    const jobId = decoded.jobId;
    // Fetch job with interview questions and answer points
    const job = await JobPost.findByPk(jobId, {
      include: [
        {
          model: InterviewQuestion,
          as: "interviewQuestions",
          include: [
            { model: InterviewAnswerPoint, as: "suggestedAnswerPoints" },
          ],
        },
      ],
    });
    if (!job) {
      return res.status(404).json({ error: "Job post not found" });
    }
    const {
      email,
      name,
      resumeUrl,
      mobile,
      experienceLevel,
      designation,
      location,
      skills,
    } = req.body;
    let findCandidate = await StudentsWithJobPost.findOne({
      where: { email: email, jobPostId: jobId },
    });
    if (!findCandidate) {
      return res.status(404).json({ error: "Candidate already exists." });
    }

    await job.increment("applicants", { by: 1 });
    await job.reload();
    const studentData = {
      email,
      name,
      resumeUrl,
      mobile,
      experienceLevel,
      designation,
      location,
      skills: skills?.length > 0 ? skills : [],
    };
    let candidateId = "";
    const studentsWithJobPostdata = await StudentsWithJobPost.create(
      {
        ...studentData,
        appliedDate: new Date(),
        status: "inprogress",
        jobPostId: jobId,
      },
      {
        transaction: t,
      }
    );
    await t.commit();
    candidateId = studentsWithJobPostdata?.id;
    // Transform questions for frontend
    const questions =
      job.interviewQuestions?.map((q) => ({
        id: q.id,
        question: q.question,
        type: q.type,
        difficulty: q.difficulty,
        expectedDuration: q.duration,
        category: q.category,
        suggestedAnswers:
          q.suggestedAnswerPoints?.map((ap) => ap.answerPoint) || [],
        isRequired: true,
        order: q.id,
      })) || [];

    res.json({
      message: "User joined successfully",
      jobId,
      jobTitle: job.jobTitle,
      activeJoinUserCount: job.activeJoinUserCount,
      questions,
      candidateId: candidateId,
    });
  } catch (err) {
    await t.rollback();
    console.log("err", err);
    res
      .status(400)
      .json({ error: "Invalid or expired token", details: err.message });
  }
};

// generate token for job post interview link
exports.generateTokenForJobInterviewLink = async (req, res) => {
  const { jobId } = req.body;
  if (!jobId) {
    return res.status(400).json({ error: "jobId are required" });
  }
  try {
    // Verify job exists
    const job = await JobPost.findByPk(jobId);
    if (!job) {
      return res.status(404).json({ error: "Job post not found" });
    }
    // Generate token
    const token = jwt.sign({ jobId }, SECRET, { expiresIn: "2d" });
    res.json({ token, token, message: "Token generated successfully" });
  } catch (err) {
    console.log("err", err);
    res.status(500).json({
      error: "Failed to generate job interview link token",
      details: err.message,
    });
  }
};

// get recent candidates
exports.getRecentCandidates = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const candidates = await StudentsWithJobPost.findAll({
      order: [["createdAt", "DESC"]],
      limit: 5,
      include: [{ model: JobPost, as: "JobPost" }],
    });
    res.json({ candidates: candidates });
  } catch (err) {
    console.log("err", err);
    await t.rollback();
    res.status(500).json({
      error: "Failed to generate job interview link token",
      details: err.message,
    });
  }
};

// update candidate interview details by id
exports.updateStudentWithJobpostById = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    let { candidateId, data } = req?.body;
    let questions = data?.questions ?? [];
    delete data?.questions;
    const candidate = await StudentsWithJobPost.findOne({
      where: { id: candidateId },
    });
    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    let deletdques = await StudentInterviewAnswer.destroy({
      where: {
        studentId: candidateId,
      },
      transaction: t,
    });
    // Map frontend field names to backend field names
    await StudentsWithJobPost.update(
      { ...data },
      { where: { id: candidateId } },
      { transaction: t }
    );
    if (deletdques === 0) {
      await JobPost.increment("interviews", {
        by: 1,
        where: { id: candidate?.jobPostId },
        transaction: t,
      });
    }
    await t.commit();
    await sequelize.transaction(async (t) => {
      await StudentInterviewAnswer.bulkCreate([...questions], {
        transaction: t,
      });
    });
    const updated = await StudentsWithJobPost.findByPk(candidateId);
    res.json({
      message: "Candidate details updated successfully",
      candidate: updated,
    });
  } catch (err) {
    await t.rollback();
    console.log("err", err);
    res
      .status(400)
      .json({ error: "Invalid or expired token", details: err.message });
  }
};

// GET candidate interview details by id
exports.getCandidateById = async (req, res) => {
  try {
    const candidate = await StudentsWithJobPost.findByPk(req.params.id, {
      include: [
        { model: JobPost, as: "JobPost" },
        {
          model: StudentInterviewAnswer,
          as: "StudentInterviewAnswer",
          include: [
            {
              model: InterviewQuestion,
              as: "Question", // 👈 Match the alias used in the association
            },
          ],
        },
      ],
    });
    if (!candidate)
      return res.status(404).json({ error: "Job post not found" });
    res.json({
      candidate: candidate,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// get admin dashboard
exports.getAdminDashbord = async (req, res) => {
  try {
    const candidates = await StudentsWithJobPost.findAll({
      order: [["createdAt", "DESC"]],
      include: [{ model: JobPost, as: "JobPost" }],
    });
    const total_interview = await StudentsWithJobPost.count({
      where: {
        interviewDate: {
          [Op.ne]: null,
        },
      },
    });
    // Get current week range (Mon–Sun)
    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const currentWeekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const curr_week_interview = await StudentsWithJobPost.count({
      where: {
        interviewDate: {
          [Op.ne]: null,
          [Op.between]: [currentWeekStart, currentWeekEnd],
        },
      },
    });
    // Get previous week range
    const previousWeekStart = startOfWeek(subWeeks(new Date(), 1), {
      weekStartsOn: 1,
    });
    const previousWeekEnd = endOfWeek(subWeeks(new Date(), 1), {
      weekStartsOn: 1,
    });
    const prev_week_interview = await StudentsWithJobPost.count({
      where: {
        interviewDate: {
          [Op.ne]: null,
          [Op.between]: [previousWeekStart, previousWeekEnd],
        },
      },
    });
    // Calculate weekly interview growth percentage
    let interview_weekly_growth = getPercentage(
      prev_week_interview,
      curr_week_interview
    );
    const jobs = await JobPost.findAll();
    let active_jobs = jobs.filter((v) => v?.status === "draft")?.length;
    let inactive_jobs = jobs.filter((v) => v?.status !== "draft")?.length;
    const total_candidates = await StudentsWithJobPost.count({});
    // Current month's range
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());
    const curr_month_total_candidates = await StudentsWithJobPost.count({
      where: {
        createdAt: {
          [Op.between]: [currentMonthStart, currentMonthEnd],
        },
      },
    });
    // Last month's range
    const prevMonthStart = startOfMonth(subMonths(new Date(), 1));
    const prevMonthEnd = endOfMonth(subMonths(new Date(), 1));
    const prev_month_total_candidates = await StudentsWithJobPost.count({
      where: {
        createdAt: {
          [Op.between]: [prevMonthStart, prevMonthEnd],
        },
      },
    });
    // Calculate monthly candidate growth percentage
    let candidate_monthly_growth = getPercentage(
      prev_month_total_candidates,
      curr_month_total_candidates
    );
    const recentCandidates = candidates
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // sort descending
      .slice(0, 5);
    const candidateScore = candidates.reduce(
      (sum, item) => sum + item.totalScore,
      0
    );
    res.json({
      recentCandidates: recentCandidates,
      candidates: candidates,
      summary: {
        total_interview: total_interview ?? 0,
        interview_weekly_growth: interview_weekly_growth,
        jobs: jobs,
        active_jobs: active_jobs ?? 0,
        inactive_jobs: inactive_jobs ?? 0,
        total_candidates: total_candidates ?? 0,
        candidate_monthly_growth: candidate_monthly_growth,
        average_score:
          candidateScore.length > 0 ? candidateScore / candidates.length : 0,
      },
    });
  } catch (err) {
    console.log("err", err);
    res.status(500).json({
      error: "Failed to generate job interview link token",
      details: err.message,
    });
  }
};

// Generate the last 7 week start dates
const weeks = [];
for (let i = 6; i >= 0; i--) {
  const date = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 }); // Monday
  weeks.push(format(date, "dd-MM-yyyy"));
}

// GET analytics dashboard
exports.getAnalyticsDashboard = async (req, res) => {
  try {
    // Current month's range
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());
    // Prev month's range
    const prevMonthStart = startOfMonth(subMonths(new Date(), 1));
    const prevMonthEnd = endOfMonth(subMonths(new Date(), 1));
    const candidates = await StudentsWithJobPost.findAll({
      order: [["createdAt", "DESC"]],
      include: [{ model: JobPost, as: "JobPost" }],
    });
    // total interview data
    const total_interview = await StudentsWithJobPost.count({
      where: {
        interviewDate: {
          [Op.ne]: null,
        },
      },
    });
    const curr_month_interview = await StudentsWithJobPost.findAll({
      where: {
        interviewDate: {
          [Op.between]: [currentMonthStart, currentMonthEnd],
        },
      },
    });
    const prev_month_interview = await StudentsWithJobPost.findAll({
      where: {
        interviewDate: {
          [Op.between]: [prevMonthStart, prevMonthEnd],
        },
      },
    });
    const interview_growth = getPercentage(
      prev_month_interview?.length ?? 0,
      curr_month_interview?.length ?? 0
    );

    // average score data
    const total_avg_score = candidates.reduce(
      (sum, item) => sum + item.totalScore,
      0
    );
    const curr_month_avg_score = curr_month_interview.reduce(
      (sum, item) => sum + item.totalScore,
      0
    );
    const prev_month_avg_score = prev_month_interview.reduce(
      (sum, item) => sum + item.totalScore,
      0
    );
    const score_growth = getPercentage(
      prev_month_avg_score,
      curr_month_avg_score
    );

    // Average Duration
    const total_avg_duration = candidates.reduce(
      (sum, item) => sum + item.duration,
      0
    );
    const curr_month_avg_duration = curr_month_interview.reduce(
      (sum, item) => sum + item.duration,
      0
    );
    const prev_month_avg_duration = prev_month_interview.reduce(
      (sum, item) => sum + item.duration,
      0
    );
    let duration_growth = curr_month_avg_duration - prev_month_avg_duration;
    if (duration_growth < 0) duration_growth = 0;
    // const duration_growth = getPercentage(
    //   prev_month_avg_duration,
    //   curr_month_avg_duration
    // );
    const last7weekdata = await StudentsWithJobPost.findAll({
      // Select the week start and average totalScore rounded to 2 decimals
      attributes: [
        // Truncate createdAt to the week (e.g., Monday of each week)
        [fn("DATE_TRUNC", "week", col("createdAt")), "week_start"],
        [fn("ROUND", fn("AVG", col("totalScore")), 2), "avg_score"],
      ],

      // Filter for records within the last 7 weeks
      where: {
        createdAt: {
          [Op.gte]: literal(`DATE_TRUNC('week', NOW()) - INTERVAL '6 weeks'`),
        },
      },

      // Group results by the week start
      group: [fn("DATE_TRUNC", "week", col("createdAt"))],

      // Sort weeks from most recent to oldest
      order: [[fn("DATE_TRUNC", "week", col("createdAt")), "ASC"]],

      // Return plain JavaScript objects instead of Sequelize instances
      raw: true,
    });
    // Map last7weekdata for quick lookup
    const last7weekdataMap = new Map(
      last7weekdata.map((row) => [
        format(new Date(row.week_start), "dd-MM-yyyy"),
        parseFloat(row.avg_score ?? 0),
      ])
    );
    // Final array with exactly 7 week entries
    const finalResult = weeks.map((week) => ({
      date: week,
      score: last7weekdataMap.get(week) ?? 0, // or null
    }));
    // Generate last 7 months (formatted as YYYY-MM for matching)
    const months = [];
    for (let i = 6; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      months.push(format(monthStart, "yyyy-MM"));
    }
    // get last 7 months interview
    const last7monthsinterview = await StudentsWithJobPost.findAll({
      attributes: [
        [fn("DATE_TRUNC", "month", col("interviewDate")), "month"],
        [fn("COUNT", "*"), "count"],
      ],
      where: {
        interviewDate: {
          [Op.ne]: null,
          [Op.gte]: literal(`DATE_TRUNC('month', NOW()) - INTERVAL '6 months'`),
        },
      },
      group: [fn("DATE_TRUNC", "month", col("interviewDate"))],
      order: [[fn("DATE_TRUNC", "month", col("interviewDate")), "ASC"]],
      raw: true,
    });
    // Normalize DB result: Map from 'YYYY-MM' to count
    const last7monthsinterviewMap = new Map(
      last7monthsinterview.map((row) => [
        format(new Date(row.month), "yyyy-MM"),
        parseInt(row.count),
      ])
    );
    //Final array: Ensure all 7 months exist
    const finalResultinterview = months.map((month) => ({
      month,
      count: last7monthsinterviewMap.get(month) ?? 0,
    }));

    // skill performance
    const scores = await StudentsWithJobPost.findAll({
      attributes: [
        "id",
        "interviewDate",
        "totalScore",
        [literal(`(scores->>'communication')::int`), "communication"],
        [literal(`(scores->>'technical')::int`), "technical"],
        [literal(`(scores->>'problemSolving')::int`), "problemSolving"],
        [literal(`(scores->>'leadership')::int`), "leadership"],
        [literal(`(scores->>'bodyLanguage')::int`), "bodyLanguage"],
        [literal(`(scores->>'confidence')::int`), "confidence"],
      ],
      where: {
        interviewDate: {
          [Op.ne]: null,
          [Op.between]: [prevMonthStart, currentMonthEnd],
        },
      },
      raw: true,
    });

    // Skills
    const skillKeys = [
      "communication",
      "technical",
      "problemSolving",
      "leadership",
      "bodyLanguage",
      "confidence",
    ];
    // Initial structure
    const skillTrends = {};
    skillKeys.forEach((skill) => {
      skillTrends[skill] = { current_month: [], previous_month: [] };
    });
    // Group by month
    const now = new Date(); // Current date
    const prevDate = subMonths(now, 1); // Date one month ago
    const currentMonthKey = format(now, "yyyy-MM");
    const previousMonthKey = format(prevDate, "yyyy-MM");
    scores.forEach((record) => {
      if (!record.interviewDate) return;
      const dateKey = format(new Date(record.interviewDate), "yyyy-MM");
      const isCurrent = dateKey === currentMonthKey;
      const isPrevious = dateKey === previousMonthKey;

      skillKeys.forEach((key) => {
        const value = record[key];
        if (value != null) {
          if (isCurrent) skillTrends[key].current_month.push(value);
          else if (isPrevious) skillTrends[key].previous_month.push(value);
        }
      });
    });
    // Reduce values to sum
    skillKeys.forEach((key) => {
      let curr = skillTrends[key].current_month.reduce(
        (acc, val) => acc + val,
        0
      );
      let prev = skillTrends[key].previous_month.reduce(
        (acc, val) => acc + val,
        0
      );
      skillTrends[key].current_month = curr;
      skillTrends[key].growth = getPercentage(prev, curr);
      delete skillTrends[key]?.previous_month;
    });

    // get top 5 candidate
    const top5ByOverallScore = await StudentsWithJobPost.findAll({
      where: {
        interviewDate: {
          [Op.ne]: null,
          [Op.between]: [currentMonthStart, currentMonthEnd],
        },
      },
      order: [["overallScore", "DESC"]],
      limit: 5,
      include: [{ model: JobPost, as: "JobPost" }],
    });

    res.json({
      trends: {
        weekly_scores: finalResult,
        monthly_interview: finalResultinterview,
        skill_trends: skillTrends,
      },
      topCandidates: top5ByOverallScore,
      summary: {
        total_interview: total_interview,
        interview_growth: interview_growth,
        total_avg_score: total_avg_score,
        score_growth: score_growth,
        total_avg_duration: total_avg_duration,
        duration_growth: duration_growth,
      },
    });
  } catch (err) {
    console.log("err", err);
    res.status(500).json({ error: err.message });
  }
};
