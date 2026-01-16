// apiaiinterview/routes/jobPost.js 
const express = require("express");
const router = express.Router();
const jobPostController = require("../controllers/jobPostController");
const uploadFileController = require("../controllers/uploadFileController");
// const resumeParserController = require("../controllers/resumeParserController");
const authMiddleware = require("../middlewares/auth");

// Inline admin guard: ensure this is a function even if the admin file is missing or empty

const multer = require("multer");
const path = require("path");

// ============================================
// MULTER CONFIGURATION FOR VIDEO UPLOADS
// ============================================

// Configure storage for videos
const storagevideo = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads")); // uploads folder
  },
  filename: (req, file, cb) => {
    console.log("-------", req.body);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const safeBaseName = path
      .basename(file.originalname, ext)
      .replace(/\s+/g, "_");
    const filename = `${safeBaseName}-${uniqueSuffix}.webm`;

    cb(null, filename);
  },
});

const uploadvideo = multer({ storage: storagevideo });

// Configure storage for resumes and files
const storage = new multer.memoryStorage();
const upload = multer({ storage });

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// Get all job posts (Public)
router.get("/", jobPostController.getAllJobPosts);

// Get job post by ID (Public)
router.get("/:id", jobPostController.getJobPostById);

// ============================================
// JOB SHARING & EMAIL ROUTES (Public)
// ============================================

// Send job link via email (Public)
router.post("/send-job-link", jobPostController.linkShareJobPost);

// Send student/candidate exam link via email (Public)
router.post("/send-student-exam-link", jobPostController.sendStudentExamLink);

// Generate token for job interview link (Public)
router.post(
  "/generate-job-token",
  jobPostController.generateTokenForJobInterviewLink
);

// Get job post by token (Public)
router.post("/get-jobpost-by-token", jobPostController.getJobpostbyToken);

// ============================================
// INTERVIEW ACCESS ROUTES (Public - With Email Verification)
// ============================================

// NEW: Verify email before allowing interview access
router.post(
  "/verify-email-for-interview",
  jobPostController.verifyEmailForInterview
);

// Join interview with token (requires email verification)
router.post("/join-job-link", jobPostController.joinJobPostWithToken);

// ============================================
// CANDIDATE INTERVIEW ROUTES (Public)
// ============================================

// Update candidate interview details by ID
router.post(
  "/update-candidate-byid",
  jobPostController.updateStudentWithJobpostById
);

// Behavioral analysis endpoint (local - replaces external API)
router.post(
  "/behavioral-analysis",
  jobPostController.getBehavioralAnalysis
);

// Get candidate interview details by ID
router.get("/get-candidate-byid/:id", jobPostController.getCandidateById);

// ============================================
// FILE UPLOAD ROUTES (Public - For Candidates)
// ============================================

// Video upload for interviews (public - for candidates)
router.post(
  "/upload-interview-video",
  uploadvideo.single("video"),
  (req, res) => {
    console.log(req.file, "file Name:", req.body.fileName);

    console.time("Video Upload");
    if (!req.file) return res.status(400).send("No file uploaded.");
    console.timeEnd("Video Upload");

    console.log("✅ File saved to disk:", req.file.path);

    // Prepare the response data
    const responseData = {
      message: "Video uploaded successfully",
      fileName: req.file.filename,
      path: `uploads/${req.file.filename}`,
    };

    // Set content type and end the response with JSON
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(responseData));
  }
);

// Resume/file upload (public - for candidates)
router.post(
  "/upload-resume",
  upload.single("file"),
  uploadFileController.UploadResume
);

// Resume parser (optional - commented out)
// router.post(
//   "/resume-parser",
//   upload.single("file"),
//   resumeParserController.getResumeParser
// );

// ============================================
// PROTECTED ADMIN ROUTES (Require admin authentication)
// ============================================

// Create job post (Admin only)
router.post("/", authMiddleware, jobPostController.createJobPost);

// Update job post (Admin only)
router.put("/:id", authMiddleware, jobPostController.updateJobPost);

// Delete job post (Admin only)
router.delete("/:id", authMiddleware, jobPostController.deleteJobPost);

// ============================================
// ADMIN DASHBOARD ROUTES (Require admin authentication)
// ============================================

// Get admin dashboard data (Admin only)
router.post(
  "/get-admin-dashboard",
  authMiddleware,
  jobPostController.getAdminDashbord
);

// Get analytics dashboard data (Admin only)
router.post(
  "/get-analytics-dashboard",
  authMiddleware,
  jobPostController.getAnalyticsDashboard
);

// Get recent candidates (Admin only)
router.post(
  "/get-recent-candidates",
  authMiddleware,
  jobPostController.getRecentCandidates
);

module.exports = router;