'use client';

/**
 * Shared chrome for every /site page: design tokens + global site CSS,
 * floating pill nav (with a mobile menu), footer with internal links, and the
 * reveal / parallax hooks. The home page and the sub-pages (about, faq,
 * contact) all render inside <SiteShell>.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, Mail, MapPin, Menu, X, ChevronRight } from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { obfuscate } from './contact-enc';
import { ObfuscatedEmail } from './contact-links';

export const SATOSHI = "'Satoshi', var(--font-outfit), ui-sans-serif, sans-serif";
export const SCRIPT = "'Allura', 'Brush Script MT', cursive";

/* Reveal-on-scroll: elements tagged data-reveal fade up when they enter the
 * viewport. Under prefers-reduced-motion everything is shown at once. */
export function useReveal() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll<HTMLElement>('[data-reveal]').forEach(el => el.classList.add('site-in'));
      return;
    }
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add('site-in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 },
    );
    document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

/* Scroll parallax: each [data-parallax="speed"] element is offset by
 * (distance of its scope from the viewport centre) x speed. Positive speeds
 * lag behind the scroll (depth), negative ones float ahead. The scope is the
 * nearest [data-parallax-scope] (or the parent), never the moving element
 * itself, so the transform can't feed back into the measurement. Transforms
 * only, one rAF per scroll event, halved on phones, off under reduced motion. */
export function useParallax() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
    if (nodes.length === 0) return;
    const items = nodes.map(el => ({
      el,
      speed: parseFloat(el.dataset.parallax || '0'),
      scope: (el.closest('[data-parallax-scope]') as HTMLElement | null) ?? (el.parentElement as HTMLElement),
    }));
    let raf = 0;
    const tick = () => {
      raf = 0;
      const vh = window.innerHeight;
      const damp = window.innerWidth < 768 ? 0.5 : 1;
      for (const it of items) {
        const r = it.scope.getBoundingClientRect();
        if (r.bottom < -vh || r.top > vh * 2) continue;
        const progress = (r.top + r.height / 2 - vh / 2) / vh;
        const y = -progress * it.speed * 140 * damp;
        it.el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
}

export function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <span className="flex items-center gap-2.5" style={{ fontFamily: SATOSHI }}>
      <span className={`grid place-items-center rounded-lg bg-[var(--teal)] font-bold text-white ${small ? 'h-8 w-8 text-base' : 'h-9 w-9 text-lg'}`}>
        L
      </span>
      <span className="flex flex-col leading-tight">
        <span className={`font-bold tracking-tight ${small ? 'text-base' : 'text-lg'}`}>Lionheart</span>
        <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-[var(--muted)]">Appraisal</span>
      </span>
    </span>
  );
}

/** Section anchors on the home page; from sub-pages they resolve to /site#id. */
const HOME_LINKS: [string, string][] = [
  ['#how', 'How it works'],
  ['#screens', 'Screens'],
  ['#vehicle', 'The vehicle'],
  ['#field', 'Field app'],
  ['#workflow', 'Workflow'],
];
const HOME_LINKS_FR: [string, string][] = [
  ['#how', 'Comment ça marche'],
  ['#screens', 'Écrans'],
  ['#vehicle', 'Le véhicule'],
  ['#field', 'App terrain'],
  ['#workflow', 'Processus'],
];

export const SITE_PAGES: { href: string; label: string }[] = [
  { href: '/site/about', label: 'About' },
  { href: '/site/faq', label: 'FAQ' },
  { href: '/site/contact', label: 'Contact' },
];
// FR pages exist for home + FAQ; about/contact fall back to the EN pages.
const SITE_PAGES_FR: { href: string; label: string }[] = [
  { href: '/site/about', label: 'À propos' },
  { href: '/site/fr/faq', label: 'FAQ' },
  { href: '/site/contact', label: 'Contact' },
];

/** Locale of the current /site route, derived from the path prefix. */
export function useSiteLocale(): 'en' | 'fr' {
  const pathname = usePathname() ?? '';
  return pathname === '/site/fr' || pathname.startsWith('/site/fr/') ? 'fr' : 'en';
}

/** Counterpart URL in the other language (falls back to that language's home). */
function switchLocaleHref(pathname: string, to: 'en' | 'fr'): string {
  const pairs: [string, string][] = [
    ['/site', '/site/fr'],
    ['/site/faq', '/site/fr/faq'],
  ];
  for (const [en, fr] of pairs) {
    if (to === 'fr' && pathname === en) return fr;
    if (to === 'en' && pathname === fr) return en;
  }
  return to === 'fr' ? '/site/fr' : '/site';
}

const NAV_T = {
  en: { home: 'Lionheart Appraisal, home', demo: 'Open the demo', open: 'Open menu', close: 'Close menu', switchTo: 'Français', switchAria: 'Voir le site en français', explore: 'Explore', reach: 'Reach us', rights: 'All rights reserved. This site uses no tracking cookies.', crumbHome: 'Home' },
  fr: { home: 'Lionheart Appraisal, accueil', demo: 'Ouvrir la démo', open: 'Ouvrir le menu', close: 'Fermer le menu', switchTo: 'English', switchAria: 'View this site in English', explore: 'Explorer', reach: 'Nous joindre', rights: 'Tous droits réservés. Ce site n\'utilise aucun témoin de suivi.', crumbHome: 'Accueil' },
} as const;

// Footer-only links; kept out of the main nav.
export const LEGAL_PAGES: { href: string; label: string }[] = [
  { href: '/site/privacy', label: 'Privacy policy' },
  { href: '/site/terms', label: 'Terms of service' },
  { href: '/site/privacy#cookies', label: 'Cookie notice' },
];

export function SiteNav() {
  const pathname = usePathname() ?? '/site';
  const locale = useSiteLocale();
  const t = NAV_T[locale];
  const home = locale === 'fr' ? '/site/fr' : '/site';
  const onHome = pathname === home;
  const homeLinks = locale === 'fr' ? HOME_LINKS_FR : HOME_LINKS;
  const sitePages = locale === 'fr' ? SITE_PAGES_FR : SITE_PAGES;
  const other = locale === 'fr' ? 'en' : 'fr';
  const switchHref = switchLocaleHref(pathname, other);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const linkCls = 'transition-colors hover:text-[var(--ink)]';
  const homeHref = (hash: string) => (onHome ? hash : `${home}${hash}`);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-40 px-4">
      <nav
        aria-label="Main"
        className="pointer-events-auto mx-auto max-w-5xl rounded-[1.75rem] border border-white/70 bg-white/85 shadow-[0_10px_40px_-18px_oklch(0.3_0.06_195/.45)] backdrop-blur"
      >
        <div className="flex h-14 items-center justify-between pl-3 pr-2">
          <Link href={home} aria-label={t.home}>
            <Wordmark small />
          </Link>
          <div className="hidden items-center gap-5 text-[13.5px] font-medium text-[var(--muted)] lg:flex">
            {homeLinks.map(([hash, label]) => (
              <a key={hash} href={homeHref(hash)} className={linkCls}>
                {label}
              </a>
            ))}
            {sitePages.map(p => (
              <Link
                key={p.href}
                href={p.href}
                aria-current={pathname === p.href ? 'page' : undefined}
                className={`${linkCls} ${pathname === p.href ? 'text-[var(--ink)]' : ''}`}
              >
                {p.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={switchHref}
              hrefLang={other}
              lang={other}
              aria-label={t.switchAria}
              className="hidden h-10 items-center rounded-full px-3 text-[13px] font-semibold text-[var(--muted)] transition-colors hover:bg-[var(--teal-soft)] hover:text-[var(--ink)] sm:inline-flex"
            >
              {t.switchTo}
            </Link>
            <Link
              href="/login"
              className="plausible-event-name=Open+demo inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--ink)] px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-[var(--teal-deep)]"
            >
              {t.demo}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              aria-expanded={open}
              aria-controls="site-mobile-menu"
              aria-label={open ? t.close : t.open}
              className="grid h-10 w-10 place-items-center rounded-full text-[var(--ink)] transition-colors hover:bg-[var(--teal-soft)] lg:hidden"
            >
              {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </button>
          </div>
        </div>
        {open && (
          <div id="site-mobile-menu" className="border-t border-[var(--line)] px-4 pb-4 pt-2 lg:hidden">
            <ul className="grid gap-1 text-[15px] font-medium">
              {homeLinks.map(([hash, label]) => (
                <li key={hash}>
                  <a href={homeHref(hash)} onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2.5 hover:bg-[var(--teal-soft)]">
                    {label}
                  </a>
                </li>
              ))}
              <li aria-hidden className="my-1 border-t border-[var(--line)]" />
              {sitePages.map(p => (
                <li key={p.href}>
                  <Link href={p.href} className="block rounded-xl px-3 py-2.5 hover:bg-[var(--teal-soft)]">
                    {p.label}
                  </Link>
                </li>
              ))}
              <li aria-hidden className="my-1 border-t border-[var(--line)]" />
              <li>
                <Link href={switchHref} hrefLang={other} lang={other} className="block rounded-xl px-3 py-2.5 text-[var(--muted)] hover:bg-[var(--teal-soft)]">
                  {t.switchTo}
                </Link>
              </li>
            </ul>
          </div>
        )}
      </nav>
    </div>
  );
}

export function SiteFooter() {
  const companyTitle = BRAND.companyName.replace(/\b\w+/g, w => w.charAt(0) + w.slice(1).toLowerCase());
  const locale = useSiteLocale();
  const t = NAV_T[locale];
  const home = locale === 'fr' ? '/site/fr' : '/site';
  const homeLinks = locale === 'fr' ? HOME_LINKS_FR : HOME_LINKS;
  const sitePages = locale === 'fr' ? SITE_PAGES_FR : SITE_PAGES;
  return (
    <footer className="border-t border-[var(--line)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Wordmark small />
          <p className="mt-4 max-w-[38ch] text-[13.5px] leading-relaxed text-[var(--muted)]">{BRAND.appDescription}</p>
        </div>
        <nav aria-label="Site">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{t.explore}</p>
          <ul className="mt-3 space-y-2 text-[14px]">
            {homeLinks.map(([hash, label]) => (
              <li key={hash}>
                <a href={`${home}${hash}`} className="hover:text-[var(--teal-deep)] hover:underline">{label}</a>
              </li>
            ))}
            {sitePages.map(p => (
              <li key={p.href}>
                <Link href={p.href} className="hover:text-[var(--teal-deep)] hover:underline">{p.label}</Link>
              </li>
            ))}
            <li>
              <Link href="/login" className="plausible-event-name=Open+demo hover:text-[var(--teal-deep)] hover:underline">{t.demo}</Link>
            </li>
            <li>
              <Link href={locale === 'fr' ? '/site' : '/site/fr'} hrefLang={locale === 'fr' ? 'en' : 'fr'} className="hover:text-[var(--teal-deep)] hover:underline">
                {t.switchTo}
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{t.reach}</p>
          <ul className="mt-3 space-y-2 text-[14px]">
            <li>
              <ObfuscatedEmail enc={obfuscate(BRAND.companyEmail)} className="inline-flex items-center gap-1.5 hover:text-[var(--teal-deep)] hover:underline">
                <Mail className="h-3.5 w-3.5" aria-hidden />
              </ObfuscatedEmail>
            </li>
            <li className="flex items-start gap-1.5 text-[var(--muted)]">
              <MapPin className="mt-1 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{BRAND.companyAddressFooter}</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 text-[12.5px] text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© 2026 {companyTitle}. {t.rights}</p>
          <nav aria-label="Legal">
            <ul className="flex flex-wrap gap-x-5 gap-y-1">
              {LEGAL_PAGES.map(p => (
                <li key={p.href}>
                  <Link href={p.href} className="hover:text-[var(--teal-deep)] hover:underline">{p.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}

/** Visible breadcrumb for sub-pages; the matching BreadcrumbList JSON-LD is emitted by the server page. */
export function SiteBreadcrumb({ items }: { items: { href?: string; label: string }[] }) {
  const locale = useSiteLocale();
  return (
    <nav aria-label="Breadcrumb" className="text-[13px] text-[var(--muted)]">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href={locale === 'fr' ? '/site/fr' : '/site'} className="hover:text-[var(--ink)]">{NAV_T[locale].crumbHome}</Link>
        </li>
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <React.Fragment key={it.label}>
              <li aria-hidden><ChevronRight className="h-3.5 w-3.5" /></li>
              <li>
                {last || !it.href ? (
                  <span aria-current={last ? 'page' : undefined} className="font-medium text-[var(--ink)]">{it.label}</span>
                ) : (
                  <Link href={it.href} className="hover:text-[var(--ink)]">{it.label}</Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  useReveal();
  useParallax();
  return (
    <div
      className="min-h-screen bg-[var(--paper)] text-[var(--ink)] antialiased"
      style={
        {
          fontFamily: SATOSHI,
          '--paper': 'oklch(0.945 0.008 75)',
          '--paper-2': 'oklch(0.985 0.004 75)',
          '--ink': 'oklch(0.22 0.02 200)',
          '--muted': 'oklch(0.5 0.02 200)',
          '--line': 'oklch(0.87 0.01 75)',
          '--teal': 'oklch(0.48 0.1 190)',
          '--teal-deep': 'oklch(0.3 0.06 195)',
          '--teal-soft': 'oklch(0.9 0.04 190)',
          '--accent': 'oklch(0.66 0.19 45)',
        } as React.CSSProperties
      }
    >
      <style>{`
        [data-reveal] { opacity: 0; transform: translateY(22px); transition: opacity .8s cubic-bezier(.16,1,.3,1), transform .8s cubic-bezier(.16,1,.3,1); }
        [data-reveal].site-in { opacity: 1; transform: none; }
        [data-reveal-delay="1"] { transition-delay: .1s; } [data-reveal-delay="2"] { transition-delay: .2s; } [data-reveal-delay="3"] { transition-delay: .3s; }
        [data-parallax] { will-change: transform; }
        @media (prefers-reduced-motion: reduce) { [data-reveal] { transition: none; } }
        html { scroll-behavior: smooth; }
        .site-grain { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E"); }
        .site-dots { background-image: radial-gradient(oklch(0.62 0.02 200 / .45) 1.2px, transparent 1.3px); background-size: 18px 18px; }
        .site-car-hero { mix-blend-mode: multiply; filter: brightness(1.15); -webkit-mask-image: radial-gradient(ellipse 48% 52% at 60% 62%, #000 40%, transparent 92%); mask-image: radial-gradient(ellipse 48% 52% at 60% 62%, #000 40%, transparent 92%); }
        .site-car-side { mix-blend-mode: multiply; filter: brightness(1.22); -webkit-mask-image: radial-gradient(ellipse 50% 54% at 50% 57%, #000 36%, transparent 97%); mask-image: radial-gradient(ellipse 50% 54% at 50% 57%, #000 36%, transparent 97%); }
        .site-frame { box-shadow: 0 1px 2px oklch(0.3 0.06 195 / .08), 0 30px 70px -30px oklch(0.3 0.06 195 / .45); }
        .site-lift { transition: transform .35s cubic-bezier(.16,1,.3,1), box-shadow .35s cubic-bezier(.16,1,.3,1); }
        .site-lift:hover { transform: translateY(-5px); box-shadow: 0 28px 55px -26px oklch(0.3 0.06 195 / .5); }
        .site-screens { scrollbar-width: none; }
        .site-screens::-webkit-scrollbar { display: none; }
        .site-input { width: 100%; border-radius: 0.9rem; border: 1px solid var(--line); background: #fff; padding: 0.75rem 1rem; font-size: 15px; color: var(--ink); outline: none; transition: border-color .2s, box-shadow .2s; }
        .site-input:focus { border-color: var(--teal); box-shadow: 0 0 0 3px var(--teal-soft); }
        .site-input::placeholder { color: oklch(0.65 0.02 200); }
        @media (min-width: 1024px) {
          .site-callout::before { content: ''; position: absolute; top: 1.35rem; width: 2.5rem; height: 1px; background: var(--line); }
          .site-callout::after { content: ''; position: absolute; top: calc(1.35rem - 3px); width: 7px; height: 7px; border-radius: 999px; background: var(--accent); }
          .site-callout-l::before { right: -3rem; } .site-callout-l::after { right: -3rem; transform: translateX(50%); }
          .site-callout-r::before { left: -3rem; } .site-callout-r::after { left: -3rem; transform: translateX(-50%); }
        }
      `}</style>
      <SiteNav />
      {children}
      <SiteFooter />
    </div>
  );
}

/** Page header block shared by the sub-pages. */
export function SubpageHero({
  crumbs,
  eyebrow,
  title,
  accent,
  intro,
}: {
  crumbs: { href?: string; label: string }[];
  eyebrow: string;
  title: string;
  accent?: string;
  intro: string;
}) {
  return (
    <section className="relative overflow-hidden pt-32 sm:pt-40">
      <div aria-hidden className="site-grain pointer-events-none absolute inset-0 opacity-[.35] mix-blend-multiply" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SiteBreadcrumb items={crumbs} />
        <p data-reveal className="mt-8 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--teal-deep)]">{eyebrow}</p>
        <h1 data-reveal data-reveal-delay="1" className="mt-3 max-w-3xl text-[2.4rem] font-bold leading-[1.05] tracking-[-0.02em] sm:text-[3.6rem]">
          {title}
          {accent && (
            <>
              {' '}
              <span className="font-normal text-[var(--accent)]" style={{ fontFamily: SCRIPT, fontSize: '1.3em', lineHeight: 1, letterSpacing: 0 }}>
                {accent}
              </span>
            </>
          )}
        </h1>
        <p data-reveal data-reveal-delay="2" className="mt-6 max-w-2xl text-[17px] leading-relaxed text-[var(--muted)]">{intro}</p>
      </div>
    </section>
  );
}
