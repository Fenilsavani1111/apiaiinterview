// apiaiinterview/routes/jobPost.js - COMPLETE WITH STUDENT EXAM LINK ROUTE
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

// Candidate routes (public - for job applications)
router.post("/send-job-link", jobPostController.linkShareJobPost);
router.post("/send-student-exam-link", jobPostController.sendStudentExamLink);
router.post("/get-jobpost-by-token", jobPostController.getJobpostbyToken);
router.post("/join-job-link", jobPostController.joinJobPostWithToken);
router.post(
  "/generate-job-token",
  jobPostController.generateTokenForJobInterviewLink
);
router.post(
  "/update-candidate-byid",
  jobPostController.updateStudentWithJobpostById
);
router.get("/get-candidate-byid/:id", jobPostController.getCandidateById);

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

// File upload routes (public - for candidates)
router.post(
  "/upload-resume",
  upload.single("file"),
  uploadFileController.UploadResume
);

// router.post(
//   "/resume-parser",
//   upload.single("file"),
//   resumeParserController.getResumeParser
// );

// ============================================
// PROTECTED ADMIN ROUTES (Require admin authentication)
// ============================================

// Create job post (Admin only)
router.post(
  "/",
  authMiddleware,
  jobPostController.createJobPost
);

// Update job post (Admin only)
router.put(
  "/:id",
  authMiddleware,
  jobPostController.updateJobPost
);

// Delete job post (Admin only)
router.delete(
  "/:id",
  authMiddleware,
  jobPostController.deleteJobPost
);

// Admin dashboard routes (Admin only)
router.post(
  "/get-admin-dashboard",
  authMiddleware,
  jobPostController.getAdminDashbord
);

router.post(
  "/get-analytics-dashboard",
  authMiddleware,
  jobPostController.getAnalyticsDashboard
);

router.post(
  "/get-recent-candidates",
  authMiddleware,
  jobPostController.getRecentCandidates
);

module.exports = router;