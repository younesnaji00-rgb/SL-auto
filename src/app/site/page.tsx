import { HomePage } from './_components/home';
import { HOME_EN } from './_components/home-copy';
import { JsonLd, siteMetadata, softwareJsonLd, SITE_NAME } from './_components/seo';

export const metadata = siteMetadata({
  title: `Auto Damage Appraisal Software for Independent Appraisers | ${SITE_NAME}`,
  description:
    'Appraisal management software for independent auto damage appraisal firms in Canada: insurer assignments, field appraiser app, photo documentation, supplements, total loss and appraisal reports in one claim file. Cut cycle time. Free live demo, no account.',
  path: '/site',
  languages: { en: '/site', fr: '/site/fr' },
  absoluteTitle: true,
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
