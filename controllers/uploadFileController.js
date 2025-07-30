const cloudinary = require("cloudinary").v2;

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET_KEY, // Click 'View API Keys' above to copy your API secret
});

async function handleUpload(file) {
  const res = await cloudinary.uploader.upload(file, {
    folder: "students-resumes", // Cloudinary folder
    allowed_formats: ["pdf", "docx"],
    resource_type: "auto",
  });
  return res;
}
async function handleInterviewUpload(file) {
  try {
    const res = await cloudinary.uploader.upload_large(file, {
      folder: "interview", // Cloudinary folder
      resource_type: "video",
      chunk_size: 6 * 1024 * 1024, // 6MB
      timeout: 60000,
    });
    return res;
  } catch (err) {
    console.log("eerr", err);
  }
}

exports.UploadResume = async (req, res) => {
  try {
    let file = req.file;
    const b64 = Buffer.from(file.buffer).toString("base64");
    let dataURI = "data:" + file.mimetype + ";base64," + b64;
    const cldRes = await handleUpload(dataURI);
    console.log("file uploaded", cldRes);
    res.json({ success: true, file_url: cldRes.secure_url });
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
    console.log("file", file);
    const b64 = Buffer.from(file.buffer).toString("base64");
    const dataURI = `data:${file.mimetype};base64,${b64}`;
    const cldRes = await handleInterviewUpload(dataURI);
    if (cldRes?.secure_url) {
      console.log("file uploaded", cldRes);
      res.json({ success: true, file_url: cldRes.secure_url });
    } else {
      res.status(404).json({ success: false, error: "Video not Uploaded" });
    }
  } catch (error) {
    console.log("error", error);
    res.send({
      message: error.message,
    });
  }
};
