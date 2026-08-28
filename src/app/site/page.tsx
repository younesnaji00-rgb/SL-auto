import { HomePage } from './_components/home';
import { HOME_EN } from './_components/home-copy';
import { JsonLd, siteMetadata, softwareJsonLd, SITE_NAME } from './_components/seo';

export const metadata = siteMetadata({
  title: `${SITE_NAME} — Auto appraisal claims, closed on time`,
  description:
    'Claims management for independent auto appraisal firms: AI document pre-fill, field agent app, estimates, agreements and expert reports in one file. Try the live demo, no account needed.',
  path: '/site',
  languages: { en: '/site', fr: '/site/fr' },
});

// Content and markup live in _components/home.tsx; the FR twin is /site/fr.
export default function SitePage() {
  return (
    <>
      <JsonLd data={softwareJsonLd} />
      <HomePage copy={HOME_EN} />
    </>
  );
}
