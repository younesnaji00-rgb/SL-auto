import type { Metadata } from 'next';
import { BRAND } from '@/lib/brand';
import { absoluteUrl, SITE_URL } from '@/lib/site-url';

export const SITE_NAME = BRAND.productName;
export const OG_IMAGE = absoluteUrl('/site/og.png');

/** Per-page metadata with canonical + Open Graph + Twitter filled in. */
export function siteMetadata(opts: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
  /** Open Graph locale; defaults to en_CA. */
  locale?: 'en_CA' | 'fr_CA';
  /** hreflang alternates, as site-relative paths keyed by language. */
  languages?: Partial<Record<'en' | 'fr', string>>;
  /** Use the title verbatim (skip the "%s · Site" template) — for home pages that already carry the site name. */
  absoluteTitle?: boolean;
}): Metadata {
  const url = absoluteUrl(opts.path);
  const languages = opts.languages
    ? {
        ...Object.fromEntries(Object.entries(opts.languages).map(([lang, p]) => [lang === 'fr' ? 'fr-CA' : 'en-CA', absoluteUrl(p)])),
        'x-default': absoluteUrl(opts.languages.en ?? opts.path),
      }
    : undefined;
  return {
    title: opts.absoluteTitle ? { absolute: opts.title } : opts.title,
    description: opts.description,
    alternates: { canonical: url, languages },
    robots: opts.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      title: opts.title,
      description: opts.description,
      url,
      locale: opts.locale ?? 'en_CA',
      alternateLocale: opts.languages ? (opts.locale === 'fr_CA' ? ['en_CA'] : ['fr_CA']) : undefined,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME} — every claim closed on time` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: opts.title,
      description: opts.description,
      images: [OG_IMAGE],
    },
  };
}

/** Renders JSON-LD. Only ever fed static, server-authored objects (no user input). */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [{ name: 'Home', path: '/site' }, ...items].map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

export const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl(`${BRAND.iconsPath}/icon-512.png`),
  // email/telephone deliberately omitted: JSON-LD is the first place harvesters
  // look. Contact details are rendered client-side only (contact-links.tsx).
  address: {
    '@type': 'PostalAddress',
    streetAddress: '1250 René-Lévesque Blvd W, Suite 2200',
    addressLocality: 'Montréal',
    addressRegion: 'QC',
    postalCode: 'H3B 4W8',
    addressCountry: 'CA',
  },
};

export const softwareJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, Android',
  description: BRAND.appDescription,
  url: absoluteUrl('/site'),
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'CAD', description: 'Free interactive demo, no account required' },
  featureList: [
    'AI document pre-fill of mission letters',
    'Field agent mobile app with photo evidence',
    'Line-by-line estimates and agreement revisions',
    'Expert report and fee note generation',
    'Complete per-file audit history',
    'English and French interface',
  ],
};
