'use client';

import React, { useMemo, useState } from 'react';
import { Pencil, Calendar as CalendarIcon, User, MapPin, Plus, Info, Clock, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
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
      orderBy('createdAt', 'desc')
    ), [db, dossierId]);

    const { data: plans, loading } = useCollection<any>(planQuery);
    const [expandedPlan, setExpandedPlan] = useState<any>(null);

    const formatTimestamp = (ts: any) => {
        if (!ts) return 'N/A';
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return format(date, "d MMMM yyyy 'à' HH:mm", { locale: fr });
    };

    const formatShortDate = (ts: any) => {
        if (!ts) return '-';
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return format(date, "dd/MM/yyyy HH:mm", { locale: fr });
    };

    if (loading) return <Skeleton className="h-[300px] w-full" />;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-end">
                <Button size="sm" onClick={onNewPlanification}>
                  <Plus className="mr-2 h-4 w-4" /> Nouvelle planification
                </Button>
            </div>

            {!plans || plans.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-20 text-center border-dashed">
                    <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <CardTitle>Aucune planification</CardTitle>
                    <CardDescription className="mb-6">Ce dossier n'a pas encore de mission planifiée.</CardDescription>
                    <Button onClick={onNewPlanification}>Programmer une mission</Button>
                </Card>
            ) : (
                <Card className="overflow-hidden shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableHead className="font-bold text-xs">#</TableHead>
                                    <TableHead className="font-bold text-xs">Type Mission</TableHead>
                                    <TableHead className="font-bold text-xs">Date & Heure RDV</TableHead>
                                    <TableHead className="font-bold text-xs">Agent</TableHead>
                                    <TableHead className="font-bold text-xs">Zone</TableHead>
                                    <TableHead className="font-bold text-xs">Observation</TableHead>
                                    <TableHead className="font-bold text-xs text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {plans.map((plan: any, index: number) => (
                                    <TableRow
                                        key={plan.id}
                                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => setExpandedPlan(plan)}
                                    >
                                        <TableCell className="font-mono text-xs font-bold text-primary">
                                            {plans.length - index}
                                            {index === 0 && (
                                                <Badge variant="default" className="ml-2 text-[9px] px-1 h-4">Dernière</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="capitalize text-xs">
                                                {plan.typeMission || 'N/A'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs font-medium">
                                            {formatShortDate(plan.dateRDV)}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {plan.agentTerrain || <span className="text-muted-foreground italic">Non assigné</span>}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {plan.zone || '-'}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                                            <span className="truncate block">{plan.observation || '-'}</span>
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onEditPlanification(plan)}>
                                                <Pencil className="mr-1.5 h-3 w-3" /> Modifier
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Lightbox dialog for expanded planification */}
            <Dialog open={!!expandedPlan} onOpenChange={(open) => { if (!open) setExpandedPlan(null); }}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-primary">
                            <CalendarIcon className="h-5 w-5" />
                            Détails de la Planification
                        </DialogTitle>
                    </DialogHeader>
                    {expandedPlan && (
                        <div className="space-y-5 py-2">
                            <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="capitalize text-sm px-3 py-1">
                                    {expandedPlan.typeMission || 'N/A'}
                                </Badge>
                                {expandedPlan.createdAt && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        Créée le {formatTimestamp(expandedPlan.createdAt)}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1 p-3 rounded-lg bg-muted/30 border">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Date & Heure RDV</p>
                                    <p className="font-semibold text-sm flex items-center gap-2">
                                        <CalendarIcon className="h-4 w-4 text-primary" />
                                        {formatTimestamp(expandedPlan.dateRDV)}
                                    </p>
                                </div>

                                <div className="space-y-1 p-3 rounded-lg bg-muted/30 border">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Agent de Terrain</p>
                                    <p className="font-semibold text-sm flex items-center gap-2">
                                        <User className="h-4 w-4 text-primary" />
                                        {expandedPlan.agentTerrain || 'Non assigné'}
                                    </p>
                                </div>

                                <div className="space-y-1 p-3 rounded-lg bg-muted/30 border">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Zone d'intervention</p>
                                    <p className="font-semibold text-sm flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        {expandedPlan.zone || 'N/A'}
                                    </p>
                                </div>

                                <div className="space-y-1 p-3 rounded-lg bg-muted/30 border">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Modifié par</p>
                                    <p className="font-semibold text-sm flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        {expandedPlan.modifiedByName || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1 p-3 rounded-lg bg-muted/30 border">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Adresse complète</p>
                                <p className="font-medium text-sm">{expandedPlan.adresse || 'N/A'}</p>
                            </div>

                            {expandedPlan.observation && (
                                <div className="space-y-1 p-3 rounded-lg bg-muted/30 border border-dashed">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <Info className="h-3 w-3" /> Observation / Notes
                                    </p>
                                    <p className="text-sm italic text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                        {expandedPlan.observation}
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <Button variant="outline" size="sm" onClick={() => { setExpandedPlan(null); onEditPlanification(expandedPlan); }}>
                                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Modifier cette planification
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
