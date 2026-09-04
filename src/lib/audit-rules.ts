/**
 * Pattern rules that turn PERSISTED French audit strings (historique /
 * workflow entries) into English.
 *
 * Deliberately import-free so it can be unit-checked in isolation; the
 * locale gate and the dictionary lookup live in `audit-i18n.ts`.
 *
 * Why patterns at all: `logHistorique` stores `details` as an interpolated
 * French sentence (`Document "facture.pdf" uploadé.`), so no flat dictionary
 * can ever match it. Each rule keeps the captured values (file names, counts,
 * people) verbatim and routes French vocabulary back through `t`.
 */

export type Translate = (s: string) => string;

// Photo categories are stored as raw enum values, not French prose.
const CATEGORY_EN: Record<string, string> = {
  avant: 'before',
  en_cours: 'in progress',
  apres: 'after',
};

const category = (raw: string): string => CATEGORY_EN[raw.trim()] ?? raw;

export const AUDIT_RULES: Array<{
  re: RegExp;
  en: (m: RegExpMatchArray, t: Translate) => string;
}> = [
  // ── Status transitions ──
  { re: /^Statut changé en "(.+)"\.$/, en: (m, t) => `Status changed to "${t(m[1])}".` },
  { re: /^Statut changé en (.+)\.$/, en: (m, t) => `Status changed to ${t(m[1])}.` },
  {
    re: /^Statut mis à jour automatiquement par la planification \((.+)\)\.$/,
    en: (m, t) => `Status updated automatically by the schedule (${t(m[1])}).`,
  },
  {
    re: /^Statut mis à jour automatiquement par l'ajout de la première photo \((.+)\)\.$/,
    en: (m) => `Status updated automatically by the first photo upload (${category(m[1])}).`,
  },
  {
    re: /^Statut mis à jour automatiquement \(création des slots (.+)\)\.$/,
    en: (m, t) => `Status updated automatically (slots created: ${t(m[1])}).`,
  },
  // ── File creation / routing ──
  { re: /^Dossier créé comme (.+)$/, en: (m, t) => `File created as ${t(m[1])}` },
  {
    re: /^Dossier envoyé au chiffreur ?: (.+) \((\d+) fichiers?\)$/,
    en: (m) => `File sent to the estimator: ${m[1]} (${m[2]} files)`,
  },
  { re: /^Accord envoyé à (.+) \((.+)\)$/, en: (m, t) => `Agreement sent to ${m[1]} (${t(m[2])})` },
  { re: /^Validation par (.+)$/, en: (m, t) => `Validated by ${t(m[1])}` },
  // ── Documents ──
  {
    re: /^Document "(.+)" uploadé \(type ?: (.+)\)\.$/,
    en: (m, t) => `Document "${m[1]}" uploaded (type: ${t(m[2])}).`,
  },
  { re: /^Document "(.+)" uploadé\.$/, en: (m) => `Document "${m[1]}" uploaded.` },
  { re: /^Document "(.+)" supprimé\.$/, en: (m) => `Document "${m[1]}" deleted.` },
  { re: /^Document "(.+)" importé via l'étape 1\.$/, en: (m) => `Document "${m[1]}" imported via step 1.` },
  {
    re: /^(\d+) document\(s\) uploadé\(s\) dans "(.+)"\.$/,
    en: (m, t) => `${m[1]} document(s) uploaded into "${t(m[2])}".`,
  },
  { re: /^(\d+) ligne\(s\) enregistrée\(s\)$/, en: (m) => `${m[1]} line(s) saved` },
  { re: /^Enregistré (.+)$/, en: (m, t) => `Saved ${t(m[1])}` },
  { re: /^Changement de statut ?: (.+)$/, en: (m, t) => `Status change: ${t(m[1])}` },
  // ── Photos ──
  {
    re: /^(\d+) photo\(s\) uploadée\(s\) dans la section (.+)\.$/,
    en: (m) => `${m[1]} photo(s) uploaded to the ${category(m[2])} section.`,
  },
  { re: /^Photo "(.+)" uploadée \((.+)\)\.$/, en: (m) => `Photo "${m[1]}" uploaded (${category(m[2])}).` },
  { re: /^Photo "(.+)" supprimée\.$/, en: (m) => `Photo "${m[1]}" deleted.` },
  { re: /^(\d+) photo\(s\) de preuve ajoutée\(s\)\.$/, en: (m) => `${m[1]} proof photo(s) added.` },
  // ── Planifications ──
  { re: /^Mission (.+) mise à jour pour (.+)\.$/, en: (m, t) => `${t(m[1])} mission updated for ${m[2]}.` },
  { re: /^Nouvelle mission (.+) créée pour (.+)\.$/, en: (m, t) => `New ${t(m[1])} mission created for ${m[2]}.` },
  // ── AI import summary: "N champ(s) pré-rempli(s) ; M champ(s) écrasé(s) (a, b) par l'IA…" ──
  {
    re: /^(.+) par l'IA depuis les documents importés\.$/,
    en: (m) => {
      const parts = m[1].split(' ; ').map((p) => {
        const filled = p.match(/^(\d+) champ\(s\) pré-rempli\(s\)$/);
        if (filled) return `${filled[1]} field(s) pre-filled`;
        const over = p.match(/^(\d+) champ\(s\) écrasé\(s\) \((.+)\)$/);
        if (over) return `${over[1]} field(s) overwritten (${over[2]})`;
        return p;
      });
      return `${parts.join(' ; ')} by the AI from the imported documents.`;
    },
  },
];

/** Applies the first matching rule; returns null when none matches. */
export function applyAuditRules(s: string, t: Translate): string | null {
  for (const rule of AUDIT_RULES) {
    const m = s.match(rule.re);
    if (m) {
      try {
        return rule.en(m, t);
      } catch {
        return null;
      }
    }
  }
  return null;
}
