"use client";

/**
 * Chiffreur picker of « Envoyer au chiffrage ».
 *
 * A plain dropdown of the Chiffreur ACCOUNTS (use-assignable-chiffreurs.ts).
 * There is no way to add, edit or delete a chiffreur here (owner ruling
 * 2026-09-24): chiffreurs are managed in Utilisateurs, where creating the
 * account also links it to the chiffreur directory. The old « + » / « Gérer
 * les chiffreurs » window let people create directory entries with no
 * account behind them, and a dossier sent to one reached nobody.
 */
import { useAssignableChiffreurs } from "@/hooks/use-assignable-chiffreurs";
import { useChiffreurWorkload } from "@/hooks/use-workload-counts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useT } from "@/i18n";

interface Props {
  /** Called when the user picks a chiffreur from the dropdown (returns ID) */
  onSelectId?: (id: string) => void;
  /** Currently selected chiffreur id */
  selectedId?: string;
}

export function ChiffreurDialog({ onSelectId, selectedId }: Props) {
  const t = useT();
  const { chiffreurs, loading } = useAssignableChiffreurs();
  const workload = useChiffreurWorkload();

  return (
    <div className="space-y-1.5">
      <Select value={selectedId || ""} onValueChange={(val) => onSelectId?.(val)} disabled={!loading && chiffreurs.length === 0}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={loading ? t('Chargement…') : t('Choisir un chiffreur')} />
        </SelectTrigger>
        <SelectContent>
          {chiffreurs.map((c) => {
            const count = workload[c.id] || 0;
            return (
              <SelectItem key={c.id} value={c.id}>
                <span className="flex items-center gap-2">
                  <span>{c.nom}</span>
                  {count > 0 && (
                    // Workload count — element-specs §11: a plain count is
                    // information, not an exception → neutral count pill.
                    <span
                      className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2"
                      title={`${count} ${t('dossier(s) en cours')}`}
                    >
                      {count}
                    </span>
                  )}
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      {!loading && chiffreurs.length === 0 && (
        <p className="t-caption text-status-warning-fg">
          {t('Aucun compte chiffreur actif. Créez un utilisateur avec le rôle Chiffreur dans Utilisateurs.')}
        </p>
      )}
    </div>
  );
}
