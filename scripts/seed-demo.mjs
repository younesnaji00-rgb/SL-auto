#!/usr/bin/env node
/**
 * seed-demo.mjs — Seeds an ISOLATED DEMO Firebase project (Canadian showcase,
 * brand "Appraisio") with auth users, option collections, holidays and sample
 * dossiers, via REST only (no firebase-admin, no npm deps — Node 18+ fetch).
 *
 * Usage:
 *   PROJECT_ID=<demo-project-id> ACCESS_TOKEN=<oauth2-bearer> node scripts/seed-demo.mjs
 *
 *   ACCESS_TOKEN must be an OAuth2 bearer token with datastore + identitytoolkit
 *   scopes, e.g.:  gcloud auth print-access-token
 *
 * What it seeds (all writes idempotent — stable doc ids, PATCH semantics):
 *   - 4 Firebase Auth users (shared password Demo2026!) + users/{uid} profiles
 *   - Every option collection covered by src/lib/seed-options.ts, with the
 *     SAME doc shape ({label, order, active, createdAt}), French workflow
 *     values kept VERBATIM, Canadian values where market-specific
 *     (compagnies, options_sites)
 *   - _seeds/{collection} lock docs so the app's built-in Moroccan auto-seed
 *     (seedAllOptions) never fires
 *   - options_holidays: Canadian statutory holidays 2026 + 2027
 *   - options_zones + options_agents + chiffreurs entries mirroring what the
 *     app itself writes when creating the demo users
 *   - 8 sample dossiers across the canonical workflow statuses, with
 *     planifications assigned to the Field Agent demo user. Their createdAt
 *     values are seed-run-relative and spread so the dashboard's period
 *     presets (Aujourd'hui / Semaine / Mois — they filter on createdAt, see
 *     src/app/(app)/dashboard/page.tsx) each always have files: 2 created
 *     today, 3 within 1-5 days, 3 within 9-26 days.
 *   - Monitoring funnel data (Suivi d'équipe page): per-dossier lifecycle
 *     fields read by src/app/(app)/monitoring/funnel.ts (datePhotosAvant /
 *     EnCours / Apres, dateDemandeExpertise*, firstAccordReachedAt,
 *     dateChiffrage, directorValidated, dateRapportDepose, lastStatusChange)
 *     plus dossiers/{id}/workflow audit logs (per-user step attribution).
 *     Recent steps are anchored to the SEED RUN TIME (see hoursAgo/inDays)
 *     because the monitoring page defaults its period filter to TODAY —
 *     re-running the seed refreshes the demo's "Jour / Semaine" activity.
 *
 * The emails are generated with the EXACT same slugification as
 * generateEmail() in src/app/login/page.tsx, using the demo brand auth
 * domain 'demo.appraisio.app' (see src/lib/brand.ts).
 */

const PROJECT_ID = process.env.PROJECT_ID;
const ACCESS_TOKEN = process.env.ACCESS_TOKEN;

if (!PROJECT_ID || !ACCESS_TOKEN) {
  console.error('FATAL: PROJECT_ID and ACCESS_TOKEN env vars are required.');
  console.error('  PROJECT_ID=my-demo-project ACCESS_TOKEN=$(gcloud auth print-access-token) node scripts/seed-demo.mjs');
  process.exit(1);
}

const AUTH_EMAIL_DOMAIN = 'demo.appraisio.app'; // BRAND.authEmailDomain for the demo brand
const SHARED_PASSWORD = 'Demo2026!';

const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const IDENTITY_BASE = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}`;

let failCount = 0;
let writeCount = 0;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Same slugification as generateEmail() in src/app/login/page.tsx. */
function generateEmail(nom) {
  const sanitized = nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove accents
    .replace(/[^a-z0-9\s]/g, '') // remove special chars
    .trim()
    .replace(/\s+/g, '.'); // spaces → dots
  return `${sanitized}@${AUTH_EMAIL_DOMAIN}`;
}

/** Stable, URL-safe doc id from a label (accents stripped, non-alnum → '-'). */
function slugId(label) {
  return label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function ts(iso) {
  return new Date(iso); // accepts ISO strings AND Date instances (copy)
}

// ── Relative "recent" timestamps ────────────────────────────────────────────
// The monitoring funnel (src/app/(app)/monitoring/page.tsx) defaults its
// period filter to TODAY (Jour preset), so the newest workflow events are
// anchored to the seed run time instead of fixed dates. Doc ids stay stable —
// re-running the seed only refreshes the timestamps (still idempotent).
const NOW = new Date();

/** NOW minus `h` hours (fractions allowed). */
function hoursAgo(h) {
  return new Date(NOW.getTime() - h * 3_600_000);
}

/** NOW plus `d` days — upcoming RDVs so the demo planning never looks stale. */
function inDays(d) {
  return new Date(NOW.getTime() + d * 86_400_000);
}

/** 'YYYY-MM-DD' string for NOW minus `d` days (dateSinistre-style fields). */
function dateStrDaysAgo(d) {
  return new Date(NOW.getTime() - d * 86_400_000).toISOString().slice(0, 10);
}

/**
 * NOW minus `d` days minus `h` extra hours — Timestamp flavour of
 * dateStrDaysAgo. The extra hours give lifecycle fields chronological
 * spacing within a day (e.g. dateRequete = daysAgo(3, 1) one hour BEFORE
 * createdAt = daysAgo(3)).
 */
function daysAgo(d, h = 0) {
  return new Date(NOW.getTime() - (d * 24 + h) * 3_600_000);
}

/** JS value → Firestore REST typed value. */
function jsToFirestore(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map(jsToFirestore) } };
  }
  if (typeof v === 'object') {
    const fields = {};
    for (const [k, val] of Object.entries(v)) fields[k] = jsToFirestore(val);
    return { mapValue: { fields } };
  }
  throw new Error(`Unsupported value type: ${typeof v}`);
}

function toFields(obj) {
  const fields = {};
  for (const [k, v] of Object.entries(obj)) fields[k] = jsToFirestore(v);
  return fields;
}

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      // User-credential OAuth tokens need an explicit quota project.
      'x-goog-user-project': PROJECT_ID,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { ok: res.ok, status: res.status, body };
}

/**
 * Idempotent Firestore write: PATCH replaces the full doc at a stable path.
 * `path` is relative, e.g. 'compagnies/intact-assurance'.
 * Individual failures warn + continue (failCount drives the exit code).
 */
async function writeDoc(path, data) {
  const url = `${FIRESTORE_BASE}/${path}`;
  const { ok, status, body } = await apiFetch(url, {
    method: 'PATCH',
    body: JSON.stringify({ fields: toFields(data) }),
  });
  if (ok) {
    writeCount++;
    console.log(`  [ok] ${path}`);
  } else {
    failCount++;
    console.warn(`  [FAIL ${status}] ${path}: ${JSON.stringify(body?.error?.message || body)}`);
  }
  return ok;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Auth users (identitytoolkit REST)
// ─────────────────────────────────────────────────────────────────────────────

async function createOrLookupAuthUser({ nom, email }) {
  // Try create first.
  const create = await apiFetch(`${IDENTITY_BASE}/accounts`, {
    method: 'POST',
    body: JSON.stringify({ email, password: SHARED_PASSWORD, displayName: nom }),
  });
  if (create.ok && create.body?.localId) {
    console.log(`  [ok] auth user created: ${email} (uid ${create.body.localId})`);
    return create.body.localId;
  }
  const msg = create.body?.error?.message || '';
  if (!/EMAIL_EXISTS|DUPLICATE_EMAIL/.test(msg)) {
    throw new Error(`Auth create failed for ${email}: ${create.status} ${msg}`);
  }
  // Already exists (idempotent re-run) — look up the localId.
  const lookup = await apiFetch(`${IDENTITY_BASE}/accounts:lookup`, {
    method: 'POST',
    body: JSON.stringify({ email: [email] }),
  });
  const uid = lookup.body?.users?.[0]?.localId;
  if (!uid) {
    throw new Error(`Auth lookup failed for existing user ${email}: ${lookup.status} ${JSON.stringify(lookup.body)}`);
  }
  console.log(`  [ok] auth user already exists: ${email} (uid ${uid})`);
  return uid;
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed data definitions
// ─────────────────────────────────────────────────────────────────────────────

const SEED_STAMP = ts('2026-06-01T09:00:00Z'); // createdAt for config docs

// Canonical statuses — MUST stay verbatim in sync with CANONICAL_STATUTS in
// src/lib/dossiers-data.ts (workflow keys the app logic depends on).
const CANONICAL_STATUTS = [
  'Création dossier',
  'Planification programmée avant',
  'Planification expertise avant',
  'Planification programmée en cours',
  'Planification expertise en cours',
  'Planification programmée après',
  'Planification expertise après',
  'Chiffrage en cours',
  'Accord',
  "Proposition d'accord",
  '2ème accord',
  "2ème proposition d'accord",
  '3ème accord',
  "3ème proposition d'accord",
  'Accord envoyé',
  'Réforme',
];

// Canadian insurers — doc shape from src/hooks/use-compagnies.ts (label + nom
// + couleur + order + active + createdAt).
const COMPAGNIES = [
  // Fictional insurer used by the demo-kit guided walkthrough (the mission
  // document in public/demo-kit is issued by it).
  { nom: 'Laurentide Assurance', couleur: '#0f4c5c' },
  { nom: 'Intact Assurance', couleur: '#ef4444' },
  { nom: 'Desjardins Assurances', couleur: '#00874e' },
  { nom: 'Aviva Canada', couleur: '#fbbf24' },
  { nom: 'TD Assurance', couleur: '#34b233' },
  { nom: 'belairdirect', couleur: '#7c3aed' },
  { nom: 'Wawanesa', couleur: '#0ea5e9' },
  { nom: 'Co-operators', couleur: '#0f766e' },
  { nom: 'Allstate Canada', couleur: '#2563eb' },
];
const COMPAGNIE_NAMES = COMPAGNIES.map((c) => c.nom);

// Simple {label} option lists. French workflow values kept VERBATIM from
// src/lib/seed-options.ts; only market-specific lists are Canadianized.
const OPTION_LISTS = {
  options_natures: ['Classique', 'Contradictoire 1er', 'Contradictoire 2ème', 'Arbitrage', 'Réforme', 'Collégiale', 'Forfait', 'Appréciation', 'EAD'],
  options_statuts: [...CANONICAL_STATUTS],
  options_types_rdv: ['Avant', 'En cours', 'Après'],
  options_types_documents: ["Rapport d'expertise", 'Devis', 'Facture', 'Photos avant expertise', 'Photos après expertise', 'Photos au moment du sinistre', 'PV de constat', 'Carte grise', 'Permis de conduire', "Attestation d'assurance"],
  options_roles: ['Admin', 'Directeur', 'Directeur des opérations', 'Directeur technique', 'Responsable technique', "Responsable d'équipe", 'Gestionnaire', 'Chiffreur', 'Agent de Terrain'],
  options_types_dossier: ['Automobile', 'Incendie', 'Bris de machine', 'Responsabilité civile', 'Transport', 'Divers'],
  options_reparateur_types: ['Agréé', 'Normal'],
  options_rapport_types_pieces: ['ORG', 'ADP', 'REC', 'ORGs', 'ADPs', 'RECs', 'P.P', 'P.Ps', 'R.P', 'R.Ps'],
  options_rapport_operations: ['Echange', 'Réparation', 'Peinture'],
  options_mdo_types: ['Tolerie', 'Peinture', 'Mécanique', 'Electrique'],
  options_observations: ['Assuré injoignable', "Véhicule hors ville d'expertise", 'Assuré non disponible', 'Rendez-vous reporté', 'Numéro erroné', 'Assuré en retard', 'Sous réserve', 'Autre'],
  options_sites: ['Montréal', 'Toronto'], // Canadianized (was Casablanca / Fès)
};

// Every collection seedAllOptions covers needs a _seeds lock so the Moroccan
// defaults never auto-fire. compagnies + options_agents are seeded with
// custom shapes below but still need their locks.
const LOCKED_COLLECTIONS = [...Object.keys(OPTION_LISTS), 'compagnies', 'options_agents'];

// Canadian statutory holidays, 2026 + 2027 — stored in options_holidays as
// {label: 'YYYY-MM-DD', order, active, createdAt} (see src/hooks/use-holidays.ts).
const CANADIAN_HOLIDAYS = [
  ['2026-01-01', 'Jour de l’An'],
  ['2026-04-03', 'Vendredi saint'],
  ['2026-05-18', 'Fête de Victoria'],
  ['2026-06-24', 'Saint-Jean-Baptiste (QC)'],
  ['2026-07-01', 'Fête du Canada'],
  ['2026-08-03', 'Congé civique'],
  ['2026-09-07', 'Fête du Travail'],
  ['2026-09-30', 'Journée nationale de la vérité et de la réconciliation'],
  ['2026-10-12', 'Action de grâce'],
  ['2026-11-11', 'Jour du Souvenir'],
  ['2026-12-25', 'Noël'],
  ['2026-12-26', 'Lendemain de Noël'],
  ['2027-01-01', 'Jour de l’An'],
  ['2027-03-26', 'Vendredi saint'],
  ['2027-05-24', 'Fête de Victoria'],
  ['2027-06-24', 'Saint-Jean-Baptiste (QC)'],
  ['2027-07-01', 'Fête du Canada'],
  ['2027-08-02', 'Congé civique'],
  ['2027-09-06', 'Fête du Travail'],
  ['2027-09-30', 'Journée nationale de la vérité et de la réconciliation'],
  ['2027-10-11', 'Action de grâce'],
  ['2027-11-11', 'Jour du Souvenir'],
  ['2027-12-25', 'Noël'],
  ['2027-12-26', 'Lendemain de Noël'],
];

// Demo users. Profile doc shape mirrors the setDoc in
// src/app/(app)/utilisateurs/client-page.tsx (onSubmit).
const DEMO_USERS = [
  { key: 'admin', nom: 'Admin Demo', role: 'Admin', compagnies: [], sites: [], zone: '' },
  { key: 'manager', nom: 'Manager Demo', role: 'Gestionnaire', compagnies: COMPAGNIE_NAMES, sites: ['Montréal', 'Toronto'], zone: '' },
  { key: 'estimator', nom: 'Estimator Demo', role: 'Chiffreur', compagnies: COMPAGNIE_NAMES, sites: ['Montréal'], zone: '' },
  { key: 'fieldagent', nom: 'Field Agent Demo', role: 'Agent de Terrain', compagnies: COMPAGNIE_NAMES, sites: ['Montréal'], zone: 'Montréal' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sample dossiers — shape mirrors src/lib/create-empty-dossier.ts, plus the
// optional lifecycle fields from the Dossier type (dossiers-data.ts) that the
// app writes as the workflow advances.
// ─────────────────────────────────────────────────────────────────────────────

function emptyExpert() {
  return { nom: '', telephone: '', email: '', compagnie: '' };
}

function buildDossier(uids, d) {
  const managerUid = uids.manager;
  const base = {
    statut: d.statut,
    directorValidated: null,
    compagnie: d.compagnie,
    nature: d.nature ?? 'Classique',
    typeDossier: 'Automobile',
    refExpert: d.refExpert,
    matricule: d.plate,
    policeNumber: d.police ?? '',
    referenceCompagnie: d.claim,
    repairerType: d.repairerType ?? 'Agréé',
    garageName: d.garage ?? '',
    expertRank: '1er',
    secondExpertName: '',
    secondExpertCompany: '',
    assure: {
      nom: d.nom,
      prenom: d.prenom,
      telephone: d.phone,
      whatsapp: '',
      telephone2: '',
      email: d.email ?? '',
      adresse: d.adresse ?? '',
      cin: '',
    },
    vehicule: {
      marque: d.marque,
      modele: d.modele,
      immatriculation: d.plate,
      serie: d.vin ?? '',
      energie: d.energie ?? 'Essence',
      puissance: d.puissance ?? '8',
      mec: d.mec ?? '',
      km: d.km ?? '',
    },
    partieAdverse: { assure: '', matricule: '', marque: '', police: '', compagnie: '' },
    adverseNom: '',
    adverseMatricule: '',
    adverseCompagnie: '',
    intermediaireNom: '',
    intermediaireEmail: '',
    experts: {
      '1er': { nom: 'J. Tremblay', telephone: '+1 (514) 555-0100', email: 'j.tremblay@appraisio.app', compagnie: 'Appraisio Auto Appraisal' },
      '2eme': emptyExpert(),
      arbitre: emptyExpert(),
    },
    dateSinistre: d.dateSinistre, // 'YYYY-MM-DD' string (matches form input storage)
    dateRequete: d.dateRequete ? ts(d.dateRequete) : null,
    createdAt: ts(d.createdAt),
    createdBy: managerUid,
    createdByName: 'Manager Demo',
    updatedAt: ts(d.updatedAt ?? d.createdAt),
  };
  // Lifecycle timestamps written as the workflow advances (optional fields on
  // the Dossier type). Only include the ones consistent with the status.
  // These are EXACTLY the fields the monitoring funnel reads — see STEP_DEFS
  // in src/app/(app)/monitoring/funnel.ts (doneAt / horsDelaiAt predicates).
  if (d.dateMission) base.dateMissionAgentTerrain = ts(d.dateMission);
  if (d.dateDemandeAvant) base.dateDemandeExpertiseAvant = ts(d.dateDemandeAvant);
  if (d.dateDemandeEnCours) base.dateDemandeExpertiseEnCours = ts(d.dateDemandeEnCours);
  if (d.dateDemandeApres) base.dateDemandeExpertiseApres = ts(d.dateDemandeApres);
  if (d.datePhotosAvant) base.datePhotosAvant = ts(d.datePhotosAvant);
  if (d.datePhotosEnCours) base.datePhotosEnCours = ts(d.datePhotosEnCours);
  if (d.datePhotosApres) base.datePhotosApres = ts(d.datePhotosApres);
  if (d.dateChiffrage) base.dateChiffrage = ts(d.dateChiffrage);
  if (d.firstAccordReachedAt) base.firstAccordReachedAt = ts(d.firstAccordReachedAt);
  if (d.rapportValideAt) {
    // Shape mirrors valider-dossier-button.tsx ({by: uid, at, role}).
    base.directorValidated = { by: uids.admin, at: ts(d.rapportValideAt), role: 'Admin' };
  }
  if (d.dateRapportDepose) {
    // Shape mirrors rapport-tab.tsx (author = user email).
    base.dateRapportDepose = ts(d.dateRapportDepose);
    base.authorRapportDepose = generateEmail('Manager Demo');
  }
  if (d.lastStatusDetails) {
    // Shape mirrors the log-historique.ts denormalization (by = email,
    // byNom = display name). `lastStatusAt` overrides when the status change
    // predates the doc's latest update (e.g. rapport deposited afterwards).
    base.lastStatusChange = {
      status: d.statut,
      at: ts(d.lastStatusAt ?? d.updatedAt ?? d.createdAt),
      by: generateEmail('Manager Demo'),
      byNom: 'Manager Demo',
      details: d.lastStatusDetails,
    };
  }
  return base;
}

const DOSSIERS = [
  {
    id: 'demo-dossier-01',
    statut: 'Création dossier',
    refExpert: 'APR-2026-0101',
    compagnie: 'Intact Assurance',
    claim: 'CLM-2026-0142',
    police: 'PA-8834-221',
    nom: 'Mitchell', prenom: 'Sarah',
    phone: '+1 (416) 555-0114',
    email: 'sarah.mitchell@example.ca',
    adresse: '2210 Queen St E, Toronto, ON',
    marque: 'Toyota', modele: 'RAV4 XLE 2022', plate: 'CKXR 382',
    vin: '2T3P1RFV8NC204518', km: '38 450', mec: '2022-03-15',
    garage: 'CarrXpert Toronto East',
    // Fresh intake — created a couple of hours before the seed run
    // (dashboard "Aujourd'hui" preset bucket) so the monitoring "Jour" view
    // always has a Création event (en délai: the requête→création gap is
    // only 30 minutes).
    dateSinistre: dateStrDaysAgo(2),
    dateRequete: hoursAgo(3),
    createdAt: hoursAgo(2.5),
    workflow: [
      { action: 'Création de dossier', at: hoursAgo(2.5), by: 'manager', details: 'Dossier créé depuis la requête compagnie' },
    ],
  },
  {
    id: 'demo-dossier-02',
    statut: 'Planification programmée avant',
    refExpert: 'APR-2026-0102',
    compagnie: 'Desjardins Assurances',
    claim: 'CLM-2026-0155',
    police: 'DA-1120-870',
    nom: 'Bélanger', prenom: 'Marc',
    phone: '+1 (514) 555-0127',
    email: 'marc.belanger@example.ca',
    adresse: '4587 rue Saint-Denis, Montréal, QC',
    marque: 'Honda', modele: 'Civic LX 2021', plate: 'F12 ABC',
    vin: '2HGFE2F50MH523907', km: '52 300', mec: '2021-05-10',
    garage: 'Garage Métropolitain Montréal',
    dateSinistre: dateStrDaysAgo(2),
    dateRequete: daysAgo(1, 4),
    // Created yesterday (dashboard "Semaine" preset bucket — the presets
    // filter on createdAt); requête→création gap is 1h → en délai.
    createdAt: daysAgo(1, 3),
    // Mission Avant requested an hour after creation, RDV upcoming — photos
    // not yet taken (photosAvant stays "non réalisé" for this dossier).
    updatedAt: hoursAgo(26),
    dateMission: hoursAgo(26),
    dateDemandeAvant: hoursAgo(26),
    lastStatusDetails: 'Mission Avant planifiée — Field Agent Demo, Montréal.',
    planification: {
      typeMission: 'Avant',
      dateRDV: inDays(2),
      adresse: 'Garage Métropolitain, 8250 boul. Saint-Laurent, Montréal, QC',
    },
    workflow: [
      { action: 'Création de dossier', at: daysAgo(1, 3), by: 'manager', details: 'Dossier créé depuis la requête compagnie' },
      { action: 'Création de planification', at: hoursAgo(26), by: 'manager', details: 'Mission Avant pour Field Agent Demo' },
    ],
  },
  {
    id: 'demo-dossier-03',
    statut: 'Planification expertise en cours',
    refExpert: 'APR-2026-0103',
    compagnie: 'belairdirect',
    claim: 'CLM-2026-0161',
    police: 'BD-3391-405',
    nom: 'Fortin', prenom: 'Émilie',
    phone: '+1 (514) 555-0138',
    email: 'emilie.fortin@example.ca',
    adresse: '1120 boul. des Laurentides, Laval, QC',
    marque: 'Ford', modele: 'F-150 XLT 2020', plate: 'G45 KLM',
    vin: '1FTEW1EP4LFA88123', km: '96 700', mec: '2020-08-22',
    garage: 'Fix Auto Laval',
    dateSinistre: dateStrDaysAgo(7),
    dateRequete: daysAgo(5, 1),
    // Created 5 days ago (dashboard "Semaine" preset bucket). Avant
    // expertise + 1er accord done earlier in the week; the mid-repair
    // (En cours) check was requested yesterday and its RDV is upcoming.
    createdAt: daysAgo(5),
    updatedAt: hoursAgo(20),
    dateMission: daysAgo(4, 2),
    dateDemandeAvant: daysAgo(4, 2),
    datePhotosAvant: daysAgo(4), // 2h after the demande → en délai
    dateChiffrage: daysAgo(2, 4),
    firstAccordReachedAt: daysAgo(2),
    dateDemandeEnCours: hoursAgo(20),
    lastStatusDetails: 'Expertise en cours de réparation — visite atelier Fix Auto Laval.',
    planification: {
      typeMission: 'En cours',
      dateRDV: inDays(1),
      adresse: 'Fix Auto Laval, 1990 boul. Industriel, Laval, QC',
    },
    workflow: [
      { action: 'Création de dossier', at: daysAgo(5), by: 'manager', details: 'Dossier créé depuis la requête compagnie' },
      { action: 'Photos avant ajoutées par Agent de Terrain', at: daysAgo(4), by: 'fieldagent', details: '6 photos avant ajoutées' },
      { action: 'Dossier envoyé vers chiffrage', at: daysAgo(2, 6), by: 'manager', details: 'Envoyé au chiffreur : Estimator Demo' },
      { action: 'Devis mis à jour', at: daysAgo(2, 4), by: 'estimator', details: 'Chiffrage enregistré' },
      { action: "Changement de statut : Proposition d'accord", at: daysAgo(2), by: 'manager', details: '1ère proposition envoyée au garage' },
      { action: 'Création de planification', at: hoursAgo(20), by: 'manager', details: 'Mission En cours pour Field Agent Demo' },
    ],
  },
  {
    id: 'demo-dossier-04',
    statut: 'Chiffrage en cours',
    refExpert: 'APR-2026-0104',
    compagnie: 'TD Assurance',
    claim: 'CLM-2026-0168',
    police: 'TD-5527-914',
    nom: 'Chen', prenom: 'David',
    phone: '+1 (416) 555-0152',
    email: 'david.chen@example.ca',
    adresse: '77 Bloor St W, Toronto, ON',
    marque: 'Hyundai', modele: 'Elantra Preferred 2023', plate: 'BXKD 719',
    vin: 'KMHLM4AG5PU384026', km: '21 900', mec: '2023-01-30',
    garage: 'Assured Collision Toronto',
    dateSinistre: dateStrDaysAgo(1),
    dateRequete: hoursAgo(5.5),
    // Created TODAY (dashboard "Aujourd'hui" preset bucket) — the whole
    // intake→photos→chiffrage run happened this morning, so the monitoring
    // "Jour" view gets Création + Avant + chiffrage events. Photos 30min
    // after the demande → en délai.
    createdAt: hoursAgo(5),
    updatedAt: hoursAgo(2),
    dateMission: hoursAgo(4.5),
    dateDemandeAvant: hoursAgo(4.5),
    datePhotosAvant: hoursAgo(4),
    dateChiffrage: hoursAgo(2),
    lastStatusDetails: 'Devis garage reçu (4 285 $ CAD) — chiffrage en cours.',
    workflow: [
      { action: 'Création de dossier', at: hoursAgo(5), by: 'manager', details: 'Dossier créé depuis la requête compagnie' },
      { action: 'Création de planification', at: hoursAgo(4.5), by: 'manager', details: 'Mission Avant pour Field Agent Demo' },
      { action: 'Photos avant ajoutées par Agent de Terrain', at: hoursAgo(4), by: 'fieldagent', details: '8 photos avant ajoutées' },
      { action: 'Dossier envoyé vers chiffrage', at: hoursAgo(2), by: 'manager', details: 'Envoyé au chiffreur : Estimator Demo' },
    ],
  },
  {
    id: 'demo-dossier-05',
    statut: "Proposition d'accord",
    refExpert: 'APR-2026-0105',
    compagnie: 'Aviva Canada',
    claim: 'CLM-2026-0171',
    police: 'AV-7743-628',
    nom: 'Gagnon', prenom: 'Nathalie',
    phone: '+1 (514) 555-0163',
    email: 'nathalie.gagnon@example.ca',
    adresse: '9034 rue Sherbrooke E, Montréal, QC',
    marque: 'Mazda', modele: 'CX-5 GS 2022', plate: 'H88 TRV',
    vin: 'JM3KFBCM6N1533280', km: '44 100', mec: '2022-06-05',
    garage: 'ProColor Montréal-Est',
    dateSinistre: dateStrDaysAgo(4),
    dateRequete: daysAgo(3, 1),
    // Created 3 days ago (dashboard "Semaine" preset bucket). Chiffrage
    // finished yesterday, 1ère proposition sent TODAY (5h ago) —
    // firstAccordReachedAt drives the "1er accord" funnel step.
    createdAt: daysAgo(3),
    updatedAt: hoursAgo(5),
    dateMission: daysAgo(2, 3),
    dateDemandeAvant: daysAgo(2, 3),
    datePhotosAvant: daysAgo(2), // 3h after the demande → en délai
    dateChiffrage: hoursAgo(22),
    firstAccordReachedAt: hoursAgo(5),
    lastStatusDetails: "Proposition d'accord envoyée au garage — 3 640 $ CAD TTC.",
    workflow: [
      { action: 'Création de dossier', at: daysAgo(3), by: 'manager', details: 'Dossier créé depuis la requête compagnie' },
      { action: 'Photos avant ajoutées par Agent de Terrain', at: daysAgo(2), by: 'fieldagent', details: '7 photos avant ajoutées' },
      { action: 'Devis mis à jour', at: hoursAgo(22), by: 'estimator', details: 'Chiffrage enregistré — 3 640 $ CAD TTC' },
      { action: "Changement de statut : Proposition d'accord", at: hoursAgo(5), by: 'manager', details: '1ère proposition envoyée au garage' },
    ],
  },
  {
    id: 'demo-dossier-06',
    statut: '2ème accord',
    refExpert: 'APR-2026-0106',
    compagnie: 'Wawanesa',
    claim: 'CLM-2026-0176',
    police: 'WW-2210-393',
    nom: 'Roy', prenom: 'Jean-François',
    phone: '+1 (514) 555-0171',
    email: 'jf.roy@example.ca',
    adresse: '655 av. des Perron, Laval, QC',
    marque: 'Volkswagen', modele: 'Tiguan Comfortline 2021', plate: 'J21 PWE',
    vin: '3VV2B7AX1MM041775', km: '61 800', mec: '2021-04-12',
    garage: 'Carrossier Procolor Laval',
    dateSinistre: dateStrDaysAgo(10),
    dateRequete: daysAgo(9, 1),
    // Created 9 days ago (dashboard "Mois" preset bucket). 1er accord 5 days
    // ago; the 2ème accord (re-chiffrage of the same source) was saved 6h
    // ago and validated 2h ago → "2ème+" step counts TODAY, en délai
    // (accord within 24 business hours of the latest chiffrage).
    createdAt: daysAgo(9),
    updatedAt: hoursAgo(2),
    dateMission: daysAgo(8, 3),
    dateDemandeAvant: daysAgo(8, 3),
    datePhotosAvant: daysAgo(8), // 3h after the demande → en délai
    firstAccordReachedAt: daysAgo(5),
    dateChiffrage: hoursAgo(6), // latest (2ème) chiffrage
    lastStatusDetails: '2ème accord après pièces supplémentaires — 5 120 $ CAD TTC.',
    workflow: [
      { action: 'Création de dossier', at: daysAgo(9), by: 'manager', details: 'Dossier créé depuis la requête compagnie' },
      { action: 'Photos avant ajoutées par Agent de Terrain', at: daysAgo(8), by: 'fieldagent', details: '9 photos avant ajoutées' },
      { action: 'Changement de statut : Accord', at: daysAgo(5), by: 'manager', details: '1er accord — 4 480 $ CAD TTC' },
      { action: 'Devis Garage mis à jour', at: hoursAgo(6), by: 'estimator', details: '2ème chiffrage — pièces supplémentaires' },
      { action: 'Changement de statut : 2ème accord', at: hoursAgo(2), by: 'manager', details: '2ème accord — 5 120 $ CAD TTC' },
    ],
  },
  {
    id: 'demo-dossier-07',
    statut: 'Accord envoyé',
    refExpert: 'APR-2026-0107',
    compagnie: 'Co-operators',
    claim: 'CLM-2026-0180',
    police: 'CO-9017-556',
    nom: 'Foster', prenom: 'Amanda',
    phone: '+1 (416) 555-0186',
    email: 'amanda.foster@example.ca',
    adresse: '128 Danforth Ave, Toronto, ON',
    marque: 'Chevrolet', modele: 'Silverado 1500 LT 2019', plate: 'CVBN 204',
    vin: '1GCUYDED3KZ301998', km: '112 400', mec: '2019-09-18',
    garage: 'CSN Collision Toronto North',
    dateSinistre: dateStrDaysAgo(22),
    dateRequete: daysAgo(20, 1),
    // Created 20 days ago (dashboard "Mois" preset bucket). Accord envoyé
    // 10 days after the chiffrage → intentionally HORS DÉLAI on the
    // monitoring accord step (feeds the amber KPI segment). Mid-repair
    // (En cours) check photographed TODAY.
    createdAt: daysAgo(20),
    updatedAt: hoursAgo(5),
    dateMission: daysAgo(19, 2),
    dateDemandeAvant: daysAgo(19, 2),
    datePhotosAvant: daysAgo(19), // 2h after the demande → en délai
    dateChiffrage: daysAgo(12),
    firstAccordReachedAt: daysAgo(11),
    lastStatusAt: daysAgo(2), // 10 days after chiffrage → hors délai
    dateDemandeEnCours: hoursAgo(23),
    datePhotosEnCours: hoursAgo(5),
    lastStatusDetails: "Accord final envoyé à la compagnie — 6 875 $ CAD TTC.",
    workflow: [
      { action: 'Création de dossier', at: daysAgo(20), by: 'manager', details: 'Dossier créé depuis la requête compagnie' },
      { action: 'Photos avant ajoutées par Agent de Terrain', at: daysAgo(19), by: 'fieldagent', details: '10 photos avant ajoutées' },
      { action: 'Devis mis à jour', at: daysAgo(12), by: 'estimator', details: 'Chiffrage enregistré — 6 875 $ CAD TTC' },
      { action: 'Changement de statut : Accord', at: daysAgo(11), by: 'manager', details: '1er accord validé' },
      { action: 'Changement de statut : Accord envoyé', at: daysAgo(2), by: 'manager', details: 'Accord final transmis à la compagnie' },
      { action: 'Photos en cours ajoutées par Agent de Terrain', at: hoursAgo(5), by: 'fieldagent', details: '5 photos en cours ajoutées' },
    ],
  },
  {
    id: 'demo-dossier-08',
    statut: 'Réforme',
    refExpert: 'APR-2026-0108',
    compagnie: 'Allstate Canada',
    claim: 'CLM-2026-0183',
    police: 'AL-4468-107',
    nom: 'Lavoie', prenom: 'Pierre',
    phone: '+1 (514) 555-0194',
    email: 'pierre.lavoie@example.ca',
    adresse: '3320 rue Ontario E, Montréal, QC',
    marque: 'Nissan', modele: 'Sentra SV 2018', plate: 'K73 FGH',
    vin: '3N1AB7AP4JY277540', km: '148 900', mec: '2018-03-08',
    garage: '',
    nature: 'Réforme',
    dateSinistre: dateStrDaysAgo(28),
    dateRequete: daysAgo(26, 1),
    // Created 26 days ago (dashboard "Mois" preset bucket). Réforme verdict
    // 2 weeks ago; the réforme rapport was validated by the director 6h ago
    // and deposited 1h ago → "Rapport validé" + "Rapport déposé" both count
    // TODAY.
    createdAt: daysAgo(26),
    updatedAt: hoursAgo(1),
    dateMission: daysAgo(25, 2),
    dateDemandeAvant: daysAgo(25, 2),
    datePhotosAvant: daysAgo(25), // 2h after the demande → en délai
    dateChiffrage: daysAgo(14, 3),
    firstAccordReachedAt: daysAgo(14),
    lastStatusAt: daysAgo(14), // Réforme within 24 business hours of chiffrage
    rapportValideAt: hoursAgo(6),
    dateRapportDepose: hoursAgo(1),
    lastStatusDetails: 'Perte totale — VAM 9 800 $ CAD, épave estimée 1 450 $ CAD.',
    workflow: [
      { action: 'Création de dossier', at: daysAgo(26), by: 'manager', details: 'Dossier créé depuis la requête compagnie' },
      { action: 'Photos avant ajoutées par Agent de Terrain', at: daysAgo(25), by: 'fieldagent', details: '12 photos avant ajoutées' },
      { action: 'Verdict Réforme déposé', at: daysAgo(14, 1), by: 'estimator', details: 'VAM 9 800 $ CAD, épave 1 450 $ CAD' },
      { action: 'Changement de statut : Réforme', at: daysAgo(14), by: 'manager', details: 'Dossier basculé en Réforme' },
      { action: 'Dossier validé', at: hoursAgo(6), by: 'admin', details: 'Rapport réforme validé par la direction' },
      { action: 'Rapport déposé', at: hoursAgo(1), by: 'manager', details: 'Rapport réforme déposé' },
    ],
  },
];

// Planification doc shape mirrors the addDoc payload in
// src/app/(app)/dossiers/[id]/modal-planification.tsx.
function buildPlanification(uids, d) {
  const p = d.planification;
  return {
    agentTerrain: 'Field Agent Demo',
    agentTerrainUid: uids.fieldagent,
    typeMission: p.typeMission,
    dateRDV: ts(p.dateRDV),
    zone: 'Montréal',
    adresse: p.adresse,
    observation: '',
    observationPersonnalisee: '',
    agentLocationManuel: '',
    modifiedAt: ts(d.updatedAt ?? d.createdAt),
    modifiedBy: uids.manager,
    modifiedByName: 'Manager Demo',
    dossierNom: d.refExpert,
    assureNom: `${d.nom} ${d.prenom}`.trim(),
    compagnie: d.compagnie,
    expertRank: '1er',
    dossierId: d.id,
    createdAt: ts(d.updatedAt ?? d.createdAt),
    active: true,
    createdBy: uids.manager,
    createdByName: 'Manager Demo',
    createdByRole: 'Gestionnaire',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Seeding demo project '${PROJECT_ID}' (auth domain ${AUTH_EMAIL_DOMAIN})`);

  // 1. Auth users --------------------------------------------------------
  console.log('\n[1/6] Firebase Auth users');
  const uids = {}; // key → uid
  for (const u of DEMO_USERS) {
    const email = generateEmail(u.nom);
    u.email = email;
    uids[u.key] = await createOrLookupAuthUser({ nom: u.nom, email });
  }

  // 2. users/{uid} profile docs ------------------------------------------
  // Shape mirrors utilisateurs/client-page.tsx onSubmit setDoc.
  console.log('\n[2/6] users/{uid} profile docs');
  for (const u of DEMO_USERS) {
    await writeDoc(`users/${uids[u.key]}`, {
      nom: u.nom,
      nomLowercase: u.nom.trim().toLowerCase(),
      prenom: '',
      email: u.email,
      password: SHARED_PASSWORD, // the app stores it so admins can view it
      role: u.role,
      compagnies: u.compagnies,
      sites: u.sites,
      zone: u.zone,
      statut: 'Actif',
      createdAt: SEED_STAMP,
      lastLogin: null,
      // Shared showcase accounts are exempt from the account-based free
      // trial (BRAND.trialDays) — they must never expire. Per-prospect
      // accounts created via the Users admin page get the trial clock
      // automatically at their first login (see src/lib/trial.ts).
      trialExempt: true,
    });
  }

  // Role-sync collections the app maintains alongside user creation:
  // Agent de Terrain → options_agents + options_zones; Chiffreur → chiffreurs.
  await writeDoc('options_agents/field-agent-demo', {
    label: 'Field Agent Demo',
    zone: 'Montréal',
    order: 0,
    active: true,
    createdAt: SEED_STAMP,
  });
  await writeDoc('options_zones/montreal', {
    label: 'Montréal',
    order: 0,
    active: true,
    createdAt: SEED_STAMP,
  });
  await writeDoc('chiffreurs/estimator-demo', {
    nom: 'Estimator Demo',
    email: generateEmail('Estimator Demo'),
    phone: '',
    active: true,
    createdAt: SEED_STAMP,
  });

  // 3. Option collections -------------------------------------------------
  console.log('\n[3/6] Option collections');
  for (const [col, labels] of Object.entries(OPTION_LISTS)) {
    for (let i = 0; i < labels.length; i++) {
      await writeDoc(`${col}/${slugId(labels[i])}`, {
        label: labels[i],
        order: i,
        active: true,
        createdAt: SEED_STAMP,
      });
    }
  }

  // compagnies — dual label/nom shape (use-compagnies.ts).
  console.log('\n      compagnies (Canadian insurers)');
  for (let i = 0; i < COMPAGNIES.length; i++) {
    const c = COMPAGNIES[i];
    await writeDoc(`compagnies/${slugId(c.nom)}`, {
      label: c.nom,
      nom: c.nom,
      couleur: c.couleur,
      order: i,
      active: true,
      createdAt: SEED_STAMP,
    });
  }

  // 4. _seeds locks --------------------------------------------------------
  // Same shape seed-options.ts writes: {seededAt, reason}. With the lock in
  // place, seedAllOptions never fires for these collections. NOTE:
  // use-compagnies.ts does NOT check a lock — it auto-seeds only when the
  // compagnies collection is EMPTY, so seeding compagnies above is what
  // actually suppresses its Moroccan defaults; the lock covers seedAllOptions.
  console.log('\n[4/6] _seeds lock docs');
  for (const col of LOCKED_COLLECTIONS) {
    await writeDoc(`_seeds/${col}`, {
      seededAt: SEED_STAMP,
      reason: 'initial_seed',
    });
  }

  // 5. Holidays -------------------------------------------------------------
  console.log('\n[5/6] options_holidays (Canadian statutory holidays 2026-2027)');
  for (let i = 0; i < CANADIAN_HOLIDAYS.length; i++) {
    const [date, name] = CANADIAN_HOLIDAYS[i];
    await writeDoc(`options_holidays/${date}`, {
      label: date, // use-holidays.ts parses `label` as YYYY-MM-DD
      name, // informational only (ignored by the hook)
      order: i,
      active: true,
      createdAt: SEED_STAMP,
    });
  }

  // 6. Sample dossiers -------------------------------------------------------
  console.log('\n[6/6] Sample dossiers');
  for (const d of DOSSIERS) {
    await writeDoc(`dossiers/${d.id}`, buildDossier(uids, d));
    if (d.planification) {
      await writeDoc(`dossiers/${d.id}/planifications/planif-01`, buildPlanification(uids, d));
    }
    // Workflow audit logs (dossiers/{id}/workflow) — shape mirrors
    // logWorkflow() in src/app/(app)/dossiers/[id]/log-historique.ts. The
    // monitoring page reads collectionGroup('workflow') for per-user step
    // attribution: photoAuthor() matches actions containing "photo" plus
    // "avant" / "en cours" / "après", so keep those words in photo actions.
    const wf = d.workflow || [];
    for (let i = 0; i < wf.length; i++) {
      const w = wf[i];
      const who = DEMO_USERS.find((u) => u.key === (w.by || 'manager'));
      await writeDoc(`dossiers/${d.id}/workflow/wf-${String(i + 1).padStart(2, '0')}`, {
        action: w.action,
        date: ts(w.at),
        user: who.email, // logWorkflow stores the author email in `user`
        userId: uids[who.key],
        status: 'done',
        dossierRef: d.refExpert,
        details: w.details || '',
        userNom: who.nom,
      });
    }

    // Status-change audit trail (dossiers/{id}/historique, type 'statut') —
    // shape mirrors logHistorique() in log-historique.ts. The list page's
    // status-pill sheet (StatusHistorySheet) reads EXACTLY this; without it
    // the "step sequencing" demo moment opens an empty sheet. The ladder is
    // derived from each dossier's real lifecycle dates so chronology holds.
    const manager = DEMO_USERS.find((u) => u.key === 'manager');
    const ladder = [
      ['Création dossier', d.createdAt, 'Dossier créé'],
      d.dateDemandeAvant && ['Planification programmée avant', d.dateDemandeAvant, 'Mission terrain programmée'],
      d.datePhotosAvant && ['Planification expertise avant', d.datePhotosAvant, 'Photos avant réparation reçues'],
      d.dateChiffrage && ['Chiffrage en cours', d.dateChiffrage, 'Dossier assigné au chiffrage'],
      d.firstAccordReachedAt && ["Proposition d'accord", d.firstAccordReachedAt, 'Proposition du chiffreur'],
    ].filter(Boolean);
    // End on the dossier's current status when the ladder didn't reach it.
    if (!ladder.some(([s]) => s === d.statut)) {
      ladder.push([d.statut, d.lastStatusAt ?? d.updatedAt ?? d.createdAt, d.lastStatusDetails || 'Changement de statut']);
    }
    ladder.sort((a, b) => new Date(a[1]) - new Date(b[1]));
    for (let i = 0; i < ladder.length; i++) {
      const [statut, at, details] = ladder[i];
      await writeDoc(`dossiers/${d.id}/historique/hist-statut-${String(i + 1).padStart(2, '0')}`, {
        action: statut,
        date: ts(at),
        user: manager.email,
        userNom: manager.nom,
        details,
        type: 'statut',
      });
    }
  }

  // Summary -------------------------------------------------------------------
  console.log('\n──────────────────────────────────────────');
  console.log(`Done. ${writeCount} document(s) written, ${failCount} failure(s).`);
  console.log('\nDemo logins (password for all: ' + SHARED_PASSWORD + '):');
  for (const u of DEMO_USERS) {
    console.log(`  ${u.role.padEnd(18)} ${u.nom.padEnd(18)} ${u.email}`);
  }
  if (failCount > 0) {
    console.error('\nSome writes failed — see [FAIL] lines above.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('\nFATAL:', err.message || err);
  process.exit(1);
});
