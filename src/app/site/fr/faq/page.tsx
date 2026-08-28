import { FaqPage } from '../../_components/faq-page';
import { FAQ_FR } from '../../_components/faq-data';
import { siteMetadata } from '../../_components/seo';

export const metadata = siteMetadata({
  title: FAQ_FR.title,
  description: FAQ_FR.description,
  path: FAQ_FR.path,
  locale: 'fr_CA',
  languages: { en: '/site/faq', fr: '/site/fr/faq' },
});

export default function FaqPageFr() {
  return <FaqPage copy={FAQ_FR} />;
}
