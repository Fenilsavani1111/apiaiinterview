const express = require('express');
const router = express.Router();
const jobPostController = require('../controllers/jobPostController');
const uploadFileController = require('../controllers/uploadFileController');
const authMiddleware = require('../middlewares/auth');
const requireJobPostLlmKey = require('../middlewares/requireJobPostLlmKey');

const multer = require('multer');
const path = require('path');

// ============================================
// MULTER CONFIGURATION
// ============================================

const storagevideo = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    const safeBaseName = path.basename(file.originalname, ext).replace(/\s+/g, '_');
    const filename = `${safeBaseName}-${uniqueSuffix}.webm`;

    cb(null, filename);
  },
});

const uploadvideo = multer({ storage: storagevideo });

// Configure storage for resumes and files
const storage = new multer.memoryStorage();
const upload = multer({ storage });

/* ======================================================
   ✅ PUBLIC ROUTES (NO AUTH)
====================================================== */

// Job browsing
router.get('/', authMiddleware, jobPostController.getAllJobPosts);
router.get('/performance-comparison', authMiddleware, jobPostController.getPerformanceComparison);
router.get('/:id', authMiddleware, jobPostController.getJobPostById);

// Job sharing & email
router.post('/send-job-link', authMiddleware, jobPostController.linkShareJobPost);
router.post('/send-student-exam-link', authMiddleware, jobPostController.sendStudentExamLink);
router.post(
  '/generate-job-token',
  authMiddleware,
  jobPostController.generateTokenForJobInterviewLink
);
router.post('/get-jobpost-by-token', jobPostController.getJobpostbyToken);

// Interview access
router.post('/join-job-link', jobPostController.joinJobPostWithToken);

// Candidate interview
router.post('/update-candidate-byid', jobPostController.updateStudentWithJobpostById);
router.get('/get-candidate-byid/:id', jobPostController.getCandidateById);
router.post('/behavioral-analysis', jobPostController.getBehavioralAnalysis);

// Candidate uploads
router.post('/upload-interview-video', uploadvideo.single('video'), (req, res) => {
  console.log(req.file, 'file Name:', req.body.fileName);

  console.time('Video Upload');
  if (!req.file) return res.status(400).send('No file uploaded.');
  console.timeEnd('Video Upload');

  console.log('✅ File saved to disk:', req.file.path);

  // Prepare the response data
  const responseData = {
    message: 'Video uploaded successfully',
    fileName: req.file.filename,
    path: `uploads/${req.file.filename}`,
  };

  // Set content type and end the response with JSON
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(responseData));
});

router.post('/upload-resume', upload.single('file'), uploadFileController.UploadResume);

// Job management
router.post('/', authMiddleware, requireJobPostLlmKey, jobPostController.createJobPost);
router.put('/:id', authMiddleware, jobPostController.updateJobPost);
router.delete('/:id', authMiddleware, jobPostController.deleteJobPost);

// Admin dashboards
router.post('/get-admin-dashboard', authMiddleware, jobPostController.getAdminDashbord);
router.post('/get-analytics-dashboard', authMiddleware, jobPostController.getAnalyticsDashboard);
router.post('/get-recent-candidates', authMiddleware, jobPostController.getRecentCandidates);

module.exports = router;
