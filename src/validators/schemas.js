const { z } = require('zod');

// ── Auth ──────────────────────────────────────────────────────────────────────
const registerSchema = z.object({
  name: z.string({ required_error: 'Name is required' }).trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string({ required_error: 'Email is required' }).email('Invalid email address').toLowerCase(),
  password: z.string({ required_error: 'Password is required' }).min(8, 'Password must be at least 8 characters').max(128),
  role: z.enum(['ADMIN', 'AGENT', 'VIEWER']).default('VIEWER'),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

// ── Projects ──────────────────────────────────────────────────────────────────
const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(100),
  description: z.string().trim().max(500).optional(),
});

// ── Tickets ───────────────────────────────────────────────────────────────────
const createTicketSchema = z.object({
  title: z.string().trim().min(1, 'Ticket title is required').max(200),
  description: z.string().trim().min(1, 'Ticket description is required').max(5000),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).default('OPEN'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  projectId: z.number({ required_error: 'projectId is required' }).int().positive(),
  assigneeId: z.number().int().positive().optional().nullable(),
});

const updateTicketSchema = z.object({
  title: z.string().trim().min(1, 'Title cannot be empty').max(200).optional(),
  description: z.string().trim().min(1, 'Description cannot be empty').max(5000).optional(),
  projectId: z.number().int().positive().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'No valid fields provided for update.',
});

const assignTicketSchema = z.object({
  assigneeId: z.number({ required_error: 'Assignee id is required' }).int().positive(),
});

const statusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], { required_error: 'status is required' }),
});

const prioritySchema = z.object({
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], { required_error: 'priority is required' }),
});

// ── Tickets — query params ────────────────────────────────────────────────────
const listTicketsQuerySchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  projectId: z.coerce.number().int().positive().optional(),
  assigneeId: z.coerce.number().int().positive().optional(),
  search: z.string().max(200).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

// ── Comments ──────────────────────────────────────────────────────────────────
const createCommentSchema = z.object({
  content: z.string().trim().min(1, 'Comment content is required').max(2000),
});

module.exports = {
  registerSchema,
  loginSchema,
  createProjectSchema,
  createTicketSchema,
  updateTicketSchema,
  assignTicketSchema,
  statusSchema,
  prioritySchema,
  listTicketsQuerySchema,
  createCommentSchema,
};
