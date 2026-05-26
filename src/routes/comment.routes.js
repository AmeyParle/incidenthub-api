const express = require('express');
const {
  addComment,
  getCommentsByTicket
} = require('../controllers/comment.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createCommentSchema } = require('../validators/schemas');

const router = express.Router();

router.post('/tickets/:id/comments', protect, validate(createCommentSchema), addComment);
router.get('/tickets/:id/comments', protect, getCommentsByTicket);

module.exports = router;
