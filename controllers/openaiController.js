const OpenAI = require('openai');

// Initialize OpenAI client securely on the backend
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * @description Processes a question and answer to evaluate the candidate's response.
 * @route POST /api/openai/process-question
 * @access Public
 */
const processPhysicsQuestion = async (req, res) => {
  const { question, answer } = req.body;

  if (!question || !answer) {
    return res.status(400).json({ error: 'Question and answer are required.' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an intelligent interviewer that understands context and responds appropriately to different types of student answers.\n\nCONTEXT ANALYSIS GUIDELINES:\n1. ANALYZE the student's answer to understand their knowledge level:\n   - Complete understanding: Shows clear grasp of concepts with correct explanations\n   - Partial understanding: Has some correct ideas but missing key elements\n   - Confused/struggling: Shows misconceptions or very limited understanding\n   - No knowledge: Admits they don't know or gives completely wrong answer\n\n2. RESPOND CONTEXTUALLY based on their understanding level:\n\n   FOR STUDENTS WHO CLEARLY KNOW THE ANSWER (score 7-10):\n   - Give encouraging feedback: 'Excellent explanation!' 'Great understanding!' 'Perfect!'\n   - Acknowledge specific correct points they made\n   - Keep it positive and brief (8-15 words)\n\n   FOR STUDENTS WITH PARTIAL KNOWLEDGE (score 4-6):\n   - Be encouraging but gently corrective: 'Good start, but remember [key point]'\n   - 'You are on the right track with [correct part]'\n   - Provide a brief hint or clarification (15-20 words)\n\n   FOR STRUGGLING STUDENTS (score 1-3):\n   - Be very supportive: 'That's okay, this is tricky!'\n   - 'No worries, let's move on to the next question'\n   - Don't explain the answer, just be encouraging (8-12 words)\n\n   FOR STUDENTS WHO ADMIT THEY DON'T KNOW (score 0-1):\n   - Be extra supportive: 'That's perfectly fine!'\n   - 'Honesty is good, let's continue!'\n   - 'No problem at all, next question!'\n\n3. NEVER give long explanations or lectures\n4. ALWAYS match your tone to their confidence level\n5. Be a supportive interviewer, not a teacher\n\nRespond in JSON format:\n{'score': <0-10>, 'feedback': '<contextually appropriate feedback>'}`,
        },
        {
          role: 'user',
          content: `Question: 
${question}

Student's Answer: "${answer}"

Please analyze this answer contextually and provide appropriate feedback based on the student's demonstrated understanding level.`,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    const responseText =
      response.choices[0]?.message?.content ||
      "{'score': 5, 'feedback': 'Thank you for your answer!'}";
    
    const evaluation = JSON.parse(responseText);
    res.json(evaluation);

  } catch (error) {
    console.error('Error processing physics question with OpenAI:', error);
    res.status(500).json({ error: 'Failed to process question.' });
  }
};

const getDataFromResumePdf = async (req, res) => {
    const { pdfText } = req.body;
    if (!pdfText) {
        return res.status(400).json({ error: 'PDF text is required.' });
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful assistant that extracts structured data from resumes. Return the result only in pure JSON format without any explanation.",
                },
                {
                    role: "user",
                    content: `
Extract the following information from the resume text:
- Full Name
- Email Address
- Phone Number
- Experience Level (choose only one from: "entry", "junior", "mid", "senior", "lead")
- Current or Last Designation
- Location
- Technical or Domain Skills

Resume Text:
"""
${pdfText}
"""
Respond only in this JSON format:
{
  "job_data": {
    "name": "",
    "email": "",
    "phone": "",
    "experienceLevel": "",
    "designation": "",
    "location": "",
    "skills": []
  }
}
`,
                },
            ],
            temperature: 0.3,
            response_format: {
                type: "json_object",
            },
        });
        let responseText = response.choices[0]?.message?.content ?? "";
        const evaluation = JSON.parse(responseText);
        res.json(evaluation);
    } catch (error) {
        console.error('Error getting data from resume PDF with OpenAI:', error);
        res.status(500).json({ error: 'Failed to get data from resume PDF.' });
    }
};

const getInterviewOverviewWithAI = async (req, res) => {
    const { interviewQuestions, candidateInterview } = req.body;
    if (!interviewQuestions || !candidateInterview) {
        return res.status(400).json({ error: 'Interview questions and candidate interview are required.' });
    }
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are an assistant that converts interview question data and candidate answers into a single dashboard-ready JSON object and short human summary. Follow these rules exactly:
1) Treat numeric 'score' as out of 10. Do NOT invent scores for missing answers.
2) For each category (communicationSkills, technicalKnowledge, confidenceLevel, problemSolving, leadershipPotential) compute and return:
   - answeredAveragePercentage: average of only answered questions *10, rounded to 1 decimal place (zero string if none answered)
   - overallAveragePercentage: average across all questions treating missing answers as 0, rounded to 1 decimal place (zero if zero questions)
   - summary: one-sentence description of performance for that category
3) Also return counts: answeredCount, totalQuestions.
4) Category mapping:
   - communicationSkills: type == 'behavioral'
   - technicalKnowledge: type == 'technical'
   - confidenceLevel: aggregate across all answered and all questions
5) Build quickStats using the percentage ranges but **return only the label** (Excellent, Good, Fair, Poor) without the numeric ranges. For example, if the percentage falls in 40-59.9%, the output should be "Fair" (do not include "40-59.9%" in the string).
6) Recommendation: one of {"Highly Recommended", "Recommended", "Consider with reservations", "Not Recommended"}, include a 'summary' field explaining reasoning. Weight: 60% Tech, 40% Communication.
7) Include meta.assumption: "Scores are out of 10. Missing answers are handled in two ways (answered-only averages and overall averages treating missing required answers as 0). calculationDate: ${new Date().toISOString()}"
8) Output JSON must include: meta, performanceBreakdown (with percentages and summary), quickStats, recommendations (with summary), aiEvaluationSummary.
9) aiEvaluationSummary must include: a 'summary' string, a 'keyStrengths' array, and an 'areasOfGrowth' array. Derive these from the computed category results; do not contradict the numbers.
10) Determinism: Be deterministic (temperature 0). Do not include anything except the single JSON object followed by a 2–6 line human summary.`,
                },
                {
                    role: "user",
                    content: `Produce professional interview evaluation in JSON and short human summary for the following data. Use the rules in the system message exactly.

---
questions: [
${interviewQuestions
                        .map(
                            (v) =>
                                `{
  "id": ${v.id},
  "question": ${JSON.stringify(v.question)},
  "type": ${JSON.stringify(v.type)},
  "difficulty": ${JSON.stringify(v.difficulty)},
  "expectedDuration": ${v.expectedDuration},
  "category": ${JSON.stringify(v.category)},
  "suggestedAnswers": [${v.suggestedAnswers?.map((s) => JSON.stringify(s)).join(", ")}],
  "isRequired": ${v.isRequired},
  "order": ${v.order}
}`
                        )
                        .join(",\n")}
]

candidateAnswers: [
${candidateInterview
                        .map(
                            (v) =>
                                `{
  "question": ${JSON.stringify(v.question)},
  "userAnswer": ${JSON.stringify(v.userAnswer)},
  "aiEvaluation": ${JSON.stringify(v.aiEvaluation)},
  "score": ${v.score},
  "responseTime": ${v.responseTime}
}`
                        )
                        .join(",\n")}
]
---`,
                },
            ],
            temperature: 0.3,
            response_format: {
                type: "json_object",
            },
        });
        let responseText = response.choices[0]?.message?.content ?? "";
        const evaluation = JSON.parse(responseText);
        res.json(evaluation);
    } catch (error) {
        console.error('Error getting interview overview with OpenAI:', error);
        res.status(500).json({ error: 'Failed to get interview overview.' });
    }
};

const getCvMatchWithJD = async (req, res) => {
    const { jobdetails, resumetext } = req.body;
    if (!jobdetails || !resumetext) {
        return res.status(400).json({ error: 'Job details and resume text are required.' });
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are a resume-to-job matching engine and a structured data extractor. 
1. First, extract structured data from the resume into JSON format. 
2. Then, compare the extracted resume data against the job post and return a JSON object with match percentages.
3. Always respond only in pure JSON without any explanation.`,
                },
                {
                    role: "user",
                    content: `
RESUME TEXT:
"""
${resumetext}
"""

JOB POST:
${JSON.stringify(jobdetails)}

Respond only in this JSON format:
{
  "job_data": {
    "name": "",
    "email": "",
    "phone": "",
    "experienceLevel": "",
    "designation": "",
    "location": "",
    "skills": []
  },
  "match": {
    "overallMatchPercentage": 0,
    "skillsMatchPercentage": 0,
    "experienceMatchPercentage": 0,
    "educationMatchPercentage": 0,
    "locationMatchPercentage": 0
  }
}
`,
                },
            ],
            temperature: 0.3,
            response_format: {
                type: "json_object",
            },
        });
        let responseText = response.choices[0]?.message?.content ?? "";
        const evaluation = JSON.parse(responseText);
        res.json(evaluation);
    } catch (error) {
        console.error('Error getting CV match with JD with OpenAI:', error);
        res.status(500).json({ error: 'Failed to get CV match with JD.' });
    }
};


module.exports = { 
    processPhysicsQuestion,
    getDataFromResumePdf,
    getInterviewOverviewWithAI,
    getCvMatchWithJD 
};
