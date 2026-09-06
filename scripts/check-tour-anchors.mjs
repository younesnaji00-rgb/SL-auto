#!/usr/bin/env node
/**
 * Guided-tutorial anchor checker.
 *
 * Every tour step points at a `data-tour="…"` attribute rendered by the real
 * UI. When a page is redesigned the attribute moves or disappears and the step
 * is SILENTLY dropped — the engine filters out steps whose anchor is absent —
 * so a stale tour still looks fine and simply teaches less and less. That is
 * how the tutorial drifted away from the app once already; this script turns
 * that silent rot into a build failure.
 *
 * It parses the real syntax tree (anchors are routinely chosen by a ternary,
 * held in a local const, or passed into a small render helper, and a regex
 * over the source cannot follow any of that). Resolution handles:
 *   - `data-tour="x"` / `data-tour={'x'}` / `data-tour={`x`}`
 *   - conditionals: `data-tour={a ? 'x' : b ? 'y' : undefined}`
 *   - locals:       `const slotTour = …; <div data-tour={slotTour}>`
 *   - parameters:   `const b = (tour?: string) => <div data-tour={tour}/>`
 *                   resolved from that function's call sites in the same file
 *   - props:        `<EntityTabsBar dataTour="dos-tabs" />`
 *   - templates:    `data-tour={`nav-${item.href}`}` → expanded via DYNAMIC
 *
 * Usage: node scripts/check-tour-anchors.mjs [--list]
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const SRC = 'src';
const TOURS = 'src/lib/tutorial/pages';

/**
 * Anchors whose suffix is computed at render time. Keys are the literal
 * prefix the template starts with, values the complete set of suffixes the
 * app can emit. Listed here so a renamed id surfaces as a failure instead of
 * a vanished step — keep each entry next to the source of its values.
 */
const DYNAMIC = {
  // src/components/layout/sidebar.tsx ← src/lib/nav-groups.ts
  'nav-': [
    '/dashboard', '/monitoring', '/dossiers', '/mes-rappels', '/consultation',
    '/compagnies', '/assignations-chiffrage', '/assignations-atg',
    '/utilisateurs', '/tampons', '/jours-feries', '/signaler-bug',
  ],
  // src/components/dossier-timeline/timeline-bar.tsx (bar) / timeline.tsx (heading)
  'dosd-step-': ['1', '4', '6', '7', '8', '9', '10', '11'],
  'dosd-sec-': ['1', '4', '6', '7', '8', '9', '10', '11'],
  // src/app/(app)/dossiers/[id]/photos-tab.tsx
  'dosd-photos-': ['avant', 'en_cours', 'apres'],
  // src/app/(app)/assignations-atg/page.tsx
  'atg-group-': ['today', 'expired', 'future'],
  // src/app/(app)/dashboard/admin-dashboard.tsx (one tab per role)
  'dash-tab-': ['gestionnaires', 'chiffreurs', 'terrain'],
  // src/app/(app)/dossiers/client-page.tsx (sortable column headers)
  'dos-col-': ['nature', 'statut'],
};

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p)) out.push(p);
  }
  return out;
}

/** Anchors this file can render, plus the template prefixes it builds. */
function anchorsIn(file) {
  const code = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const found = new Set();
  const prefixes = new Set();
  /** Every string literal passed at argument index `i` to `fn(...)`. */
  const argsByFunction = new Map(); // name -> Map(index -> Set(values))
  /** `const x = <expr>` by name, for local indirection. */
  const consts = new Map();

  const collectDeclarations = (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      consts.set(node.name.text, node.initializer);
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text;
      if (!argsByFunction.has(name)) argsByFunction.set(name, new Map());
      const byIndex = argsByFunction.get(name);
      node.arguments.forEach((arg, i) => {
        if (ts.isStringLiteralLike(arg)) {
          if (!byIndex.has(i)) byIndex.set(i, new Set());
          byIndex.get(i).add(arg.text);
        }
      });
    }
    ts.forEachChild(node, collectDeclarations);
  };
  collectDeclarations(sf);

  /** Resolve an expression to the anchor strings it can produce. */
  const resolve = (node, seen = new Set()) => {
    if (!node) return;
    if (ts.isStringLiteralLike(node)) {
      found.add(node.text);
      return;
    }
    if (ts.isParenthesizedExpression(node)) return resolve(node.expression, seen);
    if (ts.isConditionalExpression(node)) {
      resolve(node.whenTrue, seen);
      resolve(node.whenFalse, seen);
      return;
    }
    // `a ?? 'x'`, `a || 'x'`, `a && 'x'`
    if (ts.isBinaryExpression(node)) {
      resolve(node.left, seen);
      resolve(node.right, seen);
      return;
    }
    if (ts.isTemplateExpression(node)) {
      // `nav-${item.href}` — only the static head is knowable here.
      const head = node.head.text;
      if (head) prefixes.add(head);
      return;
    }
    if (ts.isIdentifier(node)) {
      if (seen.has(node.text)) return;
      seen.add(node.text);
      const init = consts.get(node.text);
      if (init) return resolve(init, seen);
      // Not a local const: most likely a parameter of a small render helper
      // (`gatedButton(label, tour)`), so take what its call sites pass in.
      const owner = enclosingFunction(node);
      if (owner) {
        const idx = owner.params.findIndex((p) => p === node.text);
        const byIndex = idx >= 0 ? argsByFunction.get(owner.name)?.get(idx) : null;
        if (byIndex) for (const v of byIndex) found.add(v);
      }
      return;
    }
    // Anything else (a call, a member access) is opaque to a static pass.
  };

  /** Name + parameter names of the function declaration containing `node`. */
  const enclosingFunction = (node) => {
    for (let p = node.parent; p; p = p.parent) {
      const isFn =
        ts.isArrowFunction(p) || ts.isFunctionExpression(p) || ts.isFunctionDeclaration(p);
      if (!isFn) continue;
      const params = p.parameters
        .map((param) => (ts.isIdentifier(param.name) ? param.name.text : ''))
        .filter(Boolean);
      let name = ts.isFunctionDeclaration(p) && p.name ? p.name.text : '';
      if (!name && p.parent && ts.isVariableDeclaration(p.parent) && ts.isIdentifier(p.parent.name)) {
        name = p.parent.name.text;
      }
      if (name) return { name, params };
    }
    return null;
  };

  const visit = (node) => {
    if (ts.isJsxAttribute(node) && node.name) {
      const attr = ts.isIdentifier(node.name) ? node.name.text : node.name.getText(sf);
      if (attr === 'data-tour' || attr === 'dataTour') {
        const init = node.initializer;
        if (init && ts.isStringLiteral(init)) found.add(init.text);
        else if (init && ts.isJsxExpression(init)) resolve(init.expression);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return { found, prefixes };
}

// ── What the app renders ────────────────────────────────────────────────
const literal = new Set();
const prefixes = new Set();
const owner = new Map(); // anchor -> file that renders it
for (const file of walk(SRC)) {
  // The engine and the launcher build `[data-tour="…"]` SELECTORS from step
  // data; reading those as declarations would whitelist whatever a tour asks
  // for, which is precisely what this script exists to check.
  if (file.includes(path.join('lib', 'tutorial'))) continue;
  if (file.includes(path.join('components', 'tutorial'))) continue;
  const { found, prefixes: pfx } = anchorsIn(file);
  for (const a of found) {
    literal.add(a);
    if (!owner.has(a)) owner.set(a, file);
  }
  for (const p of pfx) prefixes.add(p);
}
for (const [prefix, suffixes] of Object.entries(DYNAMIC)) {
  for (const s of suffixes) literal.add(prefix + s);
}
// The launcher renders its own anchor (its directory is skipped above).
literal.add('tutorial-launcher');

// A template prefix the app builds but DYNAMIC does not describe means the
// checker is blind to a whole family of anchors — say so rather than pass.
const undocumented = [...prefixes].filter((p) => p && !(p in DYNAMIC));

// ── What the tours ask for ──────────────────────────────────────────────
const refs = new Map(); // anchor -> Set("file (kind)")
for (const f of fs.readdirSync(TOURS)) {
  if (!f.endsWith('.ts')) continue;
  const code = fs.readFileSync(path.join(TOURS, f), 'utf8');
  for (const m of code.matchAll(/\b(anchor|click|expand)\s*:\s*'([^']+)'/g)) {
    if (!refs.has(m[2])) refs.set(m[2], new Set());
    refs.get(m[2]).add(`${f} (${m[1]})`);
  }
}

const missing = [...refs].filter(([a]) => !literal.has(a)).sort();
const unused = [...literal].filter((a) => !refs.has(a) && a !== 'tutorial-launcher').sort();

if (process.argv.includes('--list')) {
  console.log(`Anchors rendered by the app (${literal.size}):`);
  for (const a of [...literal].sort()) {
    console.log(`  ${a.padEnd(26)} ${owner.get(a)?.replace(/^src[\\/]/, '') ?? '(dynamic)'}`);
  }
  console.log(`\nRendered but no tour step uses them (${unused.length}):`);
  console.log(unused.map((a) => `  ${a}`).join('\n'));
  console.log('');
}

let bad = false;
if (undocumented.length) {
  bad = true;
  console.error('✗ template anchor prefix(es) with no DYNAMIC entry:\n');
  for (const p of undocumented) console.error(`  ${p}…`);
  console.error('\nAdd the values the app can produce to DYNAMIC below.\n');
}
if (missing.length) {
  bad = true;
  console.error(`✗ ${missing.length} tour anchor(s) no component renders:\n`);
  for (const [a, where] of missing) console.error(`  ${a.padEnd(26)} ${[...where].join(', ')}`);
  console.error('\nEither restore the data-tour attribute, update the step, or add the');
  console.error('value to DYNAMIC in scripts/check-tour-anchors.mjs.\n');
}
if (bad) process.exit(1);
console.log(`✓ all ${refs.size} tour anchors resolve (${unused.length} app anchors unused by a tour)`);
