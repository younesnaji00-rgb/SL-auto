'use client';

/**
 * Avatar menu — profile identity, theme, shortcuts and sign-out in one
 * control (Attio / Slack pattern), so the sidebar footer stays a frame.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Keyboard, LogOut, Moon, Sun, Bug, UserRound } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useShellUi } from './shell-ui';
import { formatKeys } from '@/hooks/use-hotkeys';

export function userInitials(profile: { prenom?: string; nom?: string } | null | undefined): string {
  if (!profile) return 'U';
  const s = `${profile.prenom?.[0] ?? ''}${profile.nom?.[0] ?? ''}`.trim();
  return (s || profile.nom?.slice(0, 2) || 'U').toUpperCase();
}

export default function UserMenu() {
  const router = useRouter();
  const { profile, signOut } = useCurrentUser();
  const { theme, setTheme } = useTheme();
  const { openShortcuts } = useShellUi();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const displayName = profile ? `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim() || 'Utilisateur' : 'Utilisateur';
  const isDark = mounted && theme === 'dark';

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-2 rounded-full px-1 pr-2 text-sm font-medium hover:bg-muted"
          aria-label={`Compte : ${displayName}`}
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">{userInitials(profile)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[10rem] truncate lg:inline">{profile?.prenom || profile?.nom || ''}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-semibold">{displayName}</p>
          {profile?.role && <p className="truncate text-xs text-muted-foreground">{profile.role}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profil">
            <UserRound className="mr-2 h-4 w-4" />
            Mon profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setTheme(isDark ? 'light' : 'dark');
          }}
        >
          {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
          {isDark ? 'Mode clair' : 'Mode sombre'}
          <DropdownMenuShortcut>{formatKeys('shift+d').join('')}</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => openShortcuts()}>
          <Keyboard className="mr-2 h-4 w-4" />
          Raccourcis clavier
          <DropdownMenuShortcut>?</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/signaler-bug">
            <Bug className="mr-2 h-4 w-4" />
            Signaler un bug
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
