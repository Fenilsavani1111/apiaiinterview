const express = require("express");
const router = express.Router();
const jobPostController = require("../controllers/jobPostController");
const uploadFileController = require("../controllers/uploadFileController");
const multer = require("multer");

router.post("/", jobPostController.createJobPost);
router.get("/", jobPostController.getAllJobPosts);
router.get("/:id", jobPostController.getJobPostById);
router.put("/:id", jobPostController.updateJobPost);
router.delete("/:id", jobPostController.deleteJobPost);

router.post("/send-job-link", jobPostController.linkShareJobPost);
router.post("/join-job-link", jobPostController.joinJobPostWithToken);
router.post(
  "/generate-job-token",
  jobPostController.generateTokenForJobInterviewLink
);
router.post("/get-recent-candidates", jobPostController.getRecentCandidates);
router.post(
  "/update-candidate-byid",
  jobPostController.updateStudentWithJobpostById
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
  "/upload-interview-video",
  upload.single("video"),
  uploadFileController.UploadInterviewVideo
);
module.exports = router;
