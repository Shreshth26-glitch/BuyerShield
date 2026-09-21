import { query } from '../db/index.js';

export const PaymentModel = {
  async findByCaseId(buyerCaseId) {
    const res = await query(
      `SELECT * FROM case_payments 
       WHERE buyer_case_id = $1 
       ORDER BY paid_on DESC, created_at DESC`,
      [buyerCaseId]
    );
    return res.rows;
  },

  async findById(id) {
    const res = await query(
      `SELECT * FROM case_payments WHERE id = $1`,
      [id]
    );
    return res.rows[0] || null;
  },

  async create({ buyer_case_id, amount, paid_on, note = null }) {
    const res = await query(
      `INSERT INTO case_payments (buyer_case_id, amount, paid_on, note)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [buyer_case_id, amount, paid_on, note]
    );
    return res.rows[0];
  },

  async delete(id) {
    const res = await query(
      `DELETE FROM case_payments WHERE id = $1 RETURNING *`,
      [id]
    );
    return res.rows[0] || null;
  },

  async getTotalByCaseId(buyerCaseId) {
    const res = await query(
      `SELECT COALESCE(SUM(amount), 0)::numeric AS total_paid
       FROM case_payments
       WHERE buyer_case_id = $1`,
      [buyerCaseId]
    );
    return parseFloat(res.rows[0].total_paid) || 0;
  },
};
