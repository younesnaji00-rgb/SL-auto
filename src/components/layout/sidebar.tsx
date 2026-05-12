"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Moon,
  Sun,
  Plus,
  X,
  LogOut,
  ChevronDown,
  LayoutDashboard,
  FolderOpen,
  Users,
  Building2,
  Calculator,
  UserCheck,
  BookOpen,
  Bug,
  Gauge,
  Stamp,
  CalendarDays,
} from 'lucide-react';
import Logo from '@/components/logo';
import { useCompagnies } from '@/hooks/use-compagnies';
import { useCurrentUser } from '@/hooks/use-current-user';
import NextLink from 'next/link';
import { cn } from '@/lib/utils';

type NavItem = {
  href: string;
  icon: React.ElementType;
  label: string;
  roles: string[] | null;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'ESPACE',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord', roles: ['Admin', "Responsable d'équipe"] },
      { href: '/monitoring', icon: Gauge, label: "Suivi d'équipe", roles: ['Admin', "Responsable d'équipe"] },
      { href: '/dossiers', icon: FolderOpen, label: 'Gestion des dossiers', roles: ['Admin', "Responsable d'équipe", 'Gestionnaire'] },
      { href: '/consultation', icon: BookOpen, label: 'Consultation', roles: ['Admin', "Responsable d'équipe", 'Gestionnaire', 'Chiffreur', 'Directeur', 'Directeur des opérations', 'Directeur technique'] },
      { href: '/compagnies', icon: Building2, label: 'Compagnies', roles: ['Admin', "Responsable d'équipe"] },
    ],
  },
  {
    label: 'ASSIGNATIONS',
    items: [
      { href: '/assignations-chiffrage', icon: Calculator, label: 'Assignations Chiffrage', roles: ['Admin', "Responsable d'équipe", 'Chiffreur'] },
      { href: '/assignations-atg', icon: UserCheck, label: 'Assignations Agent de Terrain', roles: ['Admin', "Responsable d'équipe", 'Agent de Terrain'] },
    ],
  },
  {
    label: 'ADMIN',
    items: [
      { href: '/utilisateurs', icon: Users, label: 'Utilisateurs', roles: ['Admin'] },
      { href: '/tampons', icon: Stamp, label: 'Tampons', roles: ['Admin'] },
      { href: '/jours-feries', icon: CalendarDays, label: 'Jours fériés', roles: ['Admin', 'Directeur', 'Directeur des opérations', 'Directeur technique'] },
    ],
  },
  {
    label: 'DIVERS',
    items: [
      { href: '/signaler-bug', icon: Bug, label: 'Signaler un bug', roles: null },
    ],
  },
];

const AppSidebar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { compagnies, addCompagnie, deleteCompagnie } = useCompagnies();
  const { profile, signOut } = useCurrentUser();

  const [showAddInput, setShowAddInput] = useState(false);
  const [newName, setNewName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nom: string } | null>(null);
  const [logoErrors, setLogoErrors] = useState<Set<string>>(new Set());
  const markLogoFailed = (id: string) =>
    setLogoErrors((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  const isCollapsed = state === 'collapsed';

  useEffect(() => {
    setMounted(true);
  }, []);

  const visibleGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.roles || (profile && item.roles.includes(profile.role))),
  })).filter((group) => group.items.length > 0);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const confirmDeleteCompagnie = async () => {
    if (!deleteTarget) return;
    await deleteCompagnie(deleteTarget.id);
    setDeleteTarget(null);
  };

  const userInitials = profile
    ? (profile.prenom ? profile.prenom[0] : '') + (profile.nom ? profile.nom[0] : '')
    : 'U';

  const displayName = profile?.nom || 'Utilisateur';
  const displayRole = profile?.role || '';

  return (
    <Sidebar collapsible="icon" className="shadow-xl z-50">
      <SidebarHeader className={cn("flex shrink-0 bg-background px-4", isCollapsed ? "flex-col items-center gap-2 py-3" : "flex-row items-center justify-between h-14")}>
        <Logo collapsed={isCollapsed} />
        <SidebarTrigger className="h-8 w-8 shrink-0" />
      </SidebarHeader>

      <SidebarContent className="bg-background/50">
        {visibleGroups.map((group) => (
          <SidebarGroup key={group.label}>
            {!isCollapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  const Icon = item.icon;

                  if (item.label === 'Compagnies') {
                    return (
                      <Collapsible key={item.href} className="group/collapsible">
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
                            <SidebarMenuSub className="ml-4 mr-2">
                              {compagnies.map((c) => (
                                <SidebarMenuSubItem key={c.id}>
                                  <SidebarMenuSubButton asChild isActive={pathname.includes(`selected=${c.id}`)}>
                                    <NextLink href={`/compagnies?selected=${c.id}`} className="group flex items-center gap-2">
                                      {c.logoUrl && !logoErrors.has(c.id) ? (
                                        <img
                                          src={c.logoUrl}
                                          alt=""
                                          className="h-8 w-8 rounded-sm object-contain shrink-0"
                                          onError={() => markLogoFailed(c.id)}
                                        />
                                      ) : (
                                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.couleur }} />
                                      )}
                                      <span className="flex-1 truncate">{c.nom}</span>
                                      {!isCollapsed && (
                                        <button
                                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTarget({ id: c.id, nom: c.nom }); }}
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
                                      <Input
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
                                        placeholder="Nom de la compagnie..."
                                        className="h-8 text-xs"
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
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="bg-muted/20 shrink-0 p-2 gap-2">
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

        <div className={cn("flex items-center gap-3 p-2 rounded-lg bg-primary/5 overflow-hidden transition-all duration-300", isCollapsed && "p-1 justify-center")}>
          {!isCollapsed ? (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold truncate">{displayName}</span>
              <span className="text-[10px] text-muted-foreground truncate uppercase tracking-[0.08em] font-semibold">{displayRole}</span>
            </div>
          ) : (
            <span className="text-[10px] font-bold">{userInitials.toUpperCase()}</span>
          )}
        </div>

        <div className={cn("flex gap-1", isCollapsed ? "flex-col" : "flex-row")}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-full justify-center text-muted-foreground hover:text-destructive"
            title="Déconnexion"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {deleteTarget?.nom} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Les dossiers liés à cette compagnie ne seront pas supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDeleteCompagnie}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sidebar>
  );
};

export default AppSidebar;
