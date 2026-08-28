import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand';
import { absoluteUrl } from '@/lib/site-url';

// Demo brand: index the marketing site only. Firm builds are private tools —
// nothing to index at all.
export default function robots(): MetadataRoute.Robots {
  if (BRAND.id !== 'demo') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/site', '/site/'],
      disallow: ['/api/', '/login', '/dashboard', '/dossiers', '/consultation', '/chiffrage', '/assignations-', '/utilisateurs', '/compagnies', '/monitoring', '/mes-rappels', '/tampons', '/jours-feries', '/signaler-bug', '/devis-editor', '/editor', '/viewer', '/site/contact/thank-you'],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
