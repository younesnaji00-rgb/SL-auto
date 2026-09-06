#!/usr/bin/env node
/**
 * Browser check: the guided-tour "?" launcher must land under the pointer.
 *
 * Why this exists as a real browser test rather than a unit test: the bug it
 * guards against was invisible to typecheck, lint and reasoning. The app puts
 * CSS `zoom` on <html> (density ruling: 0.9 on 1080p, 1.1 on 1440p), and
 * pointer coordinates are reported in VISUAL viewport pixels while an inline
 * `left`/`top` is interpreted in the ZOOMED document space. Writing one into
 * the other displaced the button by (zoom − 1) × its distance from the origin
 * — it appeared to teleport the instant it was grabbed. At zoom 1, which is
 * what a default headless window and most dev machines report, everything
 * looked perfect. So the check MUST sweep the zoom values.
 *
 * No new dependencies: Node 22+ ships a global WebSocket and Chrome is
 * already installed, so this drives Chrome over the DevTools Protocol.
 *
 * Usage:
 *   1. Start a dev server whose brand shows the launcher without signing in
 *      (the demo brand offers tutorials to every role, and /login has its own
 *      tour):  NEXT_PUBLIC_BRAND=demo npx next dev -p 9011
 *   2. node scripts/check-launcher-drag.mjs [url] [zoom...]
 *
 * Exits non-zero if the button does not land under the pointer.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const URL_ = process.argv[2] || 'http://localhost:9011/login';
const ZOOMS = process.argv.slice(3).length ? process.argv.slice(3) : ['0.9', '1', '1.1', '1.25'];
const SEL = '[data-tour="tutorial-launcher"]';
const PORT = 9333;
const CHROME =
  process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!fs.existsSync(CHROME)) {
  console.error(`Chrome not found at ${CHROME} — set CHROME_PATH.`);
  process.exit(2);
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'launcher-drag-'));
const chrome = spawn(
  CHROME,
  [
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    '--headless=new',
    '--window-size=1920,1080',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
  ],
  { stdio: 'ignore' },
);

const cleanup = () => {
  try { chrome.kill(); } catch { /* already gone */ }
  try { fs.rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
};

async function connect() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const url = list.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
      if (url) return url;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('Chrome did not expose a debugging target');
}

const ws = new WebSocket(await connect());
await new Promise((r) => (ws.onopen = r));

let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  const entry = msg.id && pending.get(msg.id);
  if (!entry) return;
  pending.delete(msg.id);
  msg.error ? entry.reject(new Error(JSON.stringify(msg.error))) : entry.resolve(msg.result);
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    id += 1;
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
const mouse = (type, x, y) =>
  send('Input.dispatchMouseEvent', {
    type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, pointerType: 'mouse',
  });
const escape = async () => {
  for (const type of ['keyDown', 'keyUp']) {
    await send('Input.dispatchKeyEvent', {
      type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27, nativeVirtualKeyCode: 27,
    });
  }
};

await send('Page.enable');
await send('Runtime.enable');

const rect = () =>
  evaluate(`(() => {
    const el = document.querySelector('${SEL}');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: r.left, top: r.top, w: r.width, h: r.height };
  })()`);

/** True once nothing is covering the button's centre. */
const uncovered = () =>
  evaluate(`(() => {
    const el = document.querySelector('${SEL}');
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return top === el || el.contains(top);
  })()`);

let failures = 0;
for (const zoom of ZOOMS) {
  // Reload per zoom so each run starts from the default corner with a clean
  // stored position.
  await send('Page.navigate', { url: URL_ });
  await sleep(6000);
  await evaluate(`window.localStorage.clear()`);
  await send('Page.navigate', { url: URL_ });
  await sleep(5000);
  await evaluate(`document.documentElement.style.setProperty('--app-zoom', '${zoom}')`);
  await sleep(400);

  if (!(await rect())) {
    console.error(`zoom ${zoom}: launcher not rendered (is the dev server on the demo brand?)`);
    failures += 1;
    continue;
  }
  // The /login lightbox greets every visit and sits above the button; the
  // spotlight it hands off to overlays as well. Clear both before measuring.
  for (let i = 0; i < 4 && !(await uncovered()); i += 1) {
    await escape();
    await sleep(1200);
  }

  const before = await rect();
  const from = { x: before.left + before.w / 2, y: before.top + before.h / 2 };
  const to = { x: 600, y: 300 };

  await mouse('mousePressed', from.x, from.y);
  await sleep(60);
  for (let i = 1; i <= 6; i += 1) {
    await mouse('mouseMoved', from.x + ((to.x - from.x) * i) / 6, from.y + ((to.y - from.y) * i) / 6);
    await sleep(40);
  }
  await mouse('mouseReleased', to.x, to.y);
  await sleep(400);

  const after = await rect();
  const dx = Math.round(after.left + after.w / 2 - to.x);
  const dy = Math.round(after.top + after.h / 2 - to.y);
  const ok = Math.abs(dx) <= 3 && Math.abs(dy) <= 3;
  if (!ok) failures += 1;
  console.log(
    `zoom ${String(zoom).padEnd(5)} ${ok ? 'PASS' : 'FAIL'}  offset from pointer: (${dx}, ${dy})`,
  );
}

ws.close();
cleanup();
if (failures) {
  console.error(`\n✗ ${failures} of ${ZOOMS.length} zoom level(s) failed.`);
  process.exit(1);
}
console.log(`\n✓ launcher lands under the pointer at every zoom (${ZOOMS.join(', ')})`);
