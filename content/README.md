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

**Committee members** on a hosted page carry their own dates: `data-start="YYYY-MM"` on each `hackathon-team-member` div, plus `data-end="YYYY-MM"` once that Quantathon is over (Bylaws Art. III §6: committee terms end when the event concludes). The `<!-- profile: … -->` comment inside each div holds reference notes on the person. Neither is shown on the site.

---

## Adding a new workshop or seminar

1. Create a new file in `content/events/workshops-and-seminars/`
2. Name it like: `workshop-name-2026.md` (descriptive name first, year at the end)
3. Copy `_TEMPLATE-workshop.md` in that folder and fill it in.

**SC Quantathon bootcamps** get no card: add `unlisted: true` to the bootcamp's front matter so it stays out of Workshops & Seminars and every other listing, and link it from the hackathon page's Bootcamp button instead. The exception is SC Quantathon v4, whose bootcamp is Qiskit Fall Fest 2027 (`qiskit-fall-fest-2027.md`): it is listed like every other Fall Fest once published. Both of those pages are local-only drafts for now (see `draft` below).

**Featured event.** The homepage's featured band shows the event named by `FEATURED_EVENT` in `lib/featured.ts`. Its title, dates, image (16:9, 1200×675), and Register link come from that event's front matter (`title`, `dateDisplay`, `image`, `registration_url`); the few short facts beside the dates are listed in `lib/featured.ts`, and a `Location` fact takes the event's `location` when it has one. The homepage Events list shows nothing dated after it. Once the event's last day (`end_date`, else `date`) has passed, the next build prints a warning, hides the band, and lifts that limit, so point `FEATURED_EVENT` at the next event (or set it to `null`). The content validator fails if `FEATURED_EVENT` names a missing, draft, or unlisted page.

---

## Adding a meeting or social event

1. Create a new file in `content/events/meetings/`
2. Name it like: `event-name-2026.md`
3. Use the same front matter as other events. Every meeting entry must set `external_url` (e.g. a TigerQuest listing): meetings have no internal detail pages, and the content validator enforces this.

---

## Adding a news article

1. Create a new file in `content/news/`
2. Name it like: `2026-03-15.md` (use the date), optionally followed by a short slug, e.g. `2026-05-18-scalab-initiative.md`
3. Copy `_TEMPLATE-news.md` and fill it in.

News cards always link out to the original article: `source_url` is the destination and `source` names the outlet on the card. Both are required.

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
| `date` | All | Yes | Date in `YYYY-MM-DD` format. Events may use `TBD` (with a `dateDisplay` override): it shows the Upcoming badge and lists after the dated upcoming events, and it never appears in the homepage Events list while there is a featured event |
| `dateDisplay` | All | No | Human-readable date override shown on cards (e.g. a date range) |
| `summary` | All | No | Short description for listing cards |
| `image` | All | No | Thumbnail image path (`/images/...`). On hosted event pages it is also the link-preview image, so use a 16:9 banner at 1200×675 |
| `end_date` | Events | No | Last day of a multi-day event, `YYYY-MM-DD`. Keeps the Upcoming badge on through that day. On hosted events, with `location`, it also turns on Event structured data (Google rich results) for the page |
| `location` | Hosted events | No | Venue name for the structured data (e.g. `Watt Family Innovation Center`) |
| `street_address` | Hosted events | No | Venue street address for the structured data; city, state, and ZIP default to Clemson |
| `registration_url` | Hosted events | No | Absolute registration link, emitted as the structured-data offer |
| `draft` | All | No | `true` keeps the page on your machine only: the dev server shows it like any page, but production builds (the published site) leave it out entirely, with no page, listing, sitemap, or search entry. Delete the line to publish. Unlike `unlisted`, nothing about the page reaches the live site except any images or files it uses in `public/`, which deploy with everything else. Its file still goes to GitHub if you commit it |
| `unlisted` | All | No | `true` builds the page at its URL but keeps it out of every listing (archives, nav, homepage, sitemap, search) and tags it `noindex`, so it can be reviewed before it is announced. Delete the line (or set `false`) to publish it normally. The source file is still visible in the public GitHub repo |
| `external_url` | Events | Meetings: yes. Other events: no | External event link. The card links there and no internal page is generated. Required for meetings, which have no detail pages (the content validator enforces this) |
| `source` | News | Yes | Outlet named on homepage news cards |
| `source_url` | News | Yes | Link to the original article; the card links there directly |
| `type` | Student work | No | `poster`, `paper`, or `conference` |
| `authors` | Student work | No | List of `- name: "..."` entries |
| `mentors` | Student work | No | List of plain `- "..."` name strings |
| `pdf` | Student work | No | Path in `public/files/` — drives the embedded viewer and download button |
| `link` | Student work | No | Related external link shown on the detail page |

---

## Interactive blocks

Event pages (hackathons and workshops) turn a few marker classes into live components. Both routes read the same markers, but the Fall Fest ones (`qff-*`) are styled by `assets/css/qff.css`, which only the workshops route loads, so use those on workshop pages. Anything else in the markdown renders as plain HTML.

| Class or marker | Put it on | `data-*` attributes | Validator checks |
|---|---|---|---|
| `event-countdown` | an empty `<div>` | `data-target` (start) and `data-end`, ISO 8601 with a UTC offset; optional `data-sr-summary`, `data-ended-message`, `data-live-message` | `data-target` is required, and both must parse |
| `hackathon-hero--quantum` | the hero `<div>` | none | none |
| `qff-hero--sky` | the Qiskit Fall Fest hero `<div>` | `data-hummingbirds` 0–3, `data-soarers` 0–3 | both 0–3 |
| `qff-page-clouds` | an empty `<div aria-hidden="true">` near the top of `.qff-page` | none | one per page |
| `qff-leaderboard` | an empty `<div>` | `data-src`, `data-sort` (`asc` or `desc`), `data-score-label`, `data-highlight`, `data-label`, `data-empty` | `data-src` empty or a published Google Sheet (`https://docs.google.com/…`); `data-sort` `asc` or `desc` |
| `qff-cryostat` | a `<div>` in the dark band | `data-label` (alt text) | `data-label` is required |
| `qff-bird-zone` | an empty `<span>` | `data-birds` 1–4, `data-variant` (`pink` or `lavender`) | both values |
| `qff-decade` | a `<span>` holding the final text, e.g. `2016–2026` | `data-from`, `data-to` (years) | none |
| `sponsor-carousel`, `sponsor-carousel--reverse` | a `<div>` of `<a class="hackathon-sponsor-logo">` logos | none | none |
| `href="#participant-updates"` | an `<a>` | `data-event` (the event name) | `data-event` is required |
| `scq4-stage`, `scq4-hero--sky`, `data-stage` cues | archived v4 design; see "Scroll stage" below | see below | none |

The sections below cover the Qiskit Fall Fest blocks and the leaderboards in more detail.

---

## Scroll stage (SC Quantathon v4 page)

**Shelved 2026-10-12.** The current v4 page (a local-only draft) uses the simple v3-style design. The scroll-stage version is kept in `events/hackathons/_ARCHIVE-sc-quantathon-v4-2027-scroll-stage.md` (the leading underscore keeps it off the site). Its code is kept in `components/scq4/`, `lib/physics/`, and `assets/css/scq4-archive.css`, except the anyon braid and orrery scenes, which were removed on 2026-10-15. To bring it back, follow the note at the top of that file. The rest of this section describes the archived version.

The v4 page (`events/hackathons/sc-quantathon-v4-2027.md`) had a scroll stage: a fixed canvas behind the page where a hydrogen atom, a pair of entangled qubits, and the committee's solar system appear as you scroll. It is driven entirely by attributes in the markdown, so the choreography can change without touching code.

- `<div class="scq4-stage"></div>` mounts the stage. Keep it the **last** element inside `.hackathon-page` (earlier, it shifts the section styling).
- A cue is any element with `data-stage`:

| Cue | Put it on | What happens |
|-----|-----------|--------------|
| `data-stage="atom"` | an empty `<div class="scq4-slot">` | The atom moves to this slot while the section is centered. `data-stage-orbital` (0 = 1s, 1 = 2p, 2 = 3d, 3 = 4f, decimals blend) sets its orbital; the atom keeps it while away. Thin rings mark where the pure orbital is empty, and each change of orbital shows the light it absorbs (scrolling down) or emits (scrolling up), with its real wavelength |
| `data-stage="qubits"` | an empty `<div class="scq4-slot">` | Two entangled qubits evolve continuously in this slot; their arrows shrink as they entangle |
| `data-stage="blackhole"` | an empty `<div class="scq4-slot">` | A black hole rises into this slot. `data-stage-incl` is the viewing angle in degrees (86 is nearly edge-on). It is drawn for a dark background, so use it on dark sections only. Not used as a cue on the v4 page at the moment (the committee shows the black hole on its own) |
| `data-stage="none"` | a section, or a marker inside one | Everything leaves the stage. With `data-stage-stay`, it fades out where it is instead |

Two more attributes work on any cue: `data-stage-sun="1"` (atom cues) collapses the atom into a sun, and `data-stage-hold="0.6"` keeps the cue still for that many extra viewport heights of scrolling. Objects leave upward and arrive from below, so they always travel with the scroll.

**The committee's solar system.** Wrap the committee list in `<div class="scq4-system">` with a sun slot first (`<div class="scq4-slot scq4-slot--sun" data-stage="atom" data-stage-orbital="0" data-stage-sun="1" data-stage-hold="0.6">`). Mark the Quantathon Director's list item with `scq4-director`: from 768 px wide, the atom becomes the sun with the Director's photo, name, and role on it, and everyone else becomes a body orbiting it (photo, name, and role come from the list, in order). Readers can turn the system by dragging, by clicking or tapping either side, or with the arrow keys. After its hold the system rides up with the page and stays in view above the footer. A small black hole sits far behind it. The list stays in the page for screen readers, and phones show it as usual.

- Slots: add `scq4-yield-left` (text on the left) or `scq4-yield-right` to the section and `scq4-slot--right` / `scq4-slot--left` to its slot, so the text makes room for the object on wide screens. The hero slot goes inside `.scq4-hero-art`, under the logo. On phones and tablets the slots hide and the object becomes a faint companion behind the text.
- The physics is checked by `npm run verify:physics`.

**Hero route.** The three steps under the v4 hero (`<ol class="hackathon-route">`, used on the v4 page as well as the archived one; its styles are scoped to `.hackathon-hero-cta`) are plain type on a hairline, with no buttons: a numeral, the step name, and a status line. A step that is not open yet is muted text. To switch a step live, replace its name span with a link and update its status line:

```html
<!-- Open: the name becomes a link (an external one opens in a new tab) -->
<li class="hackathon-route-step"><span class="hackathon-route-num">1</span><a class="hackathon-route-name" href="https://forms.gle/..." target="_blank" rel="noopener noreferrer">Apply</a><span class="hackathon-route-status">Open until [date]</span></li>
<!-- Open, on this site: a root-relative link -->
<li class="hackathon-route-step"><span class="hackathon-route-num">2</span><a class="hackathon-route-name" href="/events/workshops-and-seminars/qiskit-fall-fest-2027/">Bootcamp</a><span class="hackathon-route-status">Qiskit Fall Fest 2027</span></li>
<!-- Not open yet: muted text, not a link -->
<li class="hackathon-route-step"><span class="hackathon-route-num">3</span><span class="hackathon-route-name">Devpost</span><span class="hackathon-route-status">Page TBD</span></li>
```

**Hero sky.** The `scq4-hero--sky` class on the hero draws the real sky over Clemson at the reader's time (stars to magnitude 5 and the constellation figures), turning as a time-lapse. The star data is `lib/physics/sky-data.json`, generated by `scripts/build-sky-data.mjs` from the d3-celestial catalog. Its sources' license requires a credit line on any page that shows the sky; the text is in the comment at the top of the archive file.

## Leaderboards (Qiskit Fall Fest pages)

The Challenges sections on the Qiskit Fall Fest 2026 and 2027 pages have live leaderboards: an overall one and one inside each challenge. Each reads a Google Sheet, so editing the sheet updates the page within a few minutes (Google refreshes a published sheet every few minutes; the page re-reads it every minute), with no rebuild.

1. Make a Google Sheet with one tab per leaderboard (Overall, and one per challenge). Column A is the name, column B the score; an optional first row of headers is skipped.
2. File → Share → Publish to web. Pick a single tab, choose "Comma-separated values (.csv)", and publish. Copy the link (it ends in `output=csv`).
3. Paste it into that leaderboard's `data-src="…"` in `events/workshops-and-seminars/qiskit-fall-fest-2026.md` (or `-2027.md`). While `data-src` is empty the page shows the "opens …" note instead.

The attributes on each `<div class="qff-leaderboard">`:

- `data-sort="desc"` ranks the highest score first and `"asc"` the lowest (fewest gates, lowest error rate); equal scores share a rank. Leave `data-sort` out to keep the sheet's own order.
- `data-score-label` names the score column.
- `data-highlight="5"` marks the top 5 rows (optional; the 2026 overall board leaves it off, since prizes go to the top 5 local participants, who may not be the top 5 rows).
- `data-label` is the table's name for screen readers, e.g. `Repetition code leaderboard`.
- `data-empty` is the note shown while `data-src` is empty, e.g. `The leaderboard opens Monday, November 9.`

The page shows the top 10 with a "Show all" button. Names appear exactly as typed in the sheet, so use whatever participants agreed to show.

**Scoring on the 2026 page.** Each challenge is scored out of 100. The first ten people to reach a full 100 on a challenge get a bonus: 10 points for the first, down to 1 point for the tenth. The overall standings add both across all six challenges. Every board on the page uses `data-sort="desc" data-score-label="Points"`: a challenge's tab holds each person's points for that challenge (the score plus any bonus), and the Overall tab holds each person's total. The raw result (qubits, two-qubit gates, cut value, and so on) stays in each challenge's description. Scoring for the 2027 page is still TBD.

## Sky, cryostat, and hummingbirds (Qiskit Fall Fest pages)

- **Clouds.** `qff-hero--sky` on the hero `<div>` draws drifting clouds behind the hero. `data-hummingbirds` and `data-soarers` on the same div add birds to that sky (below).
- **Cryostat.** `<div class="qff-cryostat" data-label="(alt text)"></div>` in the dark band draws the dilution refrigerator, which builds itself and then cools (300 K down to 10 mK) as the reader scrolls past. `data-label` is required; it is the drawing's alt text. Anything inside the div is drawn on top of the art.
- **Hummingbirds** (2026 page only). `<span class="qff-bird-zone" data-birds="2" data-variant="pink"></span>` at the end of a short line, such as an eyebrow (`<p class="qff-eyebrow">03 / Sessions<span …></span></p>`), is the home of 1–4 birds. They start in the empty space beside and above that line, then roam the whole page, in a layer behind the content: they pass under text (never over it) and out of sight behind the dark band. `data-variant` (`pink` or `lavender`) colors the first bird; the rest alternate. Add `qff-bird-zone--box` plus a placement class (`qff-bird-zone--tile` for the hero's sky tile, `qff-bird-zone--chip` around the cryostat's chip) for a patch placed by the stylesheet instead; its birds stay inside it. `data-hummingbirds="3"` on the hero (0–3) sets how many fly in the sky above the hero text (one on phones).
- **Soarers** (2026 page). `data-soarers="3"` on the hero (0–3) adds gliding birds drawn for this site (a gull, a swallow, and a falcon) to the sky above the hero text. One flies on phones, and for visitors who prefer reduced motion they hold still. Separately, the page clouds (`qff-page-clouds`) send one glider slowly through behind the content now and then, whatever `data-soarers` says (none with reduced motion).
- **Page clouds** (2026 page). `<div class="qff-page-clouds" aria-hidden="true"></div>` near the top of `.qff-page` lets faint clouds drift behind the whole page (one per page). They hold still for visitors who prefer reduced motion.
- **Decade counter** (2026 page). `<span class="qff-decade" data-from="2016" data-to="2026">2016–2026</span>` in the band's eyebrow counts the end year up from `data-from` to `data-to` as the band scrolls past, in step with the cryostat. The component writes the range itself from those two attributes (any text inside the span is replaced), and screen readers, search engines, and reduced-motion visitors always get the full range.
- **Hairlines.** Each `<div class="qff-rule" aria-hidden="true"></div>` draws in from the left as it scrolls into view (browsers without scroll-driven animation, and reduced motion, show the full line). Add `qff-rule--static` to a rule in the first screen so it loads fully drawn; on the 2026 page that is the first two, after the hero and after the hosted strip.
- **Session and challenge files** go in `public/files/qff-<year>/`. On the 2026 page each session row has a Notebook chip and a Slides chip (there are no separate notes; they are part of each notebook), and each challenge row has Challenge notebook and Files. The chips start as plain text after a hidden "Posted after the session:" label for screen readers. To post a file, replace its chip with a link, e.g. `<a class="qff-day-resource" href="/files/qff-2026/(file)">Notebook</a>`, and delete the row's `<span class="sr-only">` label once every chip in it is a link.
- Session and challenge rows alternate violet and pink on their own (odd rows violet, even rows pink); there is no class to set.

## Tips

- **Images:** Put them in `public/images/` and reference as `/images/filename.jpg`
- **Image size budget:** keep card, thumbnail, and logo images under about 80 KB, sized to about 2× the size they display at, and set `width`/`height` on the `<img>` to the file's real pixel size.
- **File names:** Use all-lowercase kebab-case with dashes instead of spaces. The filename becomes the page URL verbatim, so any uppercase letter produces a mixed-case URL that breaks on the case-sensitive deploy server.
  - Events (hackathons, workshops, meetings): descriptive name first, **year at the end** (e.g. `my-event-2026.md` → `/events/.../my-event-2026/`).
  - News: name by date (e.g. `2026-03-15.md`), with an optional slug suffix (e.g. `2026-05-18-scalab-initiative.md`).
- **Dates:** The `date:` field must be `YYYY-MM-DD` format — listings are sorted by this field, not by the filename, so the filename order doesn't affect sorting.
- **Adding a new event type:** Currently supports hackathons, workshops & seminars, and meetings. To add a new category, a developer will need to create a new folder and route.
