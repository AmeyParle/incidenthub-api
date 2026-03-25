const express = require('express');
const {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  assignTicket,
  updateTicketStatus,
  updateTicketPriority
} = require('../controllers/ticket.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.post('/', protect, createTicket);
router.get('/', protect, getTickets);
router.get('/:id', protect, getTicketById);

router.patch('/:id', protect, authorize('ADMIN', 'AGENT'), updateTicket);
router.patch('/:id/assign', protect, authorize('ADMIN', 'AGENT'), assignTicket);
router.patch('/:id/status', protect, authorize('ADMIN', 'AGENT'), updateTicketStatus);
router.patch('/:id/priority', protect, authorize('ADMIN', 'AGENT'), updateTicketPriority);

module.exports = router;