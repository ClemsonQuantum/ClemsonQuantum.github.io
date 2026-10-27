import fs from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { pageMetadata } from '@/lib/og';
import siteConfig from '@/data/site-config.json';

const description =
  'How to behave in Clemson Quantum Club spaces, and how to report a problem.';

export const metadata: Metadata = pageMetadata({
  title: 'Code of Conduct',
  description,
  path: '/code-of-conduct/',
});

// The text lives in code-of-conduct.md beside this file: Valentine's
// Contributor Covenant 3.0 adaptation (originally written for SC Quantathon
// v3, generalized here to every club space) so it can be edited as markdown. It sits outside
// content/ on purpose: the content validator expects event/news frontmatter
// there. Read inside the component rather than at module scope so `next dev`
// picks up edits to the .md on the next request (a module-scope read is
// cached until page.tsx itself changes). The site is a static export, so in
// production this still runs once at build time. `{{contactEmail}}` and
// `{{tigerquestUrl}}` in the markdown are filled from data/site-config.json.
function readMarkdown(): string {
  return fs
    .readFileSync(
      path.join(process.cwd(), 'app', 'code-of-conduct', 'code-of-conduct.md'),
      'utf8',
    )
    .replaceAll('{{contactEmail}}', siteConfig.contactEmail)
    .replaceAll('{{tigerquestUrl}}', siteConfig.tigerquestUrl);
}

// External links open in a new tab, like every other external link on the
// site; mailto: and on-site links stay put.
const components: Components = {
  a({ node, href, children, ...rest }) {
    void node;
    const external = typeof href === 'string' && href.includes('://');
    return (
      <a
        href={href}
        {...rest}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
        {external && <span className="sr-only"> (opens in a new tab)</span>}
      </a>
    );
  },
};

export default function CodeOfConductPage() {
  const markdown = readMarkdown();
  return (
    <div className="page-content coc-page">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
