const cloudinary = require('cloudinary').v2;

// Safe check: If Cloudinary keys are not provided, do not crash the server
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log("Cloudinary configuration initialized.");
} else {
  console.warn("Warning: Cloudinary credentials are missing. Media file cleanup may be limited.");
}

module.exports = { cloudinary };
