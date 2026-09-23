import { query } from '../db/index.js';
import { EmbeddingService } from '../services/embeddingService.js';

export const PrecedentModel = {
  /**
   * Creates a new precedent order with structured facts and optional embedding.
   */
  async create({
    state,
    orderDate,
    summary,
    outcomeType,
    awardedAmount,
    interestRate,
    sourceUrl,
    delayMonths,
    amountPaidPercentage,
    remedyType,
    isUsable = true,
    embedding = null,
  }) {
    const vectorJson = embedding ? EmbeddingService.formatForDb(embedding) : null;
    const sql = `
      INSERT INTO precedent_orders (
        state,
        order_date,
        summary,
        outcome_type,
        awarded_amount,
        interest_rate,
        source_url,
        delay_months,
        amount_paid_percentage,
        remedy_type,
        is_usable,
        embedding
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `;
    const params = [
      state,
      orderDate || null,
      summary,
      outcomeType,
      awardedAmount ? parseFloat(awardedAmount) : null,
      interestRate ? parseFloat(interestRate) : null,
      sourceUrl || null,
      delayMonths !== undefined ? parseInt(delayMonths, 10) : null,
      amountPaidPercentage !== undefined ? parseFloat(amountPaidPercentage) : null,
      remedyType || null,
      isUsable,
      vectorJson,
    ];
    const res = await query(sql, params);
    return this._formatRow(res.rows[0]);
  },

  /**
   * Updates an existing precedent order.
   */
  async update(id, updates) {
    const allowed = [
      'state',
      'order_date',
      'summary',
      'outcome_type',
      'awarded_amount',
      'interest_rate',
      'source_url',
      'delay_months',
      'amount_paid_percentage',
      'remedy_type',
      'is_usable',
      'embedding',
    ];
    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [key, val] of Object.entries(updates)) {
      if (allowed.includes(key)) {
        setClauses.push(`${key} = $${idx++}`);
        if (key === 'embedding' && Array.isArray(val)) {
          values.push(EmbeddingService.formatForDb(val));
        } else {
          values.push(val);
        }
      }
    }

    if (setClauses.length === 0) return null;

    values.push(id);
    const sql = `
      UPDATE precedent_orders 
      SET ${setClauses.join(', ')} 
      WHERE id = $${idx}
      RETURNING *;
    `;
    const res = await query(sql, values);
    return res.rows[0] ? this._formatRow(res.rows[0]) : null;
  },

  /**
   * Retrieves a single precedent order by ID.
   */
  async getById(id) {
    const res = await query(`SELECT * FROM precedent_orders WHERE id = $1`, [id]);
    return res.rows[0] ? this._formatRow(res.rows[0]) : null;
  },

  /**
   * Lists precedent orders with optional search and filters.
   */
  async list({ search, state, remedyType, unembeddedOnly = false, limit = 100, offset = 0 } = {}) {
    let sql = `SELECT * FROM precedent_orders WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (search) {
      sql += ` AND (summary ILIKE $${idx} OR outcome_type ILIKE $${idx} OR state ILIKE $${idx})`;
      params.push(`%${search}%`);
      idx++;
    }

    if (state) {
      sql += ` AND state = $${idx}`;
      params.push(state);
      idx++;
    }

    if (remedyType) {
      sql += ` AND remedy_type = $${idx}`;
      params.push(remedyType);
      idx++;
    }

    if (unembeddedOnly) {
      sql += ` AND (embedding IS NULL OR embedding::text = 'null')`;
    }

    sql += ` ORDER BY id DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(limit, offset);

    const res = await query(sql, params);
    return res.rows.map((r) => this._formatRow(r));
  },

  /**
   * Deletes a precedent order by ID.
   */
  async delete(id) {
    const res = await query(`DELETE FROM precedent_orders WHERE id = $1 RETURNING id`, [id]);
    return res.rows.length > 0;
  },

  /**
   * Finds candidate precedents for vector retrieval.
   * Retrieves all usable precedents with embeddings and computes cosine similarity with query embedding.
   */
  async findCandidates({ queryEmbedding, remedyType = null, state = null, limit = 15 }) {
    let sql = `SELECT * FROM precedent_orders WHERE is_usable = TRUE`;
    const params = [];
    let idx = 1;

    if (remedyType) {
      sql += ` AND (remedy_type = $${idx} OR remedy_type IS NULL)`;
      params.push(remedyType);
      idx++;
    }

    const res = await query(sql, params);
    const candidates = res.rows.map((r) => this._formatRow(r));

    if (!queryEmbedding) {
      return candidates.slice(0, limit);
    }

    // Compute cosine similarity for each candidate
    const scored = candidates.map((cand) => {
      let similarity = 0;
      if (cand.embedding && Array.isArray(cand.embedding)) {
        similarity = EmbeddingService.cosineSimilarity(queryEmbedding, cand.embedding);
      }
      return {
        ...cand,
        vector_similarity: similarity,
      };
    });

    // Sort descending by raw vector similarity
    scored.sort((a, b) => b.vector_similarity - a.vector_similarity);
    return scored.slice(0, limit);
  },

  /**
   * Count total precedents.
   */
  async count() {
    const res = await query(`SELECT COUNT(*) FROM precedent_orders WHERE is_usable = TRUE`);
    return parseInt(res.rows[0].count, 10);
  },

  _formatRow(row) {
    if (!row) return null;
    return {
      ...row,
      awarded_amount: row.awarded_amount ? parseFloat(row.awarded_amount) : null,
      interest_rate: row.interest_rate ? parseFloat(row.interest_rate) : null,
      amount_paid_percentage: row.amount_paid_percentage ? parseFloat(row.amount_paid_percentage) : null,
      delay_months: row.delay_months !== null ? parseInt(row.delay_months, 10) : null,
      embedding: typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding,
    };
  },
};
