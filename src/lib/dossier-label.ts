/**
 * The ONE way a dossier is named in chrome (tab strip, breadcrumb, recents,
 * palette, document.title): `REF · Assuré`.
 */

export function assureName(a: any): string {
  if (!a) return '';
  if (typeof a === 'string') return a.trim();
  return `${a.prenom || ''} ${a.nom || ''}`.trim();
}

export function dossierLabel(d: { refExpert?: string | null; assure?: any } | null | undefined): string {
  if (!d) return 'Dossier';
  const ref = (d.refExpert || '').trim();
  const name = assureName(d.assure);
  return [ref, name].filter(Boolean).join(' · ') || 'Sans réf.';
}
