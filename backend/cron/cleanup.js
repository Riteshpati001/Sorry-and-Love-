const Gallery = require('../models/Gallery');
const VoiceNote = require('../models/VoiceNote');
const Proposal = require('../models/Proposal');
const bcrypt = require('bcrypt');
const { cloudinary } = require('../config/cloudinary');

const uploadMedia = async (req, res) => {
  try {
    const { proposalId } = req.body;

    const proposal = await Proposal.findOne({ _id: proposalId, senderId: req.user.id });
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found or unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';

    const galleryItem = await Gallery.create({
      proposalId,
      type: mediaType,
      url: req.file.path,
      publicId: req.file.filename,
      thumbnail: req.file.thumbnail_url || null,
    });

    res.status(201).json({
      message: 'Media uploaded successfully',
      media: galleryItem,
    });
  } catch (error) {
    console.error('Upload media error:', error.message);
    res.status(500).json({ message: 'Server error while uploading media' });
  }
};

const uploadVoiceNote = async (req, res) => {
  try {
    const { proposalId } = req.body;

    const proposal = await Proposal.findOne({ _id: proposalId, senderId: req.user.id });
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found or unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No audio file uploaded' });
    }

    const voiceNote = await VoiceNote.create({
      proposalId,
      audioURL: req.file.path,
      publicId: req.file.filename,
      duration: req.body.duration || 0,
    });

    res.status(201).json({
      message: 'Voice note uploaded successfully',
      voiceNote,
    });
  } catch (error) {
    console.error('Upload voice note error:', error.message);
    res.status(500).json({ message: 'Server error while uploading voice note' });
  }
};

const getGallery = async (req, res) => {
  try {
    const { proposalId } = req.params;

    const gallery = await Gallery.find({ proposalId }).sort({ createdAt: -1 });
    const voiceNotes = await VoiceNote.find({ proposalId }).sort({ createdAt: -1 });

    res.json({ gallery, voiceNotes });
  } catch (error) {
    console.error('Get gallery error:', error.message);
    res.status(500).json({ message: 'Server error while fetching gallery' });
  }
};

const unlockGallery = async (req, res) => {
  try {
    const { proposalId, password } = req.body;

    if (!proposalId || !password) {
      return res.status(400).json({ message: 'Proposal ID and password are required' });
    }

    const proposal = await Proposal.findById(proposalId).select('+galleryPassword');
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found' });
    }

    const isMatch = await bcrypt.compare(password, proposal.galleryPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    const gallery = await Gallery.find({ proposalId }).sort({ createdAt: -1 });
    const voiceNotes = await VoiceNote.find({ proposalId }).sort({ createdAt: -1 });

    res.json({
      message: 'Gallery unlocked successfully',
      gallery,
      voiceNotes,
    });
  } catch (error) {
    console.error('Unlock gallery error:', error.message);
    res.status(500).json({ message: 'Server error while unlocking gallery' });
  }
};

const deleteMedia = async (req, res) => {
  try {
    const { mediaId } = req.params;

    const media = await Gallery.findById(mediaId);
    if (!media) {
      return res.status(404).json({ message: 'Media not found' });
    }

    const proposal = await Proposal.findOne({ _id: media.proposalId, senderId: req.user.id });
    if (!proposal) {
      return res.status(403).json({ message: 'Unauthorized to delete this media' });
    }

    await cloudinary.uploader.destroy(media.publicId);
    await Gallery.findByIdAndDelete(mediaId);

    res.json({ message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Delete media error:', error.message);
    res.status(500).json({ message: 'Server error while deleting media' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { proposalId, currentPassword, newPassword } = req.body;

    const proposal = await Proposal.findOne({ _id: proposalId, senderId: req.user.id }).select('+galleryPassword');
    if (!proposal) {
      return res.status(404).json({ message: 'Proposal not found or unauthorized' });
    }

    const isMatch = await bcrypt.compare(currentPassword, proposal.galleryPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(12);
    proposal.galleryPassword = await bcrypt.hash(newPassword, salt);
    await proposal.save();

    res.json({ message: 'Gallery password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error.message);
    res.status(500).json({ message: 'Server error while changing password' });
  }
};

module.exports = { uploadMedia, uploadVoiceNote, getGallery, unlockGallery, deleteMedia, changePassword };
