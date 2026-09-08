import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { pageOpenGraph } from '@/lib/og';

const description =
  'The code of conduct for Clemson Quantum Club events, including SC Quantathon v3: expected behavior, restricted behavior, how to report an issue, and how reports are handled.';

export const metadata: Metadata = {
  title: 'Code of Conduct',
  description,
  openGraph: pageOpenGraph({
    title: 'Code of Conduct | Clemson Quantum Club',
    description,
    url: '/code-of-conduct/',
  }),
};

// The text lives in code-of-conduct.md beside this file: Valentine's
// Contributor Covenant 3.0 adaptation (originally written for SC Quantathon
// v3, generalized here to every club space) so it can be edited as markdown. It sits outside
// content/ on purpose: the content validator expects event/news frontmatter
// there. Read at build time; the site is a static export.
const markdown = fs.readFileSync(
  path.join(process.cwd(), 'app', 'code-of-conduct', 'code-of-conduct.md'),
  'utf8',
);

export default function CodeOfConductPage() {
  return (
    <div className="page-content coc-page">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
    </div>
  );
}
