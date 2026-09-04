import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PostalMind AI — Ground reality. Verified.',
    short_name: 'PostalMind AI',
    description:
      'Independent, evidence-grounded knowledge and workplace-evidence tools for Gramin Dak Sevaks.',
    start_url: '/dashboard',
    id: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1f3a5f',
    orientation: 'portrait-primary',
    lang: 'en-IN',
    icons: [
      { src: '/icon-192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
