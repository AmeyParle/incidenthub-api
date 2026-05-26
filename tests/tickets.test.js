const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

let adminToken;
let agentToken;
let projectId;
let ticketId;

beforeAll(async () => {
  // Clean up in order (foreign keys)
  await prisma.comment.deleteMany({ where: { ticket: { project: { name: 'TestProject' } } } });
  await prisma.ticket.deleteMany({ where: { project: { name: 'TestProject' } } });
  await prisma.project.deleteMany({ where: { name: 'TestProject' } });
  await prisma.user.deleteMany({ where: { email: { contains: '@tickets.test' } } });

  // Register admin
  let res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'TAdmin', email: 'admin@tickets.test', password: 'Admin1234', role: 'ADMIN' });
  adminToken = res.body.data.token;

  // Register agent
  res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'TAgent', email: 'agent@tickets.test', password: 'Agent1234', role: 'AGENT' });
  agentToken = res.body.data.token;

  // Create project
  res = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'TestProject', description: 'For tests' });
  projectId = res.body.data.id;
});

afterAll(async () => {
  await prisma.comment.deleteMany({ where: { ticket: { project: { name: 'TestProject' } } } });
  await prisma.ticket.deleteMany({ where: { project: { name: 'TestProject' } } });
  await prisma.project.deleteMany({ where: { name: 'TestProject' } });
  await prisma.user.deleteMany({ where: { email: { contains: '@tickets.test' } } });
  await prisma.$disconnect();
});

describe('POST /api/tickets', () => {
  it('creates a ticket with valid data', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'DB connection failing', description: 'Postgres pool exhausted', priority: 'HIGH', projectId });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.priority).toBe('HIGH');
    ticketId = res.body.data.id;
  });

  it('defaults priority to MEDIUM', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Minor UI glitch', description: 'Button misaligned on mobile', projectId });

    expect(res.status).toBe(201);
    expect(res.body.data.priority).toBe('MEDIUM');
  });

  it('rejects empty title (Zod)', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: '', description: 'Has description', projectId });

    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'title' })])
    );
  });

  it('rejects invalid priority (Zod)', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Valid title', description: 'Valid desc', priority: 'URGENT', projectId });

    expect(res.status).toBe(400);
  });

  it('rejects missing description (Zod)', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'No desc', projectId });

    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated request', async () => {
    const res = await request(app)
      .post('/api/tickets')
      .send({ title: 'No auth', description: 'Test', projectId });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/tickets', () => {
  it('returns paginated ticket list', async () => {
    const res = await request(app)
      .get('/api/tickets')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body).toHaveProperty('pagination');
  });

  it('filters by status', async () => {
    const res = await request(app)
      .get('/api/tickets?status=OPEN')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    res.body.data.forEach((t) => expect(t.status).toBe('OPEN'));
  });

  it('rejects invalid status in query (Zod)', async () => {
    const res = await request(app)
      .get('/api/tickets?status=PENDING')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/tickets/:id/status', () => {
  it('updates ticket status', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('IN_PROGRESS');
  });

  it('rejects invalid status (Zod)', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${ticketId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DOING' });

    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/tickets/:id/priority', () => {
  it('updates ticket priority', async () => {
    const res = await request(app)
      .patch(`/api/tickets/${ticketId}/priority`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ priority: 'CRITICAL' });

    expect(res.status).toBe(200);
    expect(res.body.data.priority).toBe('CRITICAL');
  });
});

describe('Comments', () => {
  it('adds a comment to a ticket', async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ content: 'Investigating the connection pool.' });

    expect(res.status).toBe(201);
    expect(res.body.data.content).toBe('Investigating the connection pool.');
  });

  it('rejects empty comment (Zod)', async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ content: '' });

    expect(res.status).toBe(400);
  });

  it('lists comments for a ticket', async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketId}/comments`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(1);
  });
});
