'use client';

/**
 * Top bar — universal actions only (Atlassian split): location on the left,
 * rappels · account on the right. Page-specific actions live in <PageHeader>,
 * never here.
 *
 * « Nouveau » is deliberately NOT here (owner ruling 2026-09-09): a dossier is
 * created from the dossiers page, where the list confirms the creation. A
 * global create button let it be pressed from contexts that then jump the user
 * somewhere else. The `c` hotkey and the command palette still open the dialog.
 *
 * Mobile pass (2026-09-06): below `md` this component renders <PhoneTopBar>
 * instead — 48 px, the page title in the bar, an up-link instead of the
 * breadcrumb, and the page's one primary action (mobile-synthesis §2). From
 * `md` (tablet) the bar below is used, with the sidebar collapsed to an icon
 * rail beside it.
 */

import React from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import Breadcrumb from '@/components/breadcrumb';
import Logo from '@/components/logo';
import Notifications from '@/components/layout/notifications';
import UserMenu from '@/components/layout/user-menu';
import PhoneTopBar from '@/components/layout/phone-top-bar';
import { useShellUi } from '@/components/layout/shell-ui';
import { useT } from '@/i18n';

/**
 * Header search field — the ONLY entry point to the command palette (QA bug
 * 039; owner ruling 2026-09-24: the Ctrl+K and « / » shortcuts are gone).
 * Styled as an input so it reads as « rechercher », not as one more button.
 */
function SearchTrigger() {
  const t = useT();
  const { openPalette } = useShellUi();
  return (
    <button
      type="button"
      onClick={() => openPalette()}
      data-tour="shell-search"
      title={t('Rechercher')}
      aria-label={t('Rechercher')}
      className="flex h-9 w-44 items-center gap-2 rounded-md border border-hairline bg-card px-3 text-left text-sm text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:w-64"
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">{t('Réf., plaque, assuré, page ou action…')}</span>
    </button>
  );
}

const Header = () => {
  const t = useT();
  const { hideChrome } = useShellUi();
  // A page can claim the whole window (devis editor, comparison pane open).
  // It then owns the navigation it took away.
  if (hideChrome) return null;
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
          <SearchTrigger />
          <Notifications />
          <UserMenu />
        </div>
      </header>
    </>
  );
};

export default Header;
