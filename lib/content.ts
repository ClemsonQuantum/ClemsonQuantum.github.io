import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import type { PageMeta } from './types';

export type { PageMeta, Author } from './types';
export { formatDate } from './types';

const CONTENT_ROOT = path.join(process.cwd(), 'content');

export function getAllPages(contentSubdir: string): PageMeta[] {
  const dir = path.join(CONTENT_ROOT, contentSubdir);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));

  return files.map((filename) => {
    const slug = filename.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(dir, filename), 'utf-8');
    const { data, content } = matter(raw);

    const destination = data.link ?? data.external_url ?? null;
    const isExternal =
      typeof destination === 'string' && destination.includes('://');

    const internalHref = `/${contentSubdir}/${slug}/`;

    return {
      slug,
      title: data.title ?? slug,
      date: data.date ? String(data.date) : null,
      summary: data.summary ?? null,
      image: data.image ?? null,
      external_url: data.external_url ?? null,
      link: data.link ?? null,
      cta_label: data.cta_label ?? null,
      type: data.type ?? null,
      authors: data.authors ?? null,
      href: isExternal ? destination! : internalHref,
      isExternal,
      excerpt: content
        .replace(/<[^>]+>/g, '')
        .replace(/[#*`_[\](){}|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160),
    };
  });
}

export function sortPages(pages: PageMeta[]): PageMeta[] {
  const dated = pages
    .filter((p) => p.date !== null)
    .sort((a, b) => (b.date! > a.date! ? 1 : -1));
  const undated = pages
    .filter((p) => p.date === null)
    .sort((a, b) => a.title.localeCompare(b.title));
  return [...dated, ...undated];
}

export function getPageBySlug(
  contentSubdir: string,
  slug: string
): { data: Record<string, unknown>; content: string } {
  const filepath = path.join(CONTENT_ROOT, contentSubdir, `${slug}.md`);
  const raw = fs.readFileSync(filepath, 'utf-8');
  return matter(raw) as { data: Record<string, unknown>; content: string };
}
