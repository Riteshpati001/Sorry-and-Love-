const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  fileType: { type: String, required: true }, // e.g., 'audio', 'video'
  publicId: { type: String, required: true }, // S3 key or Cloudinary public ID
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
});

const proposalSchema = new mongoose.Schema({
  // Add other fields your proposal might have here (like title, description, user, etc.)
  media: [mediaSchema]
}, { timestamps: true });

module.exports = mongoose.model('Proposal', proposalSchema);
