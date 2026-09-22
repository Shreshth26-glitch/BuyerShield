import { query } from '../db/index.js';

export class PolicyNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PolicyNotFoundError';
    this.code = 'RATE_POLICY_NOT_FOUND';
    this.statusCode = 400;
  }
}

export const RemedyPolicyModel = {
  /**
   * Looks up the effective interest rate policy for a state as of a given date.
   * Throws PolicyNotFoundError if no configured policy is found.
   */
  async getApplicableRate(state, asOfDate = new Date()) {
    if (!state) {
      throw new PolicyNotFoundError('State jurisdiction is required to determine the statutory interest rate.');
    }

    const dateStr = asOfDate instanceof Date 
      ? asOfDate.toISOString().substring(0, 10) 
      : String(asOfDate).substring(0, 10);

    const sql = `
      SELECT *
      FROM interest_rate_policies
      WHERE LOWER(TRIM(state)) = LOWER(TRIM($1))
        AND effective_from <= $2
      ORDER BY effective_from DESC, id DESC
      LIMIT 1;
    `;

    const res = await query(sql, [state, dateStr]);

    if (!res.rows[0]) {
      throw new PolicyNotFoundError(
        `No statutory interest rate policy configured for state "${state}" effective as of ${dateStr}. Please configure state benchmark rates in the Admin Console.`
      );
    }

    const row = res.rows[0];
    const benchmarkVal = parseFloat(row.benchmark_rate_value);
    const addedVal = parseFloat(row.added_percentage || 2.0);
    const totalRate = parseFloat((benchmarkVal + addedVal).toFixed(2));

    return {
      id: row.id,
      state: row.state,
      benchmarkName: row.benchmark_name,
      benchmarkRateSource: row.benchmark_rate_source,
      benchmarkRateValue: benchmarkVal,
      addedPercentage: addedVal,
      totalRate,
      effectiveFrom: row.effective_from,
      sourceUrl: row.source_url,
      updatedAt: row.updated_at,
    };
  },

  async getAll() {
    const sql = `
      SELECT *
      FROM interest_rate_policies
      ORDER BY state ASC, effective_from DESC;
    `;
    const res = await query(sql);
    return res.rows.map((row) => ({
      ...row,
      benchmark_rate_value: parseFloat(row.benchmark_rate_value),
      added_percentage: parseFloat(row.added_percentage),
      total_rate: parseFloat((parseFloat(row.benchmark_rate_value) + parseFloat(row.added_percentage)).toFixed(2)),
    }));
  },

  async getById(id) {
    const res = await query('SELECT * FROM interest_rate_policies WHERE id = $1', [id]);
    if (!res.rows[0]) return null;
    const row = res.rows[0];
    return {
      ...row,
      benchmark_rate_value: parseFloat(row.benchmark_rate_value),
      added_percentage: parseFloat(row.added_percentage),
      total_rate: parseFloat((parseFloat(row.benchmark_rate_value) + parseFloat(row.added_percentage)).toFixed(2)),
    };
  },

  async create({
    state,
    benchmark_name,
    benchmark_rate_source,
    benchmark_rate_value,
    added_percentage = 2.0,
    effective_from,
    source_url,
  }) {
    const sql = `
      INSERT INTO interest_rate_policies (
        state,
        benchmark_name,
        benchmark_rate_source,
        benchmark_rate_value,
        added_percentage,
        effective_from,
        source_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const params = [
      state,
      benchmark_name,
      benchmark_rate_source,
      benchmark_rate_value,
      added_percentage,
      effective_from,
      source_url,
    ];
    const res = await query(sql, params);
    return res.rows[0];
  },

  async update(id, fields) {
    const {
      state,
      benchmark_name,
      benchmark_rate_source,
      benchmark_rate_value,
      added_percentage,
      effective_from,
      source_url,
    } = fields;

    const sql = `
      UPDATE interest_rate_policies
      SET 
        state = COALESCE($1, state),
        benchmark_name = COALESCE($2, benchmark_name),
        benchmark_rate_source = COALESCE($3, benchmark_rate_source),
        benchmark_rate_value = COALESCE($4, benchmark_rate_value),
        added_percentage = COALESCE($5, added_percentage),
        effective_from = COALESCE($6, effective_from),
        source_url = COALESCE($7, source_url)
      WHERE id = $8
      RETURNING *;
    `;
    const params = [
      state,
      benchmark_name,
      benchmark_rate_source,
      benchmark_rate_value,
      added_percentage,
      effective_from,
      source_url,
      id,
    ];
    const res = await query(sql, params);
    return res.rows[0];
  },

  async delete(id) {
    const res = await query('DELETE FROM interest_rate_policies WHERE id = $1 RETURNING id', [id]);
    return res.rows.length > 0;
  },
};
