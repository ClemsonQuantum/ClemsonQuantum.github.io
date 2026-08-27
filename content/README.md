# How to Add Events, News, and Student Work

This folder holds all the Markdown (`.md`) content files. The website automatically discovers files here and adds them to the navigation and listing pages.

After editing, push to the `main` branch — the site rebuilds automatically.

---

## Adding a new hackathon

1. Create a new file in `content/events/hackathons/`
2. Name it like: `my-hackathon-2026.md` (descriptive name first, year at the end — the filename becomes the page URL)
3. Copy one of the template files in that folder and fill it in:
   - `_TEMPLATE-hosted.md` — for events we host (gets its own page on the site)
   - `_TEMPLATE-competitor.md` — for events we attend (card links to the external event site via `external_url`; no internal page)

Files starting with `_` are ignored by the site, so the templates never show up as events.

---

## Adding a new workshop or seminar

1. Create a new file in `content/events/workshops-and-seminars/`
2. Name it like: `workshop-name-2026.md` (descriptive name first, year at the end)
3. Copy `_TEMPLATE-workshop.md` in that folder and fill it in.

---

## Adding a meeting or social event

1. Create a new file in `content/events/meetings/`
2. Name it like: `event-name-2026.md`
3. Use the same front matter as other events. Every meeting entry must set `external_url` (e.g. a TigerQuest listing): meetings have no internal detail pages, and the content validator enforces this.

---

## Adding a news article

1. Create a new file in `content/news/`
2. Name it like: `2026-03-15.md` (use the date)
3. Template:

```markdown
---
title: "Article Headline"
date: 2026-03-15
summary: "Brief description of the article."
image: "/images/news-photo.jpg"
source: "Clemson News"
source_url: "https://news.clemson.edu/your-article"
cta_label: "Read on Clemson News"
---

Optional extra text here (usually not needed for external links).
```

News cards always link out to the original article: `source_url` is the destination and `source` names the outlet on the card.

---

## Adding student work (poster, paper, or conference talk)

1. Create a new file in `content/resources/student-work-and-projects/`
2. Name it like: `my-project-name.md`
3. Template:

```markdown
---
title: "Your Project Title"
date: 2025-09-29
type: poster
authors:
  - name: "Jane Doe"
  - name: "John Smith"
mentors:
  - "Dr. Advisor Name"
summary: "One paragraph about what the poster/paper covers."
pdf: "/files/your-poster.pdf"
link: "https://example.com/related-page"
---

## Abstract

Write the abstract here.
```

`pdf` (a file in `public/files/`) powers the embedded viewer and "Download PDF" button on the detail page; `link` adds a related external link. Both are optional — the detail page still exists either way.

---

## Front matter reference

The `---` block at the top of each file is called "front matter." Here are all the fields:

| Field | Used in | Required | Description |
|-------|---------|----------|-------------|
| `title` | All | Yes | Page/article title |
| `date` | All | Yes | Date in `YYYY-MM-DD` format. Events may use `TBD` (with a `dateDisplay` override), which sorts first and shows the Upcoming badge |
| `dateDisplay` | All | No | Human-readable date override shown on cards (e.g. a date range) |
| `summary` | All | No | Short description for listing cards |
| `image` | All | No | Thumbnail image path (`/images/...`) |
| `external_url` | Events | No | External event link — the card links there and no internal page is generated |
| `source` | News | No | Outlet name shown on the card (defaults to "Clemson Quantum Club") |
| `source_url` | News | Yes | Link to the original article — the card links there directly |
| `cta_label` | News | No | Card footer label; a leading "Read on " prefix is stripped and the rest shown |
| `type` | Student work | No | `poster`, `paper`, or `conference` |
| `authors` | Student work | No | List of `- name: "..."` entries |
| `mentors` | Student work | No | List of plain `- "..."` name strings |
| `pdf` | Student work | No | Path in `public/files/` — drives the embedded viewer and download button |
| `link` | Student work | No | Related external link shown on the detail page |

---

## Tips

- **Images:** Put them in `public/images/` and reference as `/images/filename.jpg`
- **File names:** Use all-lowercase kebab-case with dashes instead of spaces. The filename becomes the page URL verbatim, so any uppercase letter produces a mixed-case URL that breaks on the case-sensitive deploy server.
  - Events (hackathons, workshops, meetings): descriptive name first, **year at the end** (e.g. `my-event-2026.md` → `/events/.../my-event-2026/`).
  - News: name by date (e.g. `2026-03-15.md`).
- **Dates:** The `date:` field must be `YYYY-MM-DD` format — listings are sorted by this field, not by the filename, so the filename order doesn't affect sorting.
- **Adding a new event type:** Currently supports hackathons, workshops & seminars, and meetings. To add a new category, a developer will need to create a new folder and route.
