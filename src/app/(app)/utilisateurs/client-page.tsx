'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Pencil, Trash2, Eye, EyeOff, X, User as UserIcon } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonRow } from '@/components/ui/skeleton';
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
import { MultiSelect } from '@/components/ui/multi-select';
import { roles as defaultRoles, compagnies as defaultCompagnies, zones as defaultZones } from '@/lib/dossiers-data';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection, useFirebaseApp } from '@/firebase';
import { collection, setDoc, serverTimestamp, doc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { useOptions } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';
import { usePersistedFilters } from '@/hooks/use-persisted-filters';

const userFormSchema = z.object({
  nom: z.string().min(1, "Le nom complet est requis."),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères."),
  confirmPassword: z.string(),
  role: z.string().min(1, "Le rôle est requis."),
  compagnies: z.array(z.string()).min(1, "Veuillez sélectionner au moins une compagnie."),
  zone: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas.",
  path: ["confirmPassword"],
}).superRefine((data, ctx) => {
  if (data.role === 'Agent de Terrain' && (!data.zone || data.zone.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La zone est requise pour un Agent de Terrain.",
      path: ['zone'],
    });
  }
});

type UserFormData = z.infer<typeof userFormSchema>;

/** Generate a deterministic email from the user's full name */
function generateEmail(nom: string): string {
  const sanitized = nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9\s]/g, '')     // remove special chars
    .trim()
    .replace(/\s+/g, '.');          // spaces → dots
  return `${sanitized}@sl-auto.app`;
}

export default function UtilisateursClientPage() {
  const db = useFirestore();
  const app = useFirebaseApp();

  const { options: dbRoles } = useOptions('options_roles', [...defaultRoles]);
  const { options: dbCompagnies } = useOptions('compagnies', defaultCompagnies);
  const { options: dbAgentsRaw } = useOptions('options_agents', []);
  const { options: dbZones } = useOptions('options_zones', defaultZones);

  const roles = useMemo(() => dbRoles.length > 0 ? dbRoles : defaultRoles.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbRoles]);
  const compagniesOptions = useMemo(() => dbCompagnies.length > 0 ? dbCompagnies : defaultCompagnies.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbCompagnies]);
  const zones = useMemo(() => dbZones.length > 0 ? dbZones : defaultZones.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbZones]);

  const companyOptions = useMemo(() => compagniesOptions.map(c => ({ value: c.label, label: c.label })), [compagniesOptions]);

  const usersQuery = useMemo(() => collection(db, 'users'), [db]);
  const { data: userList, loading } = useCollection<any>(usersQuery);

  const filterDefaults = { search: '', role: 'Tous' };
  const [filters, setFilters, clearFilter] = usePersistedFilters('utilisateurs', filterDefaults);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nom: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      nom: '',
      password: '',
      confirmPassword: '',
      role: '',
      compagnies: [],
      zone: '',
    },
  });

  async function onSubmit(data: UserFormData) {
    if (!db || !app) return;
    setIsSubmitting(true);
    try {
      const email = generateEmail(data.nom);

      // Check if name already exists
      const existingSnap = await getDocs(query(collection(db, 'users'), where('nom', '==', data.nom)));
      if (!existingSnap.empty) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Un utilisateur avec ce nom existe déjà.' });
        setIsSubmitting(false);
        return;
      }

      // Create Firebase Auth user using a secondary app instance
      // This avoids signing out the current admin
      const secondaryApp = initializeApp(app.options, 'secondary-auth');
      const secondaryAuth = getAuth(secondaryApp);

      let uid: string;
      try {
        const cred = await createUserWithEmailAndPassword(secondaryAuth, email, data.password);
        uid = cred.user.uid;
      } finally {
        await deleteApp(secondaryApp);
      }

      // Store user in Firestore with Auth UID as document ID
      await setDoc(doc(db, 'users', uid), {
        nom: data.nom,
        prenom: '',
        email: email,
        password: data.password, // stored so admin can see it
        role: data.role,
        compagnies: data.compagnies,
        zone: data.zone || '',
        statut: 'Actif',
        createdAt: serverTimestamp(),
        lastLogin: null,
      });

      // Sync to role-specific collections
      if (data.role === 'Agent de Terrain') {
        const { addDoc, updateDoc } = await import('firebase/firestore');
        const existingAgents = await getDocs(query(collection(db, 'options_agents'), where('label', '==', data.nom)));
        if (existingAgents.empty) {
          const maxOrder = Math.max(0, ...dbAgentsRaw.map(o => o.order));
          await addDoc(collection(db, 'options_agents'), {
            label: data.nom,
            zone: data.zone || '',
            order: maxOrder + 1,
            active: true,
            createdAt: serverTimestamp(),
          });
        } else {
          // Keep the existing agent doc's zone in sync with the form value
          for (const d of existingAgents.docs) {
            await updateDoc(d.ref, { zone: data.zone || '' });
          }
        }
      }

      if (data.role === 'Chiffreur') {
        const existingChiffreurs = await getDocs(query(collection(db, 'chiffreurs'), where('nom', '==', data.nom)));
        if (existingChiffreurs.empty) {
          const { addDoc } = await import('firebase/firestore');
          await addDoc(collection(db, 'chiffreurs'), {
            nom: data.nom,
            email: email,
            phone: '',
            active: true,
            createdAt: serverTimestamp(),
          });
        }
      }

      toast({
        title: "Utilisateur ajouté",
        description: `${data.nom} a été ajouté avec succès.`,
      });
      form.reset();
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/email-already-in-use') {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Un compte avec ce nom existe déjà dans le système d\'authentification.' });
      } else {
        toast({ variant: 'destructive', title: "Erreur lors de la création", description: error.message || 'Erreur inconnue.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleDelete = async (userId: string) => {
    setIsDeleting(true);
    try {
      const user = userList?.find((u: any) => u.id === userId);
      await deleteDoc(doc(db, 'users', userId));

      // Clean up role-specific collections
      if (user) {
        if (user.role === 'Agent de Terrain') {
          const snap = await getDocs(query(collection(db, 'options_agents'), where('label', '==', user.nom)));
          for (const d of snap.docs) await deleteDoc(d.ref);
        }
        if (user.role === 'Chiffreur') {
          const snap = await getDocs(query(collection(db, 'chiffreurs'), where('nom', '==', user.nom)));
          for (const d of snap.docs) await deleteDoc(d.ref);
        }
      }

      toast({ title: "Utilisateur supprimé" });
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords(prev => ({ ...prev, [userId]: !prev[userId] }));
  };

  const filteredUsers = useMemo(() => {
    if (!userList) return [];
    return userList.filter((user: any) => {
      const searchLower = filters.search.toLowerCase();
      const nameMatch = (user.nom || '').toLowerCase().includes(searchLower) || (user.prenom || '').toLowerCase().includes(searchLower);
      const roleMatch = filters.role === 'Tous' || user.role === filters.role;
      return nameMatch && roleMatch;
    });
  }, [userList, filters]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card className="border shadow-sm rounded-lg">
              <CardHeader>
                <CardTitle>Ajouter un utilisateur</CardTitle>
                <CardDescription>Créez un nouveau profil utilisateur.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="nom"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom complet</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl><Input type="password" placeholder="Minimum 6 caractères" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmez le mot de passe</FormLabel>
                      <FormControl><Input type="password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Rôle</FormLabel>
                        <OptionsManagerModal collectionName="options_roles" title="Rôles" defaultValues={[...defaultRoles]} />
                      </div>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Sélectionnez un rôle" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {roles.map(role => <SelectItem key={role.id} value={role.label}>{role.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="compagnies"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Compagnies d&apos;Assurance</FormLabel>
                        <OptionsManagerModal collectionName="compagnies" title="Compagnies" />
                      </div>
                      <MultiSelect
                        options={companyOptions}
                        selected={field.value}
                        onChange={field.onChange}
                        className="w-full"
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {form.watch('role') === 'Agent de Terrain' && (
                  <FormField
                    control={form.control}
                    name="zone"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Zone</FormLabel>
                          <OptionsManagerModal collectionName="options_zones" title="Zones" defaultValues={defaultZones} />
                        </div>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger><SelectValue placeholder="Sélectionnez une zone" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {zones.map(zone => <SelectItem key={zone.id} value={zone.label}>{zone.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" loading={isSubmitting}>
                  {isSubmitting ? 'Création...' : "Ajouter l'utilisateur"}
                </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      </div>

      <div className="md:col-span-2">
        <Card className="border shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle>Gérer les utilisateurs</CardTitle>
            <CardDescription>Modifiez ou supprimez des profils existants.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom..."
                  className="pl-10"
                  value={filters.search}
                  onChange={e => setFilters({ search: e.target.value })}
                />
              </div>
              <Select value={filters.role} onValueChange={value => setFilters({ role: value })}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filtrer par rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tous">Tous les rôles</SelectItem>
                  {roles.map(role => <SelectItem key={role.id} value={role.label}>{role.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {filters.role !== 'Tous' && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">Filtres actifs</span>
                <Badge variant="outline" className="gap-1 pr-1">
                  Rôle : {filters.role}
                  <button onClick={() => clearFilter('role')} className="ml-1 rounded-full p-0.5 hover:bg-destructive/10 hover:text-destructive" aria-label="Retirer le filtre rôle">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              </div>
            )}
            <div className="rounded-lg overflow-hidden bg-muted/10">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 border-0">
                    <TableHead>Nom</TableHead>
                    <TableHead>Mot de passe</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Compagnies</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={`sk-${i}`}>
                        <TableCell colSpan={6} className="p-0">
                          <SkeletonRow />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredUsers.length === 0 ? (
                    <TableRow key="empty-users">
                      <TableCell colSpan={6} className="p-0">
                        <EmptyState
                          icon={<UserIcon />}
                          title="Aucun utilisateur trouvé"
                          description={filters.search || filters.role !== 'Tous' ? "Essayez d'ajuster les filtres." : 'Commencez par ajouter un utilisateur.'}
                          dashed={false}
                          className="border-0 bg-transparent py-10"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.prenom} {user.nom}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-mono">
                              {showPasswords[user.id] ? (user.password || '-') : '••••••'}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => togglePasswordVisibility(user.id)}
                            >
                              {showPasswords[user.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            <Badge variant="outline">{user.role}</Badge>
                            {user.zone && (
                              <Badge variant="secondary" className="text-xs">{user.zone}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {(user.compagnies || []).length === 0 ? (
                              <span className="text-xs text-muted-foreground">Toutes</span>
                            ) : (user.compagnies || []).map((c: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.statut === 'Actif' ? 'success' : 'destructive'}>{user.statut || 'Actif'}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                              <Link href={`/utilisateurs/${user.id}`} title="Modifier">
                                <Pencil className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </Link>
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: user.id, nom: `${user.prenom || ''} ${user.nom || ''}`.trim() || 'cet utilisateur' })} title="Supprimer">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet utilisateur ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.nom && <span className="font-semibold">{deleteTarget.nom}</span>} sera définitivement supprimé. Son compte Firebase, sa fiche et ses entrées dans les collections liées (options_agents / chiffreurs) seront retirés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) handleDelete(deleteTarget.id);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
