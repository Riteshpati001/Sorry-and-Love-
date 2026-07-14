const express = require('express');
const router = express.Router();
const mongoose = require('mongoose'); // Imported mongoose for ObjectId checking
const Proposal = require('../models/Proposal'); 

// Import your S3 and Cloudinary configurations for media cleanup
const { deleteVoiceFromS3 } = require('../config/s3');
const { cloudinary } = require('../config/cloudinary');

// GET: Retrieve all proposals
router.get('/', async (req, res, next) => {
  try {
    const proposals = await Proposal.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: proposals.length,
      data: proposals
    });
  } catch (error) {
    next(error);
  }
});

// POST: Create a new proposal
router.post('/', async (req, res, next) => {
  try {
    const newProposal = await Proposal.create(req.body);
    res.status(201).json({
      success: true,
      data: newProposal
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// GET: Retrieve a proposal by slug OR database ID
// ==========================================
router.get('/slug/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;

    // Check if the 'slug' parameter is actually a valid 24-character hex database ID
    const query = mongoose.Types.ObjectId.isValid(slug)
      ? { _id: slug } // If it is, look up by _id
      : { slug: slug }; // Otherwise, look up by slug string

    const proposal = await Proposal.findOne(query);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    res.status(200).json({
      success: true,
      proposal // ProposalView.jsx expects a 'proposal' field inside data
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// POST: Respond to a proposal (accept/reject) by slug OR ID
// ==========================================
router.post('/slug/:slug/respond', async (req, res, next) => {
  try {
    const { slug } = req.params;
    const { response } = req.body; // Expects 'accepted' or 'rejected'

    if (!['accepted', 'rejected'].includes(response)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid response. Must be "accepted" or "rejected".'
      });
    }

    const query = mongoose.Types.ObjectId.isValid(slug)
      ? { _id: slug }
      : { slug: slug };

    const proposal = await Proposal.findOneAndUpdate(
      query,
      { status: response },
      { new: true } // Return the updated document
    );

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    res.status(200).json({
      success: true,
      data: proposal
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// NEW ROUTE - POST: Verify passcode to unlock private gallery
// ==========================================
router.post('/slug/:slug/unlock-gallery', async (req, res, next) => {
  try {
    const { slug } = req.params;
    
    // Extract password/code sent from the frontend (handles common variable names)
    const password = req.body.password || req.body.passcode || req.body.code;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to unlock this gallery.'
      });
    }

    const query = mongoose.Types.ObjectId.isValid(slug)
      ? { _id: slug }
      : { slug: slug };

    const proposal = await Proposal.findOne(query);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    // Adjust these field names to match whatever key is defined in your Proposal model schema
    const storedPassword = proposal.galleryPassword || proposal.password || proposal.passcode;

    if (!storedPassword) {
      return res.status(400).json({
        success: false,
        message: 'No password is set up for this romantic gallery.'
      });
    }

    if (storedPassword !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Please try again.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Gallery unlocked successfully!',
      media: proposal.media 
    });
  } catch (error) {
    next(error);
  }
});

// GET: Retrieve a single proposal by ID
router.get('/:id', async (req, res, next) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: 'Proposal not found' });
    }
    res.status(200).json({
      success: true,
      data: proposal
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// DELETE: Remove proposal & media
// ==========================================
router.delete('/:id', async (req, res, next) => {
  try {
    const proposal = await Proposal.findById(req.params.id);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    // 1. Clean up any attached S3 / Cloudinary media files before deleting the record
    if (proposal.media && proposal.media.length > 0) {
      for (const item of proposal.media) {
        try {
          if (item.fileType === 'audio') {
            await deleteVoiceFromS3(item.publicId);
          } else {
            let resourceType = 'image';
            if (item.fileType === 'video') resourceType = 'video';
            await cloudinary.uploader.destroy(item.publicId, { resource_type: resourceType });
          }
        } catch (mediaError) {
          console.error(`Error deleting media file ${item.publicId}:`, mediaError.message);
        }
      }
    }

    // 2. Delete the proposal document from MongoDB
    await Proposal.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Proposal and associated media deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// POST: Add uploaded media details (metadata) to an existing proposal
// ==========================================
router.post('/:id/media', async (req, res, next) => {
  try {
    console.log("=== INCOMING MEDIA REQUEST ===");
    console.log("Proposal ID:", req.params.id);
    console.log("Content-Type Header:", req.headers['content-type']);
    console.log("Request Body:", req.body);
    console.log("===============================");

    const url = req.body.url || req.body.secure_url;
    const publicId = req.body.publicId || req.body.public_id;
    const fileType = req.body.fileType || req.body.file_type || req.body.resource_type;

    if (!url || !publicId || !fileType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields. The backend expects url (or secure_url), publicId (or public_id), and fileType (or resource_type).',
        receivedBody: req.body
      });
    }

    const proposal = await Proposal.findById(req.params.id);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    proposal.media.push({
      url,
      publicId,
      fileType,
      uploadedAt: new Date()
    });

    await proposal.save();

    res.status(200).json({
      success: true,
      data: proposal
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// DELETE: Remove an individual media item from a proposal & S3/Cloudinary
// ==========================================
router.delete('/:id/media/:mediaId', async (req, res, next) => {
  try {
    const proposal = await Proposal.findById(req.params.id);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    const mediaItem = proposal.media.id(req.params.mediaId);

    if (!mediaItem) {
      return res.status(404).json({
        success: false,
        message: 'Media item not found'
      });
    }

    try {
      if (mediaItem.fileType === 'audio') {
        await deleteVoiceFromS3(mediaItem.publicId);
      } else {
        let resourceType = 'image';
        if (mediaItem.fileType === 'video') resourceType = 'video';
        await cloudinary.uploader.destroy(mediaItem.publicId, { resource_type: resourceType });
      }
    } catch (mediaError) {
      console.error(`Storage deletion failed for ${mediaItem.publicId}:`, mediaError.message);
    }

    proposal.media.pull(req.params.mediaId);
    await proposal.save();

    res.status(200).json({
      success: true,
      data: proposal,
      media: proposal.media
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
