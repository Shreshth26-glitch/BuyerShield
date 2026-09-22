import { RemedyPolicyModel } from '../models/remedyPolicyModel.js';

export const AdminPolicyController = {
  // GET /api/admin/interest-rates
  async getAllPolicies(req, res, next) {
    try {
      const policies = await RemedyPolicyModel.getAll();
      return res.status(200).json({
        success: true,
        data: policies,
      });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/admin/interest-rates/:id
  async getPolicyById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'Invalid policy identifier.' });
      }

      const policy = await RemedyPolicyModel.getById(id);
      if (!policy) {
        return res.status(404).json({ success: false, error: 'Interest rate policy not found.' });
      }

      return res.status(200).json({
        success: true,
        data: policy,
      });
    } catch (err) {
      next(err);
    }
  },

  // POST /api/admin/interest-rates
  async createPolicy(req, res, next) {
    try {
      const {
        state,
        benchmark_name,
        benchmark_rate_source,
        benchmark_rate_value,
        added_percentage = 2.0,
        effective_from,
        source_url,
      } = req.body;

      if (!state || !benchmark_name || benchmark_rate_value === undefined || !effective_from) {
        return res.status(400).json({
          success: false,
          error: 'State, benchmark name, benchmark rate value, and effective from date are required.',
        });
      }

      const rateVal = parseFloat(benchmark_rate_value);
      if (isNaN(rateVal) || rateVal <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Benchmark rate value must be a positive percentage number.',
        });
      }

      const addedVal = parseFloat(added_percentage);
      if (isNaN(addedVal) || addedVal < 0) {
        return res.status(400).json({
          success: false,
          error: 'Added percentage must be a valid non-negative number.',
        });
      }

      const created = await RemedyPolicyModel.create({
        state: state.trim(),
        benchmark_name: benchmark_name.trim(),
        benchmark_rate_source: benchmark_rate_source?.trim(),
        benchmark_rate_value: rateVal,
        added_percentage: addedVal,
        effective_from,
        source_url: source_url?.trim(),
      });

      return res.status(201).json({
        success: true,
        message: 'Interest rate policy created successfully.',
        data: created,
      });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/admin/interest-rates/:id
  async updatePolicy(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'Invalid policy identifier.' });
      }

      const existing = await RemedyPolicyModel.getById(id);
      if (!existing) {
        return res.status(404).json({ success: false, error: 'Interest rate policy not found.' });
      }

      const {
        state,
        benchmark_name,
        benchmark_rate_source,
        benchmark_rate_value,
        added_percentage,
        effective_from,
        source_url,
      } = req.body;

      const updated = await RemedyPolicyModel.update(id, {
        state: state?.trim(),
        benchmark_name: benchmark_name?.trim(),
        benchmark_rate_source: benchmark_rate_source?.trim(),
        benchmark_rate_value: benchmark_rate_value !== undefined ? parseFloat(benchmark_rate_value) : undefined,
        added_percentage: added_percentage !== undefined ? parseFloat(added_percentage) : undefined,
        effective_from,
        source_url: source_url?.trim(),
      });

      return res.status(200).json({
        success: true,
        message: 'Interest rate policy updated successfully.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/admin/interest-rates/:id
  async deletePolicy(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ success: false, error: 'Invalid policy identifier.' });
      }

      const deleted = await RemedyPolicyModel.delete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Interest rate policy not found.' });
      }

      return res.status(200).json({
        success: true,
        message: 'Interest rate policy deleted successfully.',
      });
    } catch (err) {
      next(err);
    }
  },
};
