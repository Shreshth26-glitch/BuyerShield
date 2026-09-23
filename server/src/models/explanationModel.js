import { query } from '../db/index.js';

export const ExplanationModel = {
  /**
   * Persists an explanation request and its generated outcome.
   */
  async recordExplanation({
    buyerCaseId,
    remedyCalculationId = null,
    remedyType,
    queryText = null,
    retrievedProvisionIds = [],
    retrievedPrecedentIds = [],
    generatedExplanation,
    confidenceFlag,
    rawResponseJson = null,
  }) {
    const sql = `
      INSERT INTO explanation_requests (
        buyer_case_id,
        remedy_calculation_id,
        remedy_type,
        query_text,
        retrieved_provision_ids,
        retrieved_precedent_ids,
        generated_explanation,
        confidence_flag,
        raw_response_json
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `;
    const params = [
      buyerCaseId,
      remedyCalculationId,
      remedyType,
      queryText,
      retrievedProvisionIds,
      retrievedPrecedentIds,
      generatedExplanation,
      confidenceFlag,
      rawResponseJson ? JSON.stringify(rawResponseJson) : null,
    ];
    const res = await query(sql, params);
    return this._formatRow(res.rows[0]);
  },

  /**
   * Retrieves explanation history for a case.
   */
  async getHistoryByCaseId(buyerCaseId, limit = 20) {
    const sql = `
      SELECT * FROM explanation_requests 
      WHERE buyer_case_id = $1 
      ORDER BY created_at DESC, id DESC 
      LIMIT $2;
    `;
    const res = await query(sql, [buyerCaseId, limit]);
    return res.rows.map((r) => this._formatRow(r));
  },

  /**
   * Retrieves a single explanation request by ID.
   */
  async getById(id) {
    const res = await query(`SELECT * FROM explanation_requests WHERE id = $1`, [id]);
    return res.rows[0] ? this._formatRow(res.rows[0]) : null;
  },

  _formatRow(row) {
    if (!row) return null;
    return {
      ...row,
      retrieved_provision_ids: row.retrieved_provision_ids || [],
      retrieved_precedent_ids: row.retrieved_precedent_ids || [],
      raw_response_json:
        typeof row.raw_response_json === 'string'
          ? JSON.parse(row.raw_response_json)
          : row.raw_response_json,
    };
  },
};
