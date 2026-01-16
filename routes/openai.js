
const express = require('express');
const router = express.Router();
const { 
    processPhysicsQuestion,
    getDataFromResumePdf,
    getInterviewOverviewWithAI,
    getCvMatchWithJD 
} = require('../controllers/openaiController');

// @route   POST api/openai/process-question
// @desc    Process a physics question and answer
// @access  Public
router.post('/process-question', processPhysicsQuestion);

// @route   POST api/openai/get-data-from-resume
// @desc    Extract structured data from resume text
// @access  Public
router.post('/get-data-from-resume', getDataFromResumePdf);

// @route   POST api/openai/get-interview-overview
// @desc    Generate an overview of the interview
// @access  Public
router.post('/get-interview-overview', getInterviewOverviewWithAI);

// @route   POST api/openai/get-cv-match-with-jd
// @desc    Match a CV with a job description
// @access  Public
router.post('/get-cv-match-with-jd', getCvMatchWithJD);

module.exports = router;
