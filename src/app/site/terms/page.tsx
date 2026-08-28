import { BRAND } from '@/lib/brand';
import { SubpageHero } from '../_components/chrome';
import { obfuscate } from '../_components/contact-enc';
import { ObfuscatedEmail } from '../_components/contact-links';
import { LegalArticle } from '../_components/legal';
import { breadcrumbJsonLd, JsonLd, siteMetadata } from '../_components/seo';

export const metadata = siteMetadata({
  title: 'Terms of service',
  description: 'The terms that apply to this website and to the Lionheart Appraisal interactive demo.',
  path: '/site/terms',
});

const UPDATED = 'August 28, 2026';

export default function TermsPage() {
  const email = obfuscate(BRAND.companyEmail);
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Terms of service', path: '/site/terms' }])} />
      <SubpageHero
        crumbs={[{ label: 'Terms of service' }]}
        eyebrow="Legal"
        title="Terms of"
        accent="service."
        intro="Short and plain: what you can expect from this website and the demo, and what we ask of you in return."
      />
      <LegalArticle updated={UPDATED}>
        <div>
          <h2 id="scope">1. Scope</h2>
          <p>
            These terms cover the public website and the interactive demo of {BRAND.productName}, operated by {BRAND.companyName}. Using
            either means you accept them. Production deployments for appraisal firms are governed by a separate written agreement.
          </p>
        </div>
        <div>
          <h2 id="demo">2. The demo</h2>
          <ul>
            <li>The demo is provided free of charge for evaluation only. It is not a production service and carries no uptime commitment.</li>
            <li>
              It runs on a shared project with fictitious sample data. Anything you enter is visible to other visitors and may be reset
              without notice. Do not enter real claim files, personal information or confidential material.
            </li>
            <li>Demo accounts are for evaluation by appraisal professionals and insurers. Do not share credentials or attempt to access other users&apos; sessions.</li>
          </ul>
        </div>
        <div>
          <h2 id="acceptable">3. Acceptable use</h2>
          <p>
            You agree not to disrupt the service, probe or circumvent its security, scrape it at volume, or use it to send unsolicited
            messages. Good-faith security research is welcome — see{' '}
            <a href="/.well-known/security.txt">/.well-known/security.txt</a> for how to report what you find.
          </p>
        </div>
        <div>
          <h2 id="ip">4. Intellectual property</h2>
          <p>
            The software, design, text and images on this site belong to {BRAND.companyName} or its licensors. You may not copy or
            redistribute them beyond what is needed to evaluate the product.
          </p>
        </div>
        <div>
          <h2 id="warranty">5. No warranty, limited liability</h2>
          <p>
            The website and demo are provided &ldquo;as is&rdquo;. To the fullest extent permitted by law, we make no warranty about their
            accuracy or availability and are not liable for any loss arising from their use. Figures shown in the demo are illustrative and
            are not appraisal advice.
          </p>
        </div>
        <div>
          <h2 id="privacy">6. Privacy</h2>
          <p>How we handle personal information is described in our <a href="/site/privacy">privacy policy</a>.</p>
        </div>
        <div>
          <h2 id="law">7. Governing law</h2>
          <p>
            These terms are governed by the laws of Québec and the applicable laws of Canada. Any dispute goes to the courts of the
            district of Montréal. Questions: <ObfuscatedEmail enc={email} />.
          </p>
        </div>
      </LegalArticle>
    </>
  );
}
