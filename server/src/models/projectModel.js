import { query } from '../db/index.js';

export const ProjectModel = {
  async findAll({ limit = 50, offset = 0 } = {}) {
    const res = await query(
      `SELECT * FROM projects ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return res.rows;
  },

  async search(searchTerm, { limit = 20 } = {}) {
    if (!searchTerm || !searchTerm.trim()) {
      return this.findAll({ limit });
    }
    const pattern = `%${searchTerm.trim()}%`;
    const res = await query(
      `SELECT * FROM projects 
       WHERE name ILIKE $1 OR rera_number ILIKE $1 OR developer_name ILIKE $1
       ORDER BY created_at DESC 
       LIMIT $2`,
      [pattern, limit]
    );
    return res.rows;
  },

  async findById(id) {
    const res = await query('SELECT * FROM projects WHERE id = $1', [id]);
    return res.rows[0] || null;
  },

  async findByReraNumber(reraNumber) {
    const res = await query(
      'SELECT * FROM projects WHERE LOWER(rera_number) = LOWER($1)',
      [reraNumber.trim()]
    );
    return res.rows[0] || null;
  },

  async findByReraAndState(reraNumber, state) {
    const res = await query(
      `SELECT * FROM projects 
       WHERE LOWER(TRIM(rera_number)) = LOWER(TRIM($1)) 
         AND LOWER(TRIM(state)) = LOWER(TRIM($2))`,
      [reraNumber, state]
    );
    return res.rows[0] || null;
  },

  async create(projectData) {
    const {
      rera_number,
      state,
      name,
      developer_name,
      registered_possession_date,
      current_status = 'ACTIVE',
      oc_issued = false,
      source_url = null,
    } = projectData;

    const res = await query(
      `INSERT INTO projects (
        rera_number, state, name, developer_name, 
        registered_possession_date, current_status, oc_issued, source_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        rera_number.trim(),
        state.trim(),
        name.trim(),
        developer_name.trim(),
        registered_possession_date,
        current_status,
        oc_issued,
        source_url,
      ]
    );
    return res.rows[0];
  },

  async update(id, updates) {
    const allowedFields = [
      'name',
      'developer_name',
      'state',
      'registered_possession_date',
      'current_status',
      'oc_issued',
      'source_url',
    ];

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
      return this.findById(id);
    }

    values.push(id);
    const res = await query(
      `UPDATE projects 
       SET ${fields.join(', ')}, updated_at = NOW() 
       WHERE id = $${idx} 
       RETURNING *`,
      values
    );
    return res.rows[0] || null;
  },
};
