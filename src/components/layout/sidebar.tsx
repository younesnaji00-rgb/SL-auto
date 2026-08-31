'use client';

/**
 * Product navigation. Quiet by design (Linear: "don't compete for attention
 * you haven't earned"): tinted active row, hairline border, no shadow, no
 * editing inside the nav. Universal actions (search, create, account, theme)
 * live in the header; help lives in the footer menu.
 */

import React from 'react';
import { usePathname } from 'next/navigation';
import NextLink from 'next/link';
import { Calculator, FolderOpen, HelpCircle, Keyboard, PanelLeft } from 'lucide-react';
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
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Logo from '@/components/logo';
import { useRappels } from '@/hooks/use-rappels';
import { useVisibleNav } from '@/hooks/use-visible-nav';
import { useWorkspaceStore, TAB_KINDS } from '@/hooks/use-workspace-tabs';
import { useShellUi } from '@/components/layout/shell-ui';
import { formatKeys } from '@/hooks/use-hotkeys';
import { cn } from '@/lib/utils';

const AppSidebar = () => {
  const pathname = usePathname();
  const { state, toggleSidebar, isMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const { navGroups, footerItems, isVisible } = useVisibleNav();
  const { rappels } = useRappels();
  const { recents } = useWorkspaceStore();
  const { openShortcuts } = useShellUi();

  const unreadRappelsCount = rappels.filter((r) => !r.read && !r.resolvedAt).length;
  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const visibleRecents = recents.filter((r) =>
    r.kind === 'dossier' ? isVisible('/dossiers') : isVisible('/assignations-chiffrage'),
  ).slice(0, 5);

  const toggleKeys = formatKeys('mod+b').join(' ');

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader
        className={cn(
          'flex shrink-0 bg-sidebar px-3',
          isCollapsed ? 'flex-col items-center gap-2 py-3' : 'h-14 flex-row items-center justify-between',
        )}
      >
        <Logo collapsed={isCollapsed} onDark />
        {!isCollapsed && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                onClick={toggleSidebar}
                aria-label="Réduire la barre latérale"
              >
                <PanelLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Réduire · {toggleKeys}</TooltipContent>
          </Tooltip>
        )}
      </SidebarHeader>

      <SidebarContent className="bg-sidebar">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            {!isCollapsed && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`)) || (item.href !== '/dashboard' && pathname === item.href);
                  const Icon = item.icon;
                  const tooltip = item.hotkey ? `${item.label} · ${formatKeys(item.hotkey).join(' puis ')}` : item.label;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive} tooltip={tooltip}>
                        <NextLink href={item.href} onClick={closeOnMobile} aria-current={isActive ? 'page' : undefined}>
                          <Icon />
                          <span>{item.label}</span>
                        </NextLink>
                      </SidebarMenuButton>
                      {item.href === '/mes-rappels' && unreadRappelsCount > 0 && (
                        <SidebarMenuBadge className="bg-sidebar-primary font-semibold text-sidebar-primary-foreground peer-hover/menu-button:text-sidebar-primary-foreground peer-data-[active=true]/menu-button:text-sidebar-primary-foreground">
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
            {!isCollapsed && <SidebarGroupLabel>Récents</SidebarGroupLabel>}
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
        <div className={cn('flex gap-1', isCollapsed ? 'flex-col' : 'flex-row items-center')}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size={isCollapsed ? 'icon' : 'sm'}
                className={cn('text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground', isCollapsed ? 'h-8 w-8' : 'h-8 flex-1 justify-start gap-2 px-2 text-[13px]')}
                aria-label="Aide"
              >
                <HelpCircle className="h-4 w-4" />
                {!isCollapsed && <span>Aide</span>}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuLabel>Aide</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => openShortcuts()}>
                <Keyboard className="mr-2 h-4 w-4" />
                Raccourcis clavier
                <DropdownMenuShortcut>?</DropdownMenuShortcut>
              </DropdownMenuItem>
              {footerItems.map((item) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={item.href} asChild>
                    <NextLink href={item.href} onClick={closeOnMobile}>
                      <Icon className="mr-2 h-4 w-4" />
                      {item.label}
                    </NextLink>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
          {isCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  onClick={toggleSidebar}
                  aria-label="Agrandir la barre latérale"
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Agrandir · {toggleKeys}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
