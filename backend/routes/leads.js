const express = require('express');
const router = express.Router();
const { submitLead } = require('../controllers/leadController');

// POST /api/leads
router.post('/', submitLead);

module.exports = router;
