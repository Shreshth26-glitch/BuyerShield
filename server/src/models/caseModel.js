import { query } from '../db/index.js';

export const CaseModel = {
  /**
   * Find all cases for a specific user with joined project and computed derived fields
   */
  async findByUserId(userId) {
    const res = await query(
      `SELECT bc.*, 
              p.name AS project_name, 
              p.rera_number, 
              p.developer_name, 
              p.state,
              p.registered_possession_date,
              p.current_status AS project_status,
              p.oc_issued,
              p.last_synced_at,
              GREATEST(0, (CURRENT_DATE - COALESCE(bc.promised_date_from_agreement, p.registered_possession_date))::integer) AS days_delayed,
              COALESCE(
                (SELECT SUM(amount) FROM case_payments WHERE buyer_case_id = bc.id),
                bc.amount_paid,
                0
              )::numeric AS total_paid
       FROM buyer_cases bc
       JOIN projects p ON bc.project_id = p.id
       WHERE bc.user_id = $1
       ORDER BY bc.created_at DESC`,
      [userId]
    );

    return res.rows.map(row => ({
      ...row,
      days_delayed: parseInt(row.days_delayed, 10) || 0,
      total_paid: parseFloat(row.total_paid) || 0,
    }));
  },

  /**
   * Find single case by ID for a specific user, with joined project and computed fields
   */
  async findById(id, userId) {
    const res = await query(
      `SELECT bc.*, 
              p.name AS project_name, 
              p.rera_number, 
              p.developer_name, 
              p.state,
              p.registered_possession_date,
              p.current_status AS project_status,
              p.oc_issued,
              p.last_synced_at,
              GREATEST(0, (CURRENT_DATE - COALESCE(bc.promised_date_from_agreement, p.registered_possession_date))::integer) AS days_delayed,
              COALESCE(
                (SELECT SUM(amount) FROM case_payments WHERE buyer_case_id = bc.id),
                bc.amount_paid,
                0
              )::numeric AS total_paid
       FROM buyer_cases bc
       JOIN projects p ON bc.project_id = p.id
       WHERE bc.id = $1 AND bc.user_id = $2`,
      [id, userId]
    );

    if (!res.rows[0]) return null;

    const row = res.rows[0];
    return {
      ...row,
      days_delayed: parseInt(row.days_delayed, 10) || 0,
      total_paid: parseFloat(row.total_paid) || 0,
    };
  },

  /**
   * Create a new buyer case and optionally record initial payment in case_payments
   */
  async create({ user_id, project_id, promised_date_from_agreement, amount_paid = 0, chosen_remedy = 'UNDECIDED' }) {
    const initialAmount = Math.max(0, parseFloat(amount_paid) || 0);

    const res = await query(
      `INSERT INTO buyer_cases (user_id, project_id, promised_date_from_agreement, amount_paid, chosen_remedy)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user_id, project_id, promised_date_from_agreement, initialAmount, chosen_remedy]
    );

    const newCase = res.rows[0];

    // If initial payment was provided, record it in case_payments
    if (initialAmount > 0) {
      await query(
        `INSERT INTO case_payments (buyer_case_id, amount, paid_on, note)
         VALUES ($1, $2, CURRENT_DATE, $3)`,
        [newCase.id, initialAmount, 'Initial payment recorded at case creation']
      );
    }

    return this.findById(newCase.id, user_id);
  },

  /**
   * Update case details (promised date, remedy choice, etc.)
   */
  async update(id, userId, updates) {
    const allowedFields = ['promised_date_from_agreement', 'chosen_remedy'];
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (fields.length === 0) {
      return this.findById(id, userId);
    }

    values.push(id, userId);
    const res = await query(
      `UPDATE buyer_cases
       SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idx} AND user_id = $${idx + 1}
       RETURNING *`,
      values
    );

    if (!res.rows[0]) return null;
    return this.findById(id, userId);
  },

  /**
   * Delete case (cascades to payments)
   */
  async delete(id, userId) {
    const res = await query(
      `DELETE FROM buyer_cases WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );
    return res.rows[0] || null;
  },
};
