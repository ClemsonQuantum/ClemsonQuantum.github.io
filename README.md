# ClemsonQuantum.github.io

The official website for the **Clemson Quantum Club (CQC)** — a student-led organization making quantum computing accessible at Clemson University.

**Live site:** [clemsonquantum.github.io](https://clemsonquantum.github.io)

## Features

- Club information, executive board, and mission
- News and announcements
- Event listings (hackathons, workshops, seminars)
- Learning resources for quantum computing
- Student work and project showcases
- Search across all content
- Dark mode (system preference)
- Responsive design for mobile and desktop

## Tech Stack

- [Next.js 15](https://nextjs.org/) with App Router
- [React 19](https://react.dev/)
- TypeScript
- Static export to GitHub Pages
- Markdown content with gray-matter frontmatter

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
git clone https://github.com/ClemsonQuantum/ClemsonQuantum.github.io.git
cd ClemsonQuantum.github.io
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the site.

### Build

```bash
npm run build
```

Static output is generated in the `out/` directory.

## Project Structure

```
app/                    # Next.js App Router pages
  page.tsx              # Home page
  layout.tsx            # Root layout with metadata
  globals.css           # Global styles
  events/               # Event pages (hackathons, workshops)
  news/                 # News article pages
  resources/            # Learning resources, student work
  get-involved/         # Contact and meeting info
components/             # React components
  Header.tsx            # Navigation header with search
  Footer.tsx            # Site footer
  Gallery.tsx           # Horizontal image gallery
  PeopleCard.tsx        # Board member cards (mobile)
  OrganizerRow.tsx      # Board member rows (desktop)
  SearchBar.tsx         # Site-wide search
  NewsCard.tsx          # News article card
  EventCard.tsx         # Event listing card
  ShowMoreSection.tsx   # Expandable content section
content/                # Markdown content files
  events/               # Event markdown
    hackathons/         # Hackathon event pages
    workshops-and-seminars/  # Workshop and seminar pages
  news/                 # News articles
  resources/            # Resource pages
    student-work-and-projects/  # Student project showcases
data/                   # JSON data files
  board-members.json    # Executive board info
  site-config.json      # Site configuration (meeting time, links)
  event-cards.json      # Event card data
  gallery.json          # Image gallery data
lib/                    # Utility modules
  content.ts            # Markdown content loader
  navData.ts            # Navigation data builder
  types.ts              # Shared TypeScript types
scripts/
  generate-search-index.mjs  # Builds search.json at prebuild
public/
  assets/css/style.css  # Main stylesheet
  assets/js/main.js     # Floating submenu logic
  images/               # Site images
  search.json           # Generated search index
assets/                 # Source CSS and JS
  css/style.css
  js/main.js
```

## Content Editing

### Adding News

Create a new `.md` file in `content/news/` (see `content/news/_TEMPLATE-news.md` for the full template):

```markdown
---
title: "Your News Title"
date: 2025-01-15
summary: "Brief summary for the card view"
image: "/images/your-image.jpg"
---

Your article content here in Markdown.
```

For external articles that link out instead of rendering content:

```markdown
---
title: "Article Title"
date: 2025-01-15
summary: "Brief summary"
external_url: "https://external-site.com/article"
cta_label: "Read on External Site"
image: "/images/your-image.jpg"
---

Brief summary or excerpt (the reader will be linked to the external URL).
```

### Adding Events

Create a `.md` file in `content/events/hackathons/` or `content/events/workshops-and-seminars/`. Templates are provided:

- `content/events/hackathons/_TEMPLATE-hosted.md` — for hackathons CQC hosts
- `content/events/hackathons/_TEMPLATE-competitor.md` — for hackathons CQC competes in
- `content/events/workshops-and-seminars/_TEMPLATE-workshop.md` — for workshops

### Editing Site Configuration

Update `data/site-config.json` to change meeting times, location, Discord invite, or contact info.

Update `data/board-members.json` to change the executive board listing.

## Deployment

The site auto-deploys to GitHub Pages via GitHub Actions on push to `main`. The workflow:

1. Installs dependencies (`npm ci`)
2. Runs lint (`next lint`) and type check (`tsc --noEmit`)
3. Generates the search index (`generate-search-index.mjs` via `prebuild`)
4. Builds the static export (`next build`) into `out/`
5. Deploys to GitHub Pages

## Contributing

1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally with `npm run dev`
3. Ensure `npm run build` passes
4. Submit a pull request

## License

This project is maintained by the Clemson Quantum Club.
