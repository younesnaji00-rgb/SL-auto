import type { MetadataRoute } from 'next';
import { BRAND } from '@/lib/brand';
import { absoluteUrl } from '@/lib/site-url';

// Bump when a public page's content changes materially.
const LAST_MODIFIED = new Date('2026-08-28');

export default function sitemap(): MetadataRoute.Sitemap {
  if (BRAND.id !== 'demo') return [];
  return [
    {
      url: absoluteUrl('/site'),
      lastModified: LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 1,
      alternates: { languages: { 'en-CA': absoluteUrl('/site'), 'fr-CA': absoluteUrl('/site/fr') } },
    },
    {
      url: absoluteUrl('/site/fr'),
      lastModified: LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.9,
      alternates: { languages: { 'en-CA': absoluteUrl('/site'), 'fr-CA': absoluteUrl('/site/fr') } },
    },
    {
      url: absoluteUrl('/site/fr/faq'),
      lastModified: LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.6,
      alternates: { languages: { 'en-CA': absoluteUrl('/site/faq'), 'fr-CA': absoluteUrl('/site/fr/faq') } },
    },
    { url: absoluteUrl('/site/about'), lastModified: LAST_MODIFIED, changeFrequency: 'yearly', priority: 0.6 },
    { url: absoluteUrl('/site/faq'), lastModified: LAST_MODIFIED, changeFrequency: 'monthly', priority: 0.7 },
    { url: absoluteUrl('/site/contact'), lastModified: LAST_MODIFIED, changeFrequency: 'yearly', priority: 0.5 },
    { url: absoluteUrl('/site/privacy'), lastModified: LAST_MODIFIED, changeFrequency: 'yearly', priority: 0.3 },
    { url: absoluteUrl('/site/terms'), lastModified: LAST_MODIFIED, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
