import type { MetadataRoute } from 'next';
import { getAllPages } from '@/lib/content';
import { STATIC_PAGES } from '@/lib/routes.mjs';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-static'; // required by output: 'export'

// The home page, the fixed pages, and every content entry with a page here.
// news/ and events/meetings/ are left out: the validator keeps their entries
// external, so they have no pages on the site.
const CONTENT_DIRS = [
  'events/hackathons',
  'events/workshops-and-seminars',
  'resources/student-work-and-projects',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const contentRoutes = CONTENT_DIRS.flatMap((dir) =>
    getAllPages(dir)
      // External entries have no internal page, so they don't belong here.
      .filter((page) => !page.isExternal)
      // No lastModified: the only date on a content entry is the event or
      // publication date, which says nothing about when the page last changed
      // and is in the future for upcoming events.
      .map((page) => ({ url: `${SITE_URL}/${dir}/${page.slug}/` }))
  );

  return [
    { url: `${SITE_URL}/` },
    ...STATIC_PAGES.map((page) => ({ url: `${SITE_URL}${page.path}` })),
    ...contentRoutes,
  ];
}
