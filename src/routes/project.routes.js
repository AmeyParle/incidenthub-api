const express = require('express');
const {
  createProject,
  getProjects,
  getProjectById
} = require('../controllers/project.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');

const router = express.Router();

router.post('/', protect, authorize('ADMIN'), createProject);
router.get('/', protect, getProjects);
router.get('/:id', protect, getProjectById);

module.exports = router;