'use client';

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronRight, Inbox } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { EmptyState } from '@/components/ui/empty-state';

import { STEP_LABELS, type DossierForStep, type StepKey } from './funnel';

// Map each funnel step to the dossier-timeline section it belongs in.
// The dossier detail page renders `<section id="step-N">` (1..7), so a
// hash navigation lands directly on the right step.
const STEP_TO_TIMELINE: Record<StepKey, number> = {
  creation: 3,        // Information
  photosAvant: 5,     // Pièces jointes
  photosEnCours: 5,   // Pièces jointes
  photosApres: 5,     // Pièces jointes
  accord: 6,          // Chiffrage
  facture: 7,         // Rapport (facturation lives here)
  rapportValide: 7,   // Rapport
  rapport: 7,         // Rapport
};

export interface UserLookup {
  byKey: Map<string, string>;
}

const SYSTEM_LABELS: Record<string, string> = {
  system: 'Système',
  'admin-guest': 'Invité (admin)',
};

const resolveUserName = (raw: string | null | undefined, lookup: UserLookup): string => {
  if (!raw) return '—';
  const trimmed = raw.trim();
  if (SYSTEM_LABELS[trimmed]) return SYSTEM_LABELS[trimmed];
  const direct = lookup.byKey.get(trimmed);
  if (direct) return direct;
  const lower = lookup.byKey.get(trimmed.toLowerCase());
  if (lower) return lower;
  if (trimmed.includes('@')) return trimmed.split('@')[0];
  if (trimmed.length > 16) return `${trimmed.slice(0, 6)}…`;
  return trimmed;
};

const dossierIdentifier = (d: any): string => {
  if (d.refExpert) return d.refExpert;
  if (d.matricule) return d.matricule;
  if (d.assure && typeof d.assure === 'object') {
    const full = `${d.assure.prenom ?? ''} ${d.assure.nom ?? ''}`.trim();
    if (full) return full;
  }
  if (typeof d.assure === 'string' && d.assure) return d.assure;
  return d.id;
};

export function DossierDrawer({
  open,
  onOpenChange,
  step,
  mode,
  rows,
  userLookup,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  step: StepKey | null;
  mode: 'realise' | 'nonRealise';
  rows: DossierForStep[];
  userLookup: UserLookup;
}) {
  const router = useRouter();

  const navigate = (id: string) => {
    onOpenChange(false);
    const hash = step ? `#step-${STEP_TO_TIMELINE[step]}` : '';
    router.push(`/dossiers/${id}${hash}`);
  };

  const isNonRealise = mode === 'nonRealise';
  const stepLabel = step ? STEP_LABELS[step] : 'Dossiers';
  const title = step ? `${stepLabel} — ${isNonRealise ? 'non réalisé' : 'réalisé'}` : 'Dossiers';
  const description = rows.length === 0
    ? (isNonRealise
        ? 'Aucun dossier en attente sur cette étape.'
        : 'Aucun dossier n’a franchi cette étape.')
    : `${rows.length} dossier${rows.length > 1 ? 's' : ''} ${isNonRealise ? 'en attente sur cette étape' : 'ayant franchi cette étape'}.`;
  const emptyDescription = isNonRealise
    ? 'Tous les dossiers en périmètre ont franchi cette étape.'
    : 'Aucun dossier n’est encore associé à cette étape.';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-1">
          {rows.length === 0 ? (
            <EmptyState
              icon={<Inbox />}
              title="Aucun dossier"
              description={emptyDescription}
            />
          ) : (
            rows.map(({ dossier, doneAt, author }) => (
              <button
                key={dossier.id}
                type="button"
                onClick={() => navigate(dossier.id)}
                className="group flex w-full items-center justify-between gap-3 rounded-md border border-transparent p-3 text-left transition hover:border-border hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{dossierIdentifier(dossier)}</div>
                  {!isNonRealise && (
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>par {resolveUserName(author, userLookup)}</span>
                      {doneAt && (
                        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {format(doneAt, 'dd/MM/yyyy HH:mm', { locale: fr })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-foreground" />
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
