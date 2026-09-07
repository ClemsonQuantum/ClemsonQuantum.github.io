// @ts-check
import fs from 'fs';
import path from 'path';

/**
 * Recursively list the markdown content files under `dir`, skipping partials
 * (names starting with `_`) and README.md in any case. Shared by
 * validate-content.mjs and generate-search-index.mjs so the two scripts can
 * never disagree about which files count as content. Returns [] when `dir`
 * does not exist. Order follows readdirSync, as the original walkers did.
 *
 * @param {string} dir absolute directory to walk
 * @param {string[]} [results] accumulator used by the recursion
 * @returns {string[]} absolute paths of the .md files found
 */
export function walkContentFiles(dir, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkContentFiles(fullPath, results);
    } else if (
      entry.name.endsWith('.md') &&
      !entry.name.startsWith('_') &&
      entry.name.toLowerCase() !== 'readme.md'
    ) {
      results.push(fullPath);
    }
  }
  return results;
}
