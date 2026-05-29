const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getLeads, getLead, updateStatus, softDelete, addNote, getStats, exportLeads
} = require('../controllers/adminController');

// All routes protected by JWT
router.use(auth);

router.get('/leads', getLeads);
router.get('/leads/:id', getLead);
router.patch('/leads/:id/status', updateStatus);
router.patch('/leads/:id/delete', softDelete);
router.post('/leads/:id/notes', addNote);
router.get('/stats', getStats);
router.get('/export', exportLeads);

module.exports = router;
