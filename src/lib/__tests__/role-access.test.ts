// Run: npx tsx --test src/lib/__tests__/role-access.test.ts
//
// Owner rulings 2026-09-25 and 2026-10-01: every role of the fixed list opens
// something — the Directeurs as Admin everywhere, the three « Responsable
// des … » as Admin of their own side plus their team's dashboard and nothing
// else — and no label loops on « Chargement… ».
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NAV_ITEMS } from '../nav-groups';
import { roles } from '../dossiers-data';
import {
  canOpenPath,
  describeRole,
  landingPathForAccess,
  isTeamLead,
  resolveRoleAccess,
  roleKey,
  roleOpensNavItem,
  scopeWritesSection,
  teamRoleOf,
} from '../role-access';

const opens = (label: string) =>
  NAV_ITEMS.filter((i) => i.roles !== null && roleOpensNavItem(i, resolveRoleAccess(label))).map((i) => i.href);

/** The shell's route guard for an account of this label, with its default sidebar. */
const canOpen = (label: string, path: string) => {
  const access = resolveRoleAccess(label);
  const nav = NAV_ITEMS.filter((i) => roleOpensNavItem(i, access)).map((i) => i.href);
  return canOpenPath(path, access, nav);
};

test('every role of the list opens at least one page — none loops', () => {
  for (const label of roles) {
    const access = resolveRoleAccess(label);
    assert.ok(access.role, label);
    assert.ok(opens(label).length > 0, label);
    assert.ok(canOpen(label, landingPathForAccess(access)), label);
  }
});

test('Admin and the Directeurs: Admin rights on every page', () => {
  const adminPages = opens('Admin');
  assert.ok(adminPages.includes('/utilisateurs'));
  for (const label of ['Directeur', 'Directeur des opérations', 'Directeur technique']) {
    assert.deepEqual(resolveRoleAccess(label), { role: 'Admin', scope: null }, label);
    assert.deepEqual(opens(label), adminPages, label);
    for (const path of ['/dossiers/x', '/assignations-chiffrage/x', '/assignations-atg/x', '/utilisateurs', '/tampons']) {
      assert.ok(canOpen(label, path), `${label} ${path}`);
    }
  }
});

// 2026-10-14: and, like a chiffreur, the dossier of a chiffrage (« Ouvrir le dossier »).
test('responsable des chiffreurs: the chiffrage pages, a dossier opened from a chiffrage, its dashboard', () => {
  const label = 'Responsable des chiffreurs';
  assert.deepEqual(resolveRoleAccess(label), { role: 'Admin', scope: 'chiffrage' });
  assert.deepEqual(opens(label), ['/dashboard', '/assignations-chiffrage']);
  for (const path of ['/dashboard', '/assignations-chiffrage/abc', '/chiffrage/abc', '/devis-editor', '/dossiers/abc', '/signaler-bug']) {
    assert.ok(canOpen(label, path), path);
  }
  for (const path of ['/dossiers', '/mes-rappels', '/consultation', '/assignations-atg', '/assignations-atg/abc', '/utilisateurs', '/monitoring']) {
    assert.ok(!canOpen(label, path), path);
  }
  assert.ok(scopeWritesSection('chiffrage', 'assignations-chiffrage'));
  assert.ok(!scopeWritesSection('chiffrage', 'dossiers'));
  assert.ok(!scopeWritesSection('chiffrage', 'assignations-atg'));
});

test('responsable des agents de terrain: the missions and its dashboard, nothing else', () => {
  const label = 'Responsable des agents de terrain';
  assert.deepEqual(resolveRoleAccess(label), { role: 'Admin', scope: 'terrain' });
  assert.deepEqual(opens(label), ['/dashboard', '/assignations-atg']);
  assert.ok(canOpen(label, '/assignations-atg/abc'));
  for (const path of ['/dossiers/abc', '/assignations-chiffrage', '/chiffrage/abc', '/devis-editor', '/mes-rappels', '/utilisateurs']) {
    assert.ok(!canOpen(label, path), path);
  }
  assert.ok(scopeWritesSection('terrain', 'assignations-atg'));
  assert.ok(!scopeWritesSection('terrain', 'dossiers'));
});

// 2026-10-14: and, like a gestionnaire, the devis editor its dossiers link to.
test('responsable des gestionnaires: the Opérations pages and the devis editor, nothing of the chiffrage queue or terrain', () => {
  const label = 'Responsable des gestionnaires';
  assert.deepEqual(resolveRoleAccess(label), { role: 'Admin', scope: 'operations' });
  assert.deepEqual(opens(label), ['/dashboard', '/monitoring', '/dossiers', '/mes-rappels', '/consultation', '/compagnies']);
  for (const path of ['/dossiers/abc', '/devis-editor', '/chiffrage/abc']) assert.ok(canOpen(label, path), path);
  for (const path of ['/assignations-chiffrage', '/assignations-atg/abc', '/utilisateurs', '/tampons']) {
    assert.ok(!canOpen(label, path), path);
  }
  assert.ok(scopeWritesSection('operations', 'dossiers'));
  assert.ok(!scopeWritesSection('operations', 'assignations-chiffrage'));
});

test('labels typed before the list was fixed still resolve', () => {
  for (const label of ['directeur', 'directeur des operations', 'directeur technique']) {
    assert.deepEqual(resolveRoleAccess(label), { role: 'Admin', scope: null }, label);
  }
  assert.deepEqual(resolveRoleAccess('responsable des gestionnaires'), { role: 'Admin', scope: 'operations' });
  assert.deepEqual(resolveRoleAccess('responsable des chiffreurs'), { role: 'Admin', scope: 'chiffrage' });
  // Typed « reponsable des agent de terrain » in production until 2026-10-01.
  assert.deepEqual(resolveRoleAccess('reponsable des agent de terrain'), { role: 'Admin', scope: 'terrain' });
  // 2026-09-25 ruling, kept for the account that still carries it.
  for (const label of ["responsable d'equipe", "Responsable d'équipe", 'Responsable d’équipe', 'Responsable technique']) {
    assert.deepEqual(resolveRoleAccess(label), { role: 'Admin', scope: null }, label);
  }
});

test('the operational roles are unchanged, whatever the case', () => {
  assert.deepEqual(resolveRoleAccess('Gestionnaire'), { role: 'Gestionnaire', scope: null });
  assert.deepEqual(resolveRoleAccess('chiffreur'), { role: 'Chiffreur', scope: null });
  assert.deepEqual(resolveRoleAccess('agent de terrain'), { role: 'Agent de Terrain', scope: null });
  assert.deepEqual(opens('Chiffreur'), ['/dashboard', '/assignations-chiffrage']);
  // The agent de terrain keeps to its own navigation; a chiffreur opens a
  // dossier from its chiffrage (« Ouvrir le dossier »).
  assert.ok(canOpen('Agent de Terrain', '/assignations-atg/abc'));
  assert.ok(!canOpen('Agent de Terrain', '/dossiers/abc'));
  assert.ok(canOpen('Chiffreur', '/dossiers/abc'));
});

// Live check 2026-10-09/10: a Gestionnaire or a Chiffreur typing an address
// opened any page — user management included. Each now opens its own menu,
// the pages its work links to, and pages granted to the account.
test('gestionnaire: its menu, the dossier pages and the devis editor — nothing else', () => {
  for (const path of ['/dashboard', '/dossiers', '/dossiers/abc', '/mes-rappels', '/consultation', '/devis-editor', '/chiffrage/abc', '/signaler-bug']) {
    assert.ok(canOpen('Gestionnaire', path), path);
  }
  for (const path of ['/monitoring', '/assignations-chiffrage', '/assignations-atg', '/compagnies', '/utilisateurs', '/tampons', '/jours-feries']) {
    assert.ok(!canOpen('Gestionnaire', path), path);
  }
});

test('chiffreur: its queue, the editor and a dossier opened from a chiffrage — not the lists', () => {
  for (const path of ['/dashboard', '/assignations-chiffrage', '/assignations-chiffrage/abc', '/devis-editor', '/chiffrage/abc', '/dossiers/abc']) {
    assert.ok(canOpen('Chiffreur', path), path);
  }
  for (const path of ['/dossiers', '/mes-rappels', '/consultation', '/monitoring', '/compagnies', '/assignations-atg', '/utilisateurs']) {
    assert.ok(!canOpen('Chiffreur', path), path);
  }
});

test('a page granted to one account opens for it (individual permissions)', () => {
  const access = resolveRoleAccess('Gestionnaire');
  const nav = [...NAV_ITEMS.filter((i) => roleOpensNavItem(i, access)).map((i) => i.href), '/compagnies'];
  assert.ok(canOpenPath('/compagnies', access, nav));
  assert.ok(canOpenPath('/compagnies/atlanta', access, nav));
});

test('Admin and the Directeurs open everything', () => {
  for (const label of ['Admin', 'Directeur', 'Directeur des opérations']) {
    for (const path of ['/monitoring', '/utilisateurs', '/tampons', '/assignations-atg', '/dossiers', '/compagnies']) {
      assert.ok(canOpen(label, path), `${label} ${path}`);
    }
  }
});

test('an unknown label opens nothing — never Admin by default', () => {
  assert.deepEqual(resolveRoleAccess('stagiaire'), { role: null, scope: null });
  assert.deepEqual(opens('stagiaire'), []);
  assert.ok(!canOpen('stagiaire', '/dashboard'));
  assert.equal(describeRole('stagiaire'), 'Ce rôle ne donne accès à aucune page.');
  assert.equal(describeRole(''), null);
});

test('first page after login', () => {
  assert.equal(landingPathForAccess(resolveRoleAccess('Directeur')), '/dashboard');
  assert.equal(landingPathForAccess(resolveRoleAccess('Responsable des gestionnaires')), '/dashboard');
  assert.equal(landingPathForAccess(resolveRoleAccess('Responsable des chiffreurs')), '/dashboard');
  assert.equal(landingPathForAccess(resolveRoleAccess('Responsable des agents de terrain')), '/dashboard');
});

test('captions under the Rôle field', () => {
  assert.equal(describeRole('Directeur'), 'Mêmes droits que l’Admin');
  assert.equal(describeRole('Admin'), 'Accès complet : dossiers, assignations, utilisateurs et paramètres');
  assert.equal(
    describeRole('Responsable des chiffreurs'),
    'Droits Admin sur le chiffrage uniquement, et le tableau de bord de l’équipe des chiffreurs. Peut aussi recevoir des chiffrages comme un chiffreur',
  );
  for (const label of roles) assert.ok(describeRole(label), label);
});

// Owner ruling 2026-10-14: a « Responsable des … » also does the work of the
// team they lead, and shows in that team's pickers with a « Responsable » pill.
test('a responsable does the work of their team', () => {
  assert.equal(teamRoleOf('Gestionnaire'), 'Gestionnaire');
  assert.equal(teamRoleOf('Chiffreur'), 'Chiffreur');
  assert.equal(teamRoleOf('Agent de Terrain'), 'Agent de Terrain');
  assert.equal(teamRoleOf('Responsable des gestionnaires'), 'Gestionnaire');
  assert.equal(teamRoleOf('Responsable des chiffreurs'), 'Chiffreur');
  assert.equal(teamRoleOf('Responsable des agents de terrain'), 'Agent de Terrain');
  assert.equal(teamRoleOf('reponsable des agents de terrain'), 'Agent de Terrain');
  for (const label of ['Admin', 'Directeur', 'Directeur technique', "Responsable d'équipe", 'stagiaire', '', null]) {
    assert.equal(teamRoleOf(label), null, String(label));
  }
  assert.ok(isTeamLead('Responsable des chiffreurs'));
  assert.ok(!isTeamLead('Chiffreur'));
  assert.ok(!isTeamLead('Directeur'));
  assert.ok(!isTeamLead("Responsable d'équipe"));
});

// QA #058: « Directeur » in the role filter found no account saved as « directeur ».
test('role labels compare whatever their case, accents and spacing', () => {
  assert.equal(roleKey('directeur'), roleKey('Directeur'));
  assert.equal(roleKey(' Directeur  des opérations'), roleKey('directeur des operations'));
  assert.notEqual(roleKey('Directeur'), roleKey('Directeur technique'));
});
