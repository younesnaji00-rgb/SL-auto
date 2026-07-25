import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand';

// Brand-driven PWA manifest (replaces the static public/manifest.json).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND.productName,
    short_name: BRAND.shortName,
    description: BRAND.appDescription,
    start_url: '/',
    display: 'standalone',
    lang: BRAND.defaultLocale,
    theme_color: '#0f766e',
    background_color: '#fbf9f4',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
