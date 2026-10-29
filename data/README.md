# How to Edit Site Content

This folder contains all the data that controls the website content. You only need to edit these JSON files — no coding required.

After editing, push your changes to the `main` branch and GitHub Actions will rebuild the site automatically.

---

## board-members.json

Controls the **Executive board** section on the homepage.

Each person is an object with these fields:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Full name |
| `role` | Yes | Title (President, Vice President, etc.) |
| `start` | Yes | Month they started this role, `YYYY-MM` (e.g. `2026-10`). Not shown on the site |
| `profile` | Yes | Reference notes on the person (role history, background). Not shown on the site, but this repo is public, so keep it to public facts |
| `description` | Yes | Short bio — major, research area, etc. |
| `image` | Yes | Path to their photo, e.g. `/images/nathan-jones.jpg`. Leave it `""` while a headshot is pending: the card shows an empty circle in its place. `npm run headshot -- ~/Downloads/photo.jpg "Full Name"` does both steps: it saves a cropped 360×360 JPEG and fills in this path |
| `email` | No | Clemson email address |
| `linkedin` | No | Full LinkedIn URL |
| `github` | No | Full GitHub URL |
| `website` | No | Personal website URL |

**To add a new member:** Copy an existing entry, paste it at the end (before the closing `]`), add a comma after the previous entry, and fill in their info. Don't forget to add their photo to the `public/images/` folder.

**To remove a member:** Delete their entire `{ ... }` block and the trailing comma. If they served on the board, consider moving them to `past-board-members.json` instead.

---

## past-board-members.json

Controls the collapsible **Past board members** archive on the About page. Entries render in file order — keep the newest departures first.

One person can be in both files. When someone moves from one board role to another, their earlier role stays here and the new role goes in `board-members.json`. Nathan Jones, for example, is the current Student Advisor and a past President. When they leave the new role, add a second entry here for it (with its own `start` and `end`) and leave the earlier entry as it is.

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Full name |
| `role` | Yes | Title(s) held, joined with "&", e.g. "Co-Founder & Treasurer" |
| `start` | Yes | First month in the role, `YYYY-MM` (e.g. `2024-08`) |
| `end` | Yes | Last month in the role, `YYYY-MM`. The archive shows the pair as "Aug 2024–Oct 2026"; a malformed month or an end before the start fails the build |
| `profile` | Yes | Reference notes on the person, as in `board-members.json`. Not shown on the site |
| `image` | No | Path to their photo (reuse the one in `public/images/`) |
| `linkedin` | No | Full LinkedIn URL; their name links to it |

---

## faculty.json

Controls the **Quantum faculty at Clemson** section on the Resources page.

Each person is an object with these fields (all must be present — use an empty string `""` to leave one blank):

| Field | Description |
|-------|-------------|
| `name` | Full name, e.g. "Dr. Rong Ge" |
| `role` | Title and department |
| `description` | Short bio — research areas, courses, highlights |
| `image` | Path to their headshot, e.g. `/images/rong-ge.jpg` |
| `linkedin` | Full LinkedIn URL. An empty string hides the link |
| `website` | Faculty/personal page URL. An empty string hides the link |
| `email` | Clemson email address. An empty string hides the link |

**To finish a card:** set `image` to a headshot in `public/images/`, and fill in any of `linkedin` / `website` / `email` to surface those links on the card.

**Keeping words together:** a name, room, or course code that must not break across lines takes the escape `\u00a0` (a no-break space) in place of the space, e.g. `"CPSC\u00a03990"`. A hyphen that must not break is `\u2011`, and the en dash of a range takes `\u2060` right after it. Keep them as escapes in every data file, as faculty.json and site-config.json do (Markdown files take the characters themselves; see content/README.md).

---

## site-config.json

Controls meeting info, social links, and contact details used across the site (the Get Involved page, the Meetings page intro, the TigerQuest link on Governing Documents, the `{{contactEmail}}` and `{{tigerquestUrl}}` placeholders in the Code of Conduct, the footer, the event-page pop-up forms, and page metadata).

| Field | Description |
|-------|-------------|
| `meetingDay` | Day of the week (e.g. "Biweekly Tuesdays") |
| `meetingTime` | Time (e.g. "5:00\u00a0PM", matching the event pages; the `\u00a0` no-break space keeps the time on one line) |
| `location` | Meeting location (building and room, e.g. "McAdams\u00a0107", with the same no-break space) |
| `discordInvite` | Full Discord invite URL |
| `groupmeUrl` | GroupMe join URL |
| `tigerquestUrl` | TigerQuest listing URL |
| `linkedinUrl` | LinkedIn company page URL |
| `instagramUrl` | Instagram profile URL |
| `githubUrl` | GitHub organization URL |
| `contactEmail` | Club email address |
| `web3formsKey` | A public [Web3Forms](https://web3forms.com) access key makes the Get Involved contact form email you submissions directly. Keep the field even when you don’t use it (deleting it fails `npm run typecheck`). When it is empty or left as the placeholder (`your-access-key`), the Get Involved form falls back to opening the visitor’s email app (pre-addressed to `contactEmail`), and the pop-up forms on hosted event pages show a “not configured yet” message instead. |

---

## governing-documents.json

Controls the **Governing Documents** page (`/governing-documents/`).

| Field | Description |
|-------|-------------|
| `lastUpdated` | Date shown as “Last updated”, `YYYY-MM-DD`: the newest revision date among the three documents. Change it when a document is revised; uploading a PDF of a version already in force doesn’t change it |
| `documents` | One entry per row: `title`, `description`, and `href` |

**PDFs:** put each file in `public/documents/` with exactly the name in its `href` (spaces included, e.g. `Clemson Quantum Club Constitution.pdf`). The link is URL-encoded automatically. Until a PDF exists, its row shows “Coming soon” instead of “View PDF”; once it does, the button shows the file’s size, e.g. “View PDF (120 KB)”. An `href` that isn’t a `.pdf` (like `/code-of-conduct/`) links to that page. Capital letters must match exactly: a Mac ignores case, but the live build doesn’t, and the validator stops on a name that differs only in case. Check that Finder didn’t add a second extension (`…Constitution.pdf.pdf`; the validator warns about any PDF no row uses), and commit the files with the change (quote the names: `git add "public/documents/Clemson Quantum Club Constitution.pdf"`). Everything in the repo is public, so check a scanned PDF for signatures or personal details first.

---

## thumbnails.json

Generated by `scripts/generate-thumbnails.mjs` (it runs before `npm run dev` and `npm run build`); don't edit it by hand. It lists each event and news card image with its size, a hash of the file, and its phone copy in `public/images/thumbs/`, which the cards offer to phones as a smaller `srcset` choice. Commit it together with the thumbnails.

---

## meeting-schedule.json

Controls the semester meeting list on the Get Involved page; `semester` also names the schedule link on the Meetings page (e.g. "Fall 2026 schedule").

| Field | Required | Description |
|-------|----------|-------------|
| `semester` | Yes | Heading label, e.g. "Fall 2026" |
| `meetings` | Yes | Array of meetings, in date order |
| `meetings[].date` | Yes | `YYYY-MM-DD`. Past meetings dim automatically on the next site rebuild |
| `meetings[].title` | Yes | Meeting name |
| `meetings[].href` | No | Optional link (e.g. an event page like `/events/workshops-and-seminars/qiskit-fall-fest-2026/`) |

**Each semester:** update `semester` and replace the `meetings` array wholesale.

---

## Adding images

1. Put the image file in the `public/images/` folder
2. Reference it in JSON as `/images/your-filename.jpg`

Supported formats: `.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`
