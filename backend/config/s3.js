const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Configure S3 client safely with fallbacks to prevent initialization crashes
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

/**
 * Uploads a voice note recording to AWS S3 bucket
 */
const uploadVoiceToS3 = async (fileBuffer, fileName, mimeType) => {
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  const region = process.env.AWS_REGION || 'us-east-1';
  const key = `voicenotes/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);

  // Return key and secure public URL
  const url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
  return { url, key };
};

/**
 * Deletes a voice note from AWS S3 bucket
 */
const deleteVoiceFromS3 = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: key,
  });
  await s3Client.send(command);
};

module.exports = { uploadVoiceToS3, deleteVoiceFromS3 };
