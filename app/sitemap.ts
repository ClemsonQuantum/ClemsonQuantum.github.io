import type { MetadataRoute } from 'next';
import { getAllPages } from '@/lib/content';

// Required for metadata routes under `output: 'export'`.
export const dynamic = 'force-static';

// Generates /sitemap.xml at build (works with `output: 'export'`). Combines the
// fixed top-level routes with every content-driven page (news, events, student work).
const BASE_URL = 'https://clemsonquantum.com';

const STATIC_ROUTES = [
  '/',
  '/about/',
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
      .map((page) => {
        const parsed = page.date ? new Date(page.date) : null;
        return {
          url: `${BASE_URL}/${dir}/${page.slug}/`,
          // Entry date doubles as lastModified; skip unparsable
          // placeholders like "TBD".
          ...(parsed && !Number.isNaN(parsed.getTime())
            ? { lastModified: parsed }
            : {}),
        };
      })
  );

  return [
    ...STATIC_ROUTES.map((route) => ({ url: `${BASE_URL}${route}` })),
    ...contentRoutes,
  ];
}
