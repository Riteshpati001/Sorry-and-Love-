const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary credentials safely
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure standard local temporary file storage for uploads
const upload = multer({ dest: '/tmp/' });

module.exports = { cloudinary, upload };
