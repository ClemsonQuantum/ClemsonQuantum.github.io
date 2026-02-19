# How to Add Events, News, and Student Work

This folder holds all the Markdown (`.md`) content files. The website automatically discovers files here and adds them to the navigation and listing pages.

After editing, push to the `main` branch — the site rebuilds automatically.

---

## Adding a new hackathon

1. Create a new file in `content/events/hackathons/`
2. Name it like: `2026-My-Hackathon.md`
3. Paste this template and fill it in:

```markdown
---
title: "Hackathon Name 2026"
date: 2026-03-15
summary: "One sentence about the event."
image: "/images/my-hackathon.png"
---

# Hackathon Name 2026

Write event details here. You can use **bold**, *italics*, and [links](https://example.com).
```

---

## Adding a new workshop or seminar

1. Create a new file in `content/events/workshops-and-seminars/`
2. Name it like: `2026-Workshop-Name.md`
3. Use the same template as hackathons above.

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
external_url: "https://news.clemson.edu/your-article"
cta_label: "Read on Clemson News"
---

Optional extra text here (usually not needed for external links).
```

If the article is on an external site, set `external_url` and the card will link there directly.

---

## Adding student work (poster or paper)

1. Create a new file in `content/resources/student-work-and-projects/`
2. Name it like: `My-Project-Name.md`
3. Template:

```markdown
---
title: "Your Project Title"
date: 2025-09-29
type: poster
authors:
  - name: "Jane Doe"
  - name: "John Smith"
summary: "One paragraph about what the poster/paper covers."
link: "https://example.com/your-poster.pdf"
---

## Abstract

Write the abstract here.

## Files

- [PDF poster](https://example.com/your-poster.pdf)
```

---

## Front matter reference

The `---` block at the top of each file is called "front matter." Here are all the fields:

| Field | Used in | Required | Description |
|-------|---------|----------|-------------|
| `title` | All | Yes | Page/article title |
| `date` | All | Yes | Date in `YYYY-MM-DD` format |
| `summary` | All | No | Short description for listing cards |
| `image` | All | No | Thumbnail image path (`/images/...`) |
| `external_url` | News | No | External link (opens in new tab) |
| `cta_label` | News | No | Button text (default: "Read the story") |
| `link` | Student work | No | Link to PDF or external page |
| `type` | Student work | No | `poster` or `paper` |
| `authors` | Student work | No | List of `- name: "..."` entries |

---

## Tips

- **Images:** Put them in `public/images/` and reference as `/images/filename.jpg`
- **File names:** Use dashes instead of spaces (e.g. `2026-My-Event.md`)
- **Dates:** Must be `YYYY-MM-DD` format — events are sorted by date automatically
- **Adding a new event type:** Currently supports hackathons and workshops. To add a new category, a developer will need to create a new folder and route.
