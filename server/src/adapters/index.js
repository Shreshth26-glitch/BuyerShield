import { MahaRERAAdapter } from './MahaRERAAdapter.js';
import { KarnatakaRERAAdapter } from './KarnatakaRERAAdapter.js';

export { StateAdapter, TransientSyncError, StructuralSyncError, ProjectNotFoundError } from './StateAdapter.js';
export { MahaRERAAdapter } from './MahaRERAAdapter.js';
export { KarnatakaRERAAdapter } from './KarnatakaRERAAdapter.js';

const adapters = {
  maharashtra: new MahaRERAAdapter(),
  karnataka: new KarnatakaRERAAdapter(),
};

/**
 * Resolve the appropriate concrete StateAdapter instance for a given state name
 * @param {string} stateName
 * @returns {StateAdapter}
 */
export const getAdapterForState = (stateName) => {
  if (!stateName || typeof stateName !== 'string') {
    throw new Error('State identifier is required to resolve adapter.');
  }

  const normalized = stateName.trim().toLowerCase();
  if (normalized.includes('maha') || normalized === 'mh') {
    return adapters.maharashtra;
  }
  if (normalized.includes('karn') || normalized === 'ka') {
    return adapters.karnataka;
  }

  throw new Error(`Unsupported state jurisdiction: "${stateName}". Supported states: Maharashtra, Karnataka.`);
};
