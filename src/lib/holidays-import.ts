/**
 * Jours fériés — what an import adds (QA #067: the same date typed twice in
 * « Importer des dates » was saved twice and listed twice).
 *
 * A date already in the list, or repeated in the same import, is added once;
 * a line that is not a real AAAA-MM-JJ date is skipped. Shared by the three
 * ways in: typed dates, dates read from an image, the default catalogue.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A real calendar date written AAAA-MM-JJ (not « 2026-02-30 »). */
export function isIsoHoliday(value: string): boolean {
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

export interface HolidayImportPlan {
  /** The dates to save, each once, in the order first seen. */
  fresh: string[];
  /** Lines that are not a valid date. */
  invalid: number;
  /** Valid dates already in the list. */
  alreadyListed: number;
  /** Extra copies of a date within the same import. */
  repeated: number;
}

export function planHolidayImport(values: ReadonlyArray<string>, existing: Iterable<string>): HolidayImportPlan {
  const listed = new Set(Array.from(existing, (v) => v.trim()));
  const seen = new Set<string>();
  const plan: HolidayImportPlan = { fresh: [], invalid: 0, alreadyListed: 0, repeated: 0 };
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    if (!isIsoHoliday(value)) {
      plan.invalid += 1;
      continue;
    }
    if (seen.has(value)) {
      plan.repeated += 1;
      continue;
    }
    seen.add(value);
    if (listed.has(value)) {
      plan.alreadyListed += 1;
      continue;
    }
    plan.fresh.push(value);
  }
  return plan;
}

/** Split the « Importer des dates » text: one date per line (comma and semicolon too). */
export function holidayLines(text: string): string[] {
  return text.split(/[\n,;]/).map((l) => l.trim()).filter(Boolean);
}
