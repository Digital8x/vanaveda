const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please wait 15 minutes.' }
});

// POST /api/auth/login
router.post('/login', loginLimiter, login);

module.exports = router;
