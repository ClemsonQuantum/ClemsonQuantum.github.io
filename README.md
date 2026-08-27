# Clemson Quantum Club

Website for the Clemson Quantum Club at Clemson University.

**Live site:** https://clemsonquantum.com

Built with Next.js 15, React 19, and TypeScript, statically exported and deployed to GitHub Pages via GitHub Actions. The site lists the club's events, hackathons, news, learning resources, and student work — most content is maintained by editing Markdown and JSON files, no code required.

## Editing content

Most updates only touch Markdown and JSON:

- Events, news, and student work live as Markdown in `content/` — see [content/README.md](content/README.md).
- Board roster, meeting info, and site links live as JSON in `data/` — see [data/README.md](data/README.md).

## Development

Requires Node.js 22 and npm. See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for the full developer reference.

```bash
npm ci        # install dependencies
npm run dev   # dev server at http://localhost:3000
npm run build # static export to out/
```

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml` (lint → type check → build → deploy to GitHub Pages). The custom domain is set via `public/CNAME`.
