'use client';

/**
 * Top bar — universal actions only (Atlassian split): location on the left,
 * create · rappels · account on the right. Page-specific actions live in
 * <PageHeader>, never here.
 *
 * Mobile pass (2026-09-06): below `md` this component renders <PhoneTopBar>
 * instead — 48 px, the page title in the bar, an up-link instead of the
 * breadcrumb, and the page's one primary action (mobile-synthesis §2). From
 * `md` (tablet) the bar below is used, with the sidebar collapsed to an icon
 * rail beside it.
 */

import React from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Breadcrumb from '@/components/breadcrumb';
import Logo from '@/components/logo';
import Notifications from '@/components/layout/notifications';
import UserMenu from '@/components/layout/user-menu';
import PhoneTopBar from '@/components/layout/phone-top-bar';
import { useShellUi } from '@/components/layout/shell-ui';
import { useT } from '@/i18n';

function QuickCreate() {
  const t = useT();
  const { openCreateDossier, canCreateDossier } = useShellUi();
  if (!canCreateDossier) return null;
  return (
    <Button onClick={openCreateDossier} className="h-9 gap-1.5 px-3" title={t('Nouveau dossier')} data-tour="shell-create">
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline">{t('Nouveau')}</span>
    </Button>
  );
}

const Header = () => {
  const t = useT();
  return (
    <>
      {/* Phones (< md): the whole bar is different — title, up-link, one action. */}
      <PhoneTopBar />

      {/* Tablet and desktop. */}
      <header className="sticky top-0 z-40 hidden h-14 shrink-0 items-center gap-3 glass-bar border-b border-hairline px-3 md:flex md:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {/* Below `lg` the sidebar is an icon rail, so the wordmark is gone:
              this monogram is the only brand on screen there. It comes from
              the brand config like the sidebar's does. */}
          <Link href="/" className="flex shrink-0 items-center lg:hidden" aria-label={t('Accueil')}>
            <Logo collapsed />
          </Link>
          <div className="min-w-0" data-tour="shell-breadcrumb">
            <Breadcrumb />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
          <QuickCreate />
          <Notifications />
          <UserMenu />
        </div>
      </header>
    </>
  );
};

export default Header;
