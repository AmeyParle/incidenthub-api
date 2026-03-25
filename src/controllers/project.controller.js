const prisma = require('../config/prisma');
const asyncHandler = require('../utils/asyncHandler');

const createProject = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Project name is required.'
    });
  }

  const project = await prisma.project.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      createdById: req.user.id
    },
    include: {
      createdBy: {
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
    message: 'Project created successfully.',
    data: project
  });
});

const getProjects = asyncHandler(async (req, res) => {
  const projects = await prisma.project.findMany({
    orderBy: {
      createdAt: 'desc'
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      _count: {
        select: {
          tickets: true
        }
      }
    }
  });

  return res.status(200).json({
    success: true,
    message: 'Projects fetched successfully.',
    count: projects.length,
    data: projects
  });
});

const getProjectById = asyncHandler(async (req, res) => {
  const projectId = Number(req.params.id);

  if (Number.isNaN(projectId)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid project id.'
    });
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true
        }
      },
      tickets: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      },
      _count: {
        select: {
          tickets: true
        }
      }
    }
  });

  if (!project) {
    return res.status(404).json({
      success: false,
      message: 'Project not found.'
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Project fetched successfully.',
    data: project
  });
});

module.exports = {
  createProject,
  getProjects,
  getProjectById
};