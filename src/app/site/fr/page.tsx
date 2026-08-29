import { HomePage } from '../_components/home';
import { HOME_FR } from '../_components/home-copy';
import { JsonLd, siteMetadata, softwareJsonLd, SITE_NAME } from '../_components/seo';

export const metadata = siteMetadata({
  title: `Logiciel de gestion des dossiers d'expertise automobile pour estimateurs indépendants | ${SITE_NAME}`,
  description:
    "Logiciel de gestion des sinistres automobiles pour cabinets d'estimateurs en dommages automobiles indépendants au Québec : mandats d'assureurs, application estimateur terrain, photos, suppléments, perte totale et rapports d'expertise dans un seul dossier. Démo gratuite, sans compte.",
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
