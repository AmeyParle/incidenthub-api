const express = require('express');
const {
  createProject,
  getProjects,
  getProjectById
} = require('../controllers/project.controller');
const { protect } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validate.middleware');
const { createProjectSchema } = require('../validators/schemas');

const router = express.Router();

router.post('/', protect, authorize('ADMIN'), validate(createProjectSchema), createProject);
router.get('/', protect, getProjects);
router.get('/:id', protect, getProjectById);

module.exports = router;
