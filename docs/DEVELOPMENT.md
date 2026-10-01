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

- `npm run dev`: starts the Next.js dev server. `predev` validates content and regenerates the search index first.
- `npm run build`: runs `prebuild` (validates content, regenerates the search index, and runs the Bloch-sphere physics check, `scripts/verify-bloch-sphere.mjs`), then `next build`. Static output lands in `out/` (`public/.nojekyll` copies through for GitHub Pages).
- `npm run preview`: serves the last build from `out/` at http://localhost:4000 (`python3 -m http.server`). `next start` does not work with `output: 'export'`.
- `npm run typecheck`: `tsc --noEmit` (same gate CI runs).
- `npm run lint`: `eslint . --max-warnings=0`, so a warning fails CI like an error, then `npm run lint:css`: stylelint on `assets/css/`, with only three rules in `.stylelintrc.json` (no repeated property in a block, except a vh/dvh-style fallback pair; no shorthand that wipes an earlier longhand; kebab-case keyframe names).
- `npm run verify:physics`: all eight physics suites (`scripts/verify-*.mjs`), including the ones for the shelved SC Quantathon v4 scroll stage. Only the Bloch-sphere suite runs in `prebuild`.

## Project structure

| Folder | What lives there |
|---|---|
| `app/` | App Router routes, one folder per URL (`page.tsx`), plus `layout.tsx`, `not-found.tsx`, `robots.ts`, `sitemap.ts`, `manifest.ts` |
| `components/` | React components; `scq4/` is the shelved v4 scroll stage, kept for the archived page |
| `lib/` | Content loading, dates, metadata helpers, shared types; `physics/` and `webgl.ts` are the shelved v4 stage's physics and WebGL helpers (the live Bloch sphere uses `lib/blochSphere.mjs`) |
| `scripts/` | Pre-build scripts (`validate-content.mjs`, `generate-search-index.mjs`), the physics checks, and data generators |
| `content/` | Markdown for events, news, and student work (see [content/README.md](../content/README.md)) |
| `data/` | JSON for the board, faculty, site settings, and the meeting schedule (see [data/README.md](../data/README.md)) |
| `assets/css/` | `style.css`, the global stylesheet (a section index sits at the top); `qff.css`, the Fall Fest pages' styles, imported only by the workshops route; and `scq4-archive.css` for the shelved stage |
| `public/` | Served as-is: `images/`, `files/` (posters, papers, bootcamp files), icons, `CNAME`, `.nojekyll`, and the legacy `*.html` redirect stubs for old URLs |
| `docs/` | This file, `PLAN_STATUS.md` (local status notes, kept out of git) and `archive/` (the original cryostat drawings) |
| `curriculum/` | Sources for event curricula (Qiskit Fall Fest 2026 notebooks and slides) |

Entry points worth knowing:

- `app/layout.tsx`: root layout, site metadata, JSON-LD, CSP.
- `lib/slugPage.tsx`: the shared factory behind every markdown detail page (`[slug]` routes).
- `components/MarkdownDiv.tsx` and `components/MarkdownSpan.tsx`: turn marker classes in event markdown into live components (see "Interactive blocks" in content/README.md).
- `lib/content.ts`: reads and caches `content/`.
- `lib/featured.ts`: the homepage featured band; edit `FEATURED_EVENT` to change it.
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
4. `npm run build` (content validation, search index, Bloch-sphere check, then the static export into `out/`)
5. Publish `out/` to GitHub Pages

The custom domain (`clemsonquantum.com`) is set via `public/CNAME`.

## Known constraints

- **Static export.** No server-side features (no API routes, no SSR at request time). Dates and other dynamic values are resolved at build time.
- **Search index is generated.** `public/search.json` is gitignored and rebuilt by `predev`/`prebuild`. It must exist at runtime in dev.
- **Images are plain `<img>`.** `next/image` optimization is unavailable under static export, so images are served as-is.
- **Never run `npm run build` while `next dev` is running.** Both write to `.next/`, and the build corrupts the dev server's copy (pages come back unstyled). To recover, stop the dev server, delete `.next/`, and start it again.
- **`overflow-x: clip`, not `hidden`, on `html` and `body`.** With `hidden` on both, `body` becomes a scroll container that never scrolls, which freezes every scroll-driven animation.
- **Drafts show only under `next dev`.** A page with `draft: true` is left out of production builds entirely (see content/README.md).
