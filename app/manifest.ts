import type { MetadataRoute } from 'next';
import { SITE_DESCRIPTION } from '@/lib/site';

export const dynamic = 'force-static'; // required by output: 'export'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Clemson Quantum Club',
    short_name: 'Clemson Quantum Club',
    description: SITE_DESCRIPTION,
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
