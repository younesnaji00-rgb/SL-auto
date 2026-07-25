'use client';

import React, { useEffect, useState } from 'react';
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
import { useFirestore } from '@/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { useT, dateFnsLocale } from '@/i18n';
import { cn } from '@/lib/utils';
import { useReplayHighlight, highlightClass, ChangeBadge } from '@/components/dossier-timeline/replay-highlight';

type PlanificationTabProps = {
  dossierId: string;
  onOpenHistory: () => void;
  onEditPlanification: (data: any) => void;
  onNewPlanification: (defaultType?: 'Avant' | 'En cours' | 'Après') => void;
  typeFilter?: 'Avant' | 'En cours' | 'Après';
};

export default function PlanificationTab({
  dossierId,
  onOpenHistory,
  onEditPlanification,
  onNewPlanification,
  typeFilter
}: PlanificationTabProps) {
    const t = useT();
    const db = useFirestore();
    const [plans, setPlans] = useState<any[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedPlan, setExpandedPlan] = useState<any>(null);
    // Inert on the live page; tints planifications added/modified by the
    // gestionnaire in the rappel treatment replica.
    const hl = useReplayHighlight();

    useEffect(() => {
        const q = query(
            collection(db, 'dossiers', dossierId, 'planifications'),
            orderBy('createdAt', 'desc')
        );
        const unsub = onSnapshot(
            q,
            (snap) => {
                setPlans(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
                setLoading(false);
            },
            (err) => {
                console.warn('[planification-tab] listener error', err);
                setLoading(false);
            }
        );
        return () => unsub();
    }, [db, dossierId]);

    const formatTimestamp = (ts: any) => {
        if (!ts) return 'N/A';
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return format(date, "d MMMM yyyy 'à' HH:mm", { locale: dateFnsLocale() });
    };

    const formatShortDate = (ts: any) => {
        if (!ts) return '-';
        const date = ts.toDate ? ts.toDate() : new Date(ts);
        return format(date, "dd/MM/yyyy HH:mm", { locale: dateFnsLocale() });
    };

    if (loading) return <Skeleton className="h-[300px] w-full" />;

    const visiblePlans = typeFilter
        ? (plans ?? []).filter((p: any) => p.typeMission === typeFilter)
        : (plans ?? []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-end">
                <Button size="sm" onClick={() => onNewPlanification(typeFilter)}>
                  <Plus className="mr-2 h-4 w-4" /> {t('Nouvelle planification')}
                </Button>
            </div>

            {!visiblePlans || visiblePlans.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-20 text-center border-dashed">
                    <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                    <CardTitle>{t('Aucune planification')}</CardTitle>
                    <CardDescription className="mb-6">{t("Ce dossier n'a pas encore de mission planifiée.")}</CardDescription>
                    <Button onClick={() => onNewPlanification(typeFilter)}>{t('Programmer une mission')}</Button>
                </Card>
            ) : (
                <Card className="overflow-hidden shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableHead className="font-bold text-xs">#</TableHead>
                                    <TableHead className="font-bold text-xs">{t('Type Mission')}</TableHead>
                                    <TableHead className="font-bold text-xs">{t('Date & Heure RDV')}</TableHead>
                                    <TableHead className="font-bold text-xs">{t('Agent')}</TableHead>
                                    <TableHead className="font-bold text-xs">{t('Zone')}</TableHead>
                                    <TableHead className="font-bold text-xs">{t('Observation')}</TableHead>
                                    <TableHead className="font-bold text-xs text-right">{t('Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {visiblePlans.map((plan: any, index: number) => {
                                  const replayStatus = hl.statusForEntry('planifications', plan.id);
                                  return (
                                    <TableRow
                                        key={plan.id}
                                        className={cn("cursor-pointer hover:bg-muted/50 transition-colors", highlightClass(replayStatus))}
                                        onClick={() => setExpandedPlan(plan)}
                                    >
                                        <TableCell className="font-mono text-xs font-bold text-primary">
                                            {visiblePlans.length - index}
                                            {index === 0 && (
                                                <Badge variant="default" className="ml-2 text-[9px] px-1 h-4">{t('Dernière')}</Badge>
                                            )}
                                            <ChangeBadge status={replayStatus} className="ml-1 align-middle" />
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="capitalize text-xs">
                                                {plan.typeMission ? t(plan.typeMission) : 'N/A'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs font-medium">
                                            {formatShortDate(plan.dateRDV)}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {plan.agentTerrain || <span className="text-muted-foreground italic">{t('Non assigné')}</span>}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {plan.zone || '-'}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                                            <span className="truncate block">{plan.observation || '-'}</span>
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onEditPlanification(plan)}>
                                                <Pencil className="mr-1.5 h-3 w-3" /> {t('Modifier')}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                  );
                                })}
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
                            {t('Détails de la Planification')}
                        </DialogTitle>
                    </DialogHeader>
                    {expandedPlan && (
                        <div className="space-y-5 py-2">
                            <div className="flex items-center gap-3">
                                <Badge variant="secondary" className="capitalize text-sm px-3 py-1">
                                    {expandedPlan.typeMission ? t(expandedPlan.typeMission) : 'N/A'}
                                </Badge>
                                {expandedPlan.createdAt && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {t('Créée le')} {formatTimestamp(expandedPlan.createdAt)}
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1 p-3 rounded-lg bg-muted/30 border">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('Date & Heure RDV')}</p>
                                    <p className="font-semibold text-sm flex items-center gap-2">
                                        <CalendarIcon className="h-4 w-4 text-primary" />
                                        {formatTimestamp(expandedPlan.dateRDV)}
                                    </p>
                                </div>

                                <div className="space-y-1 p-3 rounded-lg bg-muted/30 border">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('Agent de Terrain')}</p>
                                    <p className="font-semibold text-sm flex items-center gap-2">
                                        <User className="h-4 w-4 text-primary" />
                                        {expandedPlan.agentTerrain || t('Non assigné')}
                                    </p>
                                </div>

                                <div className="space-y-1 p-3 rounded-lg bg-muted/30 border">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Zone d'intervention")}</p>
                                    <p className="font-semibold text-sm flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-primary" />
                                        {expandedPlan.zone || 'N/A'}
                                    </p>
                                </div>

                                <div className="space-y-1 p-3 rounded-lg bg-muted/30 border">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('Modifié par')}</p>
                                    <p className="font-semibold text-sm flex items-center gap-2">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        {expandedPlan.modifiedByName || 'N/A'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1 p-3 rounded-lg bg-muted/30 border">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t('Adresse complète')}</p>
                                <p className="font-medium text-sm">{expandedPlan.adresse || 'N/A'}</p>
                            </div>

                            {expandedPlan.observation && (
                                <div className="space-y-1 p-3 rounded-lg bg-muted/30 border border-dashed">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                        <Info className="h-3 w-3" /> {t('Observation / Notes')}
                                    </p>
                                    <p className="text-sm italic text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                        {expandedPlan.observation}
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <Button variant="outline" size="sm" onClick={() => { setExpandedPlan(null); onEditPlanification(expandedPlan); }}>
                                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> {t('Modifier cette planification')}
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
