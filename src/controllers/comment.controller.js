const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

const addComment = asyncHandler(async (req, res) => {
  const ticketId = Number(req.params.id);
  const { content } = req.body;

  if (Number.isNaN(ticketId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid ticket id.'
    });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Comment content is required.'
    });
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId }
  });

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Ticket not found.'
    });
  }

  const comment = await prisma.comment.create({
    data: {
      content: content.trim(),
      ticketId,
      userId: req.user.id
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      ticket: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true
        }
      }
    }
  });

  return res.status(201).json({
    success: true,
    message: 'Comment added successfully.',
    data: comment
  });
});

const getCommentsByTicket = asyncHandler(async (req, res) => {
  const ticketId = Number(req.params.id);

  if (Number.isNaN(ticketId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid ticket id.'
    });
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      title: true
    }
  });

  if (!ticket) {
    return res.status(404).json({
      success: false,
      message: 'Ticket not found.'
    });
  }

  const comments = await prisma.comment.findMany({
    where: { ticketId },
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      }
    }
  });

  return res.status(200).json({
    success: true,
    message: 'Comments fetched successfully.',
    ticket,
    count: comments.length,
    data: comments
  });
});

module.exports = {
  addComment,
  getCommentsByTicket
};