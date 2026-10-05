import { Skeleton } from '@/components/ui/skeleton';

/**
 * Mirrors the chiffrage record (element-specs §15: NN/g skeleton screens ✓
 * mirror the final layout): compact header line (back button · title +
 * subtitle · action pill) → « Devis & factures » board (title, then two
 * family bands — header band + a row of slot cards, as on the dossier page)
 * → documents filter panel block → observations collapsible bar last (spec
 * B4 order).
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl space-y-8" aria-busy="true" aria-live="polite">
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-40" />
        {/* Two family bands (Devis Garage, Facture Garage): header band, then
            the source · accord · proposition cards. */}
        {[0, 1].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
              <Skeleton className="h-[120px] rounded-[10px]" />
              <Skeleton className="h-[120px] rounded-[10px]" />
              <Skeleton className="h-[120px] rounded-[10px] max-xl:hidden" />
            </div>
          </div>
        ))}
      </div>
      {/* Documents filter panel block. */}
      <Skeleton className="h-64 w-full rounded-xl" />
      {/* Observations collapsible bar (last — spec B4). */}
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  );
}
