/**
 * Custom Error Classes for Error Categorization & Retry Policy
 */
export class TransientSyncError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'TransientSyncError';
    this.isTransient = true;
    this.originalError = originalError;
  }
}

export class StructuralSyncError extends Error {
  constructor(message, originalError = null) {
    super(message);
    this.name = 'StructuralSyncError';
    this.isTransient = false;
    this.originalError = originalError;
  }
}

export class ProjectNotFoundError extends Error {
  constructor(reraNumber, state) {
    super(`Project with RERA ID "${reraNumber}" not found on ${state} portal.`);
    this.name = 'ProjectNotFoundError';
    this.isTransient = false;
  }
}

/**
 * Base StateAdapter Interface
 * Defines the contract and built-in rate-limiting/throttling for all state RERA portals.
 */
export class StateAdapter {
  constructor(state, { minDelayMs = 750, requestTimeoutMs = 12000 } = {}) {
    if (!state) {
      throw new Error('StateAdapter must specify a state identifier.');
    }
    this.state = state;
    this.minDelayMs = minDelayMs;
    this.requestTimeoutMs = requestTimeoutMs;
    this.lastRequestTime = 0;
  }

  /**
   * Code-level throttle enforcing minimum delay between consecutive outbound requests.
   */
  async throttle() {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minDelayMs) {
      const waitTime = this.minDelayMs - elapsed;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Default browser-like headers for respectful, non-automated appearance
   */
  getStandardHeaders() {
    return {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (BuyerShield Civic Audit/0.3.0)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
      'Accept-Language': 'en-IN,en-GB;q=0.9,en-US;q=0.8,en;q=0.7',
      'Cache-Control': 'no-cache',
    };
  }

  /**
   * Safe fetch with throttling and timeout
   */
  async safeFetch(url, options = {}) {
    await this.throttle();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.requestTimeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.getStandardHeaders(),
          ...(options.headers || {}),
        },
      });
      clearTimeout(timeoutId);

      if (response.status >= 500 || response.status === 429) {
        throw new TransientSyncError(
          `Government portal returned transient status ${response.status} (${response.statusText})`
        );
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
        throw new TransientSyncError(`Connection timeout to ${this.state} portal (${this.requestTimeoutMs}ms limit)`, err);
      }
      if (err instanceof TransientSyncError || err instanceof StructuralSyncError) {
        throw err;
      }
      throw new TransientSyncError(`Network error communicating with ${this.state} portal: ${err.message}`, err);
    }
  }

  /**
   * Search projects on the state portal by name or RERA number
   * @param {Object} query - { reraNumber?: string, name?: string }
   * @returns {Promise<Array>}
   */
  async searchProject(_query) {
    throw new Error(`searchProject() must be implemented by ${this.constructor.name}`);
  }

  /**
   * Fetch complete project detail and regulatory disclosures
   * @param {string} reraNumber
   * @returns {Promise<RawProjectDetail>}
   */
  async fetchProjectDetail(_reraNumber) {
    throw new Error(`fetchProjectDetail() must be implemented by ${this.constructor.name}`);
  }
}
