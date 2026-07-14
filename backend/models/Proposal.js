const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  fileType: { type: String, required: true }, // e.g., 'audio', 'video'
  publicId: { type: String, required: true }, // S3 key or Cloudinary public ID
  url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
});

const proposalSchema = new mongoose.Schema({
  sender: { 
    type: String, 
    required: true 
  },
  receiver: { 
    type: String, 
    required: true 
  },
  status: { 
    type: String, 
    default: 'pending', // This ensures every new proposal starts as 'pending'
    enum: ['pending', 'accepted', 'rejected'] // Restricts the field to these 3 values
  },
  title: { 
    type: String 
  },
  description: { 
    type: String 
  },
  // 👈 ADDED FIELD: Stores the password to unlock the private gallery
  galleryPassword: {
    type: String,
    default: null 
  },
  media: [mediaSchema]
}, { timestamps: true });

module.exports = mongoose.model('Proposal', proposalSchema);
