import Link from 'next/link';
import { ArrowRight, ShieldCheck, Languages, Wrench, MapPin } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { SubpageHero } from '../_components/chrome';
import { breadcrumbJsonLd, JsonLd, siteMetadata } from '../_components/seo';

export const metadata = siteMetadata({
  title: 'About',
  description:
    'Lionheart Appraisal is claims management software built with independent auto appraisal firms: one file per claim, from mission letter to expert report.',
  path: '/site/about',
});

const VALUES = [
  { icon: Wrench, t: 'Built at the desk, not in a lab', d: 'Every screen was shaped by watching estimators and field agents work a real claim, then removing the re-typing.' },
  { icon: ShieldCheck, t: 'One firm, one cloud project', d: 'Each firm is deployed in isolation. No shared database, no shared accounts, no cross-tenant risk.' },
  { icon: Languages, t: 'Bilingual from day one', d: 'English and French side by side, per user, on every screen and every generated report.' },
];

// Team roster for the demo brand. Real deployments replace this with the
// firm's own people and drop a photo at public/site/team.jpg (see TeamPhoto).
const TEAM = [
  { name: 'J. Tremblay', role: 'Lead appraiser, product direction', initials: 'JT' },
  { name: 'A. Roy', role: 'Field operations', initials: 'AR' },
  { name: 'M. Bouchard', role: 'Estimating and insurer relations', initials: 'MB' },
  { name: 'S. Nguyen', role: 'Engineering', initials: 'SN' },
];

export default function AboutPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: 'About', path: '/site/about' }])} />
      <SubpageHero
        crumbs={[{ label: 'About' }]}
        eyebrow="About Lionheart"
        title="Software shaped by"
        accent="appraisers."
        intro="Lionheart Appraisal started as an internal tool for one appraisal firm that was tired of chasing photos, re-typing mission letters and explaining to insurers where the report was. It is now the product we would have bought."
      />

      <section className="py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
          <h2 data-reveal className="text-3xl font-bold tracking-tight sm:text-[2.4rem] sm:leading-[1.1]">
            What we believe a claim file should be.
          </h2>
          <div className="space-y-8">
            {VALUES.map((v, i) => (
              <div key={v.t} data-reveal data-reveal-delay={String(i + 1)} className="flex gap-5">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-white text-[var(--teal-deep)]">
                  <v.icon className="h-5 w-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-[17px] font-bold tracking-tight">{v.t}</h3>
                  <p className="mt-1.5 max-w-[48ch] text-[14.5px] leading-relaxed text-[var(--muted)]">{v.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section id="team" className="bg-[var(--paper-2)] py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 data-reveal className="max-w-xl text-3xl font-bold tracking-tight sm:text-[2.4rem] sm:leading-[1.1]">
              The people behind the file.
            </h2>
            <p data-reveal data-reveal-delay="1" className="max-w-sm text-[14.5px] leading-relaxed text-[var(--muted)]">
              A small team in Montréal, half of it still appraising vehicles every week.
            </p>
          </div>

          <TeamPhoto />

          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {TEAM.map((m, i) => (
              <li key={m.name} data-reveal data-reveal-delay={String(Math.min(i, 3))} className="rounded-2xl border border-[var(--line)] bg-white p-5">
                <span aria-hidden className="grid h-14 w-14 place-items-center rounded-full bg-[var(--teal-soft)] text-[17px] font-bold text-[var(--teal-deep)]">
                  {m.initials}
                </span>
                <p className="mt-4 text-[16px] font-bold tracking-tight">{m.name}</p>
                <p className="mt-1 text-[13.5px] leading-snug text-[var(--muted)]">{m.role}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Where */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:px-6 md:grid-cols-2">
          <div>
            <h2 data-reveal className="text-2xl font-bold tracking-tight sm:text-3xl">Based in Montréal, deployed anywhere.</h2>
            <p data-reveal data-reveal-delay="1" className="mt-4 max-w-[48ch] text-[15px] leading-relaxed text-[var(--muted)]">
              {BRAND.companyName.replace(/\b\w+/g, w => w.charAt(0) + w.slice(1).toLowerCase())} operates from {BRAND.companyAddressFooter}. Each client firm
              gets its own isolated deployment in the region of their choice.
            </p>
            <p data-reveal data-reveal-delay="2" className="mt-3 inline-flex items-center gap-2 text-[14px] text-[var(--muted)]">
              <MapPin className="h-4 w-4 text-[var(--teal)]" aria-hidden /> {BRAND.companyAddress}
            </p>
          </div>
          <div data-reveal className="rounded-3xl bg-[var(--teal)] p-8 text-white">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/70">Next step</p>
            <p className="mt-2 text-2xl font-bold tracking-tight">See it on a real claim</p>
            <p className="mt-2 max-w-[38ch] text-[14.5px] leading-relaxed text-white/80">
              Open the live demo as any role, or ask us for a walkthrough with your own mission letter.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/login" className="plausible-event-name=Open+demo inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-[var(--teal-deep)] transition-colors hover:bg-[var(--teal-soft)]">
                Open the demo <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link href="/site/contact" className="inline-flex h-11 items-center rounded-full border border-white/40 px-5 text-[14px] font-semibold text-white transition-colors hover:bg-white/10">
                Book a walkthrough
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * Team photo slot. Ships a photo when public/site/team.jpg exists; until then
 * the tile renders a labelled placeholder so the layout is final and the
 * photo is a one-file drop-in (no code change).
 */
function TeamPhoto() {
  const hasPhoto = process.env.NEXT_PUBLIC_SITE_TEAM_PHOTO === 'true';
  if (!hasPhoto) {
    return (
      <div
        data-reveal
        className="site-dots mt-10 grid aspect-[21/9] w-full place-items-center rounded-3xl border border-dashed border-[var(--line)] bg-[var(--paper)] text-center"
        role="img"
        aria-label="Team photo placeholder"
      >
        <p className="max-w-xs text-[13.5px] leading-relaxed text-[var(--muted)]">
          Team photo goes here — drop <code className="rounded bg-white px-1.5 py-0.5 text-[12px]">public/site/team.jpg</code> and set{' '}
          <code className="rounded bg-white px-1.5 py-0.5 text-[12px]">NEXT_PUBLIC_SITE_TEAM_PHOTO=true</code>.
        </p>
      </div>
    );
  }
  return (
    <div data-reveal className="site-frame mt-10 overflow-hidden rounded-3xl border border-[var(--line)] bg-white">
      <img src="/site/team.jpg" alt="The Lionheart Appraisal team in the Montréal office" width={2100} height={900} loading="lazy" className="block aspect-[21/9] w-full object-cover" />
    </div>
  );
}
