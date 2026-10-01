// @ts-check
// Content rules shared by the site build (lib/content.ts and the pages and
// helpers that read content directly) and the pre-build scripts
// (validate-content.mjs, generate-search-index.mjs). Keeping them in one place
// means search results and checks can't disagree with the pages generated.

import { parse } from 'yaml';

/**
 * Minimal frontmatter parser replacing gray-matter (whose js-yaml 3.x
 * dependency carries an unfixable CVE). Uses the maintained `yaml` package
 * (YAML 1.2), which parses unquoted dates as plain "YYYY-MM-DD" strings.
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
 * `unlisted: true` pages are built and reachable by their URL but kept out of
 * every listing: archives, nav, homepage, sitemap, and search (they also get
 * a noindex robots tag). Used for pages that are live for review before an
 * announcement. Only a literal boolean `true` counts; validate-content.mjs
 * rejects other values so a typo like `unlisted: yes` can't silently list
 * the page.
 *
 * @param {Record<string, unknown>} data frontmatter
 * @returns {boolean}
 */
export function isUnlisted(data) {
  return data.unlisted === true;
}

/**
 * `draft: true` pages stay on the machine they were written on: the dev
 * server shows them like any other page, but a production build (`next
 * build`, which sets NODE_ENV=production) leaves them out entirely: no page,
 * no listing, no sitemap or search entry. For events that are planned but
 * must not appear on the published site yet. Only a literal boolean `true`
 * counts (validate-content.mjs rejects other values).
 *
 * @param {Record<string, unknown>} data frontmatter
 * @returns {boolean}
 */
export function isDraft(data) {
  return data.draft === true;
}

/**
 * True when this build should drop the page: a draft in a production build.
 *
 * @param {Record<string, unknown>} data frontmatter
 * @returns {boolean}
 */
export function hiddenAsDraft(data) {
  return isDraft(data) && process.env.NODE_ENV === 'production';
}

/**
 * Strip markdown/HTML syntax down to plain text (uncapped; callers slice).
 *
 * @param {string} text
 * @returns {string}
 */
export function plainText(text) {
  return String(text)
    // Comments first: a comment that mentions a tag (<a …>) would otherwise
    // be cut at that tag's ">", leaking the comment's tail into search
    // results and excerpts.
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[#*`_[\](){}|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * A frontmatter date as a string ("2026-09-25", "TBD"), or null when unset.
 * parseFrontmatter's YAML 1.2 parser never produces Date objects.
 *
 * @param {unknown} date frontmatter date value
 * @returns {string | null}
 */
export function normalizeDate(date) {
  return date ? String(date) : null;
}
