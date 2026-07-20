const express = require('express');
const router = require('express').Router();
const nodemailer = require('nodemailer'); // Import nodemailer
const jwt = require('jsonwebtoken'); // Import jsonwebtoken to verify tokens
const Proposal = require('../models/Proposal'); // Adjust path to your model if needed

// Import S3 and Cloudinary configs for media cleanup upon deletion
const { deleteVoiceFromS3 } = require('../config/s3');
const { cloudinary } = require('../config/cloudinary');

// --- Nodemailer Transporter Configuration ---
const transporter = nodemailer.createTransport({
  service: 'gmail', 
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address
    pass: process.env.EMAIL_PASS  // Your Google App Password
  }
});

// --- Authentication Middleware (Supports both Sessions and JWT) ---
const protect = (req, res, next) => {
  try {
    // 1. SESSION FALLBACK: If a global session middleware (like Passport or express-session) 
    // has already authenticated the user and populated req.user, let them pass!
    if (req.user && req.user.email) {
      return next();
    }

    let token;

    // 2. JWT HEADER CHECK: Check for token in Authorization Header (Bearer <token>)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // 3. JWT COOKIE CHECK: Check for token in cookies as a fallback
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    // If no session exists and no token is found, deny access
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized: No active user session found" 
      });
    }

    // Verify token using the secret key in your .env file
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach decoded token data (which should contain user email) to req.user
    req.user = decoded; 
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: "Unauthorized: Session is invalid or expired" 
    });
  }
};

// --- 1. GET ROUTE HANDLER (Fetch proposals for the logged-in user) ---
const getProposals = async (req, res) => {
  try {
    const userEmail = req.user?.email;

    if (!userEmail) {
      return res.status(401).json({ 
        success: false, 
        message: "Unauthorized: No active user session found" 
      });
    }

    const proposals = await Proposal.find({ sender: userEmail }).sort({ createdAt: -1 });

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

    // --- SEND NOTIFICATION EMAIL TO SENDER ---
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (proposal.sender && emailRegex.test(proposal.sender)) {
      
      const emailSubject = response === 'accepted' 
        ? `💖 Great news! Your proposal to ${proposal.receiverName} was accepted!` 
        : `💌 Update on your proposal to ${proposal.receiverName}`;

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
          <h2 style="color: #d63384; text-align: center;">HeartLink Update</h2>
          <p>Hello,</p>
          <p>We are writing to let you know that <strong>${proposal.receiverName}</strong> has responded to your proposal.</p>
          
          <div style="background-color: #f8f9fa; border-left: 4px solid #d63384; padding: 15px; margin: 20px 0; border-radius: 4px; text-align: center;">
            <p style="font-size: 1.2rem; margin: 0;">Status: <strong style="color: ${response === 'accepted' ? '#198754' : '#dc3545'}; text-transform: uppercase;">${response}</strong></p>
          </div>
          
          <p>You can check the dashboard to manage your proposals.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 0.8rem; color: #888; text-align: center;">This is an automated notification from HeartLink.</p>
        </div>
      `;

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: proposal.sender,
        subject: emailSubject,
        html: emailHtml
      };

      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Failed to send email to sender:", error.message);
        } else {
          console.log("Response notification email sent to sender:", proposal.sender);
        }
      });
    }

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

// GET /api/proposals - Protected by our JWT & Session Middleware 'protect'
router.get('/', protect, getProposals);

// GET /api/proposals/slug/:id - Fetch by slug or ID
router.get('/slug/:id', getProposalById);

// GET /api/proposals/:id - Fallback to fetch directly by ID
router.get('/:id', getProposalById);

// POST /api/proposals - Create a proposal (Protected so req.user.email is set)
router.post('/', protect, createProposal);

// DELETE /api/proposals/:id - Delete a proposal
router.delete('/:id', deleteProposal);

// POST /api/proposals/:id/media - Attach media
router.post('/:id/media', addMediaToProposal);

// POST /api/proposals/slug/:id/unlock-gallery - Unlocks protected gallery
router.post('/slug/:id/unlock-gallery', unlockGallery);

// POST /api/proposals/slug/:id/respond - Responds to the proposal
router.post('/slug/:id/respond', respondToProposal);


// --- EXPORT THE ROUTER ---
module.exports = router;
