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
import { cn } from '@/lib/utils';

import { STEP_LABELS, type DossierForStep, type StepKey } from './funnel';

// Map each funnel step to the dossier-timeline section it belongs in.
// The dossier detail page renders `<section id="step-N">` (1..7), so a
// hash navigation lands directly on the right step.
const STEP_TO_TIMELINE: Record<StepKey, number> = {
  creation: 3,        // Information
  photosAvant: 5,     // Pièces jointes
  accord1er: 6,       // Chiffrage
  photosEnCours: 5,   // Pièces jointes
  photosApres: 5,     // Pièces jointes
  accord: 6,          // Chiffrage
  facture: 7,         // Rapport (facturation lives here)
  rapportValide: 7,   // Rapport
  rapport: 7,         // Rapport
  noteHonoraire: 7,   // Rapport (placeholder — no tracking yet)
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

/** Date block — the row's anchor (same tile as the planification rows). */
function DateBlock({ date }: { date: Date | null | undefined }) {
  return (
    <span className="flex w-14 shrink-0 flex-col items-center justify-center rounded-md bg-surface-3 py-1.5 text-center tabular-nums text-ink-2 shadow-rim">
      <span className="text-[11px] font-medium uppercase leading-none">{date ? format(date, 'MMM', { locale: fr }).replace('.', '') : '—'}</span>
      <span className="font-headline text-xl font-semibold leading-tight">{date ? format(date, 'd') : '—'}</span>
      <span className="text-[11px] leading-none">{date ? format(date, 'HH:mm') : ''}</span>
    </span>
  );
}

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
  mode: 'realise' | 'nonRealise' | 'horsDelai';
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
  const isHorsDelai = mode === 'horsDelai';
  const stepLabel = step ? STEP_LABELS[step] : 'Dossiers';
  const modeLabel = isNonRealise ? 'non réalisé' : isHorsDelai ? 'hors délai' : 'réalisé';
  const title = step ? `${stepLabel} — ${modeLabel}` : 'Dossiers';

  const description = rows.length === 0
    ? (isNonRealise
        ? 'Aucun dossier en attente sur cette étape.'
        : isHorsDelai
          ? 'Aucun dossier n’est hors délai sur cette étape.'
          : 'Aucun dossier n’a franchi cette étape.')
    : `${rows.length} dossier${rows.length > 1 ? 's' : ''} ${
        isNonRealise
          ? 'en attente sur cette étape'
          : isHorsDelai
            ? 'hors délai sur cette étape'
            : 'ayant franchi cette étape'
      }.`;

  const emptyDescription = isNonRealise
    ? 'Tous les dossiers en périmètre ont franchi cette étape.'
    : isHorsDelai
      ? 'Tous les dossiers en périmètre sont dans les délais.'
      : 'Aucun dossier n’est encore associé à cette étape.';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {rows.length === 0 ? (
            <EmptyState
              icon={<Inbox />}
              title="Aucun dossier"
              description={emptyDescription}
            />
          ) : (
            // Records as hairline-separated rows (blueprint §6 "lists of
            // events"): the completion date block anchors the row; the whole
            // row is the link (DESIGN.md §4).
            <ol className="divide-y divide-hairline">
              {rows.map(({ dossier, doneAt, author }) => (
                <li key={dossier.id}>
                  <button
                    type="button"
                    onClick={() => navigate(dossier.id)}
                    className={cn(
                      'group -mx-2 flex w-[calc(100%+1rem)] items-center gap-4 rounded-md px-2 text-left transition-colors hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isNonRealise ? 'py-2.5' : 'py-3',
                    )}
                  >
                    {!isNonRealise && <DateBlock date={doneAt} />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{dossierIdentifier(dossier)}</span>
                      {!isNonRealise && (
                        <span className="t-caption mt-0.5 block truncate tabular-nums">
                          par <span className="font-medium text-ink-2">{resolveUserName(author, userLookup)}</span>
                          {doneAt && <> · {format(doneAt, 'dd/MM/yyyy HH:mm', { locale: fr })}</>}
                        </span>
                      )}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-ink-4 transition-colors group-hover:text-ink" aria-hidden />
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
