import type { MetadataRoute } from 'next';
import { getAllPages } from '@/lib/content';
import { SITE_URL } from '@/lib/site';

// Required for metadata routes under `output: 'export'`.
export const dynamic = 'force-static';

// Generates /sitemap.xml at build (works with `output: 'export'`). Combines the
// fixed top-level routes with every content-driven page (news, events, student work).
const STATIC_ROUTES = [
  '/',
  '/about/',
  '/code-of-conduct/',
  '/news/',
  '/events/',
  '/events/hackathons/',
  '/events/meetings/',
  '/events/workshops-and-seminars/',
  '/resources/',
  '/resources/learning-resources/',
  '/resources/student-work-and-projects/',
  '/get-involved/',
];

const CONTENT_DIRS = [
  'news',
  'events/hackathons',
  'events/meetings',
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
    ...STATIC_ROUTES.map((route) => ({ url: `${SITE_URL}${route}` })),
    ...contentRoutes,
  ];
}
