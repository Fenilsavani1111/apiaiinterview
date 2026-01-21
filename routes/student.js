const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const authMiddleware = require('../middlewares/auth');

// All routes require authentication
router.use(authMiddleware);

// Create multiple students for a job post (Excel upload)
router.post('/students', studentController.createStudents);

// Get all students for a specific job post
router.get('/students/jobpost/:jobPostId', studentController.getStudentsByJobPost);

// Get student count for a job post
router.get('/students/jobpost/:jobPostId/count', studentController.getStudentCount);

// Delete all students for a specific job post
router.delete('/students/jobpost/:jobPostId', studentController.deleteStudentsByJobPost);

// Update students for a job post (replace all)
router.put('/students/jobpost/:jobPostId', studentController.updateStudents);

// Delete a single student
router.delete('/students/:id', studentController.deleteStudent);

module.exports = router;