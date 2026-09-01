'use client';

/**
 * Profil — the visible home for everything that used to hide in the sidebar
 * footer (theme, density, shortcuts, bug report, sign-out) and the only
 * "settings" destination on phones.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { Keyboard, LifeBuoy, Monitor, Moon, Sun, Smartphone, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useShellUi } from '@/components/layout/shell-ui';
import { userInitials } from '@/components/layout/user-menu';
import { formatKeys } from '@/hooks/use-hotkeys';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';
import { applyDensity, readDensity, type Density } from '@/lib/density';

/** Top-level block: hairline header (icon + title), 24 px body (information-tab Section). */
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
  <Card variant="tonal" role="region" aria-label={title} className={cn('min-w-0', className)}>
    <header className="flex min-h-[48px] items-center gap-2 border-b border-hairline px-6 py-3">
      {icon && <span className="shrink-0 text-ink-3 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      <h2 className="t-heading truncate">{title}</h2>
    </header>
    <div className="px-6 py-5">{children}</div>
  </Card>
);

/** Preference row: label + helper on the left, the control on the right;
 *  rows separated by hairlines only. */
const PrefRow = ({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) => (
  <div className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
    <div className="min-w-0">
      <p className="t-body font-semibold">{label}</p>
      {help && <p className="t-caption mt-0.5">{help}</p>}
    </div>
    {children}
  </div>
);

/** Segmented control on the neutral ladder: track surface-2, selected
 *  segment = raised card with the light rim (Apple segmented control). The
 *  accent stays reserved for the page primary / focus ring. */
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
    <div role="radiogroup" aria-label={label} className="inline-flex h-10 items-center gap-0.5 rounded-md bg-surface-2 p-0.5">
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
  const router = useRouter();
  const { profile, signOut } = useCurrentUser();
  const { theme, setTheme } = useTheme();
  const { openShortcuts } = useShellUi();
  const [mounted, setMounted] = useState(false);
  const [density, setDensity] = useState<Density>('normal');
  const [ua, setUa] = useState('');

  useEffect(() => {
    setMounted(true);
    setDensity(readDensity());
    try {
      const n = navigator;
      const m = /(iPhone|iPad|Android|Windows|Macintosh|Linux)/.exec(n.userAgent)?.[1] ?? 'Appareil';
      setUa(`${m} · ${/Chrome\/(\d+)/.exec(n.userAgent) ? 'Chrome' : /Safari/.test(n.userAgent) ? 'Safari' : /Firefox/.test(n.userAgent) ? 'Firefox' : 'Navigateur'}`);
    } catch {
      setUa('');
    }
  }, []);

  const displayName = profile ? `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim() || 'Utilisateur' : 'Utilisateur';
  const themeValue = (mounted ? theme : 'system') as 'light' | 'dark' | 'system';
  const email = (profile as any)?.email as string | undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Profil" subtitle="Vos informations, vos préférences d'affichage et l'aide." />

      {/* Identity: name is the value, role as a quiet chip, email in mono. */}
      <Card variant="tonal" className="flex items-center gap-4 p-6">
        <Avatar className="h-14 w-14 shadow-rim">
          <AvatarFallback className="bg-surface-3 text-lg font-semibold text-ink">{userInitials(profile)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="t-title truncate">{displayName}</p>
            {profile?.role && (
              <span className="inline-flex h-5 items-center rounded-full bg-surface-3 px-2 text-[11px] font-medium text-ink-2">{profile.role}</span>
            )}
          </div>
          {email && <p className="t-mono mt-0.5 truncate text-ink-3">{email}</p>}
        </div>
      </Card>

      <Section title="Affichage" icon={<SlidersHorizontal />}>
        <div className="divide-y divide-hairline">
          <PrefRow label="Thème" help="« Système » suit le réglage de votre appareil. Appliqué à cet appareil.">
            <SegmentedChoice
              label="Thème"
              value={themeValue}
              onChange={(v) => setTheme(v)}
              options={[
                { value: 'light', label: 'Clair', icon: <Sun className="h-4 w-4" /> },
                { value: 'dark', label: 'Sombre', icon: <Moon className="h-4 w-4" /> },
                { value: 'system', label: 'Système', icon: <Monitor className="h-4 w-4" /> },
              ]}
            />
          </PrefRow>
          <PrefRow label="Densité des listes" help="Compact affiche plus de lignes par écran.">
            <SegmentedChoice
              label="Densité"
              value={density}
              onChange={(v) => {
                setDensity(v);
                applyDensity(v);
              }}
              options={[
                { value: 'normal', label: 'Normale' },
                { value: 'compact', label: 'Compacte' },
              ]}
            />
          </PrefRow>
        </div>
      </Section>

      <Section title="Aide" icon={<LifeBuoy />}>
        <div className="divide-y divide-hairline">
          <PrefRow label="Raccourcis clavier" help={`Recherche rapide ${formatKeys('mod+k').join(' ')} · Nouveau dossier C`}>
            <Button variant="outline" className="gap-2" onClick={openShortcuts}>
              <Keyboard className="h-4 w-4" />
              Voir les raccourcis
              <Kbd>?</Kbd>
            </Button>
          </PrefRow>
          <PrefRow label="Signaler un bug" help="Décrivez un problème, joignez une capture ou un message vocal.">
            <Button variant="outline" asChild>
              <Link href="/signaler-bug">Ouvrir le formulaire</Link>
            </Button>
          </PrefRow>
        </div>
      </Section>

      <Section title="Appareil" icon={<Smartphone />}>
        <PrefRow label={ua || 'Cet appareil'} help="Session en cours sur ce navigateur.">
          <Button
            variant="outline"
            onClick={async () => {
              await signOut();
              router.push('/login');
            }}
          >
            Déconnexion
          </Button>
        </PrefRow>
      </Section>
    </div>
  );
}
