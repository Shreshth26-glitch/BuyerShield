import { query } from '../db/index.js';
import { EmbeddingService } from '../services/embeddingService.js';

export const ProvisionModel = {
  /**
   * Inserts or upserts an Act provision with embedding.
   */
  async create({ sectionNumber, title, fullText, state = null, embedding = null }) {
    const vectorJson = embedding ? EmbeddingService.formatForDb(embedding) : null;
    const sql = `
      INSERT INTO act_provisions (
        section_number,
        title,
        full_text,
        state,
        embedding
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id, section_number, title, full_text, state, created_at;
    `;
    const res = await query(sql, [sectionNumber, title, fullText, state, vectorJson]);
    return res.rows[0];
  },

  /**
   * Finds all provisions, optionally filtering by state or central.
   */
  async getAll({ state = null } = {}) {
    let sql = `SELECT id, section_number, title, full_text, state, embedding, created_at FROM act_provisions`;
    const params = [];
    if (state) {
      sql += ` WHERE state IS NULL OR state = $1`;
      params.push(state);
    }
    sql += ` ORDER BY id ASC`;
    const res = await query(sql, params);
    return res.rows.map((r) => ({
      ...r,
      embedding: typeof r.embedding === 'string' ? JSON.parse(r.embedding) : r.embedding,
    }));
  },

  /**
   * Retrieves specific provisions by section numbers (e.g. ['Section 18(1)', 'MahaRERA Rule 18']).
   */
  async getBySectionNumbers(sectionNumbers = []) {
    if (!sectionNumbers.length) return [];
    const placeholders = sectionNumbers.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `
      SELECT id, section_number, title, full_text, state, created_at 
      FROM act_provisions 
      WHERE section_number IN (${placeholders})
      ORDER BY id ASC;
    `;
    const res = await query(sql, sectionNumbers);
    return res.rows;
  },

  /**
   * Finds relevant provisions for a query using vector similarity & statutory relevance.
   */
  async findRelevant({ queryEmbedding, state = null, limit = 5 }) {
    const provisions = await this.getAll({ state });
    if (!queryEmbedding) return provisions.slice(0, limit);

    // Compute cosine similarity for each provision
    const scored = provisions.map((prov) => {
      let similarity = 0;
      if (prov.embedding) {
        similarity = EmbeddingService.cosineSimilarity(queryEmbedding, prov.embedding);
      }
      return {
        id: prov.id,
        section_number: prov.section_number,
        title: prov.title,
        full_text: prov.full_text,
        state: prov.state,
        similarity,
      };
    });

    // Sort descending by similarity
    scored.sort((a, b) => b.similarity - a.similarity);
    return scored.slice(0, limit);
  },

  /**
   * Count total provisions.
   */
  async count() {
    const res = await query(`SELECT COUNT(*) FROM act_provisions`);
    return parseInt(res.rows[0].count, 10);
  },
};
