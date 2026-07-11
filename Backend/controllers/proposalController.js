const Proposal = require('../models/Proposal');
const Gallery = require('../models/Gallery');
const VoiceNote = require('../models/VoiceNote');
const ProposalResponse = require('../models/ProposalResponse');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const { generateUniqueLink } = require('../utils/generateLink');
const { sendAcceptanceEmail, sendRejectionEmail } = require('../services/emailService');

const createProposal = async (req, res) => {
  try {
    const { receiverName, title, introMessage, proposalMessage, song, galleryPassword } = req.body;

    if (!receiverName || !galleryPassword) {
      return res.status(400).json({ message: 'Receiver name and gallery password are required' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(galleryPassword, salt);

    let uniqueLink;
    let isUnique = false;
    while (!isUnique) {
      uniqueLink = generateUniqueLink();
      const existing = await Proposal.findOne({ uniqueLink });
      if (!existing) isUnique = true;
    }

    const proposal = await Proposal.create({
      senderId: req.user.id,
      receiverName,
      title: title || 'A Special Message For You ❤️',
      introMessage: introMessage || 'There are countless words I could say, but the most important one is hidden inside this little journey. Thank you for being here.',
      proposalMessage: proposalMessage || 'Every moment with you has become one of my favorite memories. Will you stay by my side?',
      song: song || null,
      galleryPassword: hashedPassword,
      uniqueLink,
    });

    res.status(201).json({
      message: 'Proposal created successfully',
      proposal: {
        id: proposal._id,
        receiverName: proposal.receiverName,
        title: proposal.title,
        uniqueLink: proposal.uniqueLink,
        link: `${process.env.CLIENT_URL || 'http://localhost:5173'}/p/${proposal.uniqueLink}`,
        status: proposal.status,
        createdAt: proposal.createdAt,
        expiresAt: proposal.expiresAt,
      },
    });
  } catch (error) {
    console.error('Create proposal error:', error.message);
    res.status(500).json({ message: 'Server error while creating proposal' });
  }
};

const getProposalByLink = async (req, res) => {
  try {
    const { link } = req.params;
    const proposal = await Proposal.findOne({ uniqueLink: link })
      .populate('senderId', 'name')
      .select('-galleryPassword');

    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found or link is invalid' });
    }

    if (new Date() > proposal.expiresAt) {
      return res.status(410).json({ message: 'This proposal has expired' });
    }

    const response = await ProposalResponse.findOne({ proposalId: proposal._id });

    res.json({
      proposal: {
        id: proposal._id,
        senderName: proposal.senderId.name,
        receiverName: proposal.receiverName,
        title: proposal.title,
        introMessage: proposal.introMessage,
        proposalMessage: proposal.proposalMessage,
        song: proposal.song,
        status: proposal.status,
        createdAt: proposal.createdAt,
        expiresAt: proposal.expiresAt,
      },
      response: response ? {
        status: response.response,
        respondedAt: response.respondedAt,
      } : null,
    });
  } catch (error) {
    console.error('Get proposal error:', error.message);
    res.status(500).json({ message: 'Server error while fetching proposal' });
  }
};

const updateProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, introMessage, proposalMessage, song } = req.body;

    const proposal = await Proposal.findOne({ _id: id, senderId: req.user.id });
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found or unauthorized' });
    }

    if (title) proposal.title = title;
    if (introMessage !== undefined) proposal.introMessage = introMessage;
    if (proposalMessage !== undefined) proposal.proposalMessage = proposalMessage;
    if (song !== undefined) proposal.song = song;

    await proposal.save();

    res.json({
      message: 'Proposal updated successfully',
      proposal,
    });
  } catch (error) {
    console.error('Update proposal error:', error.message);
    res.status(500).json({ message: 'Server error while updating proposal' });
  }
};

const deleteProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const proposal = await Proposal.findOneAndDelete({ _id: id, senderId: req.user.id });

    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found or unauthorized' });
    }

    await Gallery.deleteMany({ proposalId: id });
    await VoiceNote.deleteMany({ proposalId: id });
    await ProposalResponse.deleteMany({ proposalId: id });

    res.json({ message: 'Proposal deleted successfully' });
  } catch (error) {
    console.error('Delete proposal error:', error.message);
    res.status(500).json({ message: 'Server error while deleting proposal' });
  }
};

const getUserProposals = async (req, res) => {
  try {
    const proposals = await Proposal.find({ senderId: req.user.id })
      .select('-galleryPassword')
      .sort({ createdAt: -1 });

    const proposalsWithResponses = await Promise.all(
      proposals.map(async (proposal) => {
        const response = await ProposalResponse.findOne({ proposalId: proposal._id });
        return {
          ...proposal.toObject(),
          response: response ? {
            status: response.response,
            respondedAt: response.respondedAt,
          } : null,
        };
      })
    );

    res.json({ proposals: proposalsWithResponses });
  } catch (error) {
    console.error('Get user proposals error:', error.message);
    res.status(500).json({ message: 'Server error while fetching proposals' });
  }
};

const respondToProposal = async (req, res) => {
  try {
    const { link } = req.params;
    const { response } = req.body;

    if (!['accepted', 'rejected'].includes(response)) {
      return res.status(400).json({ message: 'Response must be accepted or rejected' });
    }

    const proposal = await Proposal.findOne({ uniqueLink: link });
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    if (proposal.status !== 'pending') {
      return res.status(400).json({ message: 'This proposal has already been responded to' });
    }

    proposal.status = response;
    await proposal.save();

    const ipAddress = req.ip || req.connection.remoteAddress;
    const device = req.headers['user-agent'] || 'Unknown';

    await ProposalResponse.create({
      proposalId: proposal._id,
      response,
      ipAddress,
      device,
    });

    const sender = await User.findById(proposal.senderId);

    if (response === 'accepted') {
      await sendAcceptanceEmail(sender.email, sender.name, proposal.receiverName);
    } else {
      await sendRejectionEmail(sender.email, sender.name, proposal.receiverName);
    }

    res.json({
      message: response === 'accepted' ? 'Proposal accepted! ❤️' : 'Proposal rejected',
      status: response,
    });
  } catch (error) {
    console.error('Respond to proposal error:', error.message);
    res.status(500).json({ message: 'Server error while responding to proposal' });
  }
};

module.exports = {
  createProposal,
  getProposalByLink,
  updateProposal,
  deleteProposal,
  getUserProposals,
  respondToProposal,
};
