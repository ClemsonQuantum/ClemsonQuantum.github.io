# Development

Developer reference for the Clemson Quantum Club website.

**Live site:** https://clemsonquantum.com

## Tech stack

- Next.js 16 (App Router), static export to GitHub Pages
- React 19
- TypeScript
- Markdown content pipeline: `yaml` frontmatter (parsed in `lib/content-shared.mjs`) + `react-markdown` with `remark-gfm` and `rehype-raw`

## Getting started

Requires Node.js 22 and npm.

```bash
npm ci
npm run dev
```

Open http://localhost:3000.

## Scripts

- `npm run dev`: starts the Next.js dev server. `predev` first makes phone copies of any new or changed card images (`scripts/generate-thumbnails.mjs`), validates content, and regenerates the search index and the add-to-calendar files.
- `npm run build`: runs `prebuild` (card-image phone copies, content validation, the search index, the add-to-calendar files, and the Bloch-sphere physics check, `scripts/verify-bloch-sphere.mjs`), then `next build`. Static output lands in `out/` (`public/.nojekyll` lands there too but isn't deployed: `upload-pages-artifact` leaves out dotfiles, and an Actions deploy never runs Jekyll).
- `npm run preview`: serves the last build from `out/` at http://localhost:4000 (`python3 -m http.server`). `next start` does not work with `output: 'export'`.
- `npm run typecheck`: `tsc --noEmit` (same gate CI runs, on a fresh checkout). Locally it also reads the route types that `dev` and `build` write under `.next/`, so after removing or renaming a page, delete `.next/` before trusting the result.
- `npm run lint`: `eslint . --max-warnings=0`, so a warning fails CI like an error, then `npm run lint:css`: stylelint on `assets/css/`, with only three rules in `.stylelintrc.json` (no repeated property in a block, except a vh/dvh-style fallback pair; no shorthand that wipes an earlier longhand; kebab-case keyframe names).
- `npm run todo`: lists everything still waiting for real information, page by page with line numbers: TBD text, Fall Fest file chips that are not links yet, leaderboards without a sheet, board members without a headshot, and Governing Documents PDFs not uploaded yet (drafts included and marked). Read-only.
- `npm run headshot -- <photo> "<Full Name>"`: crops and resizes a board member's photo to a 360×360 JPEG at `public/images/<first-last>.jpg` and points their `image` in `data/board-members.json` at it (add `--center` for a plain center crop if the automatic one misses).
- `npm run validate`: the content validator (`scripts/validate-content.mjs`) on its own; `dev` and `build` run it first anyway. Read-only.
- `npm run verify:physics`: all eight physics suites (`scripts/verify-*.mjs`), including the ones for the shelved SC Quantathon v4 scroll stage. Only the Bloch-sphere suite runs in `prebuild`.

## Project structure

| Folder | What lives there |
|---|---|
| `app/` | App Router routes, one folder per URL (`page.tsx`), plus `layout.tsx`, `not-found.tsx`, `robots.ts`, `sitemap.ts`, `manifest.ts`, and two static text routes, `feed.xml/route.ts` (the Atom feed of news and events) and `llms.txt/route.ts` (a Markdown site map for language-model tools); the Code of Conduct text is `code-of-conduct/code-of-conduct.md` (the adopted text, word for word), with `{{contactEmail}}` and `{{tigerquestUrl}}` filled from `data/site-config.json` |
| `components/` | React components; `scq4/` is the shelved v4 scroll stage, kept for the archived page |
| `lib/` | Content loading, dates, metadata helpers, shared types; `physics/` and `webgl.ts` are the shelved v4 stage's physics and WebGL helpers (the live Bloch sphere uses `lib/blochSphere.mjs`) |
| `scripts/` | Pre-build scripts (`generate-thumbnails.mjs`, `validate-content.mjs`, `generate-search-index.mjs`, `generate-calendars.mjs`), the physics checks, data generators, and `subset-arrows-font.py`, which rebuilds the arrow and ket-bracket font subset |
| `content/` | Markdown for events, news, and student work (see [content/README.md](../content/README.md)) |
| `data/` | JSON for the board, faculty, site settings, the meeting schedule, the Governing Documents list, and the generated `thumbnails.json` (see [data/README.md](../data/README.md)) |
| `assets/css/` | `style.css`, the global stylesheet (a section index sits at the top); `qff.css`, the Fall Fest pages' styles, imported only by the workshops route; and `scq4-archive.css` for the shelved stage |
| `public/` | Served as-is: `images/`, `files/` (posters, papers, bootcamp files), `documents/` (the Governing Documents PDFs), `fonts/` (the arrow and ket-bracket subset), `images/thumbs/` (generated phone copies of the card images, committed), icons, `CNAME`, `.nojekyll` (dotfiles are left out of the deploy), and the redirect stubs for old URLs: the legacy `*.html` files, and `events/workshops-and-seminars/ibm-fall-fest-2024/`, which points to the same Wayback copy as that event's `external_url` (change both together) |
| `docs/` | This file, `PLAN_STATUS.md` (local status notes, kept out of git) and `archive/` (the original cryostat drawings) |
| `curriculum/` | Sources for event curricula (Qiskit Fall Fest 2026 notebooks and slides) |

Entry points worth knowing:

- `app/layout.tsx`: root layout, site metadata, JSON-LD, CSP.
- `lib/slugPage.tsx`: the shared factory behind every markdown detail page (`[slug]` routes).
- `components/MarkdownDiv.tsx`, `components/MarkdownSpan.tsx`, and `components/MarkdownLink.tsx`: turn marker classes (and the `#participant-updates` sign-up link) in event markdown into live components (see "Interactive blocks" in content/README.md).
- `lib/content.ts`: reads and caches `content/`.
- `lib/featured.ts`: the homepage featured band; edit `FEATURED_EVENT` to change it.
- `lib/routes.mjs`: the fixed pages (everything not built from `content/`) for the sitemap, site search, and `/llms.txt`; add a new static page here.
- `app/feed.xml/route.ts`: the Atom feed, built from the same listings as the archives. Atom needs an `updated` time on every entry, so an upcoming event takes the build day rather than its future date.
- `scripts/validate-content.mjs`: the content rules that fail `dev` and `build`.

## Content editing

- Content lives in `content/` as Markdown. See [content/README.md](../content/README.md).
- Site/board configuration lives in `data/` as JSON. See [data/README.md](../data/README.md).
- All content filenames must be lowercase kebab-case.

## Deployment

`.github/workflows/deploy.yml` deploys to GitHub Pages on push to `main`:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run build` (card-image phone copies, content validation, the search index, the add-to-calendar files, the Bloch-sphere check, then the static export into `out/`)
5. Publish `out/` to GitHub Pages

The custom domain (`clemsonquantum.com`) is set in the repository's Settings → Pages. `public/CNAME` still ships with the site, but GitHub ignores it for Actions deploys.

## Known constraints

- **Static export.** No server-side features (no API routes, no SSR at request time). Dates and other dynamic values are resolved at build time.
- **Search index and calendar files are generated.** `public/search.json` and `public/calendar/` are gitignored and rebuilt by `predev`/`prebuild`. They must exist at runtime in dev.
- **Card thumbnails are generated but committed.** `scripts/generate-thumbnails.mjs` writes `public/images/thumbs/` and `data/thumbnails.json` and skips any image whose hash has not changed, so the deploy never needs the image library. Commit them together with a new card image.
- **`next-env.d.ts` is not tracked.** `next dev` and `next build` rewrite it with different paths, so it is gitignored and Next recreates it.
- **Images are plain `<img>`.** `next/image` optimization is unavailable under static export, so images are served as-is.
- **`next dev` and `npm run build` can run side by side.** Next 16 writes the dev server's output to `.next/dev/` and the build's to `.next/`. If the dev preview ever serves unstyled pages, stop the dev server, delete `.next/`, and start it again.
- **`overflow-x: clip`, not `hidden`, on `html` and `body`.** With `hidden` on both, `body` becomes a scroll container that never scrolls, which freezes every scroll-driven animation.
- **Pill and tab padding carries `--trim-y`.** `.hackathon-cta` and `.sw-filter__btn` trim their line boxes to the cap height (`text-box`, in browsers that have it), and `var(--trim-y, 0px)` in each of their paddings adds the trimmed space back. A new padding on either class needs the same `calc(… + var(--trim-y, 0px))`, or that button comes out shorter in Chrome and Safari.
- **The accessibility-settings block stays last in `style.css`.** The reduced-transparency and more-contrast rules win over the light and dark rules by order alone.
- **Drafts show only under `next dev`.** A page with `draft: true` is left out of production builds entirely (see content/README.md).
