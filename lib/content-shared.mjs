// @ts-check
// Rules shared between lib/content.ts (site build) and
// scripts/generate-search-index.mjs (pre-build script). Keeping them in one
// place means search results can't link to pages the site never generates.

import { parse } from 'yaml';

/**
 * Minimal frontmatter parser replacing gray-matter (whose js-yaml 3.x
 * dependency carries an unfixable CVE). Uses the maintained `yaml` package
 * (YAML 1.2), which parses unquoted dates as plain "YYYY-MM-DD" strings —
 * normalizeDate accepts those directly.
 *
 * @param {string} raw full file contents
 * @returns {{ data: any, content: string }} frontmatter object + body
 */
export function parseFrontmatter(raw) {
  const src = raw.replace(/^﻿/, '');
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(src);
  if (!match) return { data: {}, content: src };
  return { data: parse(match[1]) ?? {}, content: src.slice(match[0].length) };
}

/**
 * The student-work `type` values the site knows about: they drive the filter
 * tabs (StudentWorkList), the detail-page media label, and validation.
 */
export const WORK_TYPES = ['poster', 'paper', 'conference'];

/**
 * Only `external_url` / `source_url` send a card off-site. A bare `link`
 * (student work) still has an internal detail page, so it stays internal.
 *
 * @param {Record<string, unknown>} data frontmatter
 * @returns {string | null} the external destination URL, or null
 */
export function externalDestination(data) {
  const destination = data.external_url ?? data.source_url ?? null;
  return typeof destination === 'string' && destination.includes('://')
    ? destination
    : null;
}

/**
 * Strip markdown/HTML syntax down to plain text (uncapped; callers slice).
 *
 * @param {string} text
 * @returns {string}
 */
export function plainText(text) {
  return String(text)
    .replace(/<[^>]+>/g, '')
    .replace(/[#*`_[\](){}|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Serialize Date objects to YYYY-MM-DD and pass strings ("2026-09-25",
 * "TBD") through untouched.
 *
 * @param {unknown} date frontmatter date value
 * @returns {string | null}
 */
export function normalizeDate(date) {
  if (!date) return null;
  return date instanceof Date ? date.toISOString().slice(0, 10) : String(date);
}
