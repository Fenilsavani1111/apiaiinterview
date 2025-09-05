const { AffindaAPI, AffindaCredential } = require("@affinda/affinda");

const AFFINDA_API_KEY = process.env.AFFINDA_API_KEY;
const AFFINDA_WORKSPACE = process.env.AFFINDA_WORKSPACE;

// Initialize Affinda client
const credential = new AffindaCredential(AFFINDA_API_KEY);
const client = new AffindaAPI(credential);

/**
 * Upload resume to Affinda
 */
const uploadResume = async (fileBuffer, filename) => {
  const resume = await client.createDocument({
    file: fileBuffer,
    fileName: filename,
    workspace: AFFINDA_WORKSPACE,
    documentType: process.env.AFFINDA_RESUME_PARSER_KEY, // specify the extractor
  });
  return resume;
};

/**
 * Upload job description (as plain text) to Affinda
 */
const uploadJD = async (jobText, title) => {
  const resume = await client.createDocument({
    file: Buffer.from(jobText), // send as text file
    fileName: `${title}_job_description.txt`,
    workspace: AFFINDA_WORKSPACE,
    documentType: process.env.AFFINDA_JOB_KEY, // specify the extractor
  });
  return resume;
};

/**
 * Add resume to index if it doesn’t already exist
 */
const addToIndexIfNotExists = async (indexId, documentId) => {
  const indexDocs = await client.getAllIndexDocuments(indexId);

  const alreadyExists = indexDocs.results.some(
    (doc) => doc.document === documentId
  );

  if (!alreadyExists) {
    await client.createIndexDocument(indexId, { document: documentId });
    console.log(`✅ Added ${documentId} to index ${indexId}`);
  } else {
    console.log(`⚠️ Document ${documentId} already exists in index ${indexId}`);
  }
};

/**
 * Match resume against job description
 */
const matchCandidate = async (resumeId, jobData) => {
  const matchResult = await client.getResumeSearchMatch(resumeId, jobData);
  return matchResult;
};

/**
 * Extract the current job title from work experience
 */
const getCurrentJobTitle = (data) => {
  const jobs = data?.workExperience?.map((exp) => {
    const title = exp.parsed?.workExperienceJobTitle?.parsed || null;
    const dates = exp.parsed?.workExperienceDates?.parsed;

    return {
      title,
      start: dates?.start?.date || null,
      end: dates?.end?.date || null,
      isCurrent: !dates?.end?.date || dates?.end?.isCurrent === true,
    };
  });

  // Prefer the current job, otherwise fallback to first job
  const currentJob = jobs?.find((job) => job.isCurrent) ?? jobs?.[0];

  return currentJob;
};

/**
 * Controller: Parse resume, match with job, return candidate info + match score
 */
exports.getResumeParser = async (req, res) => {
  try {
    const resumeFile = req.file;
    const jobData = req.body.jobData ? JSON.parse(req.body.jobData) : {};

    if (!resumeFile || !jobData) {
      return res
        .status(400)
        .json({ error: "Resume file and jobData are required" });
    }

    // 1. Upload resume
    const document = await uploadResume(
      resumeFile.buffer,
      resumeFile.originalname
    );

    // 2. Poll until resume is processed
    let processedDocument;
    for (let i = 0; i < 5; i++) {
      processedDocument = await client.getDocument(document.meta.identifier);
      if (
        processedDocument.data &&
        Object.keys(processedDocument.data).length > 0
      )
        break;
      await new Promise((r) => setTimeout(r, 2000)); // wait 2s before retry
    }

    // 3. Add resume to search index
    await addToIndexIfNotExists(
      "Resume-Search-Demo",
      processedDocument.meta.identifier
    );

    // 4. Convert job data into text format
    const jobDescriptionText = `
Title: ${jobData.jobTitle}
Type: ${jobData.jobType}
Location: ${jobData.location}
Company: ${jobData.company}
Experience Level: ${jobData.experienceLevel}
Department: ${jobData.department}

Description: ${jobData.jobDescription}

Requirements:
- ${jobData.requirements.join("\n- ")}

Responsibilities:
- ${jobData.responsibilities.join("\n- ")}

Skills:
- ${jobData.skills.join(", ")}
`;

    // 5. Upload job description
    const jobDoc = await uploadJD(jobDescriptionText, jobData.jobTitle);

    // 6. Match candidate resume against job description
    const matchResult = await matchCandidate(
      processedDocument.meta.identifier,
      jobDoc.meta.identifier
    );

    // 7. Pick only relevant scores
    let selectedMatch = {
      education: matchResult.details?.education?.score || 0,
      experience: matchResult.details?.experience?.score || 0,
      skills: matchResult.details?.skills?.score || 0,
      location: matchResult.details?.location?.score || 0,
    };
    selectedMatch = {
      ...selectedMatch,
      overallScore:
        (selectedMatch?.education +
          selectedMatch?.experience +
          selectedMatch?.location +
          selectedMatch?.skills) /
        4,
    };

    // 8. Extract candidate info
    const parsedResume = processedDocument.data;
    const currentJob = getCurrentJobTitle(parsedResume);

    const candidateInfo = {
      name: parsedResume.candidateName?.[0]?.raw || null,
      email: parsedResume.email?.[0]?.raw || null,
      phone: parsedResume.phoneNumber?.[0]?.raw || null,
      location: parsedResume?.location?.raw || null,
      experience: parsedResume.totalYearsExperience?.parsed || null,
      skills: parsedResume.skill?.map((v) => v?.raw) || [],
      designation: currentJob?.title || null,
    };

    // 9. Remove resumes with very low score
    if (selectedMatch?.overallScore < 0.4) {
      await client.deleteDocument(processedDocument.meta.identifier);
    }

    // 10. Delete job description (cleanup)
    await client.deleteDocument(jobDoc.meta.identifier);

    // ✅ Final response
    return res.json({
      message: "Job matched successfully.",
      candidateInfo,
      matchResult: selectedMatch,
      file_url: processedDocument?.meta?.file,
    });
  } catch (err) {
    console.error("Error matching resume:", err);
    res.status(500).json({ error: "Matching failed", details: err.message });
  }
};
