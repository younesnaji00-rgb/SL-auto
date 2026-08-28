import { Mail, MapPin, Phone, Clock } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { SubpageHero } from '../_components/chrome';
import { obfuscate } from '../_components/contact-enc';
import { ObfuscatedEmail, ObfuscatedPhone } from '../_components/contact-links';
import { breadcrumbJsonLd, JsonLd, siteMetadata } from '../_components/seo';
import { ContactForm } from './contact-form';

export const metadata = siteMetadata({
  title: 'Contact',
  description: 'Book a walkthrough of Lionheart Appraisal with your own mission letter, or ask a question. A real appraiser answers within one business day.',
  path: '/site/contact',
});

export default function ContactPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'Contact', path: '/site/contact' }])} />
      <SubpageHero
        crumbs={[{ label: 'Contact' }]}
        eyebrow="Contact"
        title="Book a walkthrough,"
        accent="or just ask."
        intro="Send us a mission letter from your desk and we will walk the claim through the product with you, live, in about thirty minutes. No slides."
      />

      <section className="py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1.3fr_1fr] lg:gap-16">
          <div data-reveal className="rounded-3xl border border-[var(--line)] bg-white p-6 sm:p-8">
            {/* The form posts to /api/site-contact, which needs SMTP creds on the
                service. Without them, show a direct-email card instead of a form
                that fails on submit. */}
            {process.env.SMTP_USER && process.env.SMTP_PASS ? <ContactForm /> : <ContactFallback />}
          </div>

          <aside className="space-y-8">
            <div data-reveal data-reveal-delay="1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Direct</p>
              <ul className="mt-3 space-y-3 text-[15px]">
                <li>
                  <ObfuscatedEmail enc={obfuscate(BRAND.companyEmail)} className="inline-flex items-center gap-2.5 font-medium hover:text-[var(--teal-deep)] hover:underline">
                    <Mail className="h-4 w-4 text-[var(--teal)]" aria-hidden />
                  </ObfuscatedEmail>
                </li>
                <li>
                  <ObfuscatedPhone enc={obfuscate(BRAND.companyTel)} className="inline-flex items-center gap-2.5 font-medium hover:text-[var(--teal-deep)] hover:underline">
                    <Phone className="h-4 w-4 text-[var(--teal)]" aria-hidden />
                  </ObfuscatedPhone>
                </li>
                <li className="flex items-start gap-2.5 text-[var(--muted)]">
                  <Clock className="mt-1 h-4 w-4 shrink-0 text-[var(--teal)]" aria-hidden />
                  <span>Monday to Friday, 8:30 to 17:00 (Eastern). We answer within one business day.</span>
                </li>
              </ul>
            </div>
            <div data-reveal data-reveal-delay="2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Office</p>
              <p className="mt-3 flex items-start gap-2.5 text-[15px] text-[var(--muted)]">
                <MapPin className="mt-1 h-4 w-4 shrink-0 text-[var(--teal)]" aria-hidden />
                <span>{BRAND.companyAddressFooter}</span>
              </p>
            </div>
            <div data-reveal data-reveal-delay="3" className="rounded-2xl bg-[var(--teal-soft)] p-5 text-[14px] leading-relaxed text-[var(--teal-deep)]">
              Prefer to look first? The demo needs no account: pick a role and open a real claim file. Then write to us with what did not feel like your desk.
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

function ContactFallback() {
  return (
    <div className="flex flex-col items-start gap-5">
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--teal-deep)]">Write to us</p>
      <p className="max-w-[46ch] text-[17px] leading-relaxed">
        Send a short note with your firm name and, if you want a walkthrough, a sample mission letter. We reply within one business day.
      </p>
      <ObfuscatedEmail
        enc={obfuscate(BRAND.companyEmail)}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--teal)] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--teal-deep)]"
      >
        <Mail className="h-4 w-4" aria-hidden />
      </ObfuscatedEmail>
    </div>
  );
}
