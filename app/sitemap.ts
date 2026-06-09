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
    getAllPages(dir).map((page) => `/${dir}/${page.slug}/`)
  );

  return [...STATIC_ROUTES, ...contentRoutes].map((route) => ({
    url: `${BASE_URL}${route}`,
  }));
}
