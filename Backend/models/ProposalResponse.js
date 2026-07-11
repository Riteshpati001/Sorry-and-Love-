const mongoose = require('mongoose');

const proposalResponseSchema = new mongoose.Schema({
  proposalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Proposal',
    required: true,
  },
  response: {
    type: String,
    enum: ['accepted', 'rejected'],
    required: true,
  },
  respondedAt: {
    type: Date,
    default: Date.now,
  },
  ipAddress: {
    type: String,
    default: null,
  },
  device: {
    type: String,
    default: null,
  },
});

proposalResponseSchema.index({ proposalId: 1 });

module.exports = mongoose.model('ProposalResponse', proposalResponseSchema);
