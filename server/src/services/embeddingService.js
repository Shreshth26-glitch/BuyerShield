import crypto from 'crypto';

/**
 * BuyerShield Embedding Service
 * Produces consistent 768-dimensional L2-normalized sentence embeddings.
 * Reused for provisions, precedent summaries, and runtime queries.
 */
export class EmbeddingService {
  static DIMENSION = 768;

  /**
   * Generates a 768-dimensional embedding for text.
   * If GEMINI_API_KEY is configured, uses Gemini text-embedding-004.
   * Otherwise, generates a deterministic semantic projection vector.
   *
   * @param {string} text - Input text
   * @returns {Promise<number[]>} 768-dimensional float array
   */
  static async getEmbedding(text) {
    if (!text || typeof text !== 'string') {
      return new Array(this.DIMENSION).fill(0);
    }

    const cleanText = text.trim();
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && apiKey !== 'mock_key' && !process.env.OFFLINE_MODE) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: 'models/text-embedding-004',
              content: { parts: [{ text: cleanText }] },
            }),
          }
        );
        if (res.ok) {
          const json = await res.json();
          if (json.embedding?.values && json.embedding.values.length === this.DIMENSION) {
            return this.normalize(json.embedding.values);
          }
        }
      } catch (err) {
        console.warn('Gemini embedding failed, falling back to local deterministic model:', err.message);
      }
    }

    // Deterministic semantic feature projection (768 dimensions)
    return this.generateDeterministicEmbedding(cleanText);
  }

  /**
   * Generates a deterministic 768-dimensional semantic embedding.
   * Uses tokenization, n-grams, statutory keyword weighting, and feature hashing.
   * Produces an L2-normalized vector that is strictly deterministic across runs.
   */
  static generateDeterministicEmbedding(text) {
    const vector = new Float64Array(this.DIMENSION);
    const tokens = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1);

    if (tokens.length === 0) {
      vector[0] = 1.0;
      return Array.from(vector);
    }

    // Statutory legal term weights
    const legalKeywords = {
      section: 3.5,
      18: 4.5,
      refund: 4.0,
      withdraw: 4.0,
      withdrawal: 4.0,
      continue: 3.8,
      possession: 3.2,
      delay: 3.5,
      interest: 3.8,
      mclr: 4.0,
      compensation: 3.5,
      allottee: 3.0,
      promoter: 3.0,
      maharera: 3.2,
      karnataka: 3.2,
      rule: 3.0,
      proviso: 4.0,
      handover: 3.0,
      appellate: 2.5,
      tribunal: 3.0,
    };

    // Unigrams and Bigrams
    const features = [];
    for (let i = 0; i < tokens.length; i++) {
      features.push({ term: tokens[i], weight: legalKeywords[tokens[i]] || 1.0 });
      if (i < tokens.length - 1) {
        const bigram = `${tokens[i]}_${tokens[i + 1]}`;
        features.push({ term: bigram, weight: 1.5 });
      }
    }

    for (const { term, weight } of features) {
      // 3 independent hashes per term to distribute across the 768 dimensions
      for (let h = 0; h < 3; h++) {
        const hash = crypto
          .createHash('md5')
          .update(`${term}:${h}`)
          .digest();
        const index = hash.readUInt16BE(0) % this.DIMENSION;
        const sign = hash.readInt8(2) >= 0 ? 1 : -1;
        vector[index] += sign * weight;
      }
    }

    return this.normalize(Array.from(vector));
  }

  /**
   * Normalizes a vector to unit length (L2 norm = 1).
   */
  static normalize(vector) {
    let norm = 0;
    for (let i = 0; i < vector.length; i++) {
      norm += vector[i] * vector[i];
    }
    norm = Math.sqrt(norm);
    if (norm === 0) return vector;
    return vector.map((v) => Number((v / norm).toFixed(6)));
  }

  /**
   * Computes cosine similarity between two vectors.
   * Since vectors are L2-normalized, cosine similarity is their dot product.
   */
  static cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dot = 0;
    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
    }
    return Math.max(-1, Math.min(1, dot));
  }

  /**
   * Formats embedding for DB insertion according to column type.
   */
  static formatForDb(vector) {
    return JSON.stringify(vector);
  }
}
