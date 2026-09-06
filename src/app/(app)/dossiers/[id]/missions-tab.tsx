'use client';

import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SkeletonRow } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { DatePicker } from '@/components/ui/date-picker';
import { useT } from '@/i18n';
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

export default function MissionsTab({ dossierId }: { dossierId: string }) {
    const db = useFirestore();
    const { toast } = useToast();
    const t = useT();
    const { canDelete } = useCurrentUser();
    const missionsRef = useMemo(() => collection(db, 'dossiers', dossierId, 'missions'), [db, dossierId]);
    const { data: missions, loading } = useCollection(missionsRef);

    const [deleteId, setDeleteId] = useState<string | null>(null);

    const handleAdd = async () => {
        const id = Date.now().toString();
        const newMission = { id, date: '', type: 'Expertise', expert: '', statut: 'Planifiée' };
        await setDoc(doc(db, 'dossiers', dossierId, 'missions', id), newMission);
    };

    const handleUpdate = (id: string, field: string, value: string) => {
        updateDoc(doc(db, 'dossiers', dossierId, 'missions', id), { [field]: value });
    };

    const handleDelete = async (id: string) => {
        await deleteDoc(doc(db, 'dossiers', dossierId, 'missions', id));
        toast({ title: t('Mission supprimée') });
        setDeleteId(null);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>{t('Missions liées')}</CardTitle>
                <Button variant="outline" size="sm" onClick={handleAdd}><Plus className="mr-2 h-4 w-4" /> {t('Nouvelle mission')}</Button>
            </CardHeader>
            <CardContent>
                {/* Phone: a 5-column record table survives only as a scroll
                    region (mobile-synthesis §4) — the PAGE never pans. */}
                <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('Date')}</TableHead>
                            <TableHead>{t('Type')}</TableHead>
                            <TableHead>{t('Assigné à')}</TableHead>
                            <TableHead>{t('Statut')}</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <TableRow key={`sk-${i}`}>
                                    <TableCell colSpan={5} className="p-0"><SkeletonRow /></TableCell>
                                </TableRow>
                            ))
                        ) : missions?.length === 0 ? (
                            <TableRow key="empty-missions">
                                <TableCell colSpan={5} className="p-0">
                                    <EmptyState
                                        icon={<Calendar />}
                                        title={t('Aucune mission enregistrée')}
                                        description={t('Créez la première mission avec le bouton ci-dessus.')}
                                        dashed={false}
                                        className="border-0 bg-transparent py-8"
                                    />
                                </TableCell>
                            </TableRow>
                        ) : (
                            missions?.map((m: any) => (
                                <TableRow key={m.id}>
                                    <TableCell>
                                        <DatePicker
                                            value={m.date ? new Date(m.date) : null}
                                            onChange={d => handleUpdate(m.id, 'date', d ? d.toISOString().split('T')[0] : '')}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select value={m.type} onValueChange={v => handleUpdate(m.id, 'type', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Expertise">{t('Expertise')}</SelectItem>
                                                <SelectItem value="Suivi">{t('Suivi')}</SelectItem>
                                                <SelectItem value="Prélèvement">{t('Prélèvement')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell><Input value={m.expert} onChange={e => handleUpdate(m.id, 'expert', e.target.value)} placeholder={t("Nom de l'expert")} /></TableCell>
                                    <TableCell>
                                        <Select value={m.statut} onValueChange={v => handleUpdate(m.id, 'statut', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Planifiée">{t('Planifiée')}</SelectItem>
                                                <SelectItem value="En cours">{t('En cours')}</SelectItem>
                                                <SelectItem value="Terminée">{t('Terminée')}</SelectItem>
                                                <SelectItem value="Annulée">{t('Annulée')}</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell>{canDelete && <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(m.id)}><Trash2 className="h-4 w-4" /></Button>}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                </div>
            </CardContent>

            <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('Supprimer cette mission ?')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('Cette action est irréversible.')}
                        </AlertDialogDescription>
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
