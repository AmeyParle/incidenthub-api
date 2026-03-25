const prisma = require('../config/prisma');

const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
const VALID_SORT_FIELDS = ['createdAt', 'updatedAt', 'priority', 'status', 'title'];
const VALID_SORT_ORDERS = ['asc', 'desc'];

const createTicket = async (req, res) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      projectId,
      assigneeId
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Ticket title is required.'
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Ticket description is required.'
      });
    }

    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project id is required.'
      });
    }

    const parsedProjectId = Number(projectId);
    const parsedAssigneeId = assigneeId ? Number(assigneeId) : null;

    if (Number.isNaN(parsedProjectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project id.'
      });
    }

    if (assigneeId && Number.isNaN(parsedAssigneeId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assignee id.'
      });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}`
      });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority. Allowed values: ${VALID_PRIORITIES.join(', ')}`
      });
    }

    const project = await prisma.project.findUnique({
      where: { id: parsedProjectId }
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    if (parsedAssigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: parsedAssigneeId }
      });

      if (!assignee) {
        return res.status(404).json({
          success: false,
          message: 'Assignee user not found.'
        });
      }
    }

    const ticket = await prisma.ticket.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        status: status || 'OPEN',
        priority: priority || 'MEDIUM',
        projectId: parsedProjectId,
        reporterId: req.user.id,
        assigneeId: parsedAssigneeId
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Ticket created successfully.',
      data: ticket
    });
  } catch (error) {
    console.error('Create ticket error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while creating ticket.'
    });
  }
};

const getTickets = async (req, res) => {
  try {
    const {
      status,
      priority,
      projectId,
      assigneeId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = '1',
      limit = '10'
    } = req.query;

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}`
      });
    }

    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority. Allowed values: ${VALID_PRIORITIES.join(', ')}`
      });
    }

    if (!VALID_SORT_FIELDS.includes(sortBy)) {
      return res.status(400).json({
        success: false,
        message: `Invalid sortBy. Allowed values: ${VALID_SORT_FIELDS.join(', ')}`
      });
    }

    if (!VALID_SORT_ORDERS.includes(sortOrder)) {
      return res.status(400).json({
        success: false,
        message: `Invalid sortOrder. Allowed values: ${VALID_SORT_ORDERS.join(', ')}`
      });
    }

    const parsedPage = Number(page);
    const parsedLimit = Number(limit);
    const parsedProjectId = projectId ? Number(projectId) : undefined;
    const parsedAssigneeId = assigneeId ? Number(assigneeId) : undefined;

    if (Number.isNaN(parsedPage) || parsedPage < 1) {
      return res.status(400).json({
        success: false,
        message: 'Page must be a number greater than or equal to 1.'
      });
    }

    if (Number.isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be a number between 1 and 100.'
      });
    }

    if (projectId && Number.isNaN(parsedProjectId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project id.'
      });
    }

    if (assigneeId && Number.isNaN(parsedAssigneeId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assignee id.'
      });
    }

    const skip = (parsedPage - 1) * parsedLimit;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (projectId) {
      where.projectId = parsedProjectId;
    }

    if (assigneeId) {
      where.assigneeId = parsedAssigneeId;
    }

    if (search && search.trim()) {
      where.OR = [
        {
          title: {
            contains: search.trim(),
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: search.trim(),
            mode: 'insensitive'
          }
        }
      ];
    }

    const [tickets, totalTickets] = await Promise.all([
      prisma.ticket.findMany({
        where,
        orderBy: {
          [sortBy]: sortOrder
        },
        skip,
        take: parsedLimit,
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          },
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          _count: {
            select: {
              comments: true
            }
          }
        }
      }),
      prisma.ticket.count({ where })
    ]);

    const totalPages = Math.ceil(totalTickets / parsedLimit);

    return res.status(200).json({
      success: true,
      message: 'Tickets fetched successfully.',
      data: tickets,
      pagination: {
        totalItems: totalTickets,
        totalPages,
        currentPage: parsedPage,
        pageSize: parsedLimit,
        hasNextPage: parsedPage < totalPages,
        hasPreviousPage: parsedPage > 1
      },
      filters: {
        status: status || null,
        priority: priority || null,
        projectId: projectId || null,
        assigneeId: assigneeId || null,
        search: search || null,
        sortBy,
        sortOrder
      }
    });
  } catch (error) {
    console.error('Get tickets error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while fetching tickets.'
    });
  }
};

const getTicketById = async (req, res) => {
  try {
    const ticketId = Number(req.params.id);

    if (Number.isNaN(ticketId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket id.'
      });
    }

    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            updatedAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            comments: true
          }
        }
      }
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Ticket fetched successfully.',
      data: ticket
    });
  } catch (error) {
    console.error('Get ticket by id error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while fetching ticket.'
    });
  }
};

const getTicketOrFail = async (ticketId) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId }
  });

  return ticket;
};

const updateTicket = async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const { title, description, projectId } = req.body;

    if (Number.isNaN(ticketId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket id.'
      });
    }

    const existingTicket = await getTicketOrFail(ticketId);

    if (!existingTicket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.'
      });
    }

    if (existingTicket.status === 'CLOSED' && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Closed tickets can only be edited by ADMIN.'
      });
    }

    const updateData = {};

    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Title cannot be empty.'
        });
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      if (!description.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Description cannot be empty.'
        });
      }
      updateData.description = description.trim();
    }

    if (projectId !== undefined) {
      const parsedProjectId = Number(projectId);

      if (Number.isNaN(parsedProjectId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid project id.'
        });
      }

      const project = await prisma.project.findUnique({
        where: { id: parsedProjectId }
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found.'
        });
      }

      updateData.projectId = parsedProjectId;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update.'
      });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        assignee: {
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
      message: 'Ticket updated successfully.',
      data: updatedTicket
    });
  } catch (error) {
    console.error('Update ticket error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while updating ticket.'
    });
  }
};

const assignTicket = async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const { assigneeId } = req.body;

    if (Number.isNaN(ticketId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket id.'
      });
    }

    const existingTicket = await getTicketOrFail(ticketId);

    if (!existingTicket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.'
      });
    }

    if (existingTicket.status === 'CLOSED' && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Closed tickets can only be modified by ADMIN.'
      });
    }

    if (assigneeId === undefined || assigneeId === null) {
      return res.status(400).json({
        success: false,
        message: 'Assignee id is required.'
      });
    }

    const parsedAssigneeId = Number(assigneeId);

    if (Number.isNaN(parsedAssigneeId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assignee id.'
      });
    }

    const assignee = await prisma.user.findUnique({
      where: { id: parsedAssigneeId }
    });

    if (!assignee) {
      return res.status(404).json({
        success: false,
        message: 'Assignee user not found.'
      });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assigneeId: parsedAssigneeId
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        assignee: {
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
      message: 'Ticket assigned successfully.',
      data: updatedTicket
    });
  } catch (error) {
    console.error('Assign ticket error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while assigning ticket.'
    });
  }
};

const updateTicketStatus = async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const { status } = req.body;

    if (Number.isNaN(ticketId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket id.'
      });
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}`
      });
    }

    const existingTicket = await getTicketOrFail(ticketId);

    if (!existingTicket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.'
      });
    }

    if (existingTicket.status === 'CLOSED' && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Closed tickets can only be modified by ADMIN.'
      });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { status },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        assignee: {
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
      message: 'Ticket status updated successfully.',
      data: updatedTicket
    });
  } catch (error) {
    console.error('Update ticket status error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while updating ticket status.'
    });
  }
};

const updateTicketPriority = async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const { priority } = req.body;

    if (Number.isNaN(ticketId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticket id.'
      });
    }

    if (!priority || !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        success: false,
        message: `Invalid priority. Allowed values: ${VALID_PRIORITIES.join(', ')}`
      });
    }

    const existingTicket = await getTicketOrFail(ticketId);

    if (!existingTicket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found.'
      });
    }

    if (existingTicket.status === 'CLOSED' && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Closed tickets can only be modified by ADMIN.'
      });
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: { priority },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        reporter: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        assignee: {
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
      message: 'Ticket priority updated successfully.',
      data: updatedTicket
    });
  } catch (error) {
    console.error('Update ticket priority error:', error);

    return res.status(500).json({
      success: false,
      message: 'Server error while updating ticket priority.'
    });
  }
};

module.exports = {
  createTicket,
  getTickets,
  getTicketById,
  updateTicket,
  assignTicket,
  updateTicketStatus,
  updateTicketPriority
};