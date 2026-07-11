const express = require('express');
const router = express.Router();
const Proposal = require('../models/Proposal');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { upload, cloudinary } = require('../config/cloudinary');
const { uploadVoiceToS3, deleteVoiceFromS3 } = require('../config/s3');
const { sendProposalUpdateEmail } = require('../utils/mailer');
const multer = require('multer');

// Configure clean memory storage for voice note audio uploads to AWS S3
const memoryStorage = multer.memoryStorage();
const memoryUpload = multer({
  storage: memoryStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for recorded notes
});

// Fetch all proposals created by the logged-in user
router.get('/', protect, async (req, res) => {
  try {
    const proposals = await Proposal.find({ senderId: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, proposals });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create a new proposal
router.post('/', protect, async (req, res) => {
  const { receiverName, receiverEmail, introMessage, proposalMessage, galleryPassword, musicUrl } = req.body;
  try {
    const slug = `${receiverName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-6)}`;
    const proposal = await Proposal.create({
      senderId: req.user._id,
      receiverName,
      receiverEmail,
      slug,
      introMessage,
      proposalMessage,
      galleryPassword,
      musicUrl,
    });
    res.status(201).json({ success: true, proposal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Fetch proposal details via slug (Public view for receiver)
router.get('/slug/:slug', async (req, res) => {
  try {
    const proposal = await Proposal.findOne({ slug: req.params.slug });
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal experience not found' });
    }

    // Increment view count
    proposal.views += 1;
    await proposal.save();

    const sanitizedProposal = {
      _id: proposal._id,
      receiverName: proposal.receiverName,
      introMessage: proposal.introMessage,
      proposalMessage: proposal.proposalMessage,
      musicUrl: proposal.musicUrl,
      status: proposal.status,
      media: proposal.media,
      hasPassword: !!proposal.galleryPassword,
    };

    res.status(200).json({ success: true, proposal: sanitizedProposal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update proposal text configurations
router.put('/:id', protect, async (req, res) => {
  const { receiverName, receiverEmail, introMessage, proposalMessage, galleryPassword, musicUrl } = req.body;
  try {
    let proposal = await Proposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }
    if (proposal.senderId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Unauthorized modification' });
    }

    proposal.receiverName = receiverName || proposal.receiverName;
    proposal.receiverEmail = receiverEmail || proposal.receiverEmail;
    proposal.introMessage = introMessage !== undefined ? introMessage : proposal.introMessage;
    proposal.proposalMessage = proposalMessage !== undefined ? proposalMessage : proposal.proposalMessage;
    proposal.galleryPassword = galleryPassword || proposal.galleryPassword;
    proposal.musicUrl = musicUrl !== undefined ? musicUrl : proposal.musicUrl;

    const updatedProposal = await proposal.save();
    res.status(200).json({ success: true, proposal: updatedProposal });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete proposal completely
router.delete('/:id', protect, async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }
    if (proposal.senderId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Unauthorized removal request' });
    }

    // Delete any associated asset files from Cloudinary and AWS S3
    for (const file of proposal.media) {
      if (file.fileType === 'audio') {
        // Voice notes stored securely in AWS S3
        await deleteVoiceFromS3(file.publicId);
      } else {
        // Images and videos stored in Cloudinary
        let resourceType = 'image';
        if (file.fileType === 'video') resourceType = 'video';
        await cloudinary.uploader.destroy(file.publicId, { resource_type: resourceType });
      }
    }

    await proposal.deleteOne();
    res.status(200).json({ success: true, message: 'Proposal and all items removed completely' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload media attachment for a proposal with dynamic categorization
router.post('/:id/media', protect, upload.single('file'), async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }
    if (proposal.senderId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    let fileType = 'image';
    let options = { folder: 'heartlink_media' };

    if (req.file.mimetype.startsWith('video/')) {
      fileType = 'video';
      options.resource_type = 'video';
    } else if (req.file.mimetype.startsWith('audio/')) {
      fileType = 'audio';
      options.resource_type = 'video';
    }

    const result = await cloudinary.uploader.upload(req.file.path, options);

    const newMedia = {
      url: result.secure_url,
      publicId: result.public_id,
      fileType,
      uploadedAt: new Date()
    };

    proposal.media.push(newMedia);
    await proposal.save();

    res.status(200).json({ success: true, media: proposal.media });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Securely record and upload a voice note specifically to AWS S3 storage
router.post('/:id/voice-note', protect, memoryUpload.single('audio'), async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }
    if (proposal.senderId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No recording file captured' });
    }

    const { url, key } = await uploadVoiceToS3(req.file.buffer, 'voicenote.webm', req.file.mimetype);

    const newMedia = {
      url,
      publicId: key,
      fileType: 'audio',
      uploadedAt: new Date()
    };

    proposal.media.push(newMedia);
    await proposal.save();

    res.status(200).json({ success: true, media: proposal.media });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete specific media file inside a proposal
router.delete('/:id/media/:mediaId', protect, async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }
    if (proposal.senderId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const mediaItem = proposal.media.id(req.params.mediaId);
    if (!mediaItem) {
      return res.status(404).json({ success: false, message: 'Media item not found' });
    }

    if (mediaItem.fileType === 'audio') {
      await deleteVoiceFromS3(mediaItem.publicId);
    } else {
      let resourceType = 'image';
      if (mediaItem.fileType === 'video') resourceType = 'video';
      await cloudinary.uploader.destroy(mediaItem.publicId, { resource_type: resourceType });
    }

    proposal.media.pull(req.params.mediaId);
    await proposal.save();

    res.status(200).json({ success: true, media: proposal.media });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Authenticate and unlock gallery access
router.post('/slug/:slug/unlock-gallery', async (req, res) => {
  const { password } = req.body;
  try {
    const proposal = await Proposal.findOne({ slug: req.params.slug });
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal experience not found' });
    }

    if (proposal.galleryPassword === password) {
      res.status(200).json({ success: true, authenticated: true });
    } else {
      res.status(401).json({ success: false, message: 'Invalid gallery password' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Submit proposal decision status (Accept/Reject)
router.post('/slug/:slug/respond', async (req, res) => {
  const { response } = req.body;
  try {
    const proposal = await Proposal.findOne({ slug: req.params.slug });
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal experience not found' });
    }

    proposal.status = response;
    proposal.responseDate = new Date();
    await proposal.save();

    const sender = await User.findById(proposal.senderId);
    if (sender) {
      await sendProposalUpdateEmail(sender.email, proposal.receiverName, response);
    }

    res.status(200).json({ success: true, status: proposal.status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
