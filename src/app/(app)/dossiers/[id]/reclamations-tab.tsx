'use client';

import React, { useMemo, useState } from 'react';
import { Plus, Trash2, User, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useAuth, useCollection } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SkeletonCard } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from 'date-fns';
import { useT, dateFnsLocale } from '@/i18n';
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

export default function ReclamationsTab({ dossierId }: { dossierId: string }) {
    const t = useT();
    const db = useFirestore();
    const auth = useAuth();
    const { toast } = useToast();
    const { canDelete } = useCurrentUser();
    const reclamationsQuery = useMemo(() => query(collection(db, 'dossiers', dossierId, 'reclamations'), orderBy('createdAt', 'desc')), [db, dossierId]);
    const { data: list, loading } = useCollection(reclamationsQuery);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleAdd = async () => {
        const id = Date.now().toString();
        const userEmail = auth?.currentUser?.email || 'Admin';
        const newRec = {
            id,
            date: new Date().toISOString().split('T')[0],
            objet: '',
            description: '',
            statut: 'Ouverte',
            reponse: '',
            createdAt: serverTimestamp(),
            createdBy: userEmail,
        };
        await setDoc(doc(db, 'dossiers', dossierId, 'reclamations', id), newRec);
    };

    const handleUpdate = (id: string, field: string, value: any) => {
        updateDoc(doc(db, 'dossiers', dossierId, 'reclamations', id), { [field]: value });
    };

    const handleDelete = async (id: string) => {
        await deleteDoc(doc(db, 'dossiers', dossierId, 'reclamations', id));
        toast({ title: t('Réclamation supprimée') });
        setDeleteId(null);
    };

    const formatTimestamp = (ts: any) => {
        if (!ts) return null;
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return format(date, "d MMM yyyy 'à' HH:mm", { locale: dateFnsLocale() });
    };

    if (loading) return (
        <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
                <CardTitle className="flex items-center gap-2">
                    {t('Réclamations')}
                    {list && list.length > 0 && (
                        <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[11px] font-medium tabular-nums text-ink-2">{list.length}</span>
                    )}
                </CardTitle>
                {/* One primary action per block (accent budget) — the réclamation
                    itself isn't a destructive act. */}
                <Button size="sm" onClick={handleAdd}><Plus className="mr-2 h-4 w-4" /> {t('Déposer une réclamation')}</Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {!list || list.length === 0 ? (
                        <EmptyState
                            key="empty-reclamations"
                            icon={<AlertTriangle />}
                            title={t('Aucune réclamation')}
                            description={t('Déposez une première réclamation avec le bouton ci-dessus.')}
                            dashed={false}
                        />
                    ) : (
                        list.map((r: any) => (
                            // Nested in paper → hairline outline, never a second tonal card.
                            <div key={r.id} className="group relative space-y-4 rounded-lg border border-hairline p-4">
                                <div className="flex items-center justify-between">
                                    <div className="t-caption flex items-center gap-3">
                                        {r.createdBy && (
                                            <span className="flex items-center gap-1">
                                                <User className="h-3 w-3" /> {r.createdBy}
                                            </span>
                                        )}
                                        {r.createdAt && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3" /> {formatTimestamp(r.createdAt)}
                                            </span>
                                        )}
                                    </div>
                                    {canDelete && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-ink-3 transition-opacity hover:text-destructive max-md:h-11 max-md:w-11 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:group-focus-within:opacity-100"
                                            onClick={() => setDeleteId(r.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <Label>{t('Date')}</Label>
                                        <DatePicker
                                            value={r.date ? new Date(r.date) : null}
                                            onChange={d => handleUpdate(r.id, 'date', d ? d.toISOString().split('T')[0] : '')}
                                        />
                                    </div>
                                    <div className="space-y-1 md:col-span-2"><Label>{t('Objet')}</Label><Input value={r.objet} onChange={e => handleUpdate(r.id, 'objet', e.target.value)} /></div>
                                    <div className="space-y-1 md:col-span-2"><Label>{t('Description')}</Label><Textarea value={r.description} onChange={e => handleUpdate(r.id, 'description', e.target.value)} rows={2} /></div>
                                    <div className="space-y-1">
                                        <Label>{t('Statut')}</Label>
                                        <Select value={r.statut} onValueChange={v => handleUpdate(r.id, 'statut', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Ouverte">{t('Ouverte')}</SelectItem>
                                                <SelectItem value="En cours">{t('En cours')}</SelectItem>
                                                <SelectItem value="Traitée">{t('Traitée')}</SelectItem>
                                                <SelectItem value="Fermée">{t('Fermée')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1 md:col-span-3"><Label>{t('Réponse / Résolution')}</Label><Textarea value={r.reponse} onChange={e => handleUpdate(r.id, 'reponse', e.target.value)} placeholder={t("Réponse de l'administration...")} /></div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>

            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('Supprimer cette réclamation ?')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('Cette action est irréversible.')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('Annuler')}</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={(e) => { e.preventDefault(); if (deleteId) handleDelete(deleteId); }}
                        >
                            {t('Supprimer')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
