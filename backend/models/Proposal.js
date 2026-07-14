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
  // 👈 CHANGED: Replaced 'receiver' with 'receiverEmail' to match your frontend payload
  receiverEmail: { 
    type: String, 
    required: true 
  },
  // 👈 ADDED: Added 'receiverName' to match your frontend payload
  receiverName: { 
    type: String,
    required: true
  },
  status: { 
    type: String, 
    default: 'pending', // This ensures every new proposal starts as 'pending'
    enum: ['pending', 'accepted', 'rejected'] // Restricts the field to these 3 values
  },
  // 👈 ADDED: Added 'introMessage' and 'proposalMessage'
  introMessage: {
    type: String 
  },
  proposalMessage: {
    type: String 
  },
  // 👈 ADDED: Added 'musicUrl' to save the MP3 link from your frontend form
  musicUrl: {
    type: String
  },
  title: { 
    type: String 
  },
  description: { 
    type: String 
  },
  // Stores the password to unlock the private gallery
  galleryPassword: {
    type: String,
    default: null 
  },
  media: [mediaSchema]
}, { timestamps: true });

module.exports = mongoose.model('Proposal', proposalSchema);
