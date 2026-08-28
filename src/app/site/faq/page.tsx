import { FaqPage } from '../_components/faq-page';
import { FAQ_EN } from '../_components/faq-data';
import { siteMetadata } from '../_components/seo';

export const metadata = siteMetadata({
  title: FAQ_EN.title,
  description: FAQ_EN.description,
  path: FAQ_EN.path,
  languages: { en: '/site/faq', fr: '/site/fr/faq' },
});

export default function FaqPageEn() {
  return <FaqPage copy={FAQ_EN} />;
}
