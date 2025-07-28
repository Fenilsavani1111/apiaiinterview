const {
  JobPost,
  JobRequirement,
  JobResponsibility,
  JobSkill,
  InterviewQuestion,
  InterviewAnswerPoint,
  sequelize,
  StudentsWithJobPost,
} = require("../models");
const jwt = require("jsonwebtoken");
const { sendJobLinkEmail } = require("../utils/mailService");
const { Op } = require("sequelize");
const {
  startOfWeek,
  subWeeks,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
} = require("date-fns");
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
    res.json(posts.map(transformJobPostForFrontend));
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
    // Add data to StudentsWithJobPost table
    // let records = email?.map((v) => {
    //   return {
    //     email: v,
    //     jobPostId: job?.id,
    //   };
    // });
    // const studentsWithJobPostdata = await StudentsWithJobPost.bulkCreate(
    //   records,
    //   {
    //     transaction: t,
    //   }
    // );
    // await t.commit();
    // Send email with token
    await sendJobLinkEmail(email, token);
    res.json({ message: "Email sent successfully" });
  } catch (err) {
    console.log("err", err);
    res
      .status(500)
      .json({ error: "Failed to send email", details: err.message });
  }
};

// join job post interview with token
exports.joinJobPostWithToken = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: "token is required" });
  }
  try {
    const t = await sequelize.transaction();
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
    await job.increment("activeJoinUserCount", { by: 1 });
    await job.reload();
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
    const data = await StudentsWithJobPost.findOne({
      where: { email: email, jobPostId: jobId },
    });
    // Map frontend field names to backend field names
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
    if (data) {
      await StudentsWithJobPost.update(
        { ...studentData },
        { where: { id: data?.id } },
        { transaction: t }
      );
      await t.commit();
      const updated = await StudentsWithJobPost.findByPk(data?.id);
      candidateId = updated?.id;
    } else {
      const studentsWithJobPostdata = await StudentsWithJobPost.create(
        { ...studentData, jobPostId: jobId },
        {
          transaction: t,
        }
      );
      await t.commit();
      candidateId = studentsWithJobPostdata?.id;
    }
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
    console.log("err", err);
    res
      .status(400)
      .json({ error: "Invalid or expired token", details: err.message });
  }
};

// generate token for job post interview link
exports.generateTokenForJobInterviewLink = async (req, res) => {
  const { jobId } = req.body;
  const t = await sequelize.transaction();
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
    res.status(500).json({
      error: "Failed to generate job interview link token",
      details: err.message,
    });
  }
};

// update candidate interview details by id
exports.updateStudentWithJobpostById = async (req, res) => {
  try {
    let { candidateId, data } = req?.body;
    const t = await sequelize.transaction();
    const candidate = await StudentsWithJobPost.findOne({
      where: { id: candidateId },
    });
    if (!candidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    // Map frontend field names to backend field names
    await StudentsWithJobPost.update(
      { ...data },
      { where: { id: candidateId } },
      { transaction: t }
    );
    await t.commit();
    const updated = await StudentsWithJobPost.findByPk(candidateId);
    res.json({
      message: "Candidate details updated successfully",
      candidate: updated,
    });
  } catch (err) {
    console.log("err", err);
    res
      .status(400)
      .json({ error: "Invalid or expired token", details: err.message });
  }
};

// get recent candidates
exports.getAdminDashbord = async (req, res) => {
  const t = await sequelize.transaction();
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
          [Op.between]: [previousWeekStart, previousWeekEnd],
        },
      },
    });
    // Calculate weekly interview growth percentage
    let interview_weekly_growth = 0;
    if (prev_week_interview === 0 && curr_week_interview === 0)
      interview_weekly_growth = 0; // No change
    else if (prev_week_interview === 0)
      interview_weekly_growth = 100; // From 0 to something = 100% growth
    else if (curr_week_interview === 0) interview_weekly_growth = 0;
    else
      interview_weekly_growth =
        prev_week_interview === 0
          ? 100
          : ((curr_week_interview - prev_week_interview) /
              prev_week_interview) *
            100;
    const jobs = await JobPost.findAll();
    let active_jobs = jobs.filter((v) => v?.status === "draft")?.length;
    let inactive_jobs = jobs.filter((v) => v?.status !== "draft")?.length;
    const total_candidates = await StudentsWithJobPost.count({});
    // This month's range
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
    const lastMonthStart = startOfMonth(subMonths(new Date(), 1));
    const lastMonthEnd = endOfMonth(subMonths(new Date(), 1));
    const prev_month_total_candidates = await StudentsWithJobPost.count({
      where: {
        createdAt: {
          [Op.between]: [lastMonthStart, lastMonthEnd],
        },
      },
    });
    // Calculate monthly candidate growth percentage
    let candidate_monthly_growth = 0;
    if (prev_month_total_candidates === 0 && curr_month_total_candidates === 0)
      candidate_monthly_growth = 0; // No change
    else if (prev_month_total_candidates === 0)
      candidate_monthly_growth = 100; // From 0 to something = 100% growth
    else if (curr_month_total_candidates === 0) candidate_monthly_growth = 0;
    else
      candidate_monthly_growth =
        prev_month_total_candidates === 0
          ? 100
          : ((curr_month_total_candidates - prev_month_total_candidates) /
              prev_month_total_candidates) *
            100;
    const recentCandidates = candidates
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // sort descending
      .slice(0, 5);
    const candidateScore = candidates.reduce(
      (sum, item) => sum + item.overallScore,
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
