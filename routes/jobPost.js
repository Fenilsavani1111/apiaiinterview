const express = require("express");
const router = express.Router();
const jobPostController = require("../controllers/jobPostController");
const uploadFileController = require("../controllers/uploadFileController");
const resumeParserController = require("../controllers/resumeParserController");
const multer = require("multer");
const path = require("path");

// Configure storage for videos
const storagevideo = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads")); // uploads folder
  },
  filename: (req, file, cb) => {
    let filename = req.body?.fileName;
    cb(null, filename);
  },
});

const uploadvideo = multer({ storage: storagevideo });

// Route to upload video
router.post(
  "/upload-interview-video",
  uploadvideo.single("video"),
  (req, res) => {
    console.log(req.file, "file Name:", req.body.fileName);
    if (!req.file) return res.status(400).send("No file uploaded.");
    res.send({
      message: "Video uploaded successfully",
      fileName: req.body.fileName,
      path: `uploads/${req.body.fileName}`, // can use for video src
    });
  }
);

router.post("/", jobPostController.createJobPost);
router.get("/", jobPostController.getAllJobPosts);
router.get("/:id", jobPostController.getJobPostById);
router.put("/:id", jobPostController.updateJobPost);
router.delete("/:id", jobPostController.deleteJobPost);

router.post("/send-job-link", jobPostController.linkShareJobPost);
router.post("/get-jobpost-by-token", jobPostController.getJobpostbyToken);
router.post("/join-job-link", jobPostController.joinJobPostWithToken);
router.post(
  "/generate-job-token",
  jobPostController.generateTokenForJobInterviewLink
);
router.post("/get-recent-candidates", jobPostController.getRecentCandidates);
router.post("/get-admin-dashboard", jobPostController.getAdminDashbord);
router.post(
  "/update-candidate-byid",
  jobPostController.updateStudentWithJobpostById
);
router.get("/get-candidate-byid/:id", jobPostController.getCandidateById);
router.post(
  "/get-analytics-dashboard",
  jobPostController.getAnalyticsDashboard
);

const storage = new multer.memoryStorage();
const upload = multer({
  storage,
});

router.post(
  "/upload-resume",
  upload.single("file"),
  uploadFileController.UploadResume
);

router.post(
  "/resume-parser",
  upload.single("file"),
  resumeParserController.getResumeParser
);

// router.post(
//   "/upload-interview-video",
//   upload.single("video"),
//   uploadFileController.UploadInterviewVideo
// );
module.exports = router;
