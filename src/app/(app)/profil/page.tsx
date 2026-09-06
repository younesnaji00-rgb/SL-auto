'use client';

/**
 * Profil — the visible home for everything that used to hide in the sidebar
 * footer (theme, density, bug report, sign-out) and the only "settings"
 * destination on phones.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { ChevronRight, LifeBuoy, LogOut, Monitor, Moon, Sun, Smartphone, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useCurrentUser } from '@/hooks/use-current-user';
import { userInitials } from '@/components/layout/user-menu';
import { IconChip } from '@/components/ui/icon-chip';
import { cn } from '@/lib/utils';
import { applyDensity, readDensity, type Density } from '@/lib/density';
import { useVisibleNav } from '@/hooks/use-visible-nav';
import { mobileBarFor } from '@/lib/nav-groups';
import { openTutorial } from '@/components/tutorial/tutorial-launcher';
import { tutorialsEnabledFor } from '@/lib/tutorial/access';
import { useT } from '@/i18n';

/**
 * Content card — element-specs §5 (Material 3 cards: container + one topic;
 * NN/g cards: "a few short, related pieces"): glass edge, hairline header
 * (icon + t-heading), 24 px body (`p-6` — 20 px is banned).
 */
const Section = ({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <Card role="region" aria-label={title} className={cn('min-w-0', className)}>
    <header className="flex min-h-[48px] items-center gap-2 border-b border-hairline px-6 py-3">
      {icon && <span className="shrink-0 text-ink-3 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      <h2 className="t-heading truncate">{title}</h2>
    </header>
    <div className="p-6">{children}</div>
  </Card>
);

/**
 * Preference row — Material 3 lists ("container and label text are
 * required"; supporting text "one to three lines"; trailing element = text,
 * icon button or selection control; "limit dividers to uncontained lists"):
 * label t-body 600, helper t-caption (may carry <Kbd> hints), the control at
 * the row end; rows separated by hairlines only, 16 px vertical padding.
 */
const PrefRow = ({ label, help, children }: { label: string; help?: React.ReactNode; children: React.ReactNode }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
    <div className="min-w-0">
      <p className="t-body font-semibold">{label}</p>
      {help && <p className="t-caption mt-0.5 flex flex-wrap items-center gap-x-1">{help}</p>}
    </div>
    {children}
  </div>
);

/**
 * Segmented control — element-specs §7 (Apple HIG segmented controls: 2–5
 * closely related, mutually exclusive choices; all-text or text+icon
 * consistently; selected state distinct): equal segments in a `surface-2`
 * track, selected = `bg-card shadow-rim text-ink`, 36 px segments, ≤ 2-word
 * labels. Teal stays reserved for the primary / focus ring.
 */
function SegmentedChoice<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string; icon?: React.ReactNode }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex h-10 items-center gap-0.5 rounded-md border border-hairline bg-surface-2 p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-[5px] px-3 text-sm transition-[color,background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'bg-card font-medium text-ink shadow-rim' : 'text-ink-2 hover:text-ink',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function ProfilPage() {
  const t = useT();
  const router = useRouter();
  const { profile, signOut } = useCurrentUser();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [density, setDensity] = useState<Density>('normal');
  const [ua, setUa] = useState('');
  // Destinations the phone bottom bar does not show (mobile pass): for roles
  // with ≤ 4 destinations there is no « Plus » tab, so this page is the only
  // place the rest can be reached from a phone.
  const { items, role } = useVisibleNav();
  const { bar, hasPlus } = mobileBarFor(items, role);
  const inBar = new Set(bar.map((i) => i.href));
  const phoneNav = hasPlus ? [] : items.filter((i) => !inBar.has(i.href) && i.href !== '/signaler-bug');
  const canUseTutorials = tutorialsEnabledFor(role);

  useEffect(() => {
    setMounted(true);
    setDensity(readDensity());
    try {
      const n = navigator;
      const m = /(iPhone|iPad|Android|Windows|Macintosh|Linux)/.exec(n.userAgent)?.[1] ?? t('Appareil');
      setUa(`${m} · ${/Chrome\/(\d+)/.exec(n.userAgent) ? 'Chrome' : /Safari/.test(n.userAgent) ? 'Safari' : /Firefox/.test(n.userAgent) ? 'Firefox' : t('Navigateur')}`);
    } catch {
      setUa('');
    }
  }, [t]);

  const displayName = profile ? `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim() || t('Utilisateur') : t('Utilisateur');
  const themeValue = (mounted ? theme : 'system') as 'light' | 'dark' | 'system';
  const email = (profile as any)?.email as string | undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Page header — element-specs §1: title only, no action (nothing on
          this page is the one thing to do next). */}
      <PageHeader title={t('Profil')} subtitle={t("Vos informations, vos préférences d'affichage et l'aide.")} />

      {/* Identity card — element-specs §5 + §10 (GOV.UK summary list / Refactoring
          UI: the name is the value, role a neutral chip §11, email t-mono quiet). */}
      <Card className="flex items-center gap-4 p-6">
        <Avatar className="h-14 w-14 shadow-rim">
          <AvatarFallback className="bg-surface-3 text-lg font-semibold text-ink">{userInitials(profile)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="t-title truncate">{displayName}</p>
            {profile?.role && <Badge variant="neutral">{t(profile.role)}</Badge>}
          </div>
          {email && <p className="t-mono mt-0.5 truncate text-ink-3">{email}</p>}
        </div>
      </Card>

      {/* Section anchor chip (neutral — terracotta = time, 2026-09-02) — addendum 1b: ONE IconChip on the anchoring
          section; the other section icons stay quiet ink-3. */}
      <Section title={t('Affichage')} icon={<IconChip><SlidersHorizontal /></IconChip>}>
        <div className="divide-y divide-hairline">
          <PrefRow label={t('Thème')} help={t('« Système » suit le réglage de votre appareil. Appliqué à cet appareil.')}>
            <SegmentedChoice
              label={t('Thème')}
              value={themeValue}
              onChange={(v) => setTheme(v)}
              options={[
                { value: 'light', label: t('Clair'), icon: <Sun className="h-4 w-4" /> },
                { value: 'dark', label: t('Sombre'), icon: <Moon className="h-4 w-4" /> },
                { value: 'system', label: t('Système'), icon: <Monitor className="h-4 w-4" /> },
              ]}
            />
          </PrefRow>
          <PrefRow label={t('Densité des listes')} help={t('Compact affiche plus de lignes par écran.')}>
            <SegmentedChoice
              label={t('Densité')}
              value={density}
              onChange={(v) => {
                setDensity(v);
                applyDensity(v);
              }}
              options={[
                { value: 'normal', label: t('Normale') },
                { value: 'compact', label: t('Compacte') },
              ]}
            />
          </PrefRow>
        </div>
      </Section>

      {/* PHONE NAVIGATION HUB (mobile pass 2026-09-06, mobile-synthesis §2).
          The bottom bar carries at most four destinations; for roles with no
          « Plus » tab this card is where the rest live, so Profil is a complete
          hub and nothing is unreachable from a phone. Hidden from `md` up,
          where the sidebar shows everything. */}
      {phoneNav.length > 0 && (
        <Card role="region" aria-label={t('Navigation')} className="min-w-0 overflow-hidden md:hidden">
          <header className="flex min-h-[48px] items-center gap-2 border-b border-hairline px-4 py-3">
            <h2 className="t-heading truncate">{t('Navigation')}</h2>
          </header>
          <ul>
            {phoneNav.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href} className="border-b border-hairline last:border-b-0">
                  <Link
                    href={item.href}
                    className="flex min-h-[56px] items-center gap-3 px-4 text-[15px] text-ink transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:bg-surface-2"
                  >
                    <Icon className="h-6 w-6 shrink-0 text-ink-2" strokeWidth={1.75} aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{t(item.label)}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-4" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Section title={t('Aide')} icon={<LifeBuoy />}>
        <div className="divide-y divide-hairline">
          {canUseTutorials && (
            <PrefRow label={t('Visite guidée')} help={t('Rejouer le tutoriel de la page où vous vous trouvez.')}>
              <Button variant="outline" onClick={openTutorial}>
                {t('Démarrer')}
              </Button>
            </PrefRow>
          )}
          <PrefRow label={t('Signaler un bug')} help={t('Décrivez un problème, joignez une capture ou un message vocal.')}>
            <Button variant="outline" asChild>
              <Link href="/signaler-bug">{t('Ouvrir le formulaire')}</Link>
            </Button>
          </PrefRow>
        </div>
      </Section>

      <Section title={t('Appareil')} icon={<Smartphone />}>
        <PrefRow label={ua || t('Cet appareil')} help={t('Session en cours sur ce navigateur.')}>
          {/* GOV.UK button: warning (destructive) buttons are for actions that
              "cannot be easily undone". Logging out is reversible → `outline`,
              with the LogOut icon restored from 3d5629a. */}
          <Button
            variant="outline"
            onClick={async () => {
              await signOut();
              router.push('/login');
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden />
            {t('Déconnexion')}
          </Button>
        </PrefRow>
      </Section>
    </div>
  );
}
