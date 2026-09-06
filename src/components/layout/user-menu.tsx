'use client';

/**
 * Avatar menu — identity, theme, bug report and sign-out in one control
 * (Attio / Slack pattern). Profile access lives in the sidebar footer on
 * desktop; on touch the menu is an `ActionSheet` (mobile-synthesis §3:
 * every dropdown renders as a sheet on coarse pointers) whose first row is
 * Profil, so the account is never more than one tap away on a phone.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { LogOut, Moon, Sun, Bug, UserRound } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ActionSheet, type ActionItem } from '@/components/ui/action-sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useIsCoarsePointer } from '@/hooks/use-viewport-class';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

export function userInitials(profile: { prenom?: string; nom?: string } | null | undefined): string {
  if (!profile) return 'U';
  const s = `${profile.prenom?.[0] ?? ''}${profile.nom?.[0] ?? ''}`.trim();
  return (s || profile.nom?.slice(0, 2) || 'U').toUpperCase();
}

/** The ONE sign-out path (avatar menu, Plus sheet, Profil): end the session, then the login page. */
export function useSignOut(): () => Promise<void> {
  const router = useRouter();
  const { signOut } = useCurrentUser();
  return useCallback(async () => {
    await signOut();
    router.push('/login');
  }, [signOut, router]);
}

export interface UserMenuProps {
  /** Phone top bar: 32 px avatar, no name. */
  compact?: boolean;
}

export default function UserMenu({ compact }: UserMenuProps) {
  const t = useT();
  const { profile } = useCurrentUser();
  const { theme, setTheme } = useTheme();
  const coarse = useIsCoarsePointer();
  const signOut = useSignOut();
  const [mounted, setMounted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  useEffect(() => setMounted(true), []);

  const displayName = profile ? `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim() || t('Utilisateur') : t('Utilisateur');
  const isDark = mounted && theme === 'dark';
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  const trigger = (
    <Button
      variant="ghost"
      className={cn(
        'gap-2 rounded-full text-sm font-medium text-ink hover:bg-surface-3',
        compact ? 'h-10 w-10 p-0' : 'h-9 px-1 pr-2',
      )}
      aria-label={`${t('Compte :')} ${displayName}`}
      data-tour="shell-user-menu"
      onClick={coarse ? () => setSheetOpen(true) : undefined}
      aria-haspopup={coarse ? 'dialog' : undefined}
      aria-expanded={coarse ? sheetOpen : undefined}
    >
      <Avatar className={compact ? 'h-8 w-8' : 'h-7 w-7'}>
        <AvatarFallback className="bg-surface-4 text-[11px] font-semibold text-ink">{userInitials(profile)}</AvatarFallback>
      </Avatar>
      {!compact && <span className="hidden max-w-[10rem] truncate lg:inline">{profile?.prenom || profile?.nom || ''}</span>}
    </Button>
  );

  if (coarse) {
    const items: ActionItem[] = [
      { key: 'profil', label: t('Profil'), icon: <UserRound />, href: '/profil' },
      { key: 'theme', label: isDark ? t('Mode clair') : t('Mode sombre'), icon: isDark ? <Sun /> : <Moon />, onSelect: toggleTheme },
      { key: 'signout', label: t('Déconnexion'), icon: <LogOut />, destructive: true, onSelect: () => void signOut() },
    ];
    return (
      <>
        {trigger}
        <ActionSheet
          open={sheetOpen}
          onOpenChange={setSheetOpen}
          title={displayName}
          description={profile?.role ? t(profile.role) : undefined}
          items={items}
        />
      </>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      {/* Menu rows: 13 px ink text, ink-2 icons (menu is already glass). */}
      <DropdownMenuContent align="end" className="w-64 [&_[role=menuitem]]:text-[13px] [&_[role=menuitem]_svg]:text-ink-2">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
          {profile?.role && <p className="t-caption truncate">{t(profile.role)}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            toggleTheme();
          }}
        >
          {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
          {isDark ? t('Mode clair') : t('Mode sombre')}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/signaler-bug">
            <Bug className="mr-2 h-4 w-4" />
            {t('Signaler un bug')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()} className="text-status-danger-fg focus:text-status-danger-fg [&_svg]:!text-status-danger-fg">
          <LogOut className="mr-2 h-4 w-4" />
          {t('Déconnexion')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
