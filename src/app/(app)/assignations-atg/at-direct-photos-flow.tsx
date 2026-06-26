'use client';

import { useEffect, useMemo, useState } from 'react';
import { Camera, Search } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFirestore } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';

const MAX_RESULTS = 20;

export default function AtDirectPhotosFlow() {
  const db = useFirestore();
  const { profile } = useCurrentUser();
  const router = useRouter();
  const canUse = profile?.role === 'Agent de Terrain' || profile?.role === 'Admin';

  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [allDossiers, setAllDossiers] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchOpen || loaded || !db) return;
    let cancelled = false;
    setLoading(true);
    getDocs(collection(db, 'dossiers'))
      .then((snap) => {
        if (cancelled) return;
        setAllDossiers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoaded(true);
      })
      .catch((err) => {
        console.warn('[at-direct-photos] dossier fetch failed', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [searchOpen, loaded, db]);

  const eligible = useMemo(
    () => allDossiers.filter((d) => d.statut === 'Création dossier'),
    [allDossiers],
  );

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return eligible.slice(0, MAX_RESULTS);
    const matched = eligible.filter((d) => {
      const assureText =
        typeof d.assure === 'string'
          ? d.assure
          : `${d.assure?.nom || ''} ${d.assure?.prenom || ''}`;
      return (
        d.refExpert?.toLowerCase().includes(s) ||
        assureText.toLowerCase().includes(s) ||
        d.matricule?.toLowerCase().includes(s) ||
        d.vehicule?.immatriculation?.toLowerCase().includes(s) ||
        d.vehicule?.immatriculationAnterieur?.toLowerCase().includes(s)
      );
    });
    return matched.slice(0, MAX_RESULTS);
  }, [q, eligible]);

  if (!canUse) return null;

  const handlePick = (d: any) => {
    setSearchOpen(false);
    setQ('');
    router.push(`/assignations-atg/${d.id}?mission=Avant`);
  };

  const assureLabel = (d: any) => {
    if (typeof d.assure === 'string') return d.assure || '—';
    return `${d.assure?.nom || ''} ${d.assure?.prenom || ''}`.trim() || '—';
  };

  const hasQuery = q.trim() !== '';

  return (
    <>
      <Button
        type="button"
        size="sm"
        onClick={() => setSearchOpen(true)}
        className="h-9 gap-1.5 text-xs"
      >
        <Camera className="h-3.5 w-3.5" />
        Ajouter photos
      </Button>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>Ajouter des photos</DialogTitle>
            <DialogDescription>
              Recherchez un dossier en attente par matricule, immatriculation ou nom de l&apos;assuré.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tapez une référence, un matricule ou un nom..."
              className="pl-8"
              autoFocus
            />
          </div>

          <div className="max-h-[320px] overflow-y-auto rounded border border-border/40">
            {loading && !loaded ? (
              <div className="p-4 text-xs text-muted-foreground">Chargement...</div>
            ) : results.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground">
                {hasQuery
                  ? 'Aucun dossier en attente correspondant.'
                  : 'Aucun dossier en attente actuellement.'}
              </div>
            ) : (
              <ul>
                {results.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => handlePick(d)}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-muted/50 focus:bg-muted/50 focus:outline-none border-b border-border/20 last:border-b-0"
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-primary tabular-nums">
                          {d.refExpert || d.id}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {d.compagnie || '—'}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-baseline justify-between gap-2 text-muted-foreground">
                        <span>{assureLabel(d)}</span>
                        <span className="font-mono">
                          {d.matricule || d.vehicule?.immatriculation || '—'}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setSearchOpen(false)}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
