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
import { Bug, Keyboard, LogOut, Monitor, Moon, Sun, Smartphone } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useShellUi } from '@/components/layout/shell-ui';
import { userInitials } from '@/components/layout/user-menu';
import { formatKeys } from '@/hooks/use-hotkeys';
import { Kbd } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';
import { applyDensity, readDensity, type Density } from '@/lib/density';

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
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border bg-background p-0.5">
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
              'inline-flex h-9 items-center gap-1.5 rounded-[5px] px-3 text-sm transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'text-ink-2 hover:bg-surface-3 hover:text-ink',
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Profil" subtitle="Vos informations, vos préférences d'affichage et l'aide." />

      <Card>
        <CardContent className="flex items-center gap-4 pt-6">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-ink-solid text-lg font-semibold text-on-ink">{userInitials(profile)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{displayName}</p>
            {profile?.role && <p className="text-sm text-muted-foreground">{profile.role}</p>}
            {(profile as any)?.email && <p className="truncate text-sm text-muted-foreground">{(profile as any).email}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Affichage</CardTitle>
          <CardDescription>Appliqué à cet appareil.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Thème</p>
              <p className="text-xs text-muted-foreground">« Système » suit le réglage de votre appareil.</p>
            </div>
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
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Densité des listes</p>
              <p className="text-xs text-muted-foreground">Compact affiche plus de lignes par écran.</p>
            </div>
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Aide</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={openShortcuts}>
            <Keyboard className="h-4 w-4" />
            Raccourcis clavier
            <Kbd>?</Kbd>
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <Link href="/signaler-bug">
              <Bug className="h-4 w-4" />
              Signaler un bug
            </Link>
          </Button>
          <p className="basis-full text-xs text-muted-foreground">
            Recherche rapide : <Kbd>{formatKeys('mod+k').join(' ')}</Kbd> · Nouveau dossier : <Kbd>C</Kbd>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appareil</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Smartphone className="h-4 w-4" />
            {ua || 'Cet appareil'}
          </p>
          <Button
            variant="outline"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={async () => {
              await signOut();
              router.push('/login');
            }}
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
