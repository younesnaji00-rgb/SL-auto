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
  resolveRoleAccess,
  roleOpensNavItem,
  scopeWritesSection,
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

test('responsable des chiffreurs: the chiffrage pages and its dashboard, nothing else', () => {
  const label = 'Responsable des chiffreurs';
  assert.deepEqual(resolveRoleAccess(label), { role: 'Admin', scope: 'chiffrage' });
  assert.deepEqual(opens(label), ['/dashboard', '/assignations-chiffrage']);
  for (const path of ['/dashboard', '/assignations-chiffrage/abc', '/chiffrage/abc', '/devis-editor', '/signaler-bug']) {
    assert.ok(canOpen(label, path), path);
  }
  for (const path of ['/dossiers', '/dossiers/abc', '/mes-rappels', '/consultation', '/assignations-atg', '/assignations-atg/abc', '/utilisateurs', '/monitoring']) {
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

test('responsable des gestionnaires: the Opérations pages, nothing of chiffrage or terrain', () => {
  const label = 'Responsable des gestionnaires';
  assert.deepEqual(resolveRoleAccess(label), { role: 'Admin', scope: 'operations' });
  assert.deepEqual(opens(label), ['/dashboard', '/monitoring', '/dossiers', '/mes-rappels', '/consultation', '/compagnies']);
  assert.ok(canOpen(label, '/dossiers/abc'));
  for (const path of ['/assignations-chiffrage', '/chiffrage/abc', '/devis-editor', '/assignations-atg/abc', '/utilisateurs', '/tampons']) {
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
  // The agent de terrain keeps to its own navigation; a chiffreur is not limited by the guard.
  assert.ok(canOpen('Agent de Terrain', '/assignations-atg/abc'));
  assert.ok(!canOpen('Agent de Terrain', '/dossiers/abc'));
  assert.ok(canOpen('Chiffreur', '/dossiers/abc'));
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
    'Droits Admin sur le chiffrage uniquement, et le tableau de bord de l’équipe des chiffreurs',
  );
  for (const label of roles) assert.ok(describeRole(label), label);
});
