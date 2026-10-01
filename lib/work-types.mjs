// @ts-check
/**
 * The student-work `type` values the site knows about: they drive the filter
 * tabs (StudentWorkList), the detail-page media label, and validation.
 *
 * Kept in a module with no imports so the client StudentWorkList can use it
 * without pulling content-shared.mjs (and its `yaml` parser, ~100 KB) into
 * the browser bundle.
 */
export const WORK_TYPES = ['poster', 'paper', 'conference'];
