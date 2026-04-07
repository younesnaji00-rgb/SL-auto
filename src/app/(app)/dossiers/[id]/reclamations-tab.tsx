'use client';

import React, { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFirestore, useCollection } from '@/firebase';
import { collection, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { DatePicker } from '@/components/ui/date-picker';

export default function ReclamationsTab({ dossierId }: { dossierId: string }) {
    const db = useFirestore();
    const { toast } = useToast();
    const reclamationsRef = useMemo(() => collection(db, 'dossiers', dossierId, 'reclamations'), [db, dossierId]);
    const { data: list, loading } = useCollection(reclamationsRef);

    const handleAdd = async () => {
        const id = Date.now().toString();
        const newRec = { id, date: new Date().toISOString().split('T')[0], objet: '', description: '', statut: 'Ouverte', reponse: '' };
        await setDoc(doc(db, 'dossiers', dossierId, 'reclamations', id), newRec);
    };

    const handleUpdate = (id: string, field: string, value: any) => {
        updateDoc(doc(db, 'dossiers', dossierId, 'reclamations', id), { [field]: value });
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Supprimer cette réclamation ?')) return;
        await deleteDoc(doc(db, 'dossiers', dossierId, 'reclamations', id));
        toast({ title: 'Réclamation supprimée' });
    };

    if (loading) return <Skeleton className="h-[400px] w-full" />;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Réclamations</CardTitle>
                <Button variant="destructive" size="sm" onClick={handleAdd}><Plus className="mr-2 h-4 w-4" /> Déposer une réclamation</Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-6">
                    {!list || list.length === 0 ? (
                        <div key="empty-reclamations" className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">Aucune réclamation.</div>
                    ) : (
                        list.map((r: any) => (
                            <div key={r.id} className="p-4 border rounded-lg space-y-4 group relative">
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="absolute top-2 right-2 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDelete(r.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <Label>Date</Label>
                                        <DatePicker 
                                            value={r.date ? new Date(r.date) : null} 
                                            onChange={d => handleUpdate(r.id, 'date', d ? d.toISOString().split('T')[0] : '')} 
                                        />
                                    </div>
                                    <div className="space-y-1 md:col-span-2"><Label>Objet</Label><Input value={r.objet} onChange={e => handleUpdate(r.id, 'objet', e.target.value)} /></div>
                                    <div className="space-y-1 md:col-span-2"><Label>Description</Label><Textarea value={r.description} onChange={e => handleUpdate(r.id, 'description', e.target.value)} rows={2} /></div>
                                    <div className="space-y-1">
                                        <Label>Statut</Label>
                                        <Select value={r.statut} onValueChange={v => handleUpdate(r.id, 'statut', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Ouverte">Ouverte</SelectItem>
                                                <SelectItem value="En cours">En cours</SelectItem>
                                                <SelectItem value="Traitée">Traitée</SelectItem>
                                                <SelectItem value="Fermée">Fermée</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1 md:col-span-3"><Label>Réponse / Résolution</Label><Textarea value={r.reponse} onChange={e => handleUpdate(r.id, 'reponse', e.target.value)} placeholder="Réponse de l'administration..." /></div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
