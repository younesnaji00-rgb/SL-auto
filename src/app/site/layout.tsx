import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Script from 'next/script';
import { BRAND } from '@/lib/brand';
import { SITE_URL } from '@/lib/site-url';
import { JsonLd, organizationJsonLd, siteMetadata, SITE_NAME } from './_components/seo';
import { SiteShell } from './_components/chrome';

export const metadata: Metadata = {
  ...siteMetadata({
    title: `${SITE_NAME} — Auto appraisal claims, closed on time`,
    description:
      'Claims management for independent auto appraisal firms: AI document pre-fill, field agent app, estimates, agreements and expert reports in one file. Try the live demo, no account needed.',
    path: '/site',
  }),
  metadataBase: new URL(SITE_URL),
  // Must come after the spread: sub-pages set a plain string title and rely on this template.
  title: {
    default: `${SITE_NAME} — Auto appraisal claims, closed on time`,
    template: `%s · ${SITE_NAME}`,
  },
};

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  // The marketing site belongs to the demo brand only; firm builds bounce to the app.
  if (BRAND.id !== 'demo') redirect('/login');
  return (
    <>
      <JsonLd data={organizationJsonLd} />
      {/* Cookieless analytics: no consent banner needed. Enable by setting
          NEXT_PUBLIC_PLAUSIBLE_DOMAIN (e.g. lionheart-appraisal.com) in .env.demo. */}
      {PLAUSIBLE_DOMAIN && (
        <Script defer data-domain={PLAUSIBLE_DOMAIN} src="https://plausible.io/js/script.tagged-events.outbound-links.js" strategy="afterInteractive" />
      )}
      <SiteShell>{children}</SiteShell>
    </>
  );
}
