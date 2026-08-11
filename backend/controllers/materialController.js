const Material = require('../models/Material');
const Module = require('../models/Module');
const Course = require('../models/Course');

/**
 * Get all materials for a module
 * @route GET /api/modules/:moduleId/materials
 */
exports.getMaterials = async (req, res, next) => {
  try {
    const materials = await Material.findAll({
      where: { moduleId: req.params.moduleId, isActive: true },
      order: [['order', 'ASC']]
    });

    res.status(200).json({
      success: true,
      count: materials.length,
      materials
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single material by ID
 * @route GET /api/materials/:id
 */
exports.getMaterialById = async (req, res, next) => {
  try {
    const material = await Material.findByPk(req.params.id);

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    res.status(200).json({
      success: true,
      material
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new material (instructor only)
 * @route POST /api/modules/:moduleId/materials
 */
exports.createMaterial = async (req, res, next) => {
  try {
    const module = await Module.findByPk(req.params.moduleId);

    if (!module) {
      return res.status(404).json({ message: 'Module not found' });
    }

    // Check if user is the instructor of the course
    const course = await Course.findByPk(module.courseId);
    if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to create materials for this module' });
    }

    const { title, type, description, order, videoUrl, linkUrl } = req.body;
    const fileUrl = req.file ? req.file.path : null;

    const material = await Material.create({
      title,
      type,
      fileUrl,
      videoUrl,
      linkUrl,
      description,
      moduleId: req.params.moduleId,
      courseId: module.courseId,
      order: order || 0,
      fileSize: req.file ? req.file.size : 0
    });

    res.status(201).json({
      success: true,
      message: 'Material created successfully',
      material
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update material (instructor only)
 * @route PUT /api/materials/:id
 */
exports.updateMaterial = async (req, res, next) => {
  try {
    const material = await Material.findByPk(req.params.id);

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Check if user is the instructor of the course
    const course = await Course.findByPk(material.courseId);
    if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this material' });
    }

    const updateData = { ...req.body };
    if (req.file) {
      updateData.fileUrl = req.file.path;
      updateData.fileSize = req.file.size;
    }

    await material.update(updateData);

    res.status(200).json({
      success: true,
      message: 'Material updated successfully',
      material
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete material (instructor only)
 * @route DELETE /api/materials/:id
 */
exports.deleteMaterial = async (req, res, next) => {
  try {
    const material = await Material.findByPk(req.params.id);

    if (!material) {
      return res.status(404).json({ message: 'Material not found' });
    }

    // Check if user is the instructor of the course
    const course = await Course.findByPk(material.courseId);
    if (course.instructorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this material' });
    }

    await material.destroy();

    res.status(200).json({
      success: true,
      message: 'Material deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
