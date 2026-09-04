import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Script from 'next/script';
import { BRAND } from '@/lib/brand';
import { SITE_URL } from '@/lib/site-url';
import { JsonLd, organizationJsonLd, siteMetadata, SITE_NAME } from './_components/seo';
import { SiteShell } from './_components/chrome';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  ...siteMetadata({
    title: `Auto Damage Appraisal Software for Independent Appraisers | ${SITE_NAME}`,
    description:
      'Appraisal management software for independent auto damage appraisal firms in Canada: insurer assignments, field appraiser app, photo documentation, supplements, total loss and appraisal reports in one claim file. Free live demo, no account.',
    path: '/site',
  }),
  metadataBase: new URL(SITE_URL),
  // Must come after the spread: sub-pages set a plain string title and rely on this template.
  title: {
    default: `Auto Damage Appraisal Software for Independent Appraisers | ${SITE_NAME}`,
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
      {/* The marketing site is a light-only design: it defines its own palette
          (--paper/--ink/--teal) on the shell and never touches the app tokens.
          The one thing it DOES inherit is the global `h1..h6 { text-heading-fg }`
          rule, so a dark <html> turns every heading pale. `forcedTheme` pins the
          class to light for as long as a /site route is mounted, which makes the
          site immune to the theme toggle as well as to the OS preference. */}
      <ThemeProvider attribute="class" forcedTheme="light">
        <SiteShell>{children}</SiteShell>
      </ThemeProvider>
    </>
  );
}
