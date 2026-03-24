import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Rank mapping configuration.
 * Loaded from ranks.json in the project root.
 * Maps internal rank keys to Discord role IDs.
 */
const ranksPath = join(process.cwd(), 'resources', 'ranks.json');
let ranksData = {};

try {
  const fileContent = readFileSync(ranksPath, 'utf8');
  ranksData = JSON.parse(fileContent);
} catch (error) {
  console.error(`[Config] Error loading ranks.json: ${error.message}`);
  // If file is missing or invalid, we use an empty object to prevent crashes
  ranksData = {};
}

export const ranks = ranksData;

/**
 * Checks if a rank key is supported.
 * @param {string} rankKey - The rank key to validate.
 * @returns {boolean}
 */
export function isSupportedRank(rankKey) {
  return Object.prototype.hasOwnProperty.call(ranks, rankKey);
}

/**
 * Gets the Discord role ID for a rank key.
 * @param {string} rankKey - The rank key.
 * @returns {string|null}
 */
export function getRoleIdForRank(rankKey) {
  return ranks[rankKey]?.roleId || null;
}
