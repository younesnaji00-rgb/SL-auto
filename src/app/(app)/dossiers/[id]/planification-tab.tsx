'use client';

import React, { useMemo } from 'react';
import { Pencil, RotateCcw, Calendar as CalendarIcon, User, MapPin, Plus, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

type PlanificationTabProps = {
  dossierId: string;
  onOpenHistory: () => void;
  onEditPlanification: (data: any) => void;
  onNewPlanification: () => void;
};

export default function PlanificationTab({ 
  dossierId, 
  onOpenHistory, 
  onEditPlanification, 
  onNewPlanification 
}: PlanificationTabProps) {
    const db = useFirestore();
    const planQuery = useMemo(() => query(
      collection(db, 'dossiers', dossierId, 'planifications'), 
      orderBy('createdAt', 'desc'), 
      limit(1)
    ), [db, dossierId]);
    
    const { data: plans, loading } = useCollection<any>(planQuery);
    const plan = plans?.[0];

    const formatTimestamp = (ts: any) => {
        if (!ts) return 'N/A';
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return format(date, "d MMMM yyyy 'à' HH:mm", { locale: fr });
    };

    if (loading) return <Skeleton className="h-[300px] w-full" />;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-4">
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={onOpenHistory} title="Voir l'historique des modifications">
                      <RotateCcw className="mr-2 h-4 w-4" /> Réinitialiser
                    </Button>
                    {plan && (
                      <Button variant="outline" size="sm" onClick={() => onEditPlanification(plan)}>
                        <Pencil className="mr-2 h-4 w-4" /> Modifier
                      </Button>
                    )}
                    <Button size="sm" onClick={onNewPlanification}>
                      <Plus className="mr-2 h-4 w-4" /> Nouvelle planification
                    </Button>
                </div>
            </div>

            {!plan ? (
                <Card className="flex flex-col items-center justify-center p-20 text-center border-dashed">
                    <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <CardTitle>Aucune planification</CardTitle>
                    <CardDescription className="mb-6">Ce dossier n'a pas encore de mission planifiée.</CardDescription>
                    <Button onClick={onNewPlanification}>Programmer une mission</Button>
                </Card>
            ) : (
                <Card className="overflow-hidden">
                    <CardHeader className="bg-primary/5 border-b">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-primary">
                                <CalendarIcon className="h-5 w-5" /> 
                                Détails du rendez-vous
                            </CardTitle>
                            <Badge variant="secondary" className="capitalize">{plan.typeMission || 'N/A'}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Date & Heure RDV</p>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-lg">{formatTimestamp(plan.dateRDV)}</span>
                            </div>
                        </div>
                        
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Agent de Terrain</p>
                            <p className="font-medium flex items-center gap-2">
                                <User className="h-4 w-4 text-primary" /> 
                                {plan.agentTerrain || 'Non assigné'}
                            </p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Zone d'intervention</p>
                            <p className="font-medium flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-primary" />
                                {plan.zone || 'N/A'}
                            </p>
                        </div>

                        <div className="space-y-1 lg:col-span-2">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Adresse complète</p>
                            <p className="font-medium">{plan.adresse || 'N/A'}</p>
                        </div>

                        <div className="space-y-1 lg:col-span-3 pt-4 border-t border-dashed">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Info className="h-3 w-3" /> Observation / Notes
                            </p>
                            <p className="text-sm italic text-muted-foreground leading-relaxed">
                                {plan.observation ? `"${plan.observation}"` : "Aucune observation particulière."}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
