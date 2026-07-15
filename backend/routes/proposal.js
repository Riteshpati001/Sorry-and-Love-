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

// --- 2. GET ROUTE HANDLER (Fetch a single proposal by ID or Slug) ---
const getProposalById = async (req, res) => {
  try {
    const { id } = req.params;
    let proposal;

    // Check if the 'id' parameter is a valid 24-character MongoDB ObjectId
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(id)) {
      proposal = await Proposal.findById(id);
    }

    // Fallback: If not found by ID, try searching by a custom 'slug' field in MongoDB
    if (!proposal) {
      proposal = await Proposal.findOne({ slug: id });
    }

    if (!proposal) {
      return res.status(404).json({ success: false, message: "Proposal not found" });
    }

    return res.status(200).json({
      success: true,
      data: proposal
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// --- 3. POST ROUTE HANDLER (Create a proposal) ---
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

// --- 4. DELETE ROUTE HANDLER (Delete a proposal and its media) ---
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

// --- 5. POST ROUTE HANDLER (Attach uploaded media metadata to a proposal) ---
const addMediaToProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { url, publicId, fileType } = req.body;

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

    proposal.media.push({
      url,
      publicId,
      fileType,
      uploadedAt: new Date()
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

// --- 6. POST ROUTE HANDLER (Unlock Gallery) ---
const unlockGallery = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    let proposal;
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(id)) {
      proposal = await Proposal.findById(id);
    }
    if (!proposal) {
      proposal = await Proposal.findOne({ slug: id });
    }

    if (!proposal) {
      return res.status(404).json({ success: false, message: "Proposal not found" });
    }

    // Direct string comparison for plaintext passwords (matching frontend database response)
    if (proposal.galleryPassword === password) {
      return res.status(200).json({ success: true, message: "Gallery unlocked successfully" });
    } else {
      return res.status(400).json({ success: false, message: "Incorrect decryption gallery code." });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// --- 7. POST ROUTE HANDLER (Submit final decision: accepted/rejected) ---
const respondToProposal = async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body; // 'accepted' or 'rejected'

    if (!response || !['accepted', 'rejected'].includes(response)) {
      return res.status(400).json({ success: false, message: "Invalid response status" });
    }

    let proposal;
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(id)) {
      proposal = await Proposal.findById(id);
    }
    if (!proposal) {
      proposal = await Proposal.findOne({ slug: id });
    }

    if (!proposal) {
      return res.status(404).json({ success: false, message: "Proposal not found" });
    }

    proposal.status = response;
    await proposal.save();

    res.status(200).json({
      success: true,
      message: `Proposal response updated to: ${response}`,
      data: proposal
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// --- ROUTE DEFINITIONS ---

// GET /api/proposals - Fetch all proposals
router.get('/', getProposals);

// GET /api/proposals/slug/:id - Fetch by slug or ID
router.get('/slug/:id', getProposalById);

// GET /api/proposals/:id - Fallback to fetch directly by ID
router.get('/:id', getProposalById);

// POST /api/proposals - Create a proposal
router.post('/', createProposal);

// DELETE /api/proposals/:id - Delete a proposal
router.delete('/:id', deleteProposal);

// POST /api/proposals/:id/media - Attach media
router.post('/:id/media', addMediaToProposal);

// POST /api/proposals/slug/:id/unlock-gallery - Unlocks protected gallery (Matches your frontend perfectly!)
router.post('/slug/:id/unlock-gallery', unlockGallery);

// POST /api/proposals/slug/:id/respond - Responds to the proposal (Fixes the future Step 5 decision submit!)
router.post('/slug/:id/respond', respondToProposal);


// --- EXPORT THE ROUTER ---
module.exports = router;
