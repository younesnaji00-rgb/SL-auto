/**
 * The ONE way a dossier is named in chrome (tab strip, breadcrumb, recents,
 * palette, document.title): `REF · Assuré`.
 */

export function assureName(a: any): string {
  if (!a) return '';
  if (typeof a === 'string') return a.trim();
  return `${a.prenom || ''} ${a.nom || ''}`.trim();
}

/**
 * The reference shown in lists and dashboards: « Sans réf. » when there is
 * none, never the database id (live, 2026-10-09: the gestionnaire dashboard
 * printed « JDhX3RUNY3NhPOiYIrlQ » for a dossier without reference).
 */
export function dossierRef(d: { refExpert?: unknown } | null | undefined): string {
  const raw = d?.refExpert;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : 'Sans réf.';
}

export function dossierLabel(d: { refExpert?: string | null; assure?: any } | null | undefined): string {
  if (!d) return 'Dossier';
  const ref = (d.refExpert || '').trim();
  const name = assureName(d.assure);
  return [ref, name].filter(Boolean).join(' · ') || 'Sans réf.';
}
