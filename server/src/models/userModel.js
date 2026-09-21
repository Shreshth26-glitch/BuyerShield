import { query } from '../db/index.js';

export const UserModel = {
  async findByEmail(email) {
    const res = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    return res.rows[0] || null;
  },

  async findById(id) {
    const res = await query(
      'SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    return res.rows[0] || null;
  },

  async create({ email, passwordHash, name, role = 'buyer' }) {
    const res = await query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES (LOWER($1), $2, $3, $4)
       RETURNING id, email, name, role, created_at, updated_at`,
      [email, passwordHash, name, role]
    );
    return res.rows[0];
  },
};
