const {
  JobPost,
  JobRequirement,
  JobResponsibility,
  JobSkill,
  InterviewQuestion,
  InterviewAnswerPoint,
  sequelize,
  StudentsWithJobPost,
  StudentInterviewAnswer
} = require('../models');
const jwt = require('jsonwebtoken');
const {
  sendJobLinkEmail,
  sendStudentExamEmail,
} = require('../utils/mailService');
const { Op, fn, col, literal } = require('sequelize');
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
} = require('date-fns');
const { getPercentage } = require('../utils/helper');
const SECRET = process.env.LINK_TOKEN_SECRET || 'your-very-secret-key';

// Helper to include all nested data
const fullInclude = [
  {
    model: JobRequirement,
    as: 'requirements',
    separate: true,
    order: [['id', 'ASC']],
  },
  {
    model: JobResponsibility,
    as: 'responsibilities',
    separate: true,
    order: [['id', 'ASC']],
  },
  {
    model: JobSkill,
    as: 'skills',
    separate: true,
    order: [['id', 'ASC']],
  },
  {
    model: InterviewQuestion,
    as: 'interviewQuestions',
    separate: true,
    order: [['id', 'ASC']],
    include: [
      {
        model: InterviewAnswerPoint,
        as: 'suggestedAnswerPoints',
        separate: true,
        order: [['id', 'ASC']],
      },
    ],
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
    location: Array.isArray(jobPost.location)
      ? jobPost.location
      : jobPost.location
      ? [jobPost.location]
      : [],
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
        options: Array.isArray(q.options) ? q.options : [],
        rightAnswer: q.rightAnswer || null,
        isRequired: true,
        order: q.id,
      })) || [],
    status: jobPost.status || 'draft',
    createdAt: jobPost.createdAt,
    updatedAt: jobPost.updatedAt,
    createdBy: jobPost.createdBy || 'admin',
    shareableUrl: jobPost.shareableUrl,
    applicants: jobPost.applicants || 0,
    interviews: jobPost.interviews || 0,
    activeJoinUser: jobPost.activeJoinUser || 0,
    activeJoinUserCount: jobPost.activeJoinUserCount || 0,
    // Expose video recording flag to admin and candidate frontends
    enableVideoRecording: jobPost.enableVideoRecording === true,
  };

  return transformed;
};

// create job post
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
      students = [],
      enableVideoRecording = false,
    } = req.body;

    if (
      !title ||
      !company ||
      !department ||
      !location ||
      !type ||
      !experience ||
      !description ||
      !salary ||
      !requirements ||
      !responsibilities ||
      !skills ||
      !questions
    )
      return res.status(400).json({ error: 'All fields are required' });

    const jobPostData = {
      jobTitle: title,
      company,
      department,
      location: Array.isArray(location) ? location : location ? [location] : [],
      jobType: type,
      experienceLevel: experience,
      jobDescription: description,
      salaryMin: salary?.min,
      salaryMax: salary?.max,
      salaryCurrency: salary?.currency,
      status: status,
      createdBy: createdBy || 'admin',
      enableVideoRecording: enableVideoRecording || false,
    };

    const jobPost = await JobPost.create(jobPostData, { transaction: t });

    if (requirements.length) {
      await JobRequirement.bulkCreate(
        requirements.map((r) => ({ requirement: r, jobPostId: jobPost.id })),
        { transaction: t }
      );
    }
    if (responsibilities.length) {
      await JobResponsibility.bulkCreate(
        responsibilities.map((r) => ({
          responsibility: r,
          jobPostId: jobPost.id,
        })),
        { transaction: t }
      );
    }
    if (skills.length) {
      await JobSkill.bulkCreate(
        skills.map((s) => ({ skill: s, jobPostId: jobPost.id })),
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
        options = [],
        rightAnswer: rawRightAnswer,
      } = q;
      const opts = Array.isArray(options)
        ? options.map((s) => String(s || '').trim()).filter(Boolean)
        : [];
      let rightAnswer = null;
      if (rawRightAnswer != null && String(rawRightAnswer).trim() !== '') {
        const r = String(rawRightAnswer).trim();
        if (opts.length === 0) {
          return res.status(400).json({
            error: `Question "${(question || '').slice(0, 50)}...": rightAnswer can only be set when options are provided.`,
          });
        }
        if (!opts.includes(r)) {
          return res.status(400).json({
            error: `Question "${(question || '').slice(0, 50)}...": rightAnswer must be one of the option values.`,
          });
        }
        rightAnswer = r;
      }
      const iq = await InterviewQuestion.create(
        {
          question,
          type,
          difficulty,
          duration: expectedDuration,
          category,
          options: opts,
          rightAnswer,
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

    if (students && students.length > 0) {
      console.log(
        `📝 Creating ${students.length} students for job ${jobPost.id}`
      );
      await StudentsWithJobPost.bulkCreate(
        students.map((student) => ({
          name: student.name,
          email: student.email.toLowerCase(),
          mobile: student.phoneNumber,
          jobPostId: jobPost.id,
          status: 'inprogress',
        })),
        { transaction: t }
      );
      console.log(`✅ Successfully created ${students.length} students`);
    }

    await t.commit();
    const created = await JobPost.findByPk(jobPost.id, {
      include: fullInclude,
    });
    return res.status(201).json(transformJobPostForFrontend(created));
  } catch (err) {
    await t.rollback();
    console.log('err Failed to create job post', err);
    return res.status(500).json({ error: err.message });
  }
};

// get all job posts
exports.getAllJobPosts = async (req, res) => {
  try {
    const posts = await JobPost.findAll({
      include: fullInclude,
      order: [['createdAt', 'DESC']],
    });

    let damiposts = posts.map(transformJobPostForFrontend);
    damiposts = damiposts.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    return res.status(200).json(damiposts);
  } catch (err) {
    console.log('err Failed to fetch jobpost', err);
    return res.status(500).json({ error: err.message });
  }
};

// get job post by id
exports.getJobPostById = async (req, res) => {
  try {
    const post = await JobPost.findByPk(req.params.id, {
      include: fullInclude,
    });
    const candidates = await StudentsWithJobPost.findAll({
      where: { jobPostId: req.params.id },
    });
    if (!post) return res.status(404).json({ error: 'Job post not found' });
    res.json({
      post: transformJobPostForFrontend(post),
      candidates: candidates,
    });
  } catch (err) {
    console.log('err Failed to get job post by id', err);
    return res.status(500).json({ error: err.message });
  }
};

// update job post
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

    if (!id) return res.status(400).json({ error: 'Job post id is required' });

    const jobPost = await JobPost.findByPk(id);
    if (!jobPost) return res.status(404).json({ error: 'Job post not found' });

    const jobPostData = {
      jobTitle: title,
      company,
      department,
      location: Array.isArray(location) ? location : location ? [location] : [],
      jobType: type,
      experienceLevel: experience,
      jobDescription: description,
      salaryMin: salary?.min,
      salaryMax: salary?.max,
      salaryCurrency: salary?.currency,
      enableVideoRecording:
        typeof req.body.enableVideoRecording === 'boolean'
          ? req.body.enableVideoRecording
          : jobPost.enableVideoRecording,
    };

    await jobPost.update(jobPostData, { where: { id } }, { transaction: t });

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
        options = [],
        rightAnswer: rawRightAnswer,
      } = q;
      const opts = Array.isArray(options)
        ? options.map((s) => String(s || '').trim()).filter(Boolean)
        : [];
      let rightAnswer = null;
      if (rawRightAnswer != null && String(rawRightAnswer).trim() !== '') {
        const r = String(rawRightAnswer).trim();
        if (opts.length === 0) {
          return res.status(400).json({
            error: `Question "${(question || '').slice(0, 50)}...": rightAnswer can only be set when options are provided.`,
          });
        }
        if (!opts.includes(r)) {
          return res.status(400).json({
            error: `Question "${(question || '').slice(0, 50)}...": rightAnswer must be one of the option values.`,
          });
        }
        rightAnswer = r;
      }
      const iq = await InterviewQuestion.create(
        {
          question,
          type,
          difficulty,
          duration: expectedDuration,
          category,
          options: opts,
          rightAnswer,
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
    return res.status(200).json(transformJobPostForFrontend(updated));
  } catch (err) {
    await t.rollback();
    console.log('err Failed to update job post by id ', err);
    return res.status(500).json({ error: err.message });
  }
};

// delete job post
exports.deleteJobPost = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: 'Job post id is required' });

    const deleted = await JobPost.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ error: 'Job post not found' });
    return res.status(200).json({ message: 'Job post deleted' });
  } catch (err) {
    console.log('err Failed to delete job post', err);
    return res.status(500).json({ error: err.message });
  }
};

// link share with mail
exports.linkShareJobPost = async (req, res) => {
  const { jobId, email } = req.body;
  const t = await sequelize.transaction();

  if (!jobId || !email) {
    return res.status(400).json({ error: 'jobId and email are required' });
  }
  try {
    const job = await JobPost.findByPk(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job post not found' });
    }
    const token = jwt.sign({ jobId }, SECRET, { expiresIn: '2d' });
    await sendJobLinkEmail(email, token);
    return res.status(200).json({ message: 'Email sent successfully' });
  } catch (err) {
    await t.rollback();
    console.log('err Failed to send job link email', err);
    return res
      .status(500)
      .json({ error: 'Failed to send job link email', details: err.message });
  }
};

// SEND STUDENT EXAM LINK
exports.sendStudentExamLink = async (req, res) => {
  const { jobId, emails, messageTemplate, students } = req.body;

  if (!jobId || !emails || !Array.isArray(emails) || emails.length === 0) {
    return res.status(400).json({
      error: 'jobId and emails array are required',
    });
  }

  try {
    console.log('📧 SEND STUDENT EXAM LINK REQUEST:', {
      jobId,
      emailCount: emails.length,
    });

    const job = await JobPost.findByPk(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job post not found' });
    }

    // Generate token with jobId only (email will be verified separately)
    const token = jwt.sign({ jobId }, SECRET, { expiresIn: '30d' });
    const examLink = `https://aiinterview.deepvox.ai/?token=${token}`;

    const dbStudents = await StudentsWithJobPost.findAll({
      where: {
        jobPostId: jobId,
        email: {
          [Op.in]: emails.map((e) => e.toLowerCase()),
        },
      },
    });

    if (dbStudents.length === 0) {
      return res.status(404).json({
        error: 'No students found for this job post with the provided emails',
      });
    }

    const emailData = {
      jobTitle: job.jobTitle,
      company: job.company,
      location: job.location,
      examLink: examLink,
      messageTemplate: messageTemplate,
      students: dbStudents.map((s) => ({
        name: s.name,
        email: s.email,
      })),
    };

    await sendStudentExamEmail(emailData);

    console.log(`✅ Exam link sent to ${dbStudents.length} student(s)`);

    return res.status(200).json({
      message: `Examination link sent successfully to ${dbStudents.length} student(s)`,
      count: dbStudents.length,
      sentTo: dbStudents.map((s) => ({ name: s.name, email: s.email })),
    });
  } catch (err) {
    console.error('❌ Send student exam link error:', err);
    return res.status(500).json({
      error: 'Failed to send examination link',
      details: err.message,
    });
  }
};

// VERIFY EMAIL FOR INTERVIEW ACCESS
exports.verifyEmailForInterview = async (req, res) => {
  const { token, email } = req.body;

  if (!token || !email) {
    return res.status(400).json({ error: 'Token and email are required' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, SECRET);
    const jobId = decoded.jobId;

    // Check if student exists in the allowed list
    const student = await StudentsWithJobPost.findOne({
      where: {
        email: email.toLowerCase(),
        jobPostId: jobId,
      },
    });

    if (!student) {
      return res.status(403).json({
        success: false,
        error:
          'Access denied. Your email is not authorized for this interview. Please contact HR .',
      });
    }

    // Check if already completed
    if (student.status === 'completed') {
      return res.status(400).json({
        success: false,
        error: 'You have already completed this interview.',
      });
    }

    // Return success with student info
    return res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        status: student.status,
      },
    });
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid token',
      });
    }

    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({
        success: false,
        error: 'Token has expired. Please request a new interview link.',
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Verification failed',
      details: err.message,
    });
  }
};

// get job post with token
exports.getJobpostbyToken = async (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'token is required' });
  }
  try {
    const decoded = jwt.verify(token, SECRET);
    const jobId = decoded.jobId;

    const job = await JobPost.findByPk(jobId, {
      include: fullInclude,
    });
    if (!job) {
      return res.status(404).json({ error: 'Job post not found' });
    }
    return res.status(200).json({
      message: 'Job post found',
      job: job,
    });
  } catch (err) {
    console.log('err Failed to get job post by token', err);
    return res
      .status(500)
      .json({ error: 'Failed to get job post by token', details: err.message });
  }
};

// JOIN JOB POST WITH TOKEN (WITH EMAIL VERIFICATION)
exports.joinJobPostWithToken = async (req, res) => {
  const { token, email } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const t = await sequelize.transaction();

  try {
    // Verify token
    const decoded = jwt.verify(token, SECRET);
    const jobId = decoded.jobId;

    // Fetch job with interview questions
    const job = await JobPost.findByPk(jobId, {
      include: [
        {
          model: InterviewQuestion,
          as: 'interviewQuestions',
          include: [
            { model: InterviewAnswerPoint, as: 'suggestedAnswerPoints' },
          ],
        },
      ],
    });

    if (!job) {
      return res.status(404).json({ error: 'Job post not found' });
    }

    // CRITICAL: Check if student email is in the allowed list
    const allowedStudent = await StudentsWithJobPost.findOne({
      where: {
        email: email.toLowerCase(),
        jobPostId: jobId,
      },
    });

    if (!allowedStudent) {
      return res.status(403).json({
        error:
          'Access denied. Your email is not authorized for this interview. Please contact HR .',
      });
    }

    // Check if already completed
    if (allowedStudent.status === 'completed') {
      return res.status(400).json({
        error: 'You have already completed this interview.',
      });
    }

    // Extract other data from request
    const {
      firstName,
      lastName,
      name,
      resumeUrl,
      mobile,
      dob,
      highestQualification,
      educations,
      location,
      skills,
    } = req.body;

    // Construct full name from firstName and lastName if provided
    const fullName =
      firstName && lastName
        ? `${firstName} ${lastName}`
        : name || allowedStudent.name;

    // Use educations array from request, or keep existing if not provided
    const educationsArray =
      educations && Array.isArray(educations)
        ? educations
        : allowedStudent.educations || [];

    // Update student record with additional info
    await allowedStudent.update(
      {
        firstName: firstName || allowedStudent.firstName,
        lastName: lastName || allowedStudent.lastName,
        name: fullName,
        resumeUrl: resumeUrl || allowedStudent.resumeUrl,
        mobile: mobile || allowedStudent.mobile,
        dob: dob || allowedStudent.dob,
        highestQualification:
          highestQualification || allowedStudent.highestQualification,
        educations: educationsArray,
        location: location || allowedStudent.location,
        skills: skills && skills.length > 0 ? skills : allowedStudent.skills,
        status: 'inprogress',
      },
      { transaction: t }
    );

    await job.increment('applicants', { by: 1 });
    await job.reload();

    await t.commit();

    // Transform questions for frontend (include rightAnswer for MCQ evaluation)
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
        options: Array.isArray(q.options) ? q.options : [],
        rightAnswer: q.rightAnswer || null,
        isRequired: true,
        order: q.id,
      })) || [];

    return res.status(200).json({
      message: 'Access granted successfully',
      jobId,
      jobTitle: job.jobTitle,
      activeJoinUserCount: job.activeJoinUserCount,
      questions,
      candidateId: allowedStudent.id,
      candidateName: allowedStudent.name,
    });
  } catch (err) {
    await t.rollback();
    console.log('err Failed to join job post with token', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ error: 'Invalid token' });
    }

    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({
        error: 'Token has expired. Please request a new interview link.',
      });
    }

    return res.status(500).json({
      error: 'Failed to access interview',
      details: err.message,
    });
  }
};

// generate token for job post interview link
exports.generateTokenForJobInterviewLink = async (req, res) => {
  const { jobId } = req.body;
  if (!jobId) {
    return res.status(400).json({ error: 'jobId is required' });
  }
  try {
    const job = await JobPost.findByPk(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job post not found' });
    }
    // Generate token with 30 days validity
    const token = jwt.sign({ jobId }, SECRET, { expiresIn: '30d' });
    return res
      .status(200)
      .json({ token: token, message: 'Token generated successfully' });
  } catch (err) {
    console.log('err Failed to generate token for job interview link', err);
    return res.status(500).json({
      error: 'Failed to generate job interview link token',
      details: err.message,
    });
  }
};

// get recent candidates
exports.getRecentCandidates = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const candidates = await StudentsWithJobPost.findAll({
      order: [['createdAt', 'DESC']],
      limit: 5,
      include: [{ model: JobPost, as: 'JobPost' }],
    });
    return res.status(200).json({ candidates: candidates });
  } catch (err) {
    console.log('err Failed to get recent candidates', err);
    await t.rollback();
    return res.status(500).json({
      error: 'Failed to get recent candidates',
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
      return res.status(404).json({ error: 'Candidate not found' });
    }

    let deletedQues = await StudentInterviewAnswer.destroy({
      where: {
        studentId: candidateId,
      },
      transaction: t,
    });

    await StudentsWithJobPost.update(
      { ...data },
      { where: { id: candidateId } },
      { transaction: t }
    );

    if (deletedQues === 0) {
      await JobPost.increment('interviews', {
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
    return res.status(200).json({
      message: 'Candidate details updated successfully',
      candidate: updated,
    });
  } catch (err) {
    await t.rollback();
    console.log('err Failed to update student with jobpost by id', err);
    return res
      .status(400)
      .json({ error: 'Update failed', details: err.message });
  }
};

// GET candidate interview details by id
exports.getCandidateById = async (req, res) => {
  try {
    const candidate = await StudentsWithJobPost.findByPk(req.params.id, {
      include: [
        { model: JobPost, as: 'JobPost' },
        {
          model: StudentInterviewAnswer,
          as: 'StudentInterviewAnswer',
          include: [
            {
              model: InterviewQuestion,
              as: 'Question',
            },
          ],
        },
      ],
    });
    if (!candidate)
      return res.status(404).json({ error: 'Candidate not found' });
    return res.status(200).json({
      candidate: candidate,
    });
  } catch (err) {
    console.log('err Failed to get candidate by id', err);
    return res.status(500).json({ error: err.message });
  }
};

// get admin dashboard
exports.getAdminDashbord = async (req, res) => {
  try {
    const candidates = await StudentsWithJobPost.findAll({
      order: [['createdAt', 'DESC']],
      include: [{ model: JobPost, as: 'JobPost' }],
    });
    const total_interview = await StudentsWithJobPost.count({
      where: {
        interviewDate: {
          [Op.ne]: null,
        },
      },
    });
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
    let interview_weekly_growth = getPercentage(
      prev_week_interview,
      curr_week_interview
    );
    const jobs = await JobPost.findAll();
    let active_jobs = jobs.filter((v) => v?.status === 'draft')?.length;
    let inactive_jobs = jobs.filter((v) => v?.status !== 'draft')?.length;
    const total_candidates = await StudentsWithJobPost.count({});
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());
    const curr_month_total_candidates = await StudentsWithJobPost.count({
      where: {
        createdAt: {
          [Op.between]: [currentMonthStart, currentMonthEnd],
        },
      },
    });
    const prevMonthStart = startOfMonth(subMonths(new Date(), 1));
    const prevMonthEnd = endOfMonth(subMonths(new Date(), 1));
    const prev_month_total_candidates = await StudentsWithJobPost.count({
      where: {
        createdAt: {
          [Op.between]: [prevMonthStart, prevMonthEnd],
        },
      },
    });
    let candidate_monthly_growth = getPercentage(
      prev_month_total_candidates,
      curr_month_total_candidates
    );
    const recentCandidates = candidates
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
    const candidateScore = candidates.reduce(
      (sum, item) => sum + item.totalScore,
      0
    );
    return res.status(200).json({
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
    console.log('err Failed to get admin dashboard', err);
    return res.status(500).json({
      error: 'Failed to get dashboard data',
      details: err.message,
    });
  }
};

const weeks = [];
for (let i = 6; i >= 0; i--) {
  const date = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 });
  weeks.push(format(date, 'dd-MM-yyyy'));
}

// GET analytics dashboard
exports.getAnalyticsDashboard = async (req, res) => {
  try {
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());
    const prevMonthStart = startOfMonth(subMonths(new Date(), 1));
    const prevMonthEnd = endOfMonth(subMonths(new Date(), 1));
    const candidates = await StudentsWithJobPost.findAll({
      order: [['createdAt', 'DESC']],
      include: [{ model: JobPost, as: 'JobPost' }],
    });
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

    const last7weekdata = await StudentsWithJobPost.findAll({
      attributes: [
        [fn('DATE_TRUNC', 'week', col('createdAt')), 'week_start'],
        [fn('ROUND', fn('AVG', col('totalScore')), 2), 'avg_score'],
      ],
      where: {
        createdAt: {
          [Op.gte]: literal(`DATE_TRUNC('week', NOW()) - INTERVAL '6 weeks'`),
        },
      },
      group: [fn('DATE_TRUNC', 'week', col('createdAt'))],
      order: [[fn('DATE_TRUNC', 'week', col('createdAt')), 'ASC']],
      raw: true,
    });

    const last7weekdataMap = new Map(
      last7weekdata.map((row) => [
        format(new Date(row.week_start), 'dd-MM-yyyy'),
        parseFloat(row.avg_score ?? 0),
      ])
    );

    const finalResult = weeks.map((week) => ({
      date: week,
      score: last7weekdataMap.get(week) ?? 0,
    }));

    const months = [];
    for (let i = 6; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i));
      months.push(format(monthStart, 'yyyy-MM'));
    }

    const last7monthsinterview = await StudentsWithJobPost.findAll({
      attributes: [
        [fn('DATE_TRUNC', 'month', col('interviewDate')), 'month'],
        [fn('COUNT', '*'), 'count'],
      ],
      where: {
        interviewDate: {
          [Op.ne]: null,
          [Op.gte]: literal(`DATE_TRUNC('month', NOW()) - INTERVAL '6 months'`),
        },
      },
      group: [fn('DATE_TRUNC', 'month', col('interviewDate'))],
      order: [[fn('DATE_TRUNC', 'month', col('interviewDate')), 'ASC']],
      raw: true,
    });

    const last7monthsinterviewMap = new Map(
      last7monthsinterview.map((row) => [
        format(new Date(row.month), 'yyyy-MM'),
        parseInt(row.count),
      ])
    );

    const finalResultinterview = months.map((month) => ({
      month,
      count: last7monthsinterviewMap.get(month) ?? 0,
    }));

    const scores = await StudentsWithJobPost.findAll({
      attributes: [
        'id',
        'interviewDate',
        'totalScore',
        [literal(`(scores->>'communication')::int`), 'communication'],
        [literal(`(scores->>'technical')::int`), 'technical'],
        [literal(`(scores->>'problemSolving')::int`), 'problemSolving'],
        [literal(`(scores->>'leadership')::int`), 'leadership'],
        [literal(`(scores->>'bodyLanguage')::int`), 'bodyLanguage'],
        [literal(`(scores->>'confidence')::int`), 'confidence'],
      ],
      where: {
        interviewDate: {
          [Op.ne]: null,
          [Op.between]: [prevMonthStart, currentMonthEnd],
        },
      },
      raw: true,
    });

    const skillKeys = [
      'communication',
      'technical',
      'problemSolving',
      'leadership',
      'bodyLanguage',
      'confidence',
    ];

    const skillTrends = {};
    skillKeys.forEach((skill) => {
      skillTrends[skill] = { current_month: [], previous_month: [] };
    });

    const now = new Date();
    const prevDate = subMonths(now, 1);
    const currentMonthKey = format(now, 'yyyy-MM');
    const previousMonthKey = format(prevDate, 'yyyy-MM');

    scores.forEach((record) => {
      if (!record.interviewDate) return;
      const dateKey = format(new Date(record.interviewDate), 'yyyy-MM');
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

    const top5ByOverallScore = await StudentsWithJobPost.findAll({
      where: {
        interviewDate: {
          [Op.ne]: null,
          [Op.between]: [currentMonthStart, currentMonthEnd],
        },
      },
      order: [['overallScore', 'DESC']],
      limit: 5,
      include: [{ model: JobPost, as: 'JobPost' }],
    });

    return res.status(200).json({
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
    console.log('err Failed to get analytics dashboard', err);
    return res.status(500).json({ error: err.message });
  }
};

// BEHAVIORAL ANALYSIS (Local endpoint - NO AUTH REQUIRED)
exports.getBehavioralAnalysis = async (req, res) => {
  try {
    const { video_url, questionsWithAnswer, jobData } = req.body;

    // Validate input
    if (
      !questionsWithAnswer ||
      !Array.isArray(questionsWithAnswer) ||
      questionsWithAnswer.length === 0
    ) {
      return res.status(400).json({
        status: 'error',
        error: 'No questions with answers provided',
        status_code: 400,
      });
    }

    // Calculate average scores and response times
    const totalScore = questionsWithAnswer.reduce(
      (sum, q) => sum + (q.score || 0),
      0
    );
    const avgScore = totalScore / questionsWithAnswer.length;
    const totalResponseTime = questionsWithAnswer.reduce(
      (sum, q) => sum + (q.responseTime || 0),
      0
    );
    const avgResponseTime = totalResponseTime / questionsWithAnswer.length;

    // Analyze answer lengths and quality
    const answerLengths = questionsWithAnswer.map(
      (q) => (q.userAnswer || '').length
    );
    const avgAnswerLength =
      answerLengths.reduce((a, b) => a + b, 0) / answerLengths.length;
    const detailedAnswers = questionsWithAnswer.filter(
      (q) => (q.userAnswer || '').length > 50
    ).length;
    const briefAnswers = questionsWithAnswer.filter(
      (q) => (q.userAnswer || '').length < 30
    ).length;

    // Generate behavioral analysis based on interview performance
    const performanceBreakdown = {
      communicationSkills: {
        overallAveragePercentage: Math.min(
          100,
          Math.max(0, (avgScore / 10) * 100)
        ),
        summary:
          avgScore >= 7
            ? 'Demonstrated strong communication skills with clear and articulate responses.'
            : avgScore >= 5
            ? 'Showed adequate communication skills with room for improvement in clarity.'
            : 'Communication skills need development. Consider focusing on structured responses.',
      },
      technicalKnowledge: {
        overallAveragePercentage: Math.min(
          100,
          Math.max(0, (avgScore / 10) * 100)
        ),
        summary:
          avgScore >= 7
            ? 'Exhibited solid technical knowledge and understanding of key concepts.'
            : avgScore >= 5
            ? 'Displayed basic technical knowledge with some gaps in understanding.'
            : 'Technical knowledge requires further development and study.',
      },
      confidenceLevel: {
        overallAveragePercentage: Math.min(
          100,
          Math.max(0, (avgScore / 10) * 100)
        ),
        summary:
          avgScore >= 7
            ? 'Displayed high confidence in responses and knowledge.'
            : avgScore >= 5
            ? 'Showed moderate confidence with some hesitation.'
            : 'Confidence level needs improvement. Consider more preparation.',
      },
      problemSolving: {
        overallAveragePercentage: Math.min(
          100,
          Math.max(0, (avgScore / 10) * 100)
        ),
        summary:
          avgScore >= 7
            ? 'Demonstrated strong problem-solving abilities.'
            : avgScore >= 5
            ? 'Showed basic problem-solving skills.'
            : 'Problem-solving skills need enhancement.',
      },
      leadershipPotential: {
        overallAveragePercentage: Math.min(
          100,
          Math.max(0, (avgScore / 10) * 100)
        ),
        summary:
          avgScore >= 7
            ? 'Exhibited leadership qualities in responses.'
            : avgScore >= 5
            ? 'Showed potential for leadership development.'
            : 'Leadership potential requires further assessment.',
      },
      body_language: {
        overallAveragePercentage: video_url ? 75 : 0, // Placeholder - would require video analysis
        summary: video_url
          ? 'Video recording available for detailed body language analysis.'
          : 'No video recording available for body language assessment.',
      },
    };

    // Generate AI evaluation summary
    const aiEvaluationSummary = {
      summary:
        avgScore >= 7
          ? `The candidate demonstrated strong performance across ${
              questionsWithAnswer.length
            } questions with an average score of ${avgScore.toFixed(
              1
            )}/10. Responses were detailed and showed good understanding of the subject matter.`
          : avgScore >= 5
          ? `The candidate showed moderate performance with an average score of ${avgScore.toFixed(
              1
            )}/10 across ${
              questionsWithAnswer.length
            } questions. Some areas showed promise while others need improvement.`
          : `The candidate's performance indicates areas for significant improvement. Average score was ${avgScore.toFixed(
              1
            )}/10 across ${
              questionsWithAnswer.length
            } questions. Additional preparation and study would be beneficial.`,
      keyStrengths: [
        avgScore >= 7
          ? 'Strong technical knowledge'
          : avgScore >= 5
          ? 'Basic understanding demonstrated'
          : 'Willingness to participate',
        avgAnswerLength > 50
          ? 'Detailed and comprehensive responses'
          : 'Concise communication style',
        detailedAnswers > briefAnswers
          ? 'Thorough in explanations'
          : 'Direct and to the point',
      ],
      areasOfGrowth: [
        avgScore < 7
          ? 'Enhance technical knowledge depth'
          : 'Continue building on existing knowledge',
        avgResponseTime > 30
          ? 'Improve response time and efficiency'
          : 'Maintain current response pace',
        briefAnswers > detailedAnswers
          ? 'Develop more detailed explanations'
          : 'Continue providing comprehensive answers',
      ],
    };

    // Generate video analysis insights (simplified since we don't have ML video processing)
    const video_analysis_insights = {
      positive_indicators: video_url
        ? [
            'Video recording completed successfully',
            'Interview session captured for review',
            `Average response time: ${avgResponseTime.toFixed(1)} seconds`,
          ]
        : [],
      areas_for_improvement: [
        avgScore < 7
          ? 'Focus on improving answer quality and depth'
          : 'Continue maintaining high standards',
        avgResponseTime > 30
          ? 'Work on reducing response time'
          : 'Maintain efficient response patterns',
      ],
      recommendations: [
        avgScore >= 7
          ? 'Strong candidate - proceed with next interview round'
          : 'Consider additional assessment',
        'Review video recording for detailed behavioral analysis',
        'Provide feedback on areas identified for improvement',
      ],
    };

    // Generate behavioral analysis scores (simplified)
    const behavioral_analysis = {
      eye_contact: video_url ? 75 : 0,
      posture: video_url ? 70 : 0,
      gestures: video_url ? 65 : 0,
      facial_expressions: video_url ? 70 : 0,
      voice_tone: 75,
      confidence: Math.min(100, Math.max(0, (avgScore / 10) * 100)),
      engagement: Math.min(100, Math.max(0, (avgScore / 10) * 100)),
    };

    // Generate recommendations
    const recommendations = {
      recommendation:
        avgScore >= 7
          ? 'Highly Recommended'
          : avgScore >= 5
          ? 'Recommended'
          : 'Consider with reservations',
      summary:
        avgScore >= 7
          ? `Strong performance with average score of ${avgScore.toFixed(
              1
            )}/10. Candidate demonstrates good understanding and communication skills.`
          : avgScore >= 5
          ? `Moderate performance with average score of ${avgScore.toFixed(
              1
            )}/10. Candidate shows potential but may need additional training.`
          : `Performance below expectations with average score of ${avgScore.toFixed(
              1
            )}/10. Consider additional assessment or training before proceeding.`,
    };

    // Generate quick stats
    const quickStats = {
      communication:
        avgScore >= 7 ? 'Excellent' : avgScore >= 5 ? 'Good' : 'Fair',
      technical: avgScore >= 7 ? 'Excellent' : avgScore >= 5 ? 'Good' : 'Fair',
      problemSolving:
        avgScore >= 7 ? 'Excellent' : avgScore >= 5 ? 'Good' : 'Fair',
      leadership: avgScore >= 7 ? 'Good' : avgScore >= 5 ? 'Fair' : 'Poor',
    };

    const response = {
      status: 'success',
      timestamp: new Date().toISOString(),
      video_url: video_url || null,
      performanceBreakdown,
      aiEvaluationSummary,
      behavioral_analysis,
      video_analysis_insights,
      recommendations,
      quickStats,
      meta: {
        totalQuestions: questionsWithAnswer.length,
        averageScore: avgScore.toFixed(2),
        averageResponseTime: avgResponseTime.toFixed(2),
        videoAvailable: !!video_url,
      },
    };

    console.log('✅ Behavioral analysis completed:', {
      status: response.status,
      avgScore: avgScore.toFixed(2),
      hasVideo: !!video_url,
    });

    return res.status(200).json(response);
  } catch (error) {
    console.error('❌ Behavioral analysis error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message || 'Internal server error',
      status_code: 500,
      video_url: req.body.video_url || null,
    });
  }
};
