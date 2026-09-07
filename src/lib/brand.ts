/**
 * SL Auto Expertise brand configuration.
 *
 * ALL firm-specific identity (names, addresses, contacts, PDF footers,
 * auth email domain, currency, market context) lives here and ONLY here, so
 * a rebrand touches one file.
 *
 * This is a SINGLE-BRAND app. There is no build-time brand switch and no
 * other firm's identity in the bundle: Lionheart Appraisal is a separate
 * product in its own repository, with its own Firebase project and its own
 * deploy pipeline. Nothing here may name it, build as it, or deploy to it —
 * a shared bundle is exactly how « Dashboard · SL-auto » ended up in
 * Lionheart's browser tab.
 */

export type BrandLocale = 'fr' | 'en';

export interface BrandConfig {
  /** Stable brand id. */
  id: string;
  /** Product / app display name (window title, sidebar, breadcrumb root). */
  productName: string;
  /** Short name for PWA / home-screen icons. */
  shortName: string;
  /** App description (metadata + manifest). */
  appDescription: string;

  // ── Legal identity printed on expert reports (PDFs) ────────────────
  companyName: string;
  companyAddress: string;
  companyTel: string;
  companyEmail: string;
  companyAddressFooter: string;
  companyContactFooter: string;
  /** Signing expert as printed in report headers/footers. */
  expertName: string;
  cabinetName: string;
  /** City printed in the "Fait à …" clause. */
  companyCity: string;

  // ── Auth ────────────────────────────────────────────────────────────
  /** Domain used to synthesize login emails from user display names. */
  authEmailDomain: string;

  // ── Email templates ─────────────────────────────────────────────────
  /** Subject prefix tag, e.g. "[SL-AUTO]". */
  emailSubjectTag: string;
  /** Sign-off line, e.g. "L'équipe SL Auto Expertise". */
  emailSignature: string;

  // ── Money / locale / market ─────────────────────────────────────────
  /** ISO 4217 code. */
  currencyCode: string;
  /** Suffix printed after amounts in PDFs/UI (historically "DHS"). */
  currencyLabel: string;
  /** Locale passed to toLocaleString for number formatting. */
  numberLocale: string;
  /** Default UI language when the user hasn't picked one. */
  defaultLocale: BrandLocale;
  /** Market context steering AI extraction prompts (plates, insurers, tax). */
  market: 'MA' | 'CA';
  /** Phone placeholder shown in forms. */
  phonePlaceholder: string;

  // ── Assets ──────────────────────────────────────────────────────────
  /**
   * Primary logo image, or null to render a styled text wordmark
   * (useful for brands without a logo asset yet).
   */
  logoSrc: string | null;
  /** Secondary wordmark image shown next to the logo when expanded. */
  logoWordmarkSrc: string | null;
  /** Directory (under public/) holding this brand's PWA icons. */
  iconsPath: string;
  /** Local-storage / IndexedDB namespace prefix. */
  storagePrefix: string;

  // ── Feature toggles ─────────────────────────────────────────────────
  /**
   * Show the EN/FR language switcher (sidebar + login). When false the
   * app is locked to defaultLocale and any stored preference is ignored.
   */
  showLanguageSwitcher: boolean;
  /** Show the per-page guided tutorials ("?" launcher). */
  showTutorials: boolean;
  /**
   * Roles allowed to see the tutorials, or null for everyone. Ignored when
   * showTutorials is false. Pages where the role is unknown (login) hide
   * the launcher entirely when this list is set.
   */
  tutorialRoles: ReadonlyArray<string> | null;
  /**
   * Account-based free trial length in days, or null for no trial. The clock
   * starts at the account's FIRST login (`trialStartedAt` on the user doc);
   * accounts flagged `trialExempt: true` never expire. See src/lib/trial.ts.
   */
  trialDays: number | null;
}

const SLAOUI: BrandConfig = {
  id: 'slaoui',
  productName: 'SL-auto',
  shortName: 'SL-auto',
  appDescription: "Plateforme d'expertise et de gestion des dossiers d'assurance auto.",

  companyName: 'SL AUTO EXPERTISE',
  companyAddress: '219 BD MOHAMED ZERKTOUNI, Etage 6, Bureau 67, MAARIF - CASABLANCA 20060',
  companyTel: '05 22 64 60 01',
  companyEmail: 'slautoexpertise@gmail.com',
  companyAddressFooter:
    '182,Bd Al Massire,Résidence Farah IV,5éme Etage,Bureau N°10,Maarif Casablanca-Maroc',
  companyContactFooter:
    'Tel : 05 22 47 46 76  / 05 22 47 20 10  Fax : 05 22 25 76 97  Email : slautoexpertise@gmail.com',
  expertName: 'AISSAOUI SLAOUI OUADIE',
  cabinetName: 'SL AUTO EXPERTISE',
  companyCity: 'CASABLANCA',

  authEmailDomain: 'sl-auto.app',

  emailSubjectTag: '[SL-AUTO]',
  emailSignature: "L'équipe SL Auto Expertise",

  currencyCode: 'MAD',
  currencyLabel: 'DHS',
  numberLocale: 'fr-MA',
  defaultLocale: 'fr',
  market: 'MA',
  phonePlaceholder: '+212 6XX XX XX XX',

  logoSrc: '/images/logo.png',
  logoWordmarkSrc: '/images/auto-expertise.png',
  iconsPath: '/icons',
  storagePrefix: 'sl-auto',

  // No language switcher (French only). The guided tutorials are reserved
  // for administrators — every other role keeps the app exactly as before.
  showLanguageSwitcher: false,
  showTutorials: true,
  tutorialRoles: ['Admin'],
  trialDays: null,
};



export const BRAND: BrandConfig = SLAOUI;
