/**
 * When a dossier is finished — ONE rule for every page that counts open or
 * finished dossiers: the dashboards (« En cours », « Terminés »), the Dossiers
 * list (« À traiter », « En retard »), Suivi d'équipe, the compagnie page and
 * the Direction view.
 *
 * Owner ruling 2026-10-29: a dossier is finished once its note d'honoraire has
 * been added, and only then. Before, the dashboards closed it at the first
 * rapport generated (any type — a préliminaire stamps `dateRapportDepose` too)
 * and the list at « Accord envoyé », so the two pages never agreed.
 *
 * The note's stamp is `dateNoteHonoraire` (legacy `noteHonoraireAt`). It is
 * written when a « Note d'honoraire » document is added and cleared when the
 * last one leaves the dossier (lib/note-honoraire-stamp.ts).
 */

export const NOTE_HONORAIRE_TYPE = "Note d'honoraire";

type WithNote = { dateNoteHonoraire?: unknown; noteHonoraireAt?: unknown } | null | undefined;

function toDate(v: any): Date | null {
  if (!v) return null;
  if (typeof v?.toDate === 'function') return v.toDate();
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000);
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** When the note d'honoraire was added; null while there is none. */
export function noteHonoraireAt(d: WithNote): Date | null {
  return toDate(d?.dateNoteHonoraire) ?? toDate(d?.noteHonoraireAt);
}

/** The note d'honoraire is in: the dossier is finished. */
export const isDossierFinished = (d: WithNote): boolean => noteHonoraireAt(d) !== null;

/** Still to treat — « en cours », « à traiter », « ouvert ». */
export const isDossierOpen = (d: WithNote): boolean => !isDossierFinished(d);
