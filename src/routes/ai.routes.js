const express = require('express');
const {
  summarizeTicket,
  suggestResolution,
  listVersions,
  activateVersion,
  evalStats,
  getMetrics,
} = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

// ── Ticket AI endpoints (any authenticated user) ──────────────────────────────
router.post('/tickets/:id/summarize', protect, summarizeTicket);
router.post('/tickets/:id/suggest-resolution', protect, suggestResolution);

// ── Prompt management (ADMIN only) ────────────────────────────────────────────
router.get('/prompts/:name/versions', protect, authorize('ADMIN'), listVersions);
router.patch('/prompts/:name/versions/:version/activate', protect, authorize('ADMIN'), activateVersion);
router.get('/prompts/:name/eval-stats', protect, authorize('ADMIN'), evalStats);

// ── LLM metrics (ADMIN only) ─────────────────────────────────────────────────
router.get('/metrics', protect, authorize('ADMIN'), getMetrics);

module.exports = router;
