'use client';

/**
 * « ⋯ » sheet of a phone ROOT page (mobile redesign 2026-09-14,
 * `Phone.dc.html` sheet `more`). The 2026-09-06 « Plus » tab and the avatar
 * menu are gone from the phone shell; what they carried lives here, after the
 * page's own secondary actions:
 *
 *   [page secondary actions…]
 *   Mode sombre / Mode clair
 *   Aide / Tutoriel            (roles with tutorials)
 *   Signaler un bug
 *   ─────────────
 *   Déconnexion                (destructive, last)
 *
 * Record pages keep their own « ⋯ » with the page's secondary actions only.
 */

import React, { useEffect, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { Bug, HelpCircle, LogOut, Moon, Sun } from 'lucide-react';
import { ActionSheet, type ActionItem } from '@/components/ui/action-sheet';
import { useVisibleNav } from '@/hooks/use-visible-nav';
import { useSignOut } from '@/components/layout/user-menu';
import { openTutorial } from '@/components/tutorial/tutorial-launcher';
import { tutorialsEnabledFor } from '@/lib/tutorial/access';
import { useT } from '@/i18n';

export interface RootMoreSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The page's own « ⋯ » rows, listed first. */
  pageActions?: ActionItem[];
}

export function RootMoreSheet({ open, onOpenChange, pageActions = [] }: RootMoreSheetProps) {
  const t = useT();
  const { role } = useVisibleNav();
  const signOut = useSignOut();
  const { theme, setTheme } = useTheme();
  // next-themes resolves client-side only; keep the label neutral until it does.
  const [themeMounted, setThemeMounted] = React.useState(false);
  useEffect(() => setThemeMounted(true), []);
  const isDark = themeMounted && theme === 'dark';

  const items = useMemo<ActionItem[]>(() => {
    const rows: ActionItem[] = [...pageActions.filter((a) => !a.hidden && !a.destructive)];
    rows.push({
      key: 'theme',
      label: isDark ? t('Mode clair') : t('Mode sombre'),
      icon: isDark ? <Sun /> : <Moon />,
      onSelect: () => setTheme(isDark ? 'light' : 'dark'),
    });
    if (tutorialsEnabledFor(role)) {
      rows.push({
        key: 'tutorial',
        label: t('Aide / Tutoriel'),
        icon: <HelpCircle />,
        // Let the sheet's exit start before the tour overlay mounts.
        onSelect: () => window.setTimeout(openTutorial, 220),
      });
    }
    rows.push({ key: 'bug', label: t('Signaler un bug'), icon: <Bug />, href: '/signaler-bug' });
    rows.push(...pageActions.filter((a) => !a.hidden && a.destructive));
    rows.push({ key: 'logout', label: t('Déconnexion'), icon: <LogOut />, destructive: true, onSelect: () => void signOut() });
    return rows;
  }, [pageActions, isDark, role, setTheme, signOut, t]);

  return <ActionSheet open={open} onOpenChange={onOpenChange} title={t('Actions')} items={items} />;
}

export default RootMoreSheet;
