const mongoose = require('mongoose');

const voiceNoteSchema = new mongoose.Schema({
  proposalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal',
    required: true,
  },
  audioURL: {
    type: String,
    required: true,
  },
  publicId: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 15 * 24 * 60 * 60 * 1000),
  },
});

voiceNoteSchema.index({ proposalId: 1 });
voiceNoteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('VoiceNote', voiceNoteSchema);
