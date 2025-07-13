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
