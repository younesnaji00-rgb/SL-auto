'use client';

/**
 * Marketing site for the white-label DEMO brand (Lionheart Appraisal).
 * Served at /site; the root page redirects here for the demo brand.
 * Firm builds never link here and the page bounces to /login for them.
 *
 * Art direction: automotive-retail landing language (light warm-grey studio
 * hero, one script accent word, floating pill nav, car photography bleeding
 * off-frame with a floating file card, radiating callouts around the
 * top-view vehicle diagram, split contact banner). Scroll parallax on the
 * imagery layers; reveal-on-scroll on copy. Both respect reduced motion.
 *
 * Assets: public/site/hero-car.png + car-side.png (generated studio shots of
 * one consistent sedan), public/site/shots/*.png (real app screenshots).
 */

import React, { useEffect } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  ScanSearch,
  MapPin,
  FileSignature,
  BellRing,
  History,
  ShieldCheck,
  Languages,
  UserRoundCheck,
  ArrowRight,
  Camera,
  Gauge,
  ListChecks,
  GitBranch,
  FileText,
  Navigation,
  Mail,
  Layers,
  CarFront,
} from 'lucide-react';
import { BRAND } from '@/lib/brand';
import CarSvgTop from '@/components/car-svg-top';

const SATOSHI = "'Satoshi', var(--font-outfit), ui-sans-serif, sans-serif";
const SCRIPT = "'Allura', 'Brush Script MT', cursive";

/* Reveal-on-scroll: elements tagged data-reveal fade up when they enter the
 * viewport. Under prefers-reduced-motion everything is shown at once. */
function useReveal() {
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
function useParallax() {
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

type IconType = React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;

const STEPS: { icon: IconType; t: string; d: string }[] = [
  { icon: ScanSearch, t: 'Open the file', d: 'Drop the mission letter or insurer document. The AI reads it and fills the claim for you.' },
  { icon: Navigation, t: 'Send a field agent', d: 'Schedule the visit; the agent gets one-tap navigation and shoots the photo evidence on site.' },
  { icon: FileSignature, t: 'Estimate, agree, report', d: 'Build the estimate line by line, send the agreement, publish the expert report and the fee note.' },
];

const DESK: { icon: IconType; t: string; d: string }[] = [
  { icon: ScanSearch, t: 'AI document pre-fill', d: 'Mission letters, accident reports and insurer documents are read and mapped onto the file. No re-typing. The demo ships with a sample mission letter so you can watch it happen.' },
  { icon: BellRing, t: 'Reminders that close the loop', d: 'Send batched reminders on selected files, then replay exactly what the recipient changed, field by field.' },
  { icon: History, t: 'A complete audit trail', d: 'Every status, document and milestone is logged on the file. Open the history and read the story of the claim.' },
];

const SCREENS = [
  { img: '/site/shots/dashboard.png', tag: 'Dashboard', t: 'Files by status, recent changes, insurer split.' },
  { img: '/site/shots/dossiers.png', tag: 'File management', t: 'The whole caseload with live statuses and batch actions.' },
  { img: '/site/shots/dossier-detail.png', tag: 'The file', t: 'A seven-step timeline from mission to report.' },
  { img: '/site/shots/monitoring.png', tag: 'Monitoring', t: 'Ten checkpoints, on time versus overdue, by teammate.' },
];

const CALLOUTS_LEFT: { icon: IconType; t: string; d: string }[] = [
  { icon: CarFront, t: 'Points of impact', d: 'Mark the struck zones on this same diagram.' },
  { icon: Camera, t: 'Photos by phase', d: 'Before, during and after the repair.' },
  { icon: Gauge, t: 'VIN and odometer', d: 'Captured on site, stored on the file.' },
];
const CALLOUTS_RIGHT: { icon: IconType; t: string; d: string }[] = [
  { icon: ListChecks, t: 'Line-by-line estimate', d: 'Parts, labour, paint, tax rules.' },
  { icon: GitBranch, t: 'Agreement revisions', d: 'First, second, third, counter-proposals.' },
  { icon: FileText, t: 'Expert report', d: 'Generated from the file, with the fee note.' },
];

const WORKFLOW = [
  { t: 'Mission', d: 'Import the document, AI pre-fill.' },
  { t: 'Visit before', d: 'Dispatch a field agent.' },
  { t: 'Agreement', d: 'Estimate, send to the garage.' },
  { t: 'Visit during', d: 'Mid-repair photo evidence.' },
  { t: 'Revisions', d: 'New damage, new agreement.' },
  { t: 'Visit after', d: 'Confirm the repair matches.' },
  { t: 'Report', d: 'Expert report and fee note.' },
];

const TRUST: { icon: IconType; t: string; d: string }[] = [
  { icon: ShieldCheck, t: 'Isolated deployment', d: 'Each firm runs on its own dedicated cloud project. Your data never shares a database with anyone.' },
  { icon: UserRoundCheck, t: 'Role-based access', d: 'Admins, managers, estimators and field agents each see exactly what their job needs.' },
  { icon: History, t: 'Complete audit history', d: 'Statuses, documents and edits are logged per file, with session-level replay of changes.' },
  { icon: Languages, t: 'Bilingual by design', d: 'English and French side by side: every screen, every report, per-user preference.' },
];

const FIELD_CHIPS: [IconType, string][] = [
  [MapPin, 'One-tap navigation'],
  [Camera, 'Camera-first capture'],
  [Layers, 'Before, during, after'],
  [FileText, 'Documents collected on site'],
  [ListChecks, 'Overdue, today, upcoming'],
];

export default function SitePage() {
  // Marketing site belongs to the demo brand only.
  if (BRAND.id !== 'demo') redirect('/login');
  return <Site />;
}

function Wordmark({ small = false }: { small?: boolean }) {
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

function Site() {
  useReveal();
  useParallax();

  const companyTitle = BRAND.companyName.replace(/\b\w+/g, w => w.charAt(0) + w.slice(1).toLowerCase());

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
        @media (min-width: 1024px) {
          .site-callout::before { content: ''; position: absolute; top: 1.35rem; width: 2.5rem; height: 1px; background: var(--line); }
          .site-callout::after { content: ''; position: absolute; top: calc(1.35rem - 3px); width: 7px; height: 7px; border-radius: 999px; background: var(--accent); }
          .site-callout-l::before { right: -3rem; } .site-callout-l::after { right: -3rem; transform: translateX(50%); }
          .site-callout-r::before { left: -3rem; } .site-callout-r::after { left: -3rem; transform: translateX(-50%); }
        }
      `}</style>

      {/* Floating pill nav */}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-40 px-4">
        <nav
          aria-label="Main"
          className="pointer-events-auto mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full border border-white/70 bg-white/85 pl-3 pr-2 shadow-[0_10px_40px_-18px_oklch(0.3_0.06_195/.45)] backdrop-blur"
        >
          <a href="#top" aria-label="Lionheart Appraisal, back to top">
            <Wordmark small />
          </a>
          <div className="hidden items-center gap-6 text-[13.5px] font-medium text-[var(--muted)] md:flex">
            <a href="#how" className="transition-colors hover:text-[var(--ink)]">How it works</a>
            <a href="#screens" className="transition-colors hover:text-[var(--ink)]">Screens</a>
            <a href="#vehicle" className="transition-colors hover:text-[var(--ink)]">The vehicle</a>
            <a href="#field" className="transition-colors hover:text-[var(--ink)]">Field app</a>
            <a href="#workflow" className="transition-colors hover:text-[var(--ink)]">Workflow</a>
          </div>
          <Link
            href="/login"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[var(--ink)] px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-[var(--teal-deep)]"
          >
            Open the demo
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </nav>
      </div>

      <main id="top">
        {/* Hero */}
        <section data-parallax-scope className="relative overflow-hidden pt-32 sm:pt-40">
          <div aria-hidden className="site-grain pointer-events-none absolute inset-0 opacity-[.35] mix-blend-multiply" />
          <div aria-hidden className="site-dots pointer-events-none absolute right-[-2rem] top-24 h-56 w-72 opacity-70 [mask-image:radial-gradient(closest-side,#000,transparent)]" />
          <div aria-hidden data-parallax="0.35" className="pointer-events-none absolute -left-40 bottom-[-14rem] h-[30rem] w-[30rem] rounded-full bg-[var(--teal-soft)] opacity-70" />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
            <h1
              data-reveal
              className="mx-auto max-w-4xl text-center text-[2.6rem] font-bold leading-[1.02] tracking-[-0.02em] sm:text-[4.2rem] lg:text-[5rem]"
            >
              Every claim closed{' '}
              <span className="font-normal text-[var(--accent)]" style={{ fontFamily: SCRIPT, fontSize: '1.34em', lineHeight: 1, letterSpacing: 0 }}>
                on time,
              </span>
              <br className="hidden sm:block" /> without the chasing.
            </h1>
            <p data-reveal data-reveal-delay="1" className="mx-auto mt-6 max-w-xl text-center text-[17px] leading-relaxed text-[var(--muted)]">
              Re-typed mission letters. Photos buried in a WhatsApp thread. A second estimate nobody
              logged. An insurer asking where the report is. Lionheart keeps every claim in one file,
              so nothing gets chased twice.
            </p>

            {/* Role bar: the demo login is a one-click role pick */}
            <div data-reveal data-reveal-delay="2" className="mx-auto mt-9 flex max-w-2xl flex-wrap items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-white/80 p-1.5 shadow-[0_18px_50px_-30px_oklch(0.3_0.06_195/.5)] backdrop-blur sm:flex-nowrap sm:justify-between sm:pl-4">
              <span className="hidden text-[13px] font-medium text-[var(--muted)] sm:block">Try it as</span>
              <div className="flex flex-wrap items-center justify-center gap-1">
                {['Admin', 'Manager', 'Estimator', 'Field agent'].map(r => (
                  <Link
                    key={r}
                    href="/login"
                    className="rounded-full px-3.5 py-2 text-[13.5px] font-medium text-[var(--ink)] transition-colors hover:bg-[var(--teal-soft)]"
                  >
                    {r}
                  </Link>
                ))}
              </div>
              <Link
                href="/login"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--teal)] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[var(--teal-deep)]"
              >
                Open the live demo
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <p data-reveal data-reveal-delay="3" className="mt-4 text-center text-[13px] text-[var(--muted)]">
              No account, no credit card. Pick a role and walk through a real claim.
            </p>
          </div>

          {/* Car + floating file card */}
          <div className="relative mx-auto mt-6 max-w-7xl sm:mt-2">
            <div data-parallax="0.22" className="relative ml-auto w-[150%] max-w-none sm:w-[112%] lg:w-[92%] lg:translate-x-[8%]">
              <img
                src="/site/hero-car.png"
                alt="Silver sedan in a studio, the kind of vehicle an appraisal file is opened for"
                width={1376}
                height={768}
                className="site-car-hero block w-full"
                fetchPriority="high"
              />
            </div>
            <div
              data-parallax="-0.16"
              className="absolute bottom-6 left-4 w-[calc(100%-2rem)] max-w-[380px] rounded-2xl border border-white/80 bg-white/95 p-3 shadow-[0_30px_70px_-25px_oklch(0.3_0.06_195/.55)] backdrop-blur sm:bottom-10 sm:left-auto sm:right-8 lg:right-[14%]"
            >
              <div className="flex gap-3">
                <img
                  src="/site/car-side.png"
                  alt=""
                  aria-hidden
                  width={1376}
                  height={768}
                  className="h-24 w-28 shrink-0 rounded-xl object-cover object-center"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[13.5px] font-bold">File APR-2026-0102</p>
                    <span className="rounded-full bg-[var(--teal-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--teal-deep)]">Step 3 of 7</span>
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-[var(--muted)]">Silver sedan, front-right collision</p>
                  <dl className="mt-2.5 grid grid-cols-3 gap-2">
                    {[
                      ['$4,250', 'Estimate'],
                      ['24', 'Photos'],
                      ['2', 'Visits'],
                    ].map(([v, l]) => (
                      <div key={l}>
                        <dt className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">{l}</dt>
                        <dd className="text-[14px] font-bold tabular-nums">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
              <Link href="/login" className="mt-3 flex items-center justify-end gap-1 text-[12.5px] font-semibold text-[var(--teal-deep)] hover:underline">
                Open this file in the demo <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-24 bg-[var(--paper-2)] py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 data-reveal className="max-w-2xl text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.1]">
              Open the file, send the agent, publish the report.
            </h2>
            <div className="relative mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
              <div aria-hidden className="absolute left-[16.6%] right-[16.6%] top-7 hidden border-t border-dashed border-[var(--line)] md:block" />
              {STEPS.map((s, i) => (
                <div key={s.t} data-reveal data-reveal-delay={String(i + 1)} className="relative">
                  <span className="relative grid h-14 w-14 place-items-center rounded-full bg-[var(--teal-soft)] text-[var(--teal-deep)]">
                    <s.icon className="h-6 w-6" aria-hidden />
                    <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-[var(--accent)] text-[11px] font-bold text-white">
                      {i + 1}
                    </span>
                  </span>
                  <h3 className="mt-5 text-xl font-bold tracking-tight">{s.t}</h3>
                  <p className="mt-2 max-w-[34ch] text-[15px] leading-relaxed text-[var(--muted)]">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The desk: side car + numbered list */}
        <section id="desk" data-parallax-scope className="relative overflow-hidden py-16 sm:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:gap-6">
            <div className="relative lg:-ml-24">
              <div data-parallax="0.18">
                <img
                  src="/site/car-side.png"
                  alt="Side profile of the same silver sedan"
                  width={1376}
                  height={768}
                  loading="lazy"
                  className="site-car-side block w-full"
                />
              </div>
            </div>
            <div>
              <h2 data-reveal className="text-3xl font-bold tracking-tight sm:text-[2.4rem] sm:leading-[1.1]">
                Nothing re-typed, nothing lost, nothing forgotten.
              </h2>
              <ul className="mt-8 divide-y divide-[var(--line)]">
                {DESK.map((f, i) => (
                  <li key={f.t} data-reveal data-reveal-delay={String(i + 1)} className="flex gap-5 py-6 first:pt-0">
                    <span className="mt-0.5 text-[13px] font-bold tabular-nums text-[var(--accent)]">0{i + 1}</span>
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-white text-[var(--teal-deep)]">
                      <f.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <h3 className="text-[17px] font-bold tracking-tight">{f.t}</h3>
                      <p className="mt-1.5 max-w-[42ch] text-[14.5px] leading-relaxed text-[var(--muted)]">{f.d}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Screens */}
        <section id="screens" className="scroll-mt-24 bg-[var(--paper-2)] py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 data-reveal className="max-w-xl text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.1]">
                This is the real product, not a mock-up.
              </h2>
              <p data-reveal data-reveal-delay="1" className="max-w-sm text-[14.5px] leading-relaxed text-[var(--muted)]">
                Nothing staged: every screenshot is captured from the demo you can open right now.
              </p>
            </div>
          </div>
          <div className="site-screens mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:px-6 lg:px-[max(1.5rem,calc((100vw-72rem)/2))]">
            {SCREENS.map((s, i) => (
              <article
                key={s.tag}
                data-reveal
                data-reveal-delay={String(Math.min(i, 3))}
                className="site-lift w-[82vw] shrink-0 snap-start overflow-hidden rounded-2xl border border-[var(--line)] bg-white sm:w-[420px]"
              >
                <div className="aspect-[8/5] overflow-hidden border-b border-[var(--line)] bg-[var(--paper)]">
                  <img src={s.img} alt={`${s.tag} screen of Lionheart Appraisal`} width={3200} height={2000} loading="lazy" className="block h-full w-full object-cover object-top" />
                </div>
                <div className="flex items-start justify-between gap-3 p-4">
                  <div>
                    <p className="text-[15px] font-bold tracking-tight">{s.tag}</p>
                    <p className="mt-0.5 text-[13px] leading-snug text-[var(--muted)]">{s.t}</p>
                  </div>
                  <Link href="/login" aria-label={`Open the ${s.tag} screen in the demo`} className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--teal)] text-white transition-colors hover:bg-[var(--teal-deep)]">
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div data-parallax-scope className="mx-auto mt-20 grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.35fr]">
            <div>
              <h3 data-reveal className="text-2xl font-bold tracking-tight sm:text-3xl">One file, one timeline.</h3>
              <ul className="mt-6 space-y-4">
                {[
                  'Seven steps from mission creation to final report, always visible.',
                  'Documents, photos, estimates and agreements sit in the step they belong to.',
                  'Compare an imported document side by side with the filled form.',
                ].map((p, i) => (
                  <li key={p} data-reveal data-reveal-delay={String(i + 1)} className="flex items-start gap-3 text-[15px] leading-relaxed text-[var(--muted)]">
                    <Layers className="mt-1 h-4 w-4 shrink-0 text-[var(--teal)]" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div data-reveal>
              <div data-parallax="0.12" className="site-frame overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
                <img src="/site/shots/dossier-detail.png" alt="Claim file detail with its seven-step timeline" width={3200} height={2000} loading="lazy" className="block w-full" />
              </div>
            </div>
          </div>
        </section>

        {/* The vehicle: radiating callouts */}
        <section id="vehicle" data-parallax-scope className="relative scroll-mt-24 overflow-hidden py-20 sm:py-28">
          <div aria-hidden className="site-dots pointer-events-none absolute left-[-3rem] top-10 h-64 w-64 opacity-60 [mask-image:radial-gradient(closest-side,#000,transparent)]" />
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 data-reveal className="mx-auto max-w-2xl text-center text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.1]">
              Every angle of the vehicle, on the record.
            </h2>
            <p data-reveal data-reveal-delay="1" className="mx-auto mt-4 max-w-lg text-center text-[15px] leading-relaxed text-[var(--muted)]">
              The diagram below is the one your estimators use in the product to mark the points of impact.
            </p>

            <div className="mt-14 grid items-center gap-10 lg:grid-cols-[1fr_auto_1fr] lg:gap-0">
              <ul className="space-y-8 lg:space-y-16 lg:pr-14">
                {CALLOUTS_LEFT.map((c, i) => (
                  <li key={c.t} data-reveal data-reveal-delay={String(i + 1)} className="site-callout site-callout-l relative flex items-start gap-4 lg:flex-row-reverse lg:text-right">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-white text-[var(--teal-deep)]">
                      <c.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-[15.5px] font-bold tracking-tight">{c.t}</p>
                      <p className="mt-1 text-[13.5px] leading-snug text-[var(--muted)]">{c.d}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div data-parallax="0.14" className="mx-auto w-[240px] sm:w-[280px]">
                <div className="rounded-[2.5rem] bg-white/70 p-6 shadow-[0_40px_80px_-40px_oklch(0.3_0.06_195/.5)] ring-1 ring-[var(--line)]">
                  <CarSvgTop zones={{}} onToggleZone={() => {}} className="pointer-events-none" />
                </div>
              </div>
              <ul className="space-y-8 lg:space-y-16 lg:pl-14">
                {CALLOUTS_RIGHT.map((c, i) => (
                  <li key={c.t} data-reveal data-reveal-delay={String(i + 1)} className="site-callout site-callout-r relative flex items-start gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-white text-[var(--teal-deep)]">
                      <c.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <p className="text-[15.5px] font-bold tracking-tight">{c.t}</p>
                      <p className="mt-1 text-[13.5px] leading-snug text-[var(--muted)]">{c.d}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Field app */}
        <section id="field" data-parallax-scope className="scroll-mt-24 bg-[var(--paper-2)] py-20 sm:py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <h2 data-reveal className="text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.1]">
                Photos come from the phone, not from WhatsApp.
              </h2>
              <p data-reveal data-reveal-delay="1" className="mt-5 max-w-[52ch] text-[16px] leading-relaxed text-[var(--muted)]">
                Field agents open the day&apos;s missions, tap once to navigate to the garage, and shoot the
                photo evidence straight from the camera, sorted into before, during and after the repair.
              </p>
              <div data-reveal data-reveal-delay="2" className="mt-7 flex flex-wrap gap-2">
                {FIELD_CHIPS.map(([Icon, label]) => (
                  <span key={label} className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white px-3.5 py-2 text-[13px] font-medium">
                    <Icon className="h-4 w-4 text-[var(--teal)]" aria-hidden />
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div data-reveal className="mx-auto w-full max-w-[330px]">
              <div data-parallax="0.2" className="site-frame overflow-hidden rounded-[2.4rem] border-[6px] border-[var(--ink)] bg-[var(--ink)]">
                <img src="/site/shots/mobile-missions.png" alt="Field agent mobile view listing the day's missions" width={860} height={1800} loading="lazy" className="block w-full rounded-[2rem]" />
              </div>
            </div>
          </div>
        </section>

        {/* Workflow band */}
        <section id="workflow" className="scroll-mt-24 bg-[var(--teal-deep)] py-20 text-white sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <h2 data-reveal className="max-w-xl text-3xl font-bold tracking-tight text-white sm:text-[2.6rem] sm:leading-[1.1]">
                Seven steps, the same on every file.
              </h2>
              <p data-reveal data-reveal-delay="1" className="max-w-sm text-[14.5px] leading-[1.7] text-white/70">
                The same seven steps as the file timeline, so nothing gets skipped and everyone knows what comes next.
              </p>
            </div>
            <ol className="relative mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-7 lg:gap-4">
              <div aria-hidden className="absolute left-4 right-4 top-4 hidden border-t border-white/20 lg:block" />
              {WORKFLOW.map((w, i) => (
                <li key={w.t} data-reveal data-reveal-delay={String(Math.min(i % 4, 3))} className="relative">
                  <span className="relative z-10 grid h-8 w-8 place-items-center rounded-full bg-white text-[13px] font-bold text-[var(--teal-deep)]">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-[15px] font-bold tracking-tight text-white">{w.t}</h3>
                  <p className="mt-1 text-[13px] leading-[1.6] text-white/70">{w.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Split contact banner */}
        <section className="py-20 sm:py-28">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 data-reveal className="mx-auto max-w-2xl text-center text-3xl font-bold tracking-tight sm:text-[2.6rem] sm:leading-[1.1]">
              Walk a real claim in{' '}
              <span className="whitespace-nowrap font-normal text-[var(--accent)]" style={{ fontFamily: SCRIPT, fontSize: '1.3em', lineHeight: 1 }}>
                ten minutes,
              </span>{' '}
              without an account.
            </h2>
            <div data-reveal data-reveal-delay="1" className="relative mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2 md:gap-0">
              <div className="rounded-3xl bg-[var(--teal)] p-8 text-white md:rounded-r-none md:pr-14">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/70">Live demo</p>
                <p className="mt-2 text-2xl font-bold tracking-tight">Pick a role, open a file</p>
                <p className="mt-2 max-w-[38ch] text-[14.5px] leading-relaxed text-white/80">
                  Sample Canadian files, a guided walkthrough, nothing to install. If it does not feel like your desk, close the tab.
                </p>
                <Link href="/login" className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-[14px] font-semibold text-[var(--teal-deep)] transition-colors hover:bg-[var(--teal-soft)]">
                  Pick a role and start
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
              <div className="rounded-3xl bg-[var(--teal-deep)] p-8 text-white md:rounded-l-none md:pl-14">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-white/70">In those ten minutes</p>
                <ol className="mt-4 space-y-3 text-[14.5px] leading-relaxed text-white/85">
                  {[
                    "Drop the sample mission letter and watch the file fill itself.",
                    "Dispatch a field agent and see the mission land on the phone view.",
                    "Build the estimate, send the agreement, log the revision.",
                    "Publish the expert report and the fee note. File closed.",
                  ].map((t, i) => (
                    <li key={t} className="flex gap-3">
                      <span className="mt-0.5 text-[12px] font-bold tabular-nums text-white/60">0{i + 1}</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* Trust */}
        <section id="security" className="scroll-mt-24 border-t border-[var(--line)] bg-[var(--paper-2)] py-20 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_2fr]">
            <h2 data-reveal className="text-3xl font-bold tracking-tight sm:text-[2.4rem] sm:leading-[1.1]">
              Your files stay yours.
            </h2>
            <dl className="grid gap-x-10 sm:grid-cols-2">
              {TRUST.map((t, i) => (
                <div key={t.t} data-reveal data-reveal-delay={String((i % 2) + 1)} className="border-t border-[var(--line)] py-6">
                  <dt className="flex items-center gap-2.5 text-[16px] font-bold tracking-tight">
                    <t.icon className="h-5 w-5 text-[var(--teal)]" aria-hidden />
                    {t.t}
                  </dt>
                  <dd className="mt-2 max-w-[40ch] text-[14.5px] leading-relaxed text-[var(--muted)]">{t.d}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--line)]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-4 py-10 sm:flex-row sm:px-6">
          <Wordmark small />
          <a href={`mailto:${BRAND.companyEmail}`} className="inline-flex items-center gap-1.5 text-[13px] text-[var(--muted)] hover:text-[var(--ink)]">
            <Mail className="h-3.5 w-3.5" aria-hidden /> {BRAND.companyEmail}
          </a>
          <p className="text-[13px] text-[var(--muted)]">© 2026 {companyTitle}</p>
        </div>
      </footer>
    </div>
  );
}
