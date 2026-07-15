const express = require('express');
const router = express.Router();
const Proposal = require('../models/Proposal'); // Adjust path to your model if needed

// --- 1. GET ROUTE HANDLER (Fetch all proposals) ---
const getProposals = async (req, res) => {
  try {
    // Fetch proposals from the database, sorting them by newest first
    const proposals = await Proposal.find().sort({ createdAt: -1 });
    
    // NOTE: Depending on how your frontend state is set up, it might expect the raw array directly.
    // If you run into another syntax/mapping error, try changing the line below to:
    // res.status(200).json(proposals);
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
    // Destructure the new fields exactly as they are sent from the frontend payload
    const { 
      receiverEmail, 
      receiverName, 
      introMessage, 
      proposalMessage, 
      galleryPassword, 
      musicUrl,
      sender // Usually passed from authenticated user, or frontend if included
    } = req.body;

    // Create the proposal using the new schema structure
    const newProposal = new Proposal({
      sender: sender || req.user?.email || "Anonymous", // Fallback if sender is handled differently
      receiverEmail,
      receiverName,
      introMessage,
      proposalMessage,
      galleryPassword,
      musicUrl
    });

    // Save to database
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

// --- ROUTE DEFINITIONS ---

// GET /api/proposals - Handles fetching proposals (Fixes the 404 error)
router.get('/', getProposals);

// POST /api/proposals - Handles creating proposals
router.post('/', createProposal);

// --- EXPORT THE ROUTER ---
module.exports = router;
