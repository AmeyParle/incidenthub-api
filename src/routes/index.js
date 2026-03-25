const express = require('express');
const prisma = require('../config/prisma');
const authRoutes = require('./auth.routes');
const projectRoutes = require('./project.routes');
const ticketRoutes = require('./ticket.routes');
const commentRoutes = require('./comment.routes');

const router = express.Router();

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'IncidentHub API root is working'
  });
});

router.get('/db-test', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      success: true,
      message: 'Database connection successful'
    });
  } catch (error) {
    console.error('DB test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed'
    });
  }
});

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);
router.use('/tickets', ticketRoutes);
router.use('/', commentRoutes);

module.exports = router;