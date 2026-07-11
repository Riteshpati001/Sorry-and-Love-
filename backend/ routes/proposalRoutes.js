const express = require('express');
const router = express.Router();
const {
  createProposal,
  getProposalByLink,
  updateProposal,
  deleteProposal,
  getUserProposals,
  respondToProposal,
} = require('../controllers/proposalController');
const { protect } = require('../middlewares/auth');

router.post('/', protect, createProposal);
router.get('/my', protect, getUserProposals);
router.get('/:link', getProposalByLink);
router.put('/:id', protect, updateProposal);
router.delete('/:id', protect, deleteProposal);
router.post('/:link/respond', respondToProposal);

module.exports = router;
