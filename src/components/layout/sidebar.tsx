'use client';

/**
 * Product navigation. Quiet by design (Linear: "don't compete for attention
 * you haven't earned"): tinted active row, hairline border, no shadow, no
 * editing inside the nav. Universal actions (create, account, theme) live in
 * the header; the profile row and help live in the footer.
 */

import React from 'react';
import { usePathname } from 'next/navigation';
import NextLink from 'next/link';
import { Calculator, FolderOpen, HelpCircle, PanelLeft } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Logo from '@/components/logo';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useRappels } from '@/hooks/use-rappels';
import { useVisibleNav } from '@/hooks/use-visible-nav';
import { useWorkspaceStore, TAB_KINDS } from '@/hooks/use-workspace-tabs';
import { userInitials } from '@/components/layout/user-menu';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n';

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
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const { navGroups, footerItems, isVisible } = useVisibleNav();
  const { rappels } = useRappels();
  const { recents } = useWorkspaceStore();
  const { profile } = useCurrentUser();
  const t = useT();

  const unreadRappelsCount = rappels.filter((r) => !r.read && !r.resolvedAt).length;
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const visibleRecents = recents.filter((r) =>
    r.kind === 'dossier' ? isVisible('/dossiers') : isVisible('/assignations-chiffrage'),
  ).slice(0, 5);

  const displayName = profile ? `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim() || t('Profil') : t('Profil');
  const isProfilActive = pathname === '/profil' || pathname.startsWith('/profil/');

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader
        className={cn(
          'flex shrink-0 bg-sidebar px-3',
          isCollapsed ? 'flex-col items-center gap-2 py-3' : 'h-14 flex-row items-center justify-between',
        )}
      >
        <Logo collapsed={isCollapsed} />
        {/* The toggle stays at the TOP in both states (owner ruling
            2026-09-02 — it used to jump to the footer when collapsed). */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={toggleSidebar}
              aria-label={isCollapsed ? t('Agrandir la barre latérale') : t('Réduire la barre latérale')}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{isCollapsed ? t('Agrandir') : t('Réduire')}</TooltipContent>
        </Tooltip>
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
          <SidebarGroup>
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
        {/* Profil row at the bottom of the nav (owner ruling 2026-09-03) with
            a quiet icon-only Aide menu beside it. The guided-tour entry point
            is the single bottom-right "?" button (TutorialLauncher) — no
            duplicate here. */}
        <div className={cn('flex gap-1', isCollapsed ? 'flex-col items-center' : 'flex-row items-center')}>
          <Tooltip>
            <TooltipTrigger asChild>
              <NextLink
                href="/profil"
                onClick={closeOnMobile}
                aria-current={isProfilActive ? 'page' : undefined}
                className={cn(
                  'flex min-w-0 items-center gap-2 rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent',
                  isCollapsed ? 'h-8 w-8 justify-center' : 'h-9 flex-1 px-1.5',
                  isProfilActive && 'bg-sidebar-active shadow-rim',
                )}
              >
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarFallback className="bg-surface-4 text-[10px] font-semibold text-ink">{userInitials(profile)}</AvatarFallback>
                </Avatar>
                {!isCollapsed && <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{displayName}</span>}
              </NextLink>
            </TooltipTrigger>
            <TooltipContent side="right">{t('Profil')}</TooltipContent>
          </Tooltip>
          {/* Brand-gated EN/FR switcher (hidden on single-language brands). */}
          <LanguageSwitcher className="h-8 shrink-0 justify-center text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                aria-label={t('Aide')}
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuLabel>{t('Aide')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {footerItems.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.href} asChild>
                    <NextLink href={item.href} onClick={closeOnMobile}>
                      <Icon className="mr-2 h-4 w-4" />
                      {t(item.label)}
                    </NextLink>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
