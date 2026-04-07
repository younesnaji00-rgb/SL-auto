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
import { Search, Pencil, Trash2, Loader2, Settings } from 'lucide-react';
import { MultiSelect } from '@/components/ui/multi-select';
import { roles as defaultRoles, compagnies as defaultCompagnies } from '@/lib/dossiers-data';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { useOptions } from '@/hooks/use-options';
import { OptionsManagerModal } from '@/components/modals/options-manager-modal';

const userFormSchema = z.object({
  nom: z.string().min(1, "Le nom complet est requis."),
  email: z.string().email("L'adresse email est invalide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
  confirmPassword: z.string(),
  role: z.string().min(1, "Le rôle est requis."),
  compagnies: z.array(z.string()).min(1, "Veuillez sélectionner au moins une compagnie."),
}).refine(data => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas.",
  path: ["confirmPassword"],
});

type UserFormData = z.infer<typeof userFormSchema>;

export default function UtilisateursClientPage() {
  const db = useFirestore();
  
  const { options: dbRoles } = useOptions('options_roles', [...defaultRoles]);
  const { options: dbCompagnies } = useOptions('compagnies', defaultCompagnies);

  const roles = useMemo(() => dbRoles.length > 0 ? dbRoles : defaultRoles.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbRoles]);
  const compagniesOptions = useMemo(() => dbCompagnies.length > 0 ? dbCompagnies : defaultCompagnies.map((label, i) => ({ id: `fallback-${i}`, label, order: i, active: true })), [dbCompagnies]);
  
  const companyOptions = useMemo(() => compagniesOptions.map(c => ({ value: c.label, label: c.label })), [compagniesOptions]);

  const usersQuery = useMemo(() => collection(db, 'users'), [db]);
  const { data: userList, loading } = useCollection<any>(usersQuery);
  
  const [filters, setFilters] = useState({ search: '', role: 'Tous' });
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      nom: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: '',
      compagnies: [],
    },
  });
  
  async function onSubmit(data: UserFormData) {
    if (!db) return;
    setIsSubmitting(true);
    try {
        await addDoc(collection(db, 'users'), {
            nom: data.nom,
            prenom: '',
            email: data.email,
            role: data.role,
            compagnies: data.compagnies,
            statut: 'Actif',
            createdAt: serverTimestamp(),
            lastLogin: null
        });
        toast({
            title: "Utilisateur ajouté",
            description: `${data.nom} a été ajouté avec succès.`,
        });
        form.reset();
    } catch (error) {
        console.error(error);
        toast({ variant: 'destructive', title: "Erreur lors de la création" });
    } finally {
        setIsSubmitting(false);
    }
  }

  const handleDelete = async (userId: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) return;
    try {
        await deleteDoc(doc(db, 'users', userId));
        toast({ title: "Utilisateur supprimé" });
    } catch (error) {
        console.error(error);
    }
  };
  
  const filteredUsers = useMemo(() => {
    if (!userList) return [];
    return userList.filter((user: any) => {
        const searchLower = filters.search.toLowerCase();
        const nameMatch = (user.nom || '').toLowerCase().includes(searchLower) || (user.prenom || '').toLowerCase().includes(searchLower);
        const emailMatch = (user.email || '').toLowerCase().includes(searchLower);
        const roleMatch = filters.role === 'Tous' || user.role === filters.role;
        return (nameMatch || emailMatch) && roleMatch;
    });
  }, [userList, filters]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card>
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
                      <FormControl><Input placeholder="John Doe" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" placeholder="john.doe@example.com" {...field} /></FormControl>
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
                      <FormControl><Input type="password" {...field} /></FormControl>
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
                        <FormLabel>Compagnies d'Assurance</FormLabel>
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
              </CardContent>
              <CardFooter>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création...</> : "Ajouter l'utilisateur"}
                  </Button>
              </CardFooter>
            </Card>
          </form>
        </Form>
      </div>

      <div className="md:col-span-2">
        <Card>
            <CardHeader>
                <CardTitle>Gérer les utilisateurs</CardTitle>
                <CardDescription>Modifiez ou supprimez des profils existants.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-grow">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Rechercher par nom/email..."
                            className="pl-10"
                            value={filters.search}
                            onChange={e => setFilters(f => ({...f, search: e.target.value}))}
                        />
                    </div>
                    <Select value={filters.role} onValueChange={value => setFilters(f => ({...f, role: value}))}>
                        <SelectTrigger className="w-full sm:w-[200px]">
                            <SelectValue placeholder="Filtrer par rôle" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Tous">Tous les rôles</SelectItem>
                            {roles.map(role => <SelectItem key={role.id} value={role.label}>{role.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nom</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Rôle</TableHead>
                                <TableHead>Statut</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow key="loading-users"><TableCell colSpan={5} className="text-center py-10">Chargement...</TableCell></TableRow>
                            ) : filteredUsers.length === 0 ? (
                                <TableRow key="empty-users"><TableCell colSpan={5} className="text-center py-10">Aucun utilisateur trouvé.</TableCell></TableRow>
                            ) : (
                                filteredUsers.map((user: any) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.prenom} {user.nom}</TableCell>
                                        <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{user.role}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.statut === 'Actif' ? 'expertise' : 'destructive'}>{user.statut || 'Actif'}</Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                             <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                    <Link href={`/utilisateurs/${user.id}`} title="Modifier">
                                                        <Pencil className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                                    </Link>
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(user.id)} title="Supprimer">
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
    </div>
  );
}