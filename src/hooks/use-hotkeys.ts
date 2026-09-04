'use client';

/**
 * Global keyboard-shortcut registry.
 *
 * Conventions (GitHub / Linear / Gmail): single keys and `g`-chords rather than
 * modifier combos, so bindings are identical on macOS and Windows. Bindings are
 * ignored while focus is in a text field, a contenteditable or an open dialog
 * unless the binding sets `allowInInput`.
 *
 * Key syntax: `"g d"` (chord: g then d within 800 ms), `"mod+k"` (⌘ on macOS,
 * Ctrl elsewhere), `"shift+/"` or `"?"`, `"escape"`, `"mod+shift+t"`.
 */

import { useEffect, useRef, useSyncExternalStore, type DependencyList } from 'react';
import { t } from '@/i18n';

export interface Hotkey {
  keys: string;
  /** Shown in the `?` sheet and in tooltips. */
  label: string;
  group: string;
  handler: (e: KeyboardEvent) => void;
  allowInInput?: boolean;
  /** Only active while the registering component is mounted (default true). */
  enabled?: boolean;
}

type Listener = () => void;

const registry = new Map<string, Hotkey>(); // id → hotkey
const listeners = new Set<Listener>();
let snapshot: Hotkey[] = [];
let nextId = 1;

function emit() {
  snapshot = Array.from(registry.values());
  listeners.forEach((l) => l());
}

export const CHORD_TIMEOUT_MS = 800;

export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform) || /Mac/.test(navigator.userAgent);
}

/** Human-readable key label: "mod+k" → "⌘ K" / "Ctrl K"; "g d" → "G puis D". */
export function formatKeys(keys: string): string[] {
  const mac = isMac();
  return keys.split(' ').map((part) =>
    part
      .split('+')
      .map((k) => {
        switch (k) {
          case 'mod': return mac ? '⌘' : 'Ctrl';
          case 'shift': return mac ? '⇧' : t('Maj');
          case 'alt': return mac ? '⌥' : 'Alt';
          case 'escape': return t('Échap');
          case 'enter': return '↵';
          case 'backspace': return '⌫';
          case 'arrowup': return '↑';
          case 'arrowdown': return '↓';
          case 'arrowleft': return '←';
          case 'arrowright': return '→';
          case '/': return '/';
          default: return k.length === 1 ? k.toUpperCase() : k;
        }
      })
      .join(mac ? '' : '+'),
  );
}

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  if (el.closest('[role="dialog"], [role="menu"], [role="listbox"], [cmdk-root]')) return true;
  return false;
}

/** Enter/Space natively ACTIVATE these — a registry binding on those keys
 *  must never steal the press from a focused button/link/menu item. */
function isActivationTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  return !!el.closest(
    'button, a[href], summary, [role="button"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="checkbox"], [role="radio"], [role="tab"], [role="option"], [role="switch"]',
  );
}

function normalizeEventKey(e: KeyboardEvent): string {
  const k = e.key;
  if (k === ' ') return 'space';
  if (k === 'Escape') return 'escape';
  if (k === 'Enter') return 'enter';
  if (k === 'Backspace') return 'backspace';
  if (k === 'Tab') return 'tab';
  if (k.startsWith('Arrow')) return k.toLowerCase();
  return k.length === 1 ? k.toLowerCase() : k.toLowerCase();
}

function matchesStep(step: string, e: KeyboardEvent): boolean {
  const parts = step.split('+');
  const key = parts[parts.length - 1];
  const wantMod = parts.includes('mod');
  const wantShift = parts.includes('shift');
  const wantAlt = parts.includes('alt');
  const mod = isMac() ? e.metaKey : e.ctrlKey;
  if (wantMod !== mod) return false;
  if (wantAlt !== e.altKey) return false;
  // Printable symbols that need Shift on most layouts ("?", "/") are matched on
  // e.key directly so the physical shift state doesn't matter.
  if (key === '?' || key === '/') return e.key === key;
  const evKey = normalizeEventKey(e);
  if (evKey !== key) return false;
  return wantShift === e.shiftKey;
}

let pendingChord: { first: string; at: number } | null = null;
let installed = false;

function onKeyDown(e: KeyboardEvent) {
  if (e.defaultPrevented) return;
  const editable = isEditableTarget(e.target);
  const now = Date.now();
  if (pendingChord && now - pendingChord.at > CHORD_TIMEOUT_MS) pendingChord = null;

  const hotkeys = Array.from(registry.values()).filter((h) => h.enabled !== false && (!editable || h.allowInInput));

  // Chord completion: a pending first key + this key.
  if (pendingChord) {
    const first = pendingChord.first;
    for (const h of hotkeys) {
      const steps = h.keys.split(' ');
      if (steps.length === 2 && steps[0] === first && matchesStep(steps[1], e)) {
        pendingChord = null;
        e.preventDefault();
        h.handler(e);
        return;
      }
    }
    pendingChord = null;
  }

  // Direct single-step bindings. Bare enter/space yield to a focused
  // button/link so native activation always wins.
  const activation = isActivationTarget(e.target);
  for (const h of hotkeys) {
    const steps = h.keys.split(' ');
    if (steps.length !== 1) continue;
    if (activation && (steps[0] === 'enter' || steps[0] === 'space')) continue;
    if (matchesStep(steps[0], e)) {
      e.preventDefault();
      h.handler(e);
      return;
    }
  }

  // Start a chord if any binding begins with this key (no modifiers).
  if (!e.metaKey && !e.ctrlKey && !e.altKey) {
    const evKey = normalizeEventKey(e);
    if (hotkeys.some((h) => h.keys.split(' ').length === 2 && h.keys.split(' ')[0] === evKey)) {
      pendingChord = { first: evKey, at: now };
    }
  }
}

function ensureInstalled() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('keydown', onKeyDown);
}

/** Register one or more hotkeys for the lifetime of the component. */
export function useHotkeys(hotkeys: Hotkey[], deps: DependencyList = []) {
  const idsRef = useRef<string[]>([]);
  useEffect(() => {
    ensureInstalled();
    const ids = hotkeys.map((h) => {
      const id = `hk-${nextId++}`;
      registry.set(id, h);
      return id;
    });
    idsRef.current = ids;
    emit();
    return () => {
      ids.forEach((id) => registry.delete(id));
      emit();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Live list of registered hotkeys (for the `?` sheet). */
export function useRegisteredHotkeys(): Hotkey[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => snapshot,
    () => snapshot,
  );
}
