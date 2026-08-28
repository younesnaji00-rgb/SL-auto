import { BRAND } from '@/lib/brand';
import { SubpageHero } from '../_components/chrome';
import { obfuscate } from '../_components/contact-enc';
import { ObfuscatedEmail } from '../_components/contact-links';
import { LegalArticle } from '../_components/legal';
import { breadcrumbJsonLd, JsonLd, siteMetadata } from '../_components/seo';

export const metadata = siteMetadata({
  title: 'Privacy policy',
  description: 'What Lionheart Appraisal collects on this website and in the demo, why, where it is stored, and how to reach us about your data.',
  path: '/site/privacy',
});

const UPDATED = 'August 28, 2026';

export default function PrivacyPage() {
  const email = obfuscate(BRAND.companyEmail);
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Privacy policy', path: '/site/privacy' }])} />
      <SubpageHero
        crumbs={[{ label: 'Privacy policy' }]}
        eyebrow="Legal"
        title="Privacy"
        accent="policy."
        intro="This page explains what this website and the interactive demo collect, what we do with it, and the choices you have. It is written to meet PIPEDA and Québec's Law 25."
      />
      <LegalArticle updated={UPDATED}>
        <div>
          <h2 id="who">1. Who we are</h2>
          <p>
            This website and the demo are operated by {BRAND.companyName} ({BRAND.companyAddress}). Questions about this policy or your
            personal information go to <ObfuscatedEmail enc={email} />. The person responsible for the protection of personal
            information can be reached at the same address.
          </p>
        </div>
        <div>
          <h2 id="collect">2. What we collect</h2>
          <ul>
            <li>
              <strong>Contact form.</strong> Name, email address, firm name and your message. We use them only to answer you. They are sent
              by email to our team and kept in our mailbox for as long as the conversation is useful, then deleted.
            </li>
            <li>
              <strong>Interactive demo.</strong> The demo runs on shared, fictitious sample data. If you sign in with a demo account, the
              authentication session is kept in your browser&apos;s local storage so you stay signed in; it contains no personal data beyond
              the demo account identifier. Anything you type into the demo is sample data on a shared project and may be reset at any time —
              please do not enter real claim files or real customer details.
            </li>
            <li>
              <strong>Server logs.</strong> Our hosting provider records standard request logs (IP address, requested URL, browser type,
              timestamp) for security and troubleshooting. Logs are retained for 30 days.
            </li>
            <li>
              <strong>Analytics.</strong> If enabled, we use Plausible, a cookieless, privacy-first analytics service that stores no personal
              identifiers and does not track you across sites.
            </li>
          </ul>
        </div>
        <div>
          <h2 id="cookies">3. Cookies</h2>
          <p>
            This website sets no advertising or tracking cookies, and no third-party cookies. The only browser storage we use is strictly
            necessary: the demo&apos;s sign-in session and your interface language preference. Because none of it is used to track you,
            no consent banner is shown; you can clear it at any time from your browser settings.
          </p>
        </div>
        <div>
          <h2 id="where">4. Where your data lives</h2>
          <p>
            The website and demo are hosted on Google Cloud in the Montréal region (northamerica-northeast1), Canada. Email from the contact
            form transits through our email provider. We do not sell personal information, and we share it only with the service providers
            named above, strictly to run this site.
          </p>
        </div>
        <div>
          <h2 id="rights">5. Your rights</h2>
          <p>
            You can ask us what personal information we hold about you, ask for it to be corrected or deleted, or withdraw your consent.
            Write to <ObfuscatedEmail enc={email} />; we answer within 30 days. If you are not satisfied with our answer, you may
            file a complaint with the Commission d&apos;accès à l&apos;information du Québec or the Office of the Privacy Commissioner of
            Canada.
          </p>
        </div>
        <div>
          <h2 id="security">6. Security</h2>
          <p>
            Traffic is encrypted end to end (HTTPS with HSTS), pages ship a strict Content-Security-Policy, and access to production systems
            is limited to named staff. Security researchers can find reporting instructions at{' '}
            <a href="/.well-known/security.txt">/.well-known/security.txt</a>.
          </p>
        </div>
        <div>
          <h2 id="changes">7. Changes</h2>
          <p>We may update this policy; the date at the top tells you when. Material changes will be announced on this page.</p>
        </div>
      </LegalArticle>
    </>
  );
}
