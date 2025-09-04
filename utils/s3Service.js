const { S3Client } = require("@aws-sdk/client-s3");
const { Upload } = require("@aws-sdk/lib-storage");

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
    if (!Body) throw new Error("Missing file content for S3 upload");
    if (!Key) throw new Error("Missing file name/key for S3 upload");

    const upload = new Upload({
      client: s3Client2,
      params: {
        Bucket: process.env.S3_BUCKET_NAME,
        Key,
        Body,
        ContentType: contentType,
      },
      queueSize: 5, // how many parts upload in parallel
      partSize: 10 * 1024 * 1024, // 10 MB chunks
    });

    upload.on("httpUploadProgress", (progress) => {
      console.log(
        `Progress: ${((progress.loaded / progress.total) * 100).toFixed(2)}%`
      );
    });

    const data = await upload.done(); // wait for completion
    console.log("Upload complete:", data);

    const url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${Key}`;
    return { url, key: Key };
  } catch (error) {
    console.error("aws error->>", error);
    throw error;
  }
};

module.exports = { uploadFile };
