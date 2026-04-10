'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collectionGroup, onSnapshot, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { UserCheck, Loader2, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/use-current-user';

interface PlanificationItem {
  id: string;
  dossierId: string;
  dossierNom?: string;
  assureNom?: string;
  compagnie?: string;
  expertRank?: string;
  agentTerrain: string;
  typeMission: string;
  dateRDV: any;
  zone: string;
  adresse: string;
  observation: string;
  createdAt: any;
  modifiedByName?: string;
  active?: boolean;
}

const MISSION_TABS = [
  { id: 'Avant', label: 'Avant' },
  { id: 'En cours', label: 'En cours' },
  { id: 'Après', label: 'Après' },
];

export default function AssignationsATGPage() {
  const db = useFirestore();
  const router = useRouter();
  const { profile } = useCurrentUser();
  const [planifications, setPlanifications] = useState<PlanificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Avant');

  useEffect(() => {
    if (!db) return;
    const q = query(
      collectionGroup(db, 'planifications'),
      orderBy('createdAt', 'desc'),
      limit(200)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const items: PlanificationItem[] = [];
      const dossierIdsToFetch = new Set<string>();

      for (const d of snap.docs) {
        const data = d.data();
        const dossierId = d.ref.parent.parent?.id || '';
        const item: PlanificationItem = {
          id: d.id,
          dossierId,
          agentTerrain: data.agentTerrain || '-',
          typeMission: data.typeMission || '-',
          dateRDV: data.dateRDV,
          zone: data.zone || '',
          adresse: data.adresse || '',
          observation: data.observation || '',
          createdAt: data.createdAt,
          modifiedByName: data.modifiedByName || '',
          active: data.active,
          dossierNom: data.dossierNom || '',
          assureNom: data.assureNom || '',
          compagnie: data.compagnie || '',
          expertRank: data.expertRank || '',
        };
        // If denormalized fields are missing, mark for enrichment
        if (!item.dossierNom && dossierId) {
          dossierIdsToFetch.add(dossierId);
        }
        items.push(item);
      }

      // Enrich items missing denormalized data
      if (dossierIdsToFetch.size > 0) {
        const dossierData: Record<string, any> = {};
        await Promise.all(
          Array.from(dossierIdsToFetch).map(async (dId) => {
            try {
              const dossierSnap = await getDoc(doc(db, 'dossiers', dId));
              if (dossierSnap.exists()) {
                const d = dossierSnap.data();
                dossierData[dId] = {
                  refExpert: d.refExpert || dId,
                  assureNom: `${d.assure?.nom || ''} ${d.assure?.prenom || ''}`.trim(),
                  compagnie: d.compagnie || '',
                  expertRank: d.expertRank || '',
                };
              }
            } catch { /* ignore */ }
          })
        );
        items.forEach(item => {
          if (!item.dossierNom && dossierData[item.dossierId]) {
            const dd = dossierData[item.dossierId];
            item.dossierNom = dd.refExpert;
            item.assureNom = item.assureNom || dd.assureNom;
            item.compagnie = item.compagnie || dd.compagnie;
            item.expertRank = item.expertRank || dd.expertRank;
          }
        });
      }

      // ATG users only see their own assignments
      if (profile?.role === 'Agent de Terrain' && profile?.nom) {
        const myName = profile.nom.toLowerCase().trim();
        setPlanifications(items.filter(p => p.agentTerrain.toLowerCase().trim() === myName));
      } else {
        setPlanifications(items);
      }
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [db, profile?.role, profile?.nom]);

  const countByType = useMemo(() => {
    const counts: Record<string, number> = { 'Avant': 0, 'En cours': 0, 'Après': 0 };
    planifications.forEach(p => {
      const type = normalizeType(p.typeMission);
      if (counts[type] !== undefined) counts[type]++;
    });
    return counts;
  }, [planifications]);

  const filteredPlanifications = useMemo(() => {
    return planifications.filter(p => normalizeType(p.typeMission) === activeTab);
  }, [planifications, activeTab]);

  const formatDate = (ts: any) => {
    if (!ts) return '-';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    try { return format(date, "d MMM yyyy HH:mm", { locale: fr }); }
    catch { return '-'; }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserCheck className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Assignations Agent de Terrain</h1>
        <Badge variant="secondary" className="ml-2">{countByType['Avant'] + countByType['En cours'] + countByType['Après']}</Badge>
      </div>

      {/* Mission type tabs */}
      <div className="bg-card border rounded-xl shadow-sm sticky top-0 z-20">
        <div className="flex overflow-x-auto no-scrollbar">
          {MISSION_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-6 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
                  isActive
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent'
                )}
              >
                {tab.label}
                <Badge
                  variant={isActive ? 'default' : 'secondary'}
                  className="text-[10px] font-mono ml-1 h-5 min-w-[20px] justify-center"
                >
                  {countByType[tab.id] || 0}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-bold text-xs">Dossier</TableHead>
                <TableHead className="font-bold text-xs">Assuré</TableHead>
                <TableHead className="font-bold text-xs">Compagnie</TableHead>
                <TableHead className="font-bold text-xs">Expert</TableHead>
                <TableHead className="font-bold text-xs">Agent</TableHead>
                <TableHead className="font-bold text-xs">Date RDV</TableHead>
                <TableHead className="font-bold text-xs">Zone</TableHead>
                <TableHead className="font-bold text-xs">Créé le</TableHead>
                <TableHead className="font-bold text-xs">Assigné par</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : filteredPlanifications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    Aucune planification {activeTab.toLowerCase()} trouvée.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlanifications.map((p) => (
                  <TableRow
                    key={`${p.dossierId}-${p.id}`}
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/assignations-atg/${p.dossierId}`)}
                  >
                    <TableCell className="font-semibold text-sm text-primary">{p.dossierNom || p.dossierId}</TableCell>
                    <TableCell className="text-xs">{p.assureNom || '-'}</TableCell>
                    <TableCell className="text-xs">{p.compagnie || '-'}</TableCell>
                    <TableCell>
                      {p.expertRank ? (
                        <Badge variant="outline" className="text-[10px]">{p.expertRank}</Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="font-medium text-sm">{p.agentTerrain}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(p.dateRDV)}</TableCell>
                    <TableCell>
                      {p.zone ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3 shrink-0" /> {p.zone}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.modifiedByName || '-'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function normalizeType(type: string): string {
  if (type === 'Apres' || type === 'Après') return 'Après';
  if (type === 'En cours') return 'En cours';
  if (type === 'Avant') return 'Avant';
  return type;
}
