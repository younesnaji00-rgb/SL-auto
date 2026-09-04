'use client';

/**
 * Top bar — universal actions only (Atlassian split): location on the left,
 * create · rappels · account on the right. Page-specific actions live in
 * <PageHeader>, never here.
 */

import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Breadcrumb, { useCrumbs } from '@/components/breadcrumb';
import Logo from '@/components/logo';
import Notifications from '@/components/layout/notifications';
import UserMenu from '@/components/layout/user-menu';
import { useShellUi } from '@/components/layout/shell-ui';
import { useT } from '@/i18n';

function QuickCreate() {
  const t = useT();
  const { openCreateDossier, canCreateDossier } = useShellUi();
  if (!canCreateDossier) return null;
  return (
    <Button onClick={openCreateDossier} className="h-9 gap-1.5 px-3" title={t('Nouveau dossier')}>
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline">{t('Nouveau')}</span>
    </Button>
  );
}

/** Mobile: a single "up one level" crumb (NN/g mobile breadcrumb guidance). */
function MobileUpCrumb() {
  const t = useT();
  const crumbs = useCrumbs();
  if (crumbs.length < 2) return null;
  const parent = crumbs[crumbs.length - 2];
  return (
    <Link
      href={parent.href}
      className="flex min-w-0 items-center gap-0.5 text-sm text-ink-3 hover:text-ink md:hidden"
    >
      <ChevronLeft className="h-4 w-4 shrink-0" />
      {/* Crumb labels are French route keys — <Breadcrumb> translates them the
          same way (see components/breadcrumb.tsx). */}
      <span className="truncate">{t(parent.label)}</span>
    </Link>
  );
}

const Header = () => {
  const t = useT();
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 glass-bar border-b border-hairline px-3 md:px-5">
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {/* Below `lg` the sidebar is gone, so this is the ONLY logo on screen.
            It must come from the brand config like the sidebar's does — it
            used to hardcode the firm's /images/logo.png, which is why the
            white-label demo showed the SL-auto monogram on phones and tablets
            and nowhere else. */}
        <Link href="/" className="flex shrink-0 items-center lg:hidden" aria-label={t('Accueil')}>
          <Logo collapsed />
        </Link>
        <MobileUpCrumb />
        <div className="hidden min-w-0 md:block">
          <Breadcrumb />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
        <QuickCreate />
        <Notifications />
        <UserMenu />
      </div>
    </header>
  );
};

export default Header;
