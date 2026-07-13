require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Print all environment keys to see what Render is actually sending to the server
    console.log("=== Environment Variables Debug ===");
    console.log("Detected Env Keys:", Object.keys(process.env));
    console.log("Value of MONGO_URI exists?", !!process.env.MONGODB_URI);
    console.log("====================================");

    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

const { deleteVoiceFromS3 } = require('./config/s3');
const { cloudinary } = require('./config/cloudinary');
const Proposal = require('./models/Proposal');

const app = express();

// Enable trust proxy so express-rate-limit can get the real client IP on Render
app.set('trust proxy', 1);

// Securely configure helmet configurations to allow audio/video playback streams
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        mediaSrc: ["'self'", "https://*.amazonaws.com", "https://res.cloudinary.com"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
      },
    },
  })
);

// Global api request rate-limiting defense
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window duration
  max: 100, // Limit each IP address to 100 requests per windowMs
  message: { success: false, message: 'Too many requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);

// Database initialization
connectDB();

// CORS origin constraints integration
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

app.use(express.json());

// Routes declarations
app.use('/api/auth', require('./routes/auth'));
app.use('/api/proposals', require('./routes/proposal'));

// Periodic automatic cleanup process for media files older than 15 days
const cleanExpiredMedia = async () => {
  try {
    const expirationThreshold = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000); // 15 days
    const proposals = await Proposal.find({ 'media.uploadedAt': { $lt: expirationThreshold } });
    
    for (const proposal of proposals) {
      const expiredItems = proposal.media.filter(item => item.uploadedAt < expirationThreshold);
      for (const item of expiredItems) {
        if (item.fileType === 'audio') {
          // Clean S3 resources
          await deleteVoiceFromS3(item.publicId);
        } else {
          // Clean Cloudinary images/videos
          let resourceType = 'image';
          if (item.fileType === 'video') resourceType = 'video';
          await cloudinary.uploader.destroy(item.publicId, { resource_type: resourceType });
        }
        proposal.media.pull(item._id);
      }
      await proposal.save();
    }
  } catch (error) {
    console.error('Expired media auto-clean error:', error.message);
  }
};

// Run automated sweep check once every hour
setInterval(cleanExpiredMedia, 60 * 60 * 1000);

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    success: false,
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// Use the port Render assigns, or default to 10000 (Render's default) for local testing
const PORT = process.env.PORT || 10000; 

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
