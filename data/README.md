# How to Edit Site Content

This folder contains all the data that controls the website content. You only need to edit these JSON files — no coding required.

After editing, push your changes to the `main` branch and GitHub Actions will rebuild the site automatically.

---

## board-members.json

Controls the **Executive Board** section on the homepage.

Each person is an object with these fields:

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Full name |
| `role` | Yes | Title (President, Vice President, etc.) |
| `description` | Yes | Short bio — major, research area, etc. |
| `image` | Yes | Path to their photo, e.g. `/images/nathan-jones.jpg` |
| `email` | No | Clemson email address |
| `linkedin` | No | Full LinkedIn URL |
| `github` | No | Full GitHub URL |
| `website` | No | Personal website URL |

**To add a new member:** Copy an existing entry, paste it at the end (before the closing `]`), add a comma after the previous entry, and fill in their info. Don't forget to add their photo to the `public/images/` folder.

**To remove a member:** Delete their entire `{ ... }` block and the trailing comma. If they served on the board, consider moving them to `past-board-members.json` instead.

---

## past-board-members.json

Controls the collapsible **Past board members** archive on the About page. Entries render in file order — keep the newest departures first.

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Full name |
| `role` | Yes | Title(s) held, e.g. "Co-Founder and Treasurer" |
| `years` | Yes | Term served, e.g. "Fall 2024 – Fall 2025" |
| `image` | No | Path to their photo (reuse the one in `public/images/`) |

---

## faculty.json

Controls the **Quantum Faculty at Clemson** section on the Resources page.

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

---

## site-config.json

Controls meeting info, social links, and contact details used across the site (Get Involved page, footer, and page metadata).

| Field | Description |
|-------|-------------|
| `meetingDay` | Day of the week (e.g. "Thursdays") |
| `meetingTime` | Time (e.g. "6:30 PM") |
| `location` | Room and building |
| `discordInvite` | Full Discord invite URL |
| `groupmeUrl` | GroupMe join URL |
| `tigerquestUrl` | TigerQuest listing URL |
| `linkedinUrl` | LinkedIn company page URL |
| `instagramUrl` | Instagram profile URL |
| `githubUrl` | GitHub organization URL |
| `contactEmail` | Club email address |
| `web3formsKey` | Optional. A public [Web3Forms](https://web3forms.com) access key makes the Get Involved contact form email you submissions directly. When it is absent or left as the placeholder (`your-access-key`), the form falls back to opening the visitor's email app (pre-addressed to `contactEmail`). |

---

## Adding images

1. Put the image file in the `public/images/` folder
2. Reference it in JSON as `/images/your-filename.jpg`

Supported formats: `.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`
