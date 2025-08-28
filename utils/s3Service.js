const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

// Configure AWS S3 client using environment variables
const s3Client2 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const uploadFile = async ({
  fileContent,
  fileName,
  buffer,
  key,
  contentType,
}) => {
  try {
    const Body = fileContent || buffer;
    const Key = fileName || key;
    if (!Body && !Key)
      throw new Error("Missing file content or file name/key for S3 upload");

    // Prepare S3 PutObjectCommand parameters
    const cmd = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key,
      Body: Body,
      ContentType: contentType, // include only if you'll send the header on upload
    });

    // Send the command to S3
    const data = await s3Client2.send(cmd);

    // Check if upload was successful
    if (data.$metadata.httpStatusCode !== 200) {
      return;
    }

    // Construct public URL of the uploaded file
    let url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${Key}`;
    return { url, key: Key };
  } catch (error) {
    console.error("aws error->>", error);
    throw error;
  }
};

module.exports = { uploadFile };
