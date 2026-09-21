import { ProjectModel } from '../models/projectModel.js';

// Basic sanity check helper for RERA number (alphanumeric, slashes, hyphens, min 3 chars)
const isValidReraNumber = (rera) => {
  if (!rera || typeof rera !== 'string') return false;
  const trimmed = rera.trim();
  if (trimmed.length < 3 || trimmed.length > 64) return false;
  return /^[a-zA-Z0-9\/\-_\s]+$/.test(trimmed);
};

// Date validation helper: valid date and not > 10 years in the future
const isValidDate = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  const tenYearsFromNow = new Date();
  tenYearsFromNow.setFullYear(tenYearsFromNow.getFullYear() + 10);
  return d <= tenYearsFromNow;
};

export const ProjectController = {
  async getAll(req, res, next) {
    try {
      const { search, limit = 50, offset = 0 } = req.query;

      if (search && search.trim()) {
        const projects = await ProjectModel.search(search.trim(), { limit: parseInt(limit, 10) || 20 });
        return res.status(200).json({
          success: true,
          data: projects,
        });
      }

      const projects = await ProjectModel.findAll({
        limit: parseInt(limit, 10) || 50,
        offset: parseInt(offset, 10) || 0,
      });

      return res.status(200).json({
        success: true,
        data: projects,
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req, res, next) {
    try {
      const project = await ProjectModel.findById(req.params.id);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found',
        });
      }
      return res.status(200).json({
        success: true,
        data: project,
      });
    } catch (err) {
      next(err);
    }
  },

  async getByRera(req, res, next) {
    try {
      const project = await ProjectModel.findByReraNumber(req.params.reraNumber);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project with specified RERA number not found',
        });
      }
      return res.status(200).json({
        success: true,
        data: project,
      });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const {
        rera_number,
        state,
        name,
        developer_name,
        registered_possession_date,
        current_status,
        oc_issued,
        source_url,
      } = req.body;

      // Server-side validation
      if (!rera_number || !isValidReraNumber(rera_number)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or missing rera_number. Must be alphanumeric and 3-64 characters.',
        });
      }

      if (!state || typeof state !== 'string' || !state.trim()) {
        return res.status(400).json({
          success: false,
          error: 'State is required.',
        });
      }

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Project name is required.',
        });
      }

      if (!developer_name || typeof developer_name !== 'string' || !developer_name.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Developer name is required.',
        });
      }

      if (!registered_possession_date || !isValidDate(registered_possession_date)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid registered_possession_date. Must be a valid date within the next 10 years.',
        });
      }

      // Check for duplicate project with same rera_number + state
      const existingProject = await ProjectModel.findByReraAndState(rera_number, state);
      if (existingProject) {
        // Return existing project instead of creating a duplicate
        return res.status(200).json({
          success: true,
          message: 'Existing project found with matching RERA number and state.',
          data: existingProject,
          isExisting: true,
        });
      }

      const newProject = await ProjectModel.create({
        rera_number,
        state,
        name,
        developer_name,
        registered_possession_date,
        current_status,
        oc_issued,
        source_url,
      });

      return res.status(201).json({
        success: true,
        message: 'Project created successfully',
        data: newProject,
        isExisting: false,
      });
    } catch (err) {
      // In case of unique constraint race condition, fallback to returning existing
      if (err.code === '23505') {
        const existing = await ProjectModel.findByReraNumber(req.body.rera_number);
        if (existing) {
          return res.status(200).json({
            success: true,
            message: 'Existing project found with matching RERA number.',
            data: existing,
            isExisting: true,
          });
        }
      }
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      // Admin only verification
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: Admin credentials required to modify project catalog.',
        });
      }

      const project = await ProjectModel.findById(req.params.id);
      if (!project) {
        return res.status(404).json({
          success: false,
          error: 'Project not found',
        });
      }

      if (req.body.registered_possession_date && !isValidDate(req.body.registered_possession_date)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid registered_possession_date. Must be a valid date within the next 10 years.',
        });
      }

      const updated = await ProjectModel.update(req.params.id, req.body);
      return res.status(200).json({
        success: true,
        message: 'Project updated successfully',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },
};
