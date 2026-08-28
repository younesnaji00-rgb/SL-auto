import { HomePage } from '../_components/home';
import { HOME_FR } from '../_components/home-copy';
import { JsonLd, siteMetadata, softwareJsonLd, SITE_NAME } from '../_components/seo';

export const metadata = siteMetadata({
  title: `${SITE_NAME} — Réclamations d'évaluation automobile, fermées à temps`,
  description:
    "Gestion des réclamations pour cabinets d'évaluation automobile indépendants : préremplissage IA, application agent terrain, estimations, ententes et rapports d'expertise dans un seul dossier. Démo en direct, sans compte.",
  path: '/site/fr',
  locale: 'fr_CA',
  languages: { en: '/site', fr: '/site/fr' },
  absoluteTitle: true,
});

export default function SitePageFr() {
  return (
    <>
      <JsonLd data={{ ...softwareJsonLd, inLanguage: 'fr-CA' }} />
      <HomePage copy={HOME_FR} />
    </>
  );
}
