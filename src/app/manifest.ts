import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand';

// Brand-driven PWA manifest, served at /manifest.webmanifest and linked from
// the root layout. It replaced the static public/manifest.json, which was
// hardcoded to the firm ("SL-auto Expertise") and therefore advertised the
// wrong product on the white-label domains; that file has been deleted.
//
// `id` is spelled out even though it equals the implicit default (start_url):
// it is the key the browser uses to decide whether an installed PWA is THIS
// app, so pinning it keeps future start_url changes from spawning a second
// home-screen entry instead of updating the existing one.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: BRAND.productName,
    short_name: BRAND.shortName,
    description: BRAND.appDescription,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    lang: BRAND.defaultLocale,
    theme_color: '#0f766e',
    background_color: '#fbf9f4',
    icons: [
      { src: `${BRAND.iconsPath}/icon-192.png`, sizes: '192x192', type: 'image/png' },
      { src: `${BRAND.iconsPath}/icon-512.png`, sizes: '512x512', type: 'image/png' },
      { src: `${BRAND.iconsPath}/icon-maskable-512.png`, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
