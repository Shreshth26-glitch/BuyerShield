import { query } from '../db/index.js';

export const RemedyCalculationModel = {
  /**
   * Persists an immutable calculation run in remedy_calculations audit log.
   */
  async recordCalculation({
    buyerCaseId,
    remedyType,
    applicableRate,
    principalAmount,
    delayStartDate,
    delayEndDate,
    computedAmount,
    breakdownJson,
  }) {
    const sql = `
      INSERT INTO remedy_calculations (
        buyer_case_id,
        remedy_type,
        applicable_rate,
        principal_amount,
        delay_start_date,
        delay_end_date,
        computed_amount,
        breakdown_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *;
    `;
    const params = [
      buyerCaseId,
      remedyType,
      applicableRate,
      principalAmount,
      delayStartDate,
      delayEndDate,
      computedAmount,
      JSON.stringify(breakdownJson),
    ];

    const res = await query(sql, params);
    return res.rows[0];
  },

  /**
   * Retrieves calculation history for a buyer case, most recent first.
   */
  async getHistoryByCaseId(buyerCaseId, limit = 50) {
    const sql = `
      SELECT 
        id,
        buyer_case_id,
        calculated_at,
        remedy_type,
        applicable_rate,
        principal_amount,
        delay_start_date,
        delay_end_date,
        computed_amount,
        breakdown_json
      FROM remedy_calculations
      WHERE buyer_case_id = $1
      ORDER BY calculated_at DESC, id DESC
      LIMIT $2;
    `;
    const res = await query(sql, [buyerCaseId, limit]);
    return res.rows.map((row) => ({
      ...row,
      applicable_rate: parseFloat(row.applicable_rate),
      principal_amount: parseFloat(row.principal_amount),
      computed_amount: parseFloat(row.computed_amount),
      breakdown_json: typeof row.breakdown_json === 'string' ? JSON.parse(row.breakdown_json) : row.breakdown_json,
    }));
  },
};
