import type { MetadataRoute } from 'next';

// Required for metadata routes under `output: 'export'`.
export const dynamic = 'force-static';

// Generates /manifest.webmanifest at build (works with `output: 'export'`);
// app/layout.tsx links it through `metadata.manifest`.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Clemson Quantum Club',
    short_name: 'CQC',
    description:
      'The Clemson Quantum Club (CQC) is a student-led organization making quantum computing accessible at Clemson University. Workshops, hackathons, research, and community.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f3ee',
    theme_color: '#f6f3ee',
    icons: [
      { src: '/favicon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
