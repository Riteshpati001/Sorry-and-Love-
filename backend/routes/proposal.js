const express = require('express');
const router = express.Router();
const Proposal = require('../models/Proposal'); // Adjust path to your model if needed

// Import S3 and Cloudinary configs for media cleanup upon deletion
const { deleteVoiceFromS3 } = require('../config/s3');
const { cloudinary } = require('../config/cloudinary');

// --- 1. GET ROUTE HANDLER (Fetch all proposals) ---
const getProposals = async (req, res) => {
  try {
    const proposals = await Proposal.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: proposals
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// --- 2. POST ROUTE HANDLER (Create a proposal) ---
const createProposal = async (req, res) => {
  try {
    const { 
      receiverEmail, 
      receiverName, 
      introMessage, 
      proposalMessage, 
      galleryPassword, 
      musicUrl,
      sender 
    } = req.body;

    const newProposal = new Proposal({
      sender: sender || req.user?.email || "Anonymous", 
      receiverEmail,
      receiverName,
      introMessage,
      proposalMessage,
      galleryPassword,
      musicUrl
    });

    await newProposal.save();

    res.status(201).json({ 
      success: true, 
      message: "Proposal created successfully", 
      data: newProposal 
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// --- 3. DELETE ROUTE HANDLER (Delete a proposal and its media) ---
const deleteProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const proposal = await Proposal.findById(id);
    
    if (!proposal) {
      return res.status(404).json({ success: false, message: "Proposal not found" });
    }

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
          console.error(`Failed to delete media asset ${item.publicId}:`, mediaError.message);
        }
      }
    }

    await Proposal.findByIdAndDelete(id);

    res.status(200).json({ 
      success: true, 
      message: "Proposal and associated media deleted successfully" 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// --- 4. POST ROUTE HANDLER (Attach uploaded media metadata to a proposal) ---
const addMediaToProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { url, publicId, fileType } = req.body;

    // Validate that required metadata fields exist
    if (!url || !publicId || !fileType) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required media fields: url, publicId, or fileType" 
      });
    }

    const proposal = await Proposal.findById(id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: "Proposal not found" });
    }

    // Push the metadata to the proposal's media array
    proposal.media.push({
      url,
      publicId,
      fileType,
      uploadedAt: new Date() // Sets current timestamp (needed for your automated cleanup)
    });

    await proposal.save();

    res.status(200).json({
      success: true,
      message: "Media attached successfully",
      data: proposal
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// --- ROUTE DEFINITIONS ---

// GET /api/proposals - Fetch proposals
router.get('/', getProposals);

// POST /api/proposals - Create a proposal
router.post('/', createProposal);

// DELETE /api/proposals/:id - Delete a proposal
router.delete('/:id', deleteProposal);

// POST /api/proposals/:id/media - Attach media (Fixes the upload/attachment 404 error)
router.post('/:id/media', addMediaToProposal);

// --- EXPORT THE ROUTER ---
module.exports = router;
