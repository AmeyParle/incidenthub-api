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
const { validate, validateQuery } = require('../middleware/validate.middleware');
const {
  createTicketSchema,
  updateTicketSchema,
  assignTicketSchema,
  statusSchema,
  prioritySchema,
  listTicketsQuerySchema,
} = require('../validators/schemas');

const router = express.Router();

router.post('/', protect, validate(createTicketSchema), createTicket);
router.get('/', protect, validateQuery(listTicketsQuerySchema), getTickets);
router.get('/:id', protect, getTicketById);

router.patch('/:id', protect, authorize('ADMIN', 'AGENT'), validate(updateTicketSchema), updateTicket);
router.patch('/:id/assign', protect, authorize('ADMIN', 'AGENT'), validate(assignTicketSchema), assignTicket);
router.patch('/:id/status', protect, authorize('ADMIN', 'AGENT'), validate(statusSchema), updateTicketStatus);
router.patch('/:id/priority', protect, authorize('ADMIN', 'AGENT'), validate(prioritySchema), updateTicketPriority);

module.exports = router;
