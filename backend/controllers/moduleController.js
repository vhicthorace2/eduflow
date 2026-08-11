const Module = require('../models/Module');
const Course = require('../models/Course');
const Material = require('../models/Material');

/**
 * Get all modules for a course
 * @route GET /api/courses/:courseId/modules
 */
exports.getModules = async (req, res, next) => {
  try {
    const modules = await Module.findAll({
      where: { courseId: req.params.courseId, isActive: true },
      include: [{
        model: Material,
        as: 'materials'
      }],
      order: [['order', 'ASC']]
    });

    res.status(200).json({
      success: true,
      count: modules.length,
      modules
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single module by ID
 * @route GET /api/modules/:id
 */
exports.getModuleById = async (req, res, next) => {
  try {
    const module = await Module.findByPk(req.params.id, {
      include: [{
        model: Material,
        as: 'materials'
      }]
    });

    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    res.status(200).json({
      success: true,
      module
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new module (instructor only)
 * @route POST /api/courses/:courseId/modules
 */
exports.createModule = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.courseId);

    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is the instructor or admin
    if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to create modules for this course' });
    }

    const { title, description, order } = req.body;

    const module = await Module.create({
      title,
      description,
      courseId: req.params.courseId,
      order: order || 0
    });

    res.status(201).json({
      success: true,
      message: 'Module created successfully',
      module
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update module (instructor only)
 * @route PUT /api/modules/:id
 */
exports.updateModule = async (req, res, next) => {
  try {
    const module = await Module.findByPk(req.params.id);

    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    // Check if user is the instructor of the course
    const course = await Course.findByPk(module.courseId);
    if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this module' });
    }

    await module.update(req.body);

    res.status(200).json({
      success: true,
      message: 'Module updated successfully',
      module
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete module (instructor only)
 * @route DELETE /api/modules/:id
 */
exports.deleteModule = async (req, res, next) => {
  try {
    const module = await Module.findByPk(req.params.id);

    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    // Check if user is the instructor of the course
    const course = await Course.findByPk(module.courseId);
    if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this module' });
    }

    // Delete all materials in the module
    await Material.destroy({ where: { moduleId: req.params.id } });

    await module.destroy();

    res.status(200).json({
      success: true,
      message: 'Module deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
