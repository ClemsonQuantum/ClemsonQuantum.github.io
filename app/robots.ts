import type { MetadataRoute } from 'next';

// Required for metadata routes under `output: 'export'`.
export const dynamic = 'force-static';

// Generates /robots.txt at build (works with `output: 'export'`).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://clemsonquantum.com/sitemap.xml',
    host: 'https://clemsonquantum.com',
  };
}
