import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { SiteBreadcrumb } from '../../_components/chrome';
import { siteMetadata } from '../../_components/seo';

export const metadata = siteMetadata({
  title: 'Message received',
  description: 'Thanks for writing to Lionheart Appraisal. We answer within one business day.',
  path: '/site/contact/thank-you',
  noindex: true,
});

const NEXT = [
  { t: 'Open the demo', d: 'Pick a role and walk a real claim while you wait for our reply.', href: '/login', cta: 'Pick a role' },
  { t: 'Read the FAQ', d: 'Data isolation, roles, bilingual reports, onboarding and pricing.', href: '/site/faq', cta: 'Browse questions' },
  { t: 'Meet the team', d: 'Who builds Lionheart, and why half of us still appraise every week.', href: '/site/about', cta: 'About us' },
];

export default function ThankYouPage() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      <div aria-hidden className="site-grain pointer-events-none absolute inset-0 opacity-[.35] mix-blend-multiply" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SiteBreadcrumb items={[{ href: '/site/contact', label: 'Contact' }, { label: 'Message received' }]} />
        <div className="mt-10 max-w-2xl">
          <span data-reveal className="grid h-14 w-14 place-items-center rounded-full bg-[var(--teal-soft)] text-[var(--teal-deep)]">
            <CheckCircle2 className="h-7 w-7" aria-hidden />
          </span>
          <h1 data-reveal data-reveal-delay="1" className="mt-6 text-[2.4rem] font-bold leading-[1.05] tracking-[-0.02em] sm:text-[3.4rem]">
            Got it. A real appraiser will reply within one business day.
          </h1>
          <p data-reveal data-reveal-delay="2" className="mt-5 text-[17px] leading-relaxed text-[var(--muted)]">
            If you asked for a walkthrough, expect a short email proposing two or three time slots and asking for a sample mission letter to run through the product live.
          </p>
        </div>

        <ul className="mt-14 grid gap-5 md:grid-cols-3">
          {NEXT.map((n, i) => (
            <li key={n.t} data-reveal data-reveal-delay={String(i + 1)} className="site-lift flex flex-col rounded-2xl border border-[var(--line)] bg-white p-6">
              <p className="text-[17px] font-bold tracking-tight">{n.t}</p>
              <p className="mt-2 flex-1 text-[14.5px] leading-relaxed text-[var(--muted)]">{n.d}</p>
              <Link href={n.href} className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--teal-deep)] hover:underline">
                {n.cta} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
