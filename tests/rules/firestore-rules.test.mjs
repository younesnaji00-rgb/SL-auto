// Firestore security-rules tests, run against the Firebase Rules API
// (projects:test) — no emulator/Java needed. The API compiles the rules and
// evaluates each case; `get()` calls on users/{uid} are mocked per case.
//
//   node tests/rules/firestore-rules.test.mjs [projectId]
//   (needs `gcloud auth print-access-token` to work; default project: appraisio-demo-ca)
//
// Exit code 1 if any case fails or the rules do not compile.

import { readFile } from 'node:fs/promises';
import { execSync } from 'node:child_process';

const PROJECT = process.argv[2] ?? 'appraisio-demo-ca';
const RULES = await readFile(new URL('../../firestore.rules', import.meta.url), 'utf8');
const DB = '/databases/(default)/documents';

const ROLE = {
  admin: 'Admin',
  gest: 'Gestionnaire',
  re: "Responsable d'équipe",
  chiff: 'Chiffreur',
  atg: 'Agent de Terrain',
  dir: 'Directeur',
  dirops: 'Directeur des opérations',
  custom: 'Stagiaire', // not in the canonical list
};

// Each case: [name, expectation, { uid, role, method, path, data?, existing? }]
const cases = [];
const allow = (name, c) => cases.push([name, 'ALLOW', c]);
const deny = (name, c) => cases.push([name, 'DENY', c]);

// ── unauthenticated ─────────────────────────────────────────────────────
allow('anon can read users (login lookup)', { method: 'get', path: 'users/u1' });
deny('anon cannot list dossiers', { method: 'list', path: 'dossiers' });
deny('anon cannot read a dossier', { method: 'get', path: 'dossiers/d1' });
deny('anon cannot read rappels', { method: 'get', path: 'rappels/r1' });
deny('anon cannot read bugReports', { method: 'get', path: 'bugReports/u1' });
deny('anon cannot read chiffrages (/viewer)', { method: 'get', path: 'chiffrages/c1' });
deny('anon cannot read session_meta', { method: 'get', path: 'users/u1/session_meta/current' });

// ── dossiers ─────────────────────────────────────────────────────────────
for (const [k, r] of Object.entries(ROLE)) {
  allow(`${k} can list dossiers`, { uid: k, role: r, method: 'list', path: 'dossiers' });
}
allow('gestionnaire creates dossier', { uid: 'g', role: ROLE.gest, method: 'create', path: 'dossiers/new', data: { statut: 'Création dossier' } });
deny('atg cannot create dossier', { uid: 'a', role: ROLE.atg, method: 'create', path: 'dossiers/new', data: { statut: 'Création dossier' } });
deny('chiffreur cannot create dossier', { uid: 'c', role: ROLE.chiff, method: 'create', path: 'dossiers/new', data: {} });
allow('atg updates statut to canonical', { uid: 'a', role: ROLE.atg, method: 'update', path: 'dossiers/d1', existing: { statut: 'Création dossier' }, data: { statut: 'Planification expertise avant' } });
allow('chiffreur sets Réforme', { uid: 'c', role: ROLE.chiff, method: 'update', path: 'dossiers/d1', existing: { statut: 'Accord' }, data: { statut: 'Réforme' } });
allow('gestionnaire sets 4ème accord', { uid: 'g', role: ROLE.gest, method: 'update', path: 'dossiers/d1', existing: { statut: '3ème accord' }, data: { statut: '4ème accord' } });
deny('gestionnaire cannot set bogus statut', { uid: 'g', role: ROLE.gest, method: 'update', path: 'dossiers/d1', existing: { statut: 'Accord' }, data: { statut: 'Whatever' } });
deny('gestionnaire cannot set directorValidated', { uid: 'g', role: ROLE.gest, method: 'update', path: 'dossiers/d1', existing: { directorValidated: false }, data: { directorValidated: true } });
allow('dir ops sets directorValidated', { uid: 'o', role: ROLE.dirops, method: 'update', path: 'dossiers/d1', existing: { directorValidated: false }, data: { directorValidated: true } });
deny('custom role cannot update dossier', { uid: 'x', role: ROLE.custom, method: 'update', path: 'dossiers/d1', existing: { a: 1 }, data: { a: 2 } });
allow('custom role can still read dossier', { uid: 'x', role: ROLE.custom, method: 'get', path: 'dossiers/d1' });
allow('directeur deletes dossier', { uid: 'd', role: ROLE.dir, method: 'delete', path: 'dossiers/d1' });
deny('gestionnaire cannot delete dossier', { uid: 'g', role: ROLE.gest, method: 'delete', path: 'dossiers/d1' });
deny('atg cannot delete dossier', { uid: 'a', role: ROLE.atg, method: 'delete', path: 'dossiers/d1' });

// subcollections
allow('atg writes photo', { uid: 'a', role: ROLE.atg, method: 'create', path: 'dossiers/d1/photos/p1', data: { url: 'x' } });
allow('atg deletes document', { uid: 'a', role: ROLE.atg, method: 'delete', path: 'dossiers/d1/documents/x1' });
allow('atg updates planification', { uid: 'a', role: ROLE.atg, method: 'update', path: 'dossiers/d1/planifications/p1', existing: { done: false }, data: { done: true } });
deny('atg cannot create planification', { uid: 'a', role: ROLE.atg, method: 'create', path: 'dossiers/d1/planifications/p2', data: {} });
allow('gestionnaire creates planification', { uid: 'g', role: ROLE.gest, method: 'create', path: 'dossiers/d1/planifications/p2', data: {} });
deny('atg cannot write commentaires', { uid: 'a', role: ROLE.atg, method: 'create', path: 'dossiers/d1/commentaires/c1', data: {} });
allow('gestionnaire writes commentaire', { uid: 'g', role: ROLE.gest, method: 'create', path: 'dossiers/d1/commentaires/c1', data: {} });
allow('chiffreur logs historique', { uid: 'c', role: ROLE.chiff, method: 'create', path: 'dossiers/d1/historique/h1', data: {} });
allow('atg writes observation', { uid: 'a', role: ROLE.atg, method: 'create', path: 'dossiers/d1/observations/o1', data: {} });
allow('re reads rapport_pieces', { uid: 'r', role: ROLE.re, method: 'list', path: 'dossiers/d1/rapport_pieces' });
deny('chiffreur cannot write rapport_pieces', { uid: 'c', role: ROLE.chiff, method: 'create', path: 'dossiers/d1/rapport_pieces/x', data: {} });

// collection groups
allow('atg collectionGroup planifications', { uid: 'a', role: ROLE.atg, method: 'list', path: 'dossiers/d1/planifications', group: 'planifications' });
allow('re collectionGroup workflow', { uid: 'r', role: ROLE.re, method: 'list', path: 'dossiers/d1/workflow', group: 'workflow' });
allow('admin collectionGroup history', { uid: 'ad', role: ROLE.admin, method: 'list', path: 'users/u1/history', group: 'history' });
deny('gestionnaire collectionGroup history', { uid: 'g', role: ROLE.gest, method: 'list', path: 'users/u1/history', group: 'history' });

// ── rappels / bugReports (previously catch-all only) ─────────────────────
allow('gestionnaire lists rappels', { uid: 'g', role: ROLE.gest, method: 'list', path: 'rappels' });
allow('gestionnaire writes rappel snapshot', { uid: 'g', role: ROLE.gest, method: 'create', path: 'rappels/r1/snapshots/before', data: {} });
deny('atg cannot read rappels', { uid: 'a', role: ROLE.atg, method: 'list', path: 'rappels' });
deny('chiffreur cannot read rappels', { uid: 'c', role: ROLE.chiff, method: 'get', path: 'rappels/r1' });
allow('atg writes own bug report', { uid: 'a', role: ROLE.atg, method: 'create', path: 'bugReports/a', data: {} });
allow('atg posts own bug message', { uid: 'a', role: ROLE.atg, method: 'create', path: 'bugReports/a/messages/m1', data: {} });
deny('atg cannot read another bug report', { uid: 'a', role: ROLE.atg, method: 'get', path: 'bugReports/g' });
deny('atg cannot list bug inbox', { uid: 'a', role: ROLE.atg, method: 'list', path: 'bugReports' });
allow('admin lists bug inbox', { uid: 'ad', role: ROLE.admin, method: 'list', path: 'bugReports' });
allow('admin replies in any thread', { uid: 'ad', role: ROLE.admin, method: 'create', path: 'bugReports/a/messages/m2', data: {} });

// ── options / reference data ─────────────────────────────────────────────
allow('atg reads options_holidays', { uid: 'a', role: ROLE.atg, method: 'list', path: 'options_holidays' });
deny('atg cannot write options_holidays', { uid: 'a', role: ROLE.atg, method: 'create', path: 'options_holidays/h', data: {} });
allow('directeur writes options_holidays', { uid: 'd', role: ROLE.dir, method: 'create', path: 'options_holidays/h', data: {} });
allow('atg adds observation preset', { uid: 'a', role: ROLE.atg, method: 'create', path: 'options_observations/o', data: {} });
allow('gestionnaire edits options_natures', { uid: 'g', role: ROLE.gest, method: 'update', path: 'options_natures/n', existing: { a: 1 }, data: { a: 2 } });
deny('chiffreur cannot edit options_natures', { uid: 'c', role: ROLE.chiff, method: 'update', path: 'options_natures/n', existing: { a: 1 }, data: { a: 2 } });
allow('chiffreur reads options_types_documents', { uid: 'c', role: ROLE.chiff, method: 'list', path: 'options_types_documents' });
deny('gestionnaire cannot write options_roles', { uid: 'g', role: ROLE.gest, method: 'create', path: 'options_roles/r', data: {} });
allow('admin writes options_zones', { uid: 'ad', role: ROLE.admin, method: 'create', path: 'options_zones/z', data: {} });
allow('atg reads options_types_rdv', { uid: 'a', role: ROLE.atg, method: 'list', path: 'options_types_rdv' });
allow('everyone reads _seeds', { uid: 'c', role: ROLE.chiff, method: 'get', path: '_seeds/options_natures' });
deny('chiffreur cannot write _seeds', { uid: 'c', role: ROLE.chiff, method: 'create', path: '_seeds/options_natures', data: {} });
allow('chiffreur reads compagnies', { uid: 'c', role: ROLE.chiff, method: 'list', path: 'compagnies' });
deny('chiffreur cannot write compagnies', { uid: 'c', role: ROLE.chiff, method: 'create', path: 'compagnies/x', data: {} });

// ── chiffrages / chiffreurs / stamps / location_requests ─────────────────
allow('chiffreur creates chiffrage', { uid: 'c', role: ROLE.chiff, method: 'create', path: 'chiffrages/c1', data: {} });
allow('gestionnaire updates chiffrage', { uid: 'g', role: ROLE.gest, method: 'update', path: 'chiffrages/c1', existing: { a: 1 }, data: { a: 2 } });
deny('atg cannot write chiffrage', { uid: 'a', role: ROLE.atg, method: 'create', path: 'chiffrages/c2', data: {} });
allow('atg reads chiffrage', { uid: 'a', role: ROLE.atg, method: 'get', path: 'chiffrages/c1' });
allow('admin writes chiffreurs', { uid: 'ad', role: ROLE.admin, method: 'create', path: 'chiffreurs/x', data: {} });
deny('chiffreur cannot write chiffreurs', { uid: 'c', role: ROLE.chiff, method: 'create', path: 'chiffreurs/x', data: {} });
allow('chiffreur lists stamps', { uid: 'c', role: ROLE.chiff, method: 'list', path: 'stamps' });
allow('owner creates stamp', { uid: 'c', role: ROLE.chiff, method: 'create', path: 'stamps/s1', data: { createdBy: 'c' } });
deny('cannot create stamp for someone else', { uid: 'c', role: ROLE.chiff, method: 'create', path: 'stamps/s1', data: { createdBy: 'zz' } });
allow('atg reads own location_request', { uid: 'a', role: ROLE.atg, method: 'get', path: 'location_requests/l1', existing: { agentUid: 'a' } });
deny('atg cannot read other location_request', { uid: 'a', role: ROLE.atg, method: 'get', path: 'location_requests/l1', existing: { agentUid: 'zz' } });
allow('gestionnaire creates location_request', { uid: 'g', role: ROLE.gest, method: 'create', path: 'location_requests/l2', data: { agentUid: 'a' } });

// ── users ────────────────────────────────────────────────────────────────
allow('admin creates user with role', { uid: 'ad', role: ROLE.admin, method: 'create', path: 'users/newu', data: { role: 'Gestionnaire', nom: 'X' } });
allow('self-signup without role', { uid: 'newu', role: undefined, method: 'create', path: 'users/newu', data: { nom: 'X' }, noUserDoc: true });
deny('self-signup with role', { uid: 'newu', role: undefined, method: 'create', path: 'users/newu', data: { nom: 'X', role: 'Admin' }, noUserDoc: true });
allow('self updates heartbeat', { uid: 'a', role: ROLE.atg, method: 'update', path: 'users/a', existing: { role: ROLE.atg, seen: 1 }, data: { role: ROLE.atg, seen: 2 } });
allow('atg publishes own location', { uid: 'a', role: ROLE.atg, method: 'update', path: 'users/a', existing: { role: ROLE.atg }, data: { role: ROLE.atg, currentLocation: { lat: 1 } } });
deny('self cannot change role', { uid: 'a', role: ROLE.atg, method: 'update', path: 'users/a', existing: { role: ROLE.atg }, data: { role: 'Admin' } });
deny('self cannot grant nav items', { uid: 'a', role: ROLE.atg, method: 'update', path: 'users/a', existing: { role: ROLE.atg }, data: { role: ROLE.atg, grantedNavItems: ['utilisateurs'] } });
deny('self cannot change own compagnies', { uid: 'g', role: ROLE.gest, method: 'update', path: 'users/g', existing: { role: ROLE.gest, compagnies: ['A'] }, data: { role: ROLE.gest, compagnies: ['A', 'B'] } });
deny('gestionnaire cannot update another user', { uid: 'g', role: ROLE.gest, method: 'update', path: 'users/a', existing: { seen: 1 }, data: { seen: 2 } });
allow('admin updates another user (stamps)', { uid: 'ad', role: ROLE.admin, method: 'update', path: 'users/a', existing: {}, data: { assignedStampIds: ['s1'] } });
deny('gestionnaire cannot delete user', { uid: 'g', role: ROLE.gest, method: 'delete', path: 'users/a' });
allow('admin deletes user', { uid: 'ad', role: ROLE.admin, method: 'delete', path: 'users/a' });
allow('owner writes own session_meta', { uid: 'a', role: ROLE.atg, method: 'create', path: 'users/a/session_meta/current', data: { ip: '1.2.3.4' } });
allow('admin reads session_meta', { uid: 'ad', role: ROLE.admin, method: 'get', path: 'users/a/session_meta/current' });
deny('gestionnaire cannot read other session_meta (was leaked by catch-all)', { uid: 'g', role: ROLE.gest, method: 'get', path: 'users/a/session_meta/current' });

// ── nothing else ─────────────────────────────────────────────────────────
deny('admin cannot read an unknown collection (no catch-all)', { uid: 'ad', role: ROLE.admin, method: 'get', path: 'secrets/x' });
deny('gestionnaire cannot write an unknown collection', { uid: 'g', role: ROLE.gest, method: 'create', path: 'whatever/x', data: {} });

// ── build API payload ────────────────────────────────────────────────────
function toCase([name, expectation, c]) {
  // `list` is evaluated against a document path under the collection.
  const segs = c.path.split("/");
  const path = `${DB}/${segs.length % 2 === 1 ? c.path + "/__any__" : c.path}`;
  const request = { method: c.method, path, time: '2026-08-28T00:00:00Z' };
  if (c.uid) request.auth = { uid: c.uid, token: { sub: c.uid } };
  if (c.data !== undefined) request.resource = { data: c.data };
  const tc = { expectation, request };
  if (c.existing !== undefined) tc.resource = { data: c.existing };
  if (c.uid && !c.noUserDoc) {
    tc.functionMocks = [
      {
        function: 'get',
        args: [{ exactValue: `${DB}/users/${c.uid}` }],
        result: { value: { data: { role: c.role } } },
      },
    ];
  } else if (c.uid) {
    // Mock a missing user doc: get() returns null → .data access errors → deny.
    tc.functionMocks = [{ function: 'get', args: [{ anyValue: {} }], result: { value: null } }];
  }
  return { name, tc };
}

const built = cases.map(toCase);
const token = execSync('gcloud auth print-access-token', { encoding: 'utf8', shell: true }).trim();
const res = await fetch(`https://firebaserules.googleapis.com/v1/projects/${PROJECT}:test`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-goog-user-project': PROJECT },
  body: JSON.stringify({
    source: { files: [{ name: 'firestore.rules', content: RULES }] },
    testSuite: { testCases: built.map(b => b.tc) },
  }),
});
const body = await res.json();
if (!res.ok) {
  console.error('Rules API error', res.status, JSON.stringify(body, null, 2));
  process.exit(1);
}
if (body.issues?.length) {
  const errors = body.issues.filter(i => i.severity === 'ERROR');
  for (const i of body.issues) console.log(`[${i.severity}] ${i.sourcePosition?.line ?? '?'}: ${i.description}`);
  if (errors.length) process.exit(1);
}
let failed = 0;
body.testResults.forEach((r, i) => {
  const ok = r.state === 'SUCCESS';
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${built[i].name}${ok ? '' : `\n      ${JSON.stringify(r.debugMessages ?? r.errorPosition ?? r)}`}`);
});
console.log(`\n${built.length - failed}/${built.length} passed`);
process.exit(failed ? 1 : 0);
