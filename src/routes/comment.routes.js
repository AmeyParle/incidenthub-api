const express = require('express');
const {
  addComment,
  getCommentsByTicket
} = require('../controllers/comment.controller');
const { protect } = require('../middleware/auth.middleware');

const router = express.Router();

router.post('/tickets/:id/comments', protect, addComment);
router.get('/tickets/:id/comments', protect, getCommentsByTicket);

module.exports = router;