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
import { Keyboard, LifeBuoy, LogOut, Monitor, Moon, Sun, Smartphone, SlidersHorizontal } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useShellUi } from '@/components/layout/shell-ui';
import { userInitials } from '@/components/layout/user-menu';
import { formatKeys } from '@/hooks/use-hotkeys';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';
import { applyDensity, readDensity, type Density } from '@/lib/density';

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
      {/* Page header — element-specs §1: title only, no action (nothing on
          this page is the one thing to do next). */}
      <PageHeader title="Profil" subtitle="Vos informations, vos préférences d'affichage et l'aide." />

      {/* Identity card — element-specs §5 + §10 (GOV.UK summary list / Refactoring
          UI: the name is the value, role a neutral chip §11, email t-mono quiet). */}
      <Card className="flex items-center gap-4 p-6">
        <Avatar className="h-14 w-14 shadow-rim">
          <AvatarFallback className="bg-surface-3 text-lg font-semibold text-ink">{userInitials(profile)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <p className="t-title truncate">{displayName}</p>
            {profile?.role && <Badge variant="neutral">{profile.role}</Badge>}
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
          {/* Keyboard hints as <Kbd> keycaps (restored from 3d5629a). */}
          <PrefRow
            label="Raccourcis clavier"
            help={
              <>
                <span>Recherche rapide</span>
                <Kbd>{formatKeys('mod+k').join(' ')}</Kbd>
                <span>· Nouveau dossier</span>
                <Kbd>C</Kbd>
              </>
            }
          >
            {/* Buttons — element-specs §8: `outline` for a secondary action,
                leading 16 px icon, verb + noun label. */}
            <Button variant="outline" onClick={openShortcuts}>
              <Keyboard className="h-4 w-4" aria-hidden />
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
            Déconnexion
          </Button>
        </PrefRow>
      </Section>
    </div>
  );
}
