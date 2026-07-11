const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiverName: {
    type: String,
    required: [true, 'Receiver name is required'],
    trim: true,
    maxlength: [50, 'Receiver name cannot exceed 50 characters'],
  },
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters'],
    default: 'A Special Message For You ❤️',
  },
  introMessage: {
    type: String,
    trim: true,
    maxlength: [500, 'Intro message cannot exceed 500 characters'],
    default: 'There are countless words I could say, but the most important one is hidden inside this little journey. Thank you for being here.',
  },
  proposalMessage: {
    type: String,
    trim: true,
    maxlength: [500, 'Proposal message cannot exceed 500 characters'],
    default: 'Every moment with you has become one of my favorite memories. Will you stay by my side?',
  },
  song: {
    type: String,
    default: null,
  },
  galleryPassword: {
    type: String,
    required: [true, 'Gallery password is required'],
  },
  uniqueLink: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending',
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

proposalSchema.index({ uniqueLink: 1 });
proposalSchema.index({ senderId: 1 });
proposalSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Proposal', proposalSchema);
