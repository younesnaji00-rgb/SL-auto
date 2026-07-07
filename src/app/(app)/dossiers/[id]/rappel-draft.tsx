'use client';

/**
 * Rappel draft buffer — "rien ne part avant Sauvegarder".
 *
 * When a gestionnaire opens a dossier from Mes Rappels (rappel-treatment
 * session, detected via the `rappel-active-session-{dossierId}` localStorage
 * handshake), every edit to the `dossiers/{id}` DOCUMENT made from the
 * gestionnaire editing surfaces (Information, Dates clés, rapport selects,
 * AI-scan pre-fill…) is captured HERE instead of being written to Firestore.
 * Nothing reaches the live dossier — and therefore Gestion des Dossiers —
 * until the amber « Sauvegarder » button flushes the buffer.
 *
 * The buffer is mirrored to localStorage on every change (Timestamp /
 * serverTimestamp / deleteField sentinels encoded), so a crash, power cut or
 * accidental tab close never loses the session's work: reopening the dossier
 * while the rappel session is still active restores the buffer as-is.
 *
 * OUT of the buffer, by design (operational actions other actors depend on,
 * or subcollection data with its own explicit send/upload semantics):
 * observations, photo/document uploads, planifications (+ statut bump),
 * envoi en chiffrage, and rapport PDF generation — generation force-flushes
 * the buffer first so the produced PDF reads the up-to-date dossier.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FieldValue,
  Timestamp,
  deleteField,
  doc,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { logHistorique, logWorkflow } from './log-historique';

/** A historique/workflow entry authored during the session, written at flush
 *  so the audit trail never shows changes the dossier doesn't have yet.
 *  `args` are the parameters that follow (db, dossierId) in the logger. */
export interface PendingLog {
  kind: 'historique' | 'workflow';
  args: any[];
}

export interface RappelDraftValue {
  /** True while a rappel-treatment session is buffering writes. */
  active: boolean;
  /** Field-path → value map, same semantics as an `updateDoc` payload. */
  pending: Record<string, any>;
  pendingCount: number;
  bufferUpdate: (fields: Record<string, any>) => void;
  bufferLog: (log: PendingLog) => void;
  /** Imperative read of the current pending map (stable identity). */
  getPending: () => Record<string, any>;
  /** Commit: one updateDoc with the whole buffer, then the deferred logs. */
  flush: () => Promise<void>;
  /** Drop the buffer (and its localStorage mirror) without writing. */
  discard: () => void;
}

const INACTIVE: RappelDraftValue = {
  active: false,
  pending: {},
  pendingCount: 0,
  bufferUpdate: () => {},
  bufferLog: () => {},
  getPending: () => ({}),
  flush: async () => {},
  discard: () => {},
};

export const RappelDraftContext = createContext<RappelDraftValue>(INACTIVE);
export const useRappelDraft = () => useContext(RappelDraftContext);

// ── Serialization (localStorage mirror) ──────────────────────────────────────
// Buffered payloads may carry Firestore Timestamps (Information dates, Dates
// clés) and serverTimestamp()/deleteField() sentinels (AI-scan pre-fill).

const TAG = '__rappelDraftV1';

function encodeValue(v: any): any {
  if (v === null || v === undefined) return v;
  if (v instanceof Timestamp) return { [TAG]: 'ts', s: v.seconds, n: v.nanoseconds };
  if (v instanceof Date) return { [TAG]: 'date', iso: v.toISOString() };
  if (v instanceof FieldValue) {
    const method = String((v as any)._methodName ?? '');
    if (method.includes('serverTimestamp')) return { [TAG]: 'serverTs' };
    if (method.includes('deleteField')) return { [TAG]: 'delete' };
    // arrayUnion & co: not used by buffered surfaces; dropped on restore.
    return { [TAG]: 'unsupported' };
  }
  if (Array.isArray(v)) return v.map(encodeValue);
  if (typeof v === 'object') {
    const out: Record<string, any> = {};
    for (const [k, val] of Object.entries(v)) out[k] = encodeValue(val);
    return out;
  }
  return v;
}

function decodeValue(v: any): any {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return v.map(decodeValue);
  if (typeof v === 'object') {
    const tag = (v as any)[TAG];
    if (tag === 'ts') return new Timestamp((v as any).s, (v as any).n);
    if (tag === 'date') return new Date((v as any).iso);
    if (tag === 'serverTs') return serverTimestamp();
    if (tag === 'delete') return deleteField();
    if (tag === 'unsupported') return undefined;
    const out: Record<string, any> = {};
    for (const [k, val] of Object.entries(v)) out[k] = decodeValue(val);
    return out;
  }
  return v;
}

// ── Display overlay ──────────────────────────────────────────────────────────

const DELETE_MARKER = Symbol('rappel-draft-delete');

/** Resolve a buffered value for DISPLAY: sentinels become concrete values
 *  (serverTimestamp ≈ now, deleteField removes the key). */
function resolveOverlayValue(v: any): any {
  if (v === null || v === undefined) return v;
  if (v instanceof FieldValue) {
    const method = String((v as any)._methodName ?? '');
    if (method.includes('serverTimestamp')) return Timestamp.now();
    if (method.includes('deleteField')) return DELETE_MARKER;
    return undefined;
  }
  if (Array.isArray(v)) return v.map(resolveOverlayValue);
  if (typeof v === 'object' && !(v instanceof Timestamp) && !(v instanceof Date)) {
    const out: Record<string, any> = {};
    for (const [k, val] of Object.entries(v)) {
      const r = resolveOverlayValue(val);
      if (r !== DELETE_MARKER) out[k] = r;
    }
    return out;
  }
  return v;
}

/**
 * Apply the pending buffer onto a dossier snapshot for display, mirroring
 * `updateDoc` semantics: top-level keys replace wholesale, dotted keys set
 * the nested field. Never mutates the input.
 */
export function applyPendingToDossier<T>(dossier: T, pending: Record<string, any>): T {
  if (!dossier || typeof dossier !== 'object' || Object.keys(pending).length === 0) {
    return dossier;
  }
  const out: any = { ...(dossier as any) };
  for (const [path, raw] of Object.entries(pending)) {
    const value = resolveOverlayValue(raw);
    const parts = path.split('.');
    if (parts.length === 1) {
      if (value === DELETE_MARKER) delete out[path];
      else out[path] = value;
      continue;
    }
    let node = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      const next = node[k];
      node[k] = next && typeof next === 'object' && !Array.isArray(next) ? { ...next } : {};
      node = node[k];
    }
    const leaf = parts[parts.length - 1];
    if (value === DELETE_MARKER) delete node[leaf];
    else node[leaf] = value;
  }
  return out as T;
}

// ── Store (owned by the dossier detail page) ─────────────────────────────────

export function useRappelDraftStore(opts: {
  dossierId: string;
  /** null disables persistence (e.g. no active session). */
  storageKey: string | null;
  active: boolean;
}): RappelDraftValue {
  const { dossierId, storageKey, active } = opts;
  const db = useFirestore();

  const [pending, setPending] = useState<Record<string, any>>({});
  const [logs, setLogs] = useState<PendingLog[]>([]);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const logsRef = useRef(logs);
  logsRef.current = logs;
  // Guards the persist effect until the restore for this key has run, so the
  // initial empty state can't clobber a stored draft before it is read back.
  const hydratedKeyRef = useRef<string | null>(null);
  // The persist effect fires once in the same commit as the restore, still
  // seeing the pre-restore state — skip that first run so it can't remove a
  // stored draft that is about to be re-applied.
  const persistArmedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active || !storageKey) {
      hydratedKeyRef.current = null;
      persistArmedRef.current = null;
      setPending({});
      setLogs([]);
      return;
    }
    persistArmedRef.current = null;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setPending(decodeValue(parsed?.pending) || {});
        setLogs(Array.isArray(parsed?.logs) ? (decodeValue(parsed.logs) as PendingLog[]) : []);
      } else {
        setPending({});
        setLogs([]);
      }
    } catch (err) {
      console.warn('[rappel-draft] restore failed', err);
      setPending({});
      setLogs([]);
    }
    hydratedKeyRef.current = storageKey;
  }, [active, storageKey]);

  useEffect(() => {
    if (!active || !storageKey || hydratedKeyRef.current !== storageKey) return;
    if (persistArmedRef.current !== storageKey) {
      // Same-commit run as the restore: state here predates the restored
      // values. Arm and wait for a real change.
      persistArmedRef.current = storageKey;
      return;
    }
    try {
      if (Object.keys(pending).length === 0 && logs.length === 0) {
        window.localStorage.removeItem(storageKey);
      } else {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            v: 1,
            savedAt: Date.now(),
            pending: encodeValue(pending),
            logs: encodeValue(logs),
          }),
        );
      }
    } catch (err) {
      console.warn('[rappel-draft] persist failed', err);
    }
  }, [active, storageKey, pending, logs]);

  const bufferUpdate = useCallback((fields: Record<string, any>) => {
    setPending((prev) => ({ ...prev, ...fields }));
  }, []);

  const bufferLog = useCallback((log: PendingLog) => {
    setLogs((prev) => [...prev, log]);
  }, []);

  const getPending = useCallback(() => pendingRef.current, []);

  const clearAll = useCallback(() => {
    setPending({});
    setLogs([]);
    try {
      if (storageKey) window.localStorage.removeItem(storageKey);
    } catch {}
  }, [storageKey]);

  const flush = useCallback(async () => {
    const fields = pendingRef.current;
    const pendingLogs = logsRef.current;
    if (Object.keys(fields).length > 0) {
      await updateDoc(doc(db, 'dossiers', dossierId), fields);
    }
    for (const l of pendingLogs) {
      try {
        if (l.kind === 'historique') {
          await (logHistorique as (...a: any[]) => Promise<void>)(db, dossierId, ...l.args);
        } else {
          await (logWorkflow as (...a: any[]) => Promise<void>)(db, dossierId, ...l.args);
        }
      } catch (err) {
        console.warn('[rappel-draft] deferred log failed', err);
      }
    }
    clearAll();
  }, [db, dossierId, clearAll]);

  return useMemo(
    () => ({
      active,
      pending,
      pendingCount: Object.keys(pending).length,
      bufferUpdate,
      bufferLog,
      getPending,
      flush,
      discard: clearAll,
    }),
    [active, pending, bufferUpdate, bufferLog, getPending, flush, clearAll],
  );
}

// ── Write hook for editing surfaces ──────────────────────────────────────────

/**
 * Drop-in replacement for `updateDoc(doc(db, 'dossiers', dossierId), fields)`
 * on gestionnaire editing surfaces: buffers during a rappel session, writes
 * through otherwise. `buffered` lets callers adapt their toast copy.
 */
export function useDossierDocWrite(dossierId: string) {
  const db = useFirestore();
  const draft = useRappelDraft();
  const write = useCallback(
    async (fields: Record<string, any>) => {
      if (draft.active) {
        draft.bufferUpdate(fields);
        return;
      }
      await updateDoc(doc(db, 'dossiers', dossierId), fields);
    },
    [db, dossierId, draft],
  );
  return { write, buffered: draft.active, draft };
}
