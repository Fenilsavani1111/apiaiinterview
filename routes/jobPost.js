const express = require('express');
const router = express.Router();
const jobPostController = require('../controllers/jobPostController');

router.post('/', jobPostController.createJobPost);
router.get('/', jobPostController.getAllJobPosts);
router.get('/:id', jobPostController.getJobPostById);
router.put('/:id', jobPostController.updateJobPost);
router.delete('/:id', jobPostController.deleteJobPost);

router.post('/send-job-link', jobPostController.linkShareJobPost);
router.post('/join-job-link', jobPostController.joinJobPostWithToken);
module.exports = router; 