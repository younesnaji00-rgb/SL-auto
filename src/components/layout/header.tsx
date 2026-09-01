'use client';

/**
 * Top bar — universal actions only (Atlassian split): location on the left,
 * search · create · rappels · account on the right. Page-specific actions live
 * in <PageHeader>, never here.
 */

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';
import Breadcrumb, { useCrumbs } from '@/components/breadcrumb';
import Notifications from '@/components/layout/notifications';
import UserMenu from '@/components/layout/user-menu';
import { useShellUi } from '@/components/layout/shell-ui';
import { formatKeys } from '@/hooks/use-hotkeys';

function SearchTrigger() {
  const { openPalette } = useShellUi();
  const keys = formatKeys('mod+k');
  return (
    <>
      <Button
        variant="outline"
        onClick={() => openPalette()}
        // Outline button (keeps the light rim — it is a button, not a field)
        // with the shortcut as a <Kbd> at the right end.
        className="hidden h-9 w-56 justify-between gap-2 px-3 text-sm font-normal text-ink-3 hover:text-ink md:flex lg:w-72"
        aria-label="Rechercher (palette de commandes)"
        title={`Rechercher — ${keys.join(' ')}`}
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4 text-ink-3" />
          Rechercher…
        </span>
        <Kbd>{keys.join(' ')}</Kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => openPalette()}
        className="h-9 w-9 text-ink-3 hover:text-ink md:hidden"
        aria-label="Rechercher"
      >
        <Search className="h-[18px] w-[18px]" />
      </Button>
    </>
  );
}

function QuickCreate() {
  const { openCreateDossier, canCreateDossier } = useShellUi();
  if (!canCreateDossier) return null;
  return (
    <Button onClick={openCreateDossier} className="h-9 gap-1.5 px-3" title="Nouveau dossier (C)">
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline">Nouveau</span>
    </Button>
  );
}

/** Mobile: a single "up one level" crumb (NN/g mobile breadcrumb guidance). */
function MobileUpCrumb() {
  const crumbs = useCrumbs();
  if (crumbs.length < 2) return null;
  const parent = crumbs[crumbs.length - 2];
  return (
    <Link
      href={parent.href}
      className="flex min-w-0 items-center gap-0.5 text-sm text-ink-3 hover:text-ink md:hidden"
    >
      <ChevronLeft className="h-4 w-4 shrink-0" />
      <span className="truncate">{parent.label}</span>
    </Link>
  );
}

const Header = () => {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 glass-bar border-b border-hairline px-3 md:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Link href="/" className="flex shrink-0 items-center lg:hidden" aria-label="Accueil">
          <img src="/images/logo.png" alt="" className="h-7 w-7 object-contain dark:invert" />
        </Link>
        <MobileUpCrumb />
        <div className="hidden min-w-0 md:block">
          <Breadcrumb />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
        <SearchTrigger />
        <QuickCreate />
        <Notifications />
        <UserMenu />
      </div>
    </header>
  );
};

export default Header;
