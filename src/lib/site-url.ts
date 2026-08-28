/**
 * Absolute public origin of the deployed marketing site, used for canonical
 * URLs, Open Graph, sitemap and robots. Set NEXT_PUBLIC_SITE_URL in the
 * deploy env (.env.demo); the fallback only keeps local builds valid.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lionheart-appraisal.com').replace(/\/+$/, '');

export const absoluteUrl = (path: string): string => `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
