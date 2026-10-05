/**
 * Where a dossier was opened from, when that is not the dossiers list — so the
 * record bar's back arrow (and the « Dossier introuvable » page's « Retour »)
 * returns there (QA GE-009: a dossier opened from Mes rappels sent « Retour »
 * to the dossiers list instead of the rappel it came from).
 *
 * Per browser tab (sessionStorage) and per dossier. Mes rappels writes it just
 * before navigating; the dossiers list clears it when it opens the dossier, so
 * a later visit from the list goes back to the list again. Other entry points
 * (search, workspace tabs) leave it as it is.
 */

export interface DossierOrigin {
  /** Same-app path to go back to, e.g. `/mes-rappels?rappel=abc`. */
  href: string;
  /** French label of that place (« Mes rappels »), translated where shown. */
  label: string;
}

const key = (dossierId: string) => `dossier-origin:${dossierId}`;

export function setDossierOrigin(dossierId: string, origin: DossierOrigin): void {
  if (!dossierId) return;
  try {
    window.sessionStorage.setItem(key(dossierId), JSON.stringify(origin));
  } catch {
    /* storage unavailable: the back arrow keeps its default */
  }
}

export function clearDossierOrigin(dossierId: string): void {
  if (!dossierId) return;
  try {
    window.sessionStorage.removeItem(key(dossierId));
  } catch {
    /* ignore */
  }
}

/** The stored origin, or null. Only same-app paths are honoured. */
export function readDossierOrigin(dossierId: string): DossierOrigin | null {
  if (!dossierId) return null;
  try {
    const raw = window.sessionStorage.getItem(key(dossierId));
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<DossierOrigin>;
    if (typeof o?.href !== 'string' || typeof o?.label !== 'string') return null;
    // A path inside the app, never a protocol-relative or absolute URL.
    if (!o.href.startsWith('/') || o.href.startsWith('//')) return null;
    return { href: o.href, label: o.label };
  } catch {
    return null;
  }
}

/** The origin of a dossier opened from a received or sent rappel. */
export function rappelOrigin(rappelId: string, vue: 'recus' | 'envoyes' = 'recus'): DossierOrigin {
  const q = new URLSearchParams();
  if (vue === 'envoyes') q.set('vue', 'envoyes');
  else q.set('rappel', rappelId);
  return { href: `/mes-rappels?${q.toString()}`, label: 'Mes rappels' };
}
