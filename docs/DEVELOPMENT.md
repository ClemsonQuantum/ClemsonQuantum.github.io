# Development

Developer reference for the Clemson Quantum Club website.

**Live site:** https://clemsonquantum.com

## Tech stack

- Next.js 15 (App Router), static export to GitHub Pages
- React 19
- TypeScript
- Markdown content pipeline: `gray-matter` (frontmatter) + `react-markdown` with `remark-gfm` and `rehype-raw`

## Getting started

Requires Node.js 22 and npm.

```bash
npm ci
npm run dev
```

Open http://localhost:3000.

## Scripts

- `npm run dev` — starts the Next.js dev server. `predev` validates content and regenerates the search index first.
- `npm run build` — runs `prebuild` (validates content, regenerates the search index), then `next build`. Static output lands in `out/` (`public/.nojekyll` copies through for GitHub Pages).
- `npm run typecheck` — `tsc --noEmit` (same gate CI runs).
- `npm run lint` — `eslint .`.

## Project structure

```
app/                                 # App Router routes
  layout.tsx                         # Root layout, metadata, JSON-LD, CSP
  page.tsx                           # Home
  about/page.tsx
  get-involved/page.tsx
  robots.ts                          # robots.txt (generated)
  sitemap.ts                         # sitemap.xml (generated)
  not-found.tsx                      # 404 page
  events/
    page.tsx
    hackathons/page.tsx
    hackathons/[slug]/page.tsx
    meetings/page.tsx
    workshops-and-seminars/page.tsx
    workshops-and-seminars/[slug]/page.tsx
  news/
    page.tsx
  resources/
    page.tsx
    learning-resources/page.tsx
    student-work-and-projects/page.tsx
    student-work-and-projects/[slug]/page.tsx
components/
  Header.tsx                         # Navigation header with search
  Footer.tsx
  BoardMember.tsx                    # Executive board member
  PastBoardMembers.tsx               # Past board roster (expandable)
  PreviewCard.tsx                    # News / event preview card
  SearchBar.tsx                      # Site-wide search
  ContactForm.tsx                    # Web3Forms contact form
  ModalFormButton.tsx                # Generic Web3Forms modal (sign-ups, sponsor inquiries)
  CopyrightYear.tsx                  # Client-corrected footer year
  StudentWorkList.tsx                # Student work listing
  EventArchive.tsx                   # Term-filtered archive for events + news
  EventCountdown.tsx                 # Countdown to an event date
  SiteImage.tsx                      # Plain <img> wrapper
  QuantumCanvas.tsx                  # Entangled-qubit particle field canvas
  BlochSphere.tsx                    # Interactive Bloch sphere
  ConstellationDivider.tsx           # Decorative section divider
  ScrollReveal.tsx                   # Reveal-on-scroll wrapper
  ShootingStar.tsx                   # Comet animation
  TitleReveal.tsx                    # Animated page title
  NotFoundJoke.tsx                   # 404 page easter egg
  icons/EmailIcon.tsx
  icons/WebsiteIcon.tsx
  icons/ChannelIcons.tsx
lib/
  content.ts                         # Markdown content loader (cached in prod builds)
  content-shared.mjs                 # Rules shared with the pre-build scripts
  slugPage.tsx                       # Shared factory for markdown slug routes
  og.ts                              # Shared per-page OpenGraph builder
  navData.ts                         # Navigation data builder
  types.ts                           # Shared TypeScript types
content/                             # Markdown content (see content/README.md)
  events/hackathons/
  events/meetings/
  events/workshops-and-seminars/
  news/
  resources/student-work-and-projects/
data/                                # JSON data (see data/README.md)
  board-members.json
  past-board-members.json
  faculty.json
  site-config.json
scripts/
  validate-content.mjs               # Validates content/ front matter (pre dev/build)
  generate-search-index.mjs          # Builds public/search.json (pre dev/build)
assets/
  css/style.css                      # Single global stylesheet (imported by app/layout.tsx)
public/
  CNAME                              # Custom domain (clemsonquantum.com)
  images/                            # Served at /images/...
  files/                             # PDFs (posters, papers) served at /files/...
  .nojekyll                          # Keeps GitHub Pages from running Jekyll
  favicon.ico, favicon-512.png, apple-icon.png
  search.json                        # Generated search index (gitignored)
```

## Content editing

- Content lives in `content/` as Markdown — see [content/README.md](../content/README.md).
- Site/board configuration lives in `data/` as JSON — see [data/README.md](../data/README.md).
- All content filenames must be lowercase kebab-case.

## Deployment

`.github/workflows/deploy.yml` deploys to GitHub Pages on push to `main`:

1. `npm ci`
2. `npm run lint`
3. `npm run typecheck`
4. `npm run build` (content validation + search index + static export into `out/`)
5. Publish `out/` to GitHub Pages

The custom domain (`clemsonquantum.com`) is set via `public/CNAME`.

## Known constraints

- **Static export.** No server-side features (no API routes, no SSR at request time). Dates and other dynamic values are resolved at build time.
- **Search index is generated.** `public/search.json` is gitignored and rebuilt by `predev`/`prebuild`. It must exist at runtime in dev.
- **Images are plain `<img>`.** `next/image` optimization is unavailable under static export, so images are served as-is.
