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
| `image` | Yes | Path to their photo, e.g. `/images/Nathan.jpeg` |
| `linkedin` | No | Full LinkedIn URL |
| `github` | No | Full GitHub URL |

**To add a new member:** Copy an existing entry, paste it at the end (before the closing `]`), add a comma after the previous entry, and fill in their info. Don't forget to add their photo to the `public/images/` folder.

**To remove a member:** Delete their entire `{ ... }` block and the trailing comma.

---

## site-config.json

Controls the **Get Involved** page — meeting info, links, and contact details.

| Field | Description |
|-------|-------------|
| `meetingDay` | Day of the week (e.g. "Thursdays") |
| `meetingTime` | Time (e.g. "6:30 PM") |
| `location` | Room and building |
| `locationNote` | Extra note shown in parentheses |
| `discordInvite` | Full Discord invite URL |
| `tigerquestUrl` | TigerQuest listing URL |
| `contactEmail` | Club email address |
| `formspreeId` | Formspree form ID for the contact form |

---

## Adding images

1. Put the image file in the `public/images/` folder
2. Reference it in JSON as `/images/your-filename.jpg`

Supported formats: `.jpg`, `.jpeg`, `.png`, `.webp`, `.svg`
