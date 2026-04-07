
'use client';

import React, { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePicker } from '@/components/ui/date-picker';

export default function MissionsTab({ dossierId }: { dossierId: string }) {
    const db = useFirestore();
    const { toast } = useToast();
    const missionsRef = useMemo(() => collection(db, 'dossiers', dossierId, 'missions'), [db, dossierId]);
    const { data: missions, loading } = useCollection(missionsRef);

    const handleAdd = async () => {
        const id = Date.now().toString();
        const newMission = { id, date: '', type: 'Expertise', expert: '', statut: 'Planifiée' };
        await setDoc(doc(db, 'dossiers', dossierId, 'missions', id), newMission);
    };

    const handleUpdate = (id: string, field: string, value: string) => {
        updateDoc(doc(db, 'dossiers', dossierId, 'missions', id), { [field]: value });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer cette mission ?')) return;
        await deleteDoc(doc(db, 'dossiers', dossierId, 'missions', id));
        toast({ title: 'Mission supprimée' });
    };

    if (loading) return <Skeleton className="h-[300px] w-full" />;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Missions liées</CardTitle>
                <Button variant="outline" size="sm" onClick={handleAdd}><Plus className="mr-2 h-4 w-4" /> Nouvelle mission</Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Assigné à</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {missions?.length === 0 ? (
                            <TableRow key="empty-missions"><TableCell colSpan={5} className="text-center py-10 text-muted-foreground">Aucune mission enregistrée.</TableCell></TableRow>
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
                                                <SelectItem value="Expertise">Expertise</SelectItem>
                                                <SelectItem value="Suivi">Suivi</SelectItem>
                                                <SelectItem value="Prélèvement">Prélèvement</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell><Input value={m.expert} onChange={e => handleUpdate(m.id, 'expert', e.target.value)} placeholder="Nom de l'expert" /></TableCell>
                                    <TableCell>
                                        <Select value={m.statut} onValueChange={v => handleUpdate(m.id, 'statut', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Planifiée">Planifiée</SelectItem>
                                                <SelectItem value="En cours">En cours</SelectItem>
                                                <SelectItem value="Terminée">Terminée</SelectItem>
                                                <SelectItem value="Annulée">Annulée</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell><Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(m.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
