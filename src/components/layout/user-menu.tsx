'use client';

/**
 * Avatar menu — identity, theme, bug report and sign-out in one control
 * (Attio / Slack pattern). Profile access lives in the sidebar footer.
 */

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { LogOut, Moon, Sun, Bug } from 'lucide-react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useCurrentUser } from '@/hooks/use-current-user';

export function userInitials(profile: { prenom?: string; nom?: string } | null | undefined): string {
  if (!profile) return 'U';
  const s = `${profile.prenom?.[0] ?? ''}${profile.nom?.[0] ?? ''}`.trim();
  return (s || profile.nom?.slice(0, 2) || 'U').toUpperCase();
}

export default function UserMenu() {
  const router = useRouter();
  const { profile, signOut } = useCurrentUser();
  const { theme, setTheme } = useTheme();
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
          className="h-9 gap-2 rounded-full px-1 pr-2 text-sm font-medium text-ink hover:bg-surface-3"
          aria-label={`Compte : ${displayName}`}
        >
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-surface-4 text-[11px] font-semibold text-ink">{userInitials(profile)}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[10rem] truncate lg:inline">{profile?.prenom || profile?.nom || ''}</span>
        </Button>
      </DropdownMenuTrigger>
      {/* Menu rows: 13 px ink text, ink-2 icons (menu is already glass). */}
      <DropdownMenuContent align="end" className="w-64 [&_[role=menuitem]]:text-[13px] [&_[role=menuitem]_svg]:text-ink-2">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
          {profile?.role && <p className="t-caption truncate">{profile.role}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            setTheme(isDark ? 'light' : 'dark');
          }}
        >
          {isDark ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
          {isDark ? 'Mode clair' : 'Mode sombre'}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/signaler-bug">
            <Bug className="mr-2 h-4 w-4" />
            Signaler un bug
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleSignOut} className="text-status-danger-fg focus:text-status-danger-fg [&_svg]:!text-status-danger-fg">
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
