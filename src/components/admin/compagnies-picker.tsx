'use client';

/**
 * « Compagnies d'assurance » of an account. An account's `compagnies` limit
 * the dossiers it sees, and an EMPTY list means no limit — the only way to
 * see every compagnie, the ones added later included. Ticking every compagnie
 * one by one saves the names of that day: a compagnie added to the list
 * afterwards is not on the account, and its dossiers leave it (owner report
 * 2026-10-27: « a gestionnaire with all the compagnies can't see them all »).
 * Hence an explicit « Toutes les compagnies » box, saved as the empty list.
 */

import { Checkbox } from '@/components/ui/checkbox';
import { MultiSelect } from '@/components/ui/multi-select';
import { useT } from '@/i18n';
import { compagnieKey } from '@/lib/compagnie-name';
import { cn } from '@/lib/utils';

export function CompagniesPicker({
  all,
  onAllChange,
  value,
  onChange,
  options,
  className,
}: {
  /** « Toutes les compagnies »: saved as an empty `compagnies` list. */
  all: boolean;
  onAllChange: (all: boolean) => void;
  value: string[];
  onChange: (compagnies: string[]) => void;
  /** The active compagnies of the list. */
  options: { value: string; label: string }[];
  className?: string;
}) {
  const t = useT();
  // Every compagnie of today ticked by hand: the trap this field exists for.
  const everyOne =
    !all && options.length > 1 && options.every((o) => value.some((v) => compagnieKey(v) === compagnieKey(o.value)));
  return (
    <div className={cn('space-y-2', className)} data-testid="compagnies-picker">
      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-ink">
        <Checkbox checked={all} onCheckedChange={(v) => onAllChange(v === true)} data-testid="compagnies-all" />
        {t('Toutes les compagnies')}
      </label>
      {all ? (
        <p className="t-caption">{t('Le compte voit les dossiers de toutes les compagnies, y compris celles ajoutées plus tard.')}</p>
      ) : (
        <>
          <MultiSelect
            options={options}
            selected={value}
            onChange={onChange}
            className="w-full"
            aria-label={t("Compagnies d'assurance")}
          />
          {everyOne ? (
            <p role="note" className="t-caption text-status-warning-fg">
              {t('Toutes les compagnies actuelles sont cochées, mais une compagnie ajoutée plus tard ne sera pas sur ce compte. Cochez « Toutes les compagnies » pour qu’il les voie toutes.')}
            </p>
          ) : (
            <p className="t-caption">{t('Le compte ne voit que les dossiers des compagnies choisies.')}</p>
          )}
        </>
      )}
    </div>
  );
}

export default CompagniesPicker;
