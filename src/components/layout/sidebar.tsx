"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  Settings, 
  Moon, 
  Sun, 
  Plus, 
  X, 
  LogOut, 
  ChevronDown,
  LayoutDashboard,
  FolderOpen,
  Users,
  Building2
} from 'lucide-react';
import Logo from '@/components/logo';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useCompagnies } from '@/hooks/use-compagnies';
import NextLink from 'next/link';
import { cn } from '@/lib/utils';

const AppSidebar = () => {
  const pathname = usePathname();
  const { state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { compagnies, addCompagnie, deleteCompagnie } = useCompagnies();
  
  const [showAddInput, setShowAddInput] = useState(false);
  const [newName, setNewName] = useState('');

  const avatarImage = PlaceHolderImages.find(img => img.id === 'avatar1');
  const isCollapsed = state === 'collapsed';

  useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { href: '/dossiers', icon: FolderOpen, label: 'Dossiers' },
    { href: '/utilisateurs', icon: Users, label: 'Utilisateurs' },
    { href: '/compagnies', icon: Building2, label: 'Compagnies' },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r shadow-xl z-50">
      <SidebarHeader className="h-14 border-b flex flex-row items-center justify-between px-4 shrink-0 bg-background">
        <div className={cn("flex items-center gap-2 overflow-hidden transition-all duration-300", isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100")}>
          <Logo />
        </div>
        <SidebarTrigger className="h-8 w-8" />
      </SidebarHeader>

      <SidebarContent className="bg-background/50">
        <SidebarMenu className="px-2 pt-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            if (item.label === 'Compagnies') {
              return (
                <Collapsible key={item.href} defaultOpen className="group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton 
                        isActive={isActive}
                        tooltip={item.label}
                        className="transition-all duration-200"
                      >
                        <Icon />
                        <span>{item.label}</span>
                        {!isCollapsed && <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-180" />}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="ml-4 mr-2 border-l-2 border-primary/10">
                        {compagnies.map((c) => (
                          <SidebarMenuSubItem key={c.id}>
                            <SidebarMenuSubButton asChild isActive={pathname.includes(`selected=${c.id}`)}>
                              <NextLink href={`/compagnies?selected=${c.id}`} className="group flex items-center gap-2">
                                {c.logoUrl ? (
                                  <img src={c.logoUrl} alt="" className="h-4 w-4 rounded-sm object-contain shrink-0" />
                                ) : (
                                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: c.couleur }} />
                                )}
                                <span className="flex-1 truncate">{c.nom}</span>
                                {!isCollapsed && (
                                  <button
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); if(confirm(`Supprimer ${c.nom} ?`)) deleteCompagnie(c.id); }}
                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </NextLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                        
                        {!isCollapsed && (
                          <SidebarMenuSubItem>
                            {showAddInput ? (
                              <div className="flex items-center gap-1 px-2 mt-1">
                                <input
                                  autoFocus
                                  value={newName}
                                  onChange={(e) => setNewName(e.target.value)}
                                  onKeyDown={async (e) => {
                                    if (e.key === 'Enter' && newName.trim()) {
                                      await addCompagnie(newName.trim());
                                      setNewName('');
                                      setShowAddInput(false);
                                    }
                                    if (e.key === 'Escape') {
                                      setShowAddInput(false);
                                      setNewName('');
                                    }
                                  }}
                                  placeholder="Nom..."
                                  className="w-full text-xs px-2 py-1.5 rounded border bg-background"
                                />
                              </div>
                            ) : (
                              <button
                                onClick={() => setShowAddInput(true)}
                                className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-primary transition-colors w-full"
                              >
                                <Plus className="h-3 w-3" /> Ajouter
                              </button>
                            )}
                          </SidebarMenuSubItem>
                        )}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              );
            }

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                  <NextLink href={item.href}>
                    <Icon />
                    <span>{item.label}</span>
                  </NextLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t bg-background shrink-0 p-2 gap-2">
        {mounted && (
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full justify-start gap-2 text-muted-foreground hover:text-foreground", isCollapsed && "px-0 justify-center")}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {!isCollapsed && <span>{theme === 'dark' ? 'Mode clair' : 'Mode sombre'}</span>}
          </Button>
        )}

        <div className={cn("flex items-center gap-3 p-2 rounded-lg bg-primary/5 border border-primary/10 overflow-hidden transition-all duration-300", isCollapsed && "p-1 justify-center")}>
          <Avatar className={cn("h-8 w-8 border transition-all", isCollapsed ? "h-6 w-6" : "h-8 w-8")}>
            {avatarImage && <AvatarImage src={avatarImage.imageUrl} data-ai-hint={avatarImage.imageHint} />}
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold truncate">Admin</span>
              <span className="text-[10px] text-muted-foreground truncate uppercase font-black">Administrateur</span>
            </div>
          )}
        </div>

        <div className={cn("flex gap-1", isCollapsed ? "flex-col" : "flex-row")}>
          <Button variant="ghost" size="icon" className="h-8 w-full justify-center text-muted-foreground hover:text-foreground" title="Paramètres">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-full justify-center text-muted-foreground hover:text-destructive" title="Déconnexion">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
