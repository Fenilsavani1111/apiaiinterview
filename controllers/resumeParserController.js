const { AffindaAPI, AffindaCredential } = require("@affinda/affinda");

const AFFINDA_API_KEY = process.env.AFFINDA_API_KEY;
const AFFINDA_WORKSPACE = process.env.AFFINDA_WORKSPACE;

// Initialize the Affinda client
const credential = new AffindaCredential(AFFINDA_API_KEY);
const client = new AffindaAPI(credential);

const uploadResume = async (fileBuffer, filename) => {
  const resume = await client.createDocument({
    file: fileBuffer,
    fileName: filename,
    workspace: AFFINDA_WORKSPACE,
    documentType: process.env.AFFINDA_RESUME_PARSER_KEY, // specify the extractor
  });
  return resume;
};

const uploadJD = async (jobText) => {
  const resume = await client.createDocument({
    file: Buffer.from(jobText), // send as text file
    fileName: "job-description.txt",
    workspace: AFFINDA_WORKSPACE,
    documentType: process.env.AFFINDA_JOB_KEY, // specify the extractor
  });
  return resume;
};

// Match resume with job description
const matchCandidate = async (resumeId, jobData) => {
  const matchResult = await client.getResumeSearchMatch(resumeId, jobData);
  return matchResult;
};

const getCurrentJobTitle = (data) => {
  const jobs = data?.workExperience.map((exp) => {
    const title = exp.parsed?.workExperienceJobTitle?.parsed || null;
    const dates = exp.parsed?.workExperienceDates?.parsed;

    return {
      title,
      start: dates?.start?.date || null,
      end: dates?.end?.date || null,
      isCurrent: !dates?.end?.date || dates?.end?.isCurrent === true,
    };
  });

  // Find the current one
  const currentJob = jobs.find((job) => job.isCurrent) ?? jobs?.[0];

  return currentJob;
};

exports.getResumeParser = async (req, res) => {
  try {
    const resumeFile = req.file;
    const jobData = req.body.jobData ? JSON.parse(req.body.jobData) : {};

    if (!resumeFile || !jobData) {
      return res
        .status(400)
        .json({ error: "Resume file and jobData are required" });
    }

    // Upload resume
    const document = await uploadResume(
      resumeFile.buffer,
      resumeFile.originalname
    );
    let processedDocument;
    for (let i = 0; i < 5; i++) {
      processedDocument = await client.getDocument(document.meta.identifier);
      if (
        processedDocument.data &&
        Object.keys(processedDocument.data).length > 0
      )
        break;
      await new Promise((r) => setTimeout(r, 2000)); // wait 2 seconds
    }
    // Add resume to the index
    await client.createIndexDocument("Resume-Search-Demo", {
      document: processedDocument.meta.identifier,
    });

    // Convert to text
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
    const jobDoc = await uploadJD(jobDescriptionText);

    // Call matching API
    const matchResult = await matchCandidate(
      processedDocument.meta.identifier,
      jobDoc.meta.identifier
    );
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
    // Extract candidate info
    const parsedResume = processedDocument.data;
    const currentJob = getCurrentJobTitle(parsedResume);
    const candidateInfo = {
      name: parsedResume.candidateName?.[0]?.raw || null,
      email: parsedResume.email?.[0]?.raw || null,
      location: parsedResume?.location?.raw || null,
      phone: parsedResume?.phoneNumber?.[0]?.raw || null,
      experience: parsedResume.totalYearsExperience?.parsed || null,
      skills: parsedResume.skill?.map((v) => v?.raw),
      designation: currentJob?.title || null,
    };

    res.json({
      candidateInfo,
      matchResult: selectedMatch,
      file_url: processedDocument?.meta?.file,
    });
  } catch (err) {
    console.error("Error matching resume:", err);
    res.status(500).json({ error: "Matching failed", details: err.message });
  }
};
