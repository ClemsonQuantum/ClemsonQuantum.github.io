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
// v3, generalized here to every club space), now the club's adopted Code of
// Conduct (Articles I–VII), kept word for word as markdown: edit it only to
// match an adopted revision. Only the intro sentence after "Last Revised" is
// site copy. It sits outside
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
    .replaceAll('{{tigerquestUrl}}', siteConfig.tigerquestUrl)
    // Display only, the adopted wording is unchanged: names, dates and
    // "24 hours" never break across lines (no-break spaces, as elsewhere on
    // the site, like PreviewCard's keepNames).
    .replace(
      /\b(?:Clemson Quantum Club|Clemson University|Qiskit Fall Fest|\d+ hours|(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4})\b/g,
      (unit) => unit.replace(/ /g, '\u00a0'),
    );
}

// Section links: every "## Article …" heading gets an id from its own text
// ("Article V: Reporting" -> #article-v-reporting), so organizers can link
// straight to a section and the contents list below can point at it. The
// adopted wording is untouched; ids and the contents list are page chrome.
type HastNode = { type: string; value?: string; children?: HastNode[] };

function hastText(node: HastNode | undefined): string {
  if (!node) return '';
  if (node.type === 'text') return node.value ?? '';
  return (node.children ?? []).map(hastText).join('');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// External links open in a new tab, like every other external link on the
// site; mailto: and on-site links stay put.
const components: Components = {
  h2({ node, children, ...rest }) {
    const text = hastText(node as HastNode);
    const id = slugify(text);
    return (
      <h2 id={id} {...rest}>
        {children}
        {/* A pointer shortcut only: the contents list gives keyboard and
            screen reader users the same links, and the heading's name stays
            its own text. */}
        <a
          className="coc-anchor"
          href={`#${id}`}
          aria-hidden="true"
          tabIndex={-1}
        >
          #
        </a>
      </h2>
    );
  },
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
  // The title and intro render first, then the contents list, then the
  // Articles: the markdown is split at its first "## " heading.
  const split = markdown.search(/^## /m);
  const intro = split === -1 ? markdown : markdown.slice(0, split);
  const articles = split === -1 ? '' : markdown.slice(split);
  const sections = [...articles.matchAll(/^## (.+)$/gm)].map((m) => {
    const title = m[1].trim();
    return { title, id: slugify(title) };
  });
  return (
    <div className="page-content coc-page">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {intro}
      </ReactMarkdown>
      {sections.length > 0 && (
        <nav className="coc-toc" aria-labelledby="coc-toc-label">
          <p className="coc-toc__label" id="coc-toc-label">
            On this page
          </p>
          <ul role="list">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`}>{s.title}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {articles}
      </ReactMarkdown>
      {sections.length > 0 && (
        <p className="coc-back">
          <a href="#main">Back to top</a>
        </p>
      )}
    </div>
  );
}
