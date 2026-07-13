const express = require('express');
const router = express.Router();
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
// NEW ROUTE - DELETE: Remove proposal & media
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
            // Remove from S3
            await deleteVoiceFromS3(item.publicId);
          } else {
            // Remove from Cloudinary (image or video)
            let resourceType = 'image';
            if (item.fileType === 'video') resourceType = 'video';
            await cloudinary.uploader.destroy(item.publicId, { resource_type: resourceType });
          }
        } catch (mediaError) {
          // Log media cleanup errors but don't stop the database deletion
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
// NEW ROUTE - POST: Add uploaded media details (metadata) to an existing proposal
// ==========================================
router.post('/:id/media', async (req, res, next) => {
  try {
    const { url, publicId, fileType } = req.body;

    // 1. Basic validation of incoming metadata
    if (!url || !publicId || !fileType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: url, publicId, or fileType'
      });
    }

    // 2. Find the target proposal
    const proposal = await Proposal.findById(req.params.id);

    if (!proposal) {
      return res.status(404).json({
        success: false,
        message: 'Proposal not found'
      });
    }

    // 3. Add the new media object to the proposal's media array
    // (uploadedAt property is included to support your hourly cleanup task in server.js)
    proposal.media.push({
      url,
      publicId,
      fileType,
      uploadedAt: new Date()
    });

    // 4. Save the updated proposal document to MongoDB
    await proposal.save();

    res.status(200).json({
      success: true,
      data: proposal
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
