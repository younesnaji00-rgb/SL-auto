'use client';

/**
 * Product navigation. Quiet by design (Linear: "don't compete for attention
 * you haven't earned"): tinted active row, hairline border, no shadow, no
 * editing inside the nav.
 *
 * The nav rests as an ICON RAIL and expands on hover — there is no collapse
 * button (owner ruling 2026-09-09). The footer carries the account actions as
 * three ordinary rows, in the same anatomy as a destination: mode sombre,
 * « Signaler un bug », déconnexion. There is no Profil page.
 */

import React, { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import NextLink from 'next/link';
import { Calculator, FolderOpen, HelpCircle, LogOut, Moon, Sun } from 'lucide-react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  useSidebar,
} from '@/components/ui/sidebar';
import Logo from '@/components/logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useTheme } from 'next-themes';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useRappels } from '@/hooks/use-rappels';
import { useVisibleNav } from '@/hooks/use-visible-nav';
import { useWorkspaceStore, TAB_KINDS } from '@/hooks/use-workspace-tabs';
import { useSignOut } from '@/components/layout/user-menu';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';
import { tutorialsEnabledFor } from '@/lib/tutorial/access';
import {
  setTutorialsDisabled,
  subscribeTutorialPrefs,
  tutorialsDisabled,
  tutorialsDisabledServer,
} from '@/lib/tutorial/prefs';

/**
 * The single source of the active row's SURFACE (tint + light rim + 2px teal
 * bar): one absolutely-positioned indicator that SLIDES from the old row to
 * the new one (200ms, standard curve) instead of the highlight teleporting —
 * owner ruling 2026-09-02 ("the contour highlight morphs into the other
 * tab"). Rows keep their text/icon active treatment (ui/sidebar.tsx) and
 * paint above the indicator. Measured with the offsetTop chain (layout px —
 * CSS-zoom- and scroll-safe); re-measured when the container resizes
 * (collapse/expand) via ResizeObserver. Reduced motion: it snaps.
 */
const ActiveRowIndicator = ({ deps }: { deps: React.DependencyList }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const [box, setBox] = React.useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const readyRef = React.useRef(false);

  const measure = React.useCallback(() => {
    const el = ref.current;
    const container = el?.parentElement;
    if (!el || !container) return;
    const btn = container.querySelector<HTMLElement>('[data-sidebar="menu-button"][data-active="true"]');
    if (!btn) {
      setBox(null);
      return;
    }
    let top = 0;
    let left = 0;
    let node: HTMLElement | null = btn;
    while (node && node !== container) {
      top += node.offsetTop;
      left += node.offsetLeft;
      node = node.offsetParent as HTMLElement | null;
    }
    setBox({ top, left, width: btn.offsetWidth, height: btn.offsetHeight });
  }, []);

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  React.useLayoutEffect(measure, deps);
  React.useEffect(() => {
    const container = ref.current?.parentElement;
    if (!container) return;
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, [measure]);
  // Transitions only AFTER the first placement — the indicator must not fly
  // in from 0,0 on mount.
  React.useEffect(() => {
    if (box) readyRef.current = true;
  }, [box]);

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        'pointer-events-none absolute z-0 rounded-md bg-sidebar-active shadow-rim',
        readyRef.current && 'transition-[top,left,width,height,opacity] duration-300 ease-standard motion-reduce:transition-none',
        box ? 'opacity-100' : 'opacity-0',
      )}
      style={box ?? undefined}
    >
      {/* The 2px teal bar rides the indicator; hidden in icon-collapsed mode
          (same rule the old per-row bar had). */}
      <span className="absolute bottom-1.5 left-0 top-1.5 w-0.5 rounded-full bg-sidebar-primary group-data-[collapsible=icon]:hidden" />
    </div>
  );
};

const AppSidebar = () => {
  const pathname = usePathname();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const { navGroups, footerItems, isVisible } = useVisibleNav();
  const { rappels } = useRappels();
  const { recents } = useWorkspaceStore();
  const { profile } = useCurrentUser();
  const { theme, setTheme } = useTheme();
  const signOut = useSignOut();
  const t = useT();
  // next-themes resolves on the client only: render the neutral label until
  // it does, or the server and the first paint disagree.
  const [themeMounted, setThemeMounted] = React.useState(false);
  React.useEffect(() => setThemeMounted(true), []);
  const isDark = themeMounted && theme === 'dark';
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  const unreadRappelsCount = rappels.filter((r) => !r.read && !r.resolvedAt).length;
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const visibleRecents = recents.filter((r) =>
    r.kind === 'dossier' ? isVisible('/dossiers') : isVisible('/assignations-chiffrage'),
  ).slice(0, 5);

  const displayName = profile ? `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim() || t('Utilisateur') : t('Utilisateur');
  // The guided tour's own "?" button is its only entry point, and the welcome
  // lightbox lets the user switch the tutorial off — which hides that button.
  // This Aide entry is the way back; it exists ONLY while the tutorial is off,
  // and only for a role this brand offers it to.
  const tourOff = useSyncExternalStore(
    subscribeTutorialPrefs,
    tutorialsDisabled,
    tutorialsDisabledServer,
  );
  const canUseTutorials = tutorialsEnabledFor(profile?.role);

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader
        className={cn(
          'flex shrink-0 bg-sidebar px-3',
          isCollapsed ? 'flex-col items-center gap-2 py-3' : 'h-14 flex-row items-center justify-between',
        )}
      >
        <Logo collapsed={isCollapsed} />
        {/* No collapse button (owner ruling 2026-09-09): the rail opens on
            hover and closes when the pointer leaves, so there is nothing to
            toggle. Ctrl/⌘+B still pins it open for keyboard users. */}
      </SidebarHeader>

      <SidebarContent className="relative bg-sidebar">
        <ActiveRowIndicator deps={[pathname, isCollapsed, visibleRecents.length]} />
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            {!isCollapsed && <SidebarGroupLabel>{t(group.label)}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`)) || (item.href !== '/dashboard' && pathname === item.href);
                  const Icon = item.icon;
                  const tooltip = t(item.label);
                  return (
                    <SidebarMenuItem key={item.href}>
                      {/* `data-tour="nav-<href>"` anchors the guided tours to
                          each destination — never rename these. */}
                      <SidebarMenuButton asChild isActive={isActive} tooltip={tooltip} data-tour={`nav-${item.href}`}>
                        <NextLink href={item.href} onClick={closeOnMobile} aria-current={isActive ? 'page' : undefined}>
                          <Icon />
                          <span>{t(item.label)}</span>
                        </NextLink>
                      </SidebarMenuButton>
                      {item.href === '/mes-rappels' && unreadRappelsCount > 0 && (
                        <SidebarMenuBadge className="bg-status-info-bg font-semibold text-status-info-fg peer-hover/menu-button:text-status-info-fg peer-data-[active=true]/menu-button:text-status-info-fg">
                          {unreadRappelsCount > 99 ? '99+' : unreadRappelsCount}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {visibleRecents.length > 0 && (
          <SidebarGroup data-tour="nav-recents">
            {!isCollapsed && <SidebarGroupLabel>{t('Récents')}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleRecents.map((r) => {
                  const href = TAB_KINDS[r.kind].detailHref(r.id);
                  const Icon = r.kind === 'dossier' ? FolderOpen : Calculator;
                  const isActive = pathname === href;
                  return (
                    <SidebarMenuItem key={`${r.kind}:${r.id}`}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={r.label} size="sm">
                        <NextLink href={href} onClick={closeOnMobile}>
                          <Icon className="text-sidebar-muted" />
                          <span>{r.label}</span>
                        </NextLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className={cn('shrink-0 border-t border-sidebar-border bg-sidebar p-2', isCollapsed && 'items-center')}>
        {/* Account actions are ROWS, not a menu (owner ruling 2026-09-09): the
            three things a user actually does here — flip the theme, report a
            bug, sign out — each get their own row, in the same anatomy as a
            nav destination, so the rail shows them as icons and the expanded
            panel shows them labelled. The Profil page is gone; the identity is
            the quiet caption above them. */}
        {!isCollapsed && (
          <div className="min-w-0 px-2 pb-1.5">
            <p className="truncate text-[13px] font-medium text-sidebar-foreground">{displayName}</p>
            {profile?.role && <p className="truncate text-[11px] text-sidebar-muted">{t(profile.role)}</p>}
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={toggleTheme}
              tooltip={isDark ? t('Mode clair') : t('Mode sombre')}
              data-tour="nav-theme"
            >
              {isDark ? <Sun /> : <Moon />}
              <span>{isDark ? t('Mode clair') : t('Mode sombre')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {footerItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={t(item.label)} data-tour={`nav-${item.href}`}>
                  <NextLink href={item.href} onClick={closeOnMobile} aria-current={isActive ? 'page' : undefined}>
                    <Icon />
                    <span>{t(item.label)}</span>
                  </NextLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
          {/* The « ? » launcher is the tour's entry point; this row only exists
              while the user has switched the tutorial off, as the way back. */}
          {canUseTutorials && tourOff && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={() => setTutorialsDisabled(false)} tooltip={t('Réactiver le tutoriel guidé')}>
                <HelpCircle />
                <span>{t('Réactiver le tutoriel guidé')}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => void signOut()}
              tooltip={t('Déconnexion')}
              className="text-status-danger-fg hover:bg-status-danger-bg hover:text-status-danger-fg [&>svg]:text-status-danger-fg"
              data-tour="nav-signout"
            >
              <LogOut />
              <span>{t('Déconnexion')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {/* Brand-gated EN/FR switcher (hidden on single-language brands). */}
        <LanguageSwitcher className={cn('h-8 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground', isCollapsed ? 'w-8 justify-center' : 'w-full justify-start px-2')} />
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
