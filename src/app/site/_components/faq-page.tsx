import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SubpageHero } from './chrome';
import { breadcrumbJsonLd, JsonLd } from './seo';
import type { FaqCopy } from './faq-data';

/** Server-rendered FAQ page; /site/faq and /site/fr/faq pass their copy. */
export function FaqPage({ copy }: { copy: FaqCopy }) {
  const c = copy;
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: c.locale === 'fr' ? 'fr-CA' : 'en-CA',
    mainEntity: c.groups.flatMap(g => g.items).map(it => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };

  return (
    <div lang={c.locale}>
      <JsonLd data={[breadcrumbJsonLd([{ name: c.crumb, path: c.path }]), faqJsonLd]} />
      <SubpageHero crumbs={[{ label: c.crumb }]} eyebrow={c.eyebrow} title={c.h1} accent={c.accent} intro={c.intro} />

      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-[220px_1fr] lg:gap-16">
            <nav aria-label={c.sectionsAria} className="lg:sticky lg:top-28 lg:self-start">
              <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
                {c.groups.map(g => (
                  <li key={g.id}>
                    <a
                      href={`#${g.id}`}
                      className="inline-block rounded-full border border-[var(--line)] bg-white px-3.5 py-1.5 text-[13.5px] font-medium transition-colors hover:bg-[var(--teal-soft)] lg:border-0 lg:bg-transparent lg:px-0 lg:py-1 lg:text-[var(--muted)] lg:hover:bg-transparent lg:hover:text-[var(--ink)]"
                    >
                      {g.group}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="space-y-14">
              {c.groups.map(g => (
                <div key={g.id} id={g.id} className="scroll-mt-28">
                  <h2 data-reveal className="text-2xl font-bold tracking-tight">{g.group}</h2>
                  <div className="mt-4 divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-white">
                    {g.items.map((it, i) => (
                      <details key={it.q} data-reveal data-reveal-delay={String(Math.min(i, 3))} className="group px-5 py-4 open:bg-[var(--paper-2)]">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
                          {it.q}
                          <span aria-hidden className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--teal-soft)] text-[var(--teal-deep)] transition-transform group-open:rotate-45">
                            +
                          </span>
                        </summary>
                        <p className="mt-3 max-w-[70ch] text-[15px] leading-relaxed text-[var(--muted)]">{it.a}</p>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div data-reveal className="mt-20 flex flex-wrap items-center justify-between gap-5 rounded-3xl bg-[var(--teal-deep)] p-8 text-white">
            <div>
              <p className="text-2xl font-bold tracking-tight">{c.stillTitle}</p>
              <p className="mt-1 text-[14.5px] text-white/75">{c.stillP}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href={c.contactPath} className="inline-flex h-11 items-center rounded-full border border-white/40 px-5 text-[14px] font-semibold text-white transition-colors hover:bg-white/10">
                {c.ask}
              </Link>
              <Link href="/login" className="plausible-event-name=Open+demo inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-[var(--teal-deep)] transition-colors hover:bg-[var(--teal-soft)]">
                {c.open} <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
