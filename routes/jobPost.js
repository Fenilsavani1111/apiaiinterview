const express = require("express");
const router = express.Router();
const jobPostController = require("../controllers/jobPostController");
const uploadFileController = require("../controllers/uploadFileController");
// const resumeParserController = require("../controllers/resumeParserController");
const multer = require("multer");
const path = require("path");
const {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
} = require("@aws-sdk/client-s3");

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

// Route to upload video
// router.post(
//   "/upload-interview-video",
//   uploadvideo.single("video"),
//   (req, res) => {
//     console.log(req.file, "file Name:", req.body.fileName);

//     console.time("Video Upload");
//     if (!req.file) return res.status(400).send("No file uploaded.");
//     console.timeEnd("Video Upload");
//     console.log("✅ File saved to disk:", req.file.path);

//     // Prepare the response data
//     const responseData = {
//       message: "Video uploaded successfully",
//       fileName: req.file.filename,
//       path: `uploads/${req.file.filename}`,
//     };

//     // Set content type and end the response with JSON
//     res.setHeader("Content-Type", "application/json");
//     res.end(JSON.stringify(responseData));
//   }
// );

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

// interview video upload routes

// AWS S3 v3 Client
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Store upload sessions in memory (for demo)
const uploadSessions = {};

router.post("/start-upload", async (req, res) => {
  try {
    const key = `interview-${Date.now()}.webm`;

    const command = new CreateMultipartUploadCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      ContentType: "video/webm",
    });
    const response = await s3.send(command);

    uploadSessions[key] = {
      uploadId: response.UploadId,
      parts: [],
    };
    res.json({ key, uploadId: response.UploadId });
  } catch (err) {
    console.error("Start upload error:", err);
    res.status(500).json({ error: "Failed to start upload" });
  }
});

router.post("/upload-part", upload.single("chunk"), async (req, res) => {
  try {
    console.log("body--->", req.body);
    const { key, partNumber } = req.body;
    const fileBuffer = req.file.buffer;

    if (!uploadSessions[key]) {
      return res.status(400).json({ error: "Invalid upload session" });
    }

    const uploadId = uploadSessions[key].uploadId;

    const command = new UploadPartCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      PartNumber: parseInt(partNumber),
      UploadId: uploadId,
      Body: fileBuffer,
    });

    const response = await s3.send(command);

    uploadSessions[key].parts.push({
      ETag: response.ETag,
      PartNumber: parseInt(partNumber),
    });

    res.json({ success: true, ETag: response.ETag });
  } catch (err) {
    console.error("Error uploading part", err);
    res.status(500).json({ error: "Failed to upload part" });
  }
});

router.post("/complete-upload", async (req, res) => {
  try {
    const { key } = req.body;

    if (!uploadSessions[key]) {
      return res.status(400).json({ error: "Invalid session" });
    }

    const { uploadId, parts } = uploadSessions[key];

    const command = new CompleteMultipartUploadCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.sort((a, b) => a.PartNumber - b.PartNumber),
      },
    });

    const response = await s3.send(command);

    // Clean up memory
    delete uploadSessions[key];

    res.json({ success: true, url: response.Location });
  } catch (err) {
    console.error("Complete upload error:", err);
    res.status(500).json({ error: "Failed to complete upload" });
  }
});

// router.post(
//   "/resume-parser",
//   upload.single("file"),
//   resumeParserController.getResumeParser
// );

// router.post(
//   "/upload-interview-video",
//   upload.single("video"),
//   uploadFileController.UploadInterviewVideo
// );
module.exports = router;
