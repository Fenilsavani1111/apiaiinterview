const { uploadFile } = require("../utils/s3Service");

exports.UploadResume = async (req, res) => {
  try {
    let file = req.file;
    if (!file)
      return res
        .status(400)
        .json({ success: false, error: "No file provided" });

    const timestamp = Date.now();
    const originalName =
      req.body.fileName || file.originalname || `resume-${timestamp}.pdf`;
    const key = `Resumes/${timestamp}-${originalName}`;
    const uploadRes = await uploadFile({
      buffer: file.buffer,
      key,
      contentType: file.mimetype,
    });

    console.log("upload resume response ->", uploadRes);
    if (uploadRes?.url) {
      return res.json({ success: true, file_url: uploadRes?.url });
    }
    return res
      .status(400)
      .json({ success: false, message: "Can't upload a file." });
  } catch (error) {
    console.log(error);
    res.send({
      message: error.message,
    });
  }
};

exports.UploadInterviewVideo = async (req, res) => {
  try {
    let file = req.file;
    if (!file)
      return res
        .status(400)
        .json({ success: false, error: "No file provided" });

    const timestamp = Date.now();
    const originalName = file.originalname || `interview-${timestamp}`;
    const key = `interviews/${timestamp}-${originalName}.webm`;

    const uploadRes = await uploadFile({
      fileContent: file.buffer,
      fileName: key,
      contentType: file.mimetype,
    });

    console.log("upload video response ->", uploadRes);
    if (uploadRes?.url) {
      return res.json({ success: true, file_url: uploadRes?.url });
    }
    return res
      .status(400)
      .json({ success: false, message: "Can't upload a video." });
  } catch (error) {
    console.log("error", error);
    res.send({
      message: error.message,
    });
  }
};
