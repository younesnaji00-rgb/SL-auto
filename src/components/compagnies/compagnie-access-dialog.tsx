'use client';

/**
 * « Qui voit « Allianz » ? » (owner request 2026-10-15) — give a compagnie to
 * several accounts at once from /compagnies, the way a message is forwarded to
 * several contacts: search, tick, send. Before, each account had to be opened
 * in Utilisateurs. Admin, the Directeurs and the Responsable des gestionnaires
 * (the roles that create compagnies) use it.
 *
 * An account's `compagnies` limit the dossiers it sees; an EMPTY list means no
 * limit (« Toutes les compagnies » in Utilisateurs). Hence two locks:
 * - an account with no compagnies already sees this one — ticking it would
 *   shrink its view to this compagnie alone;
 * - a compagnie that is an account's only one cannot be taken away here —
 *   the account would fall back to seeing every compagnie.
 * The Responsable des gestionnaires does not change accounts with Admin
 * rights (firestore.rules allows them the `compagnies` field of the others).
 *
 * An account that has every OTHER compagnie of the list was meant to see them
 * all: ticked one by one, its list stops at the day it was saved, and a new
 * compagnie's dossiers leave it (owner report 2026-10-27). Such accounts say
 * « A toutes les autres compagnies », and right after « Nouvelle compagnie »
 * they start ticked.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, writeBatch } from 'firebase/firestore';
import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useFirestore } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOptions } from '@/hooks/use-options';
import { isInactiveAccount } from '@/hooks/use-team-members';
import { useToast } from '@/hooks/use-toast';
import { useT } from '@/i18n';
import { compagnieKey } from '@/lib/compagnie-name';
import { onSnapshot } from '@/lib/firestore-logged';
import { resolveRoleAccess } from '@/lib/role-access';
import { cn } from '@/lib/utils';

interface Account {
  uid: string;
  name: string;
  email: string;
  roleLabel: string;
  compagnies: string[];
  fullAdmin: boolean;
}

type Lock = 'all' | 'admin' | 'only' | null;

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';

export function CompagnieAccessDialog({
  open,
  onOpenChange,
  compagnie,
  isNew = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The list entry being given: its name is what accounts store. */
  compagnie: { id: string; nom: string } | null;
  /** Just created: the accounts that had every other compagnie start ticked. */
  isNew?: boolean;
}) {
  const t = useT();
  const db = useFirestore();
  const { toast } = useToast();
  const { profile } = useCurrentUser();
  // Admin and the Directeurs change any account; a scoped responsable only
  // the accounts without Admin rights.
  const editorIsFullAdmin = profile?.role === 'Admin' && !profile?.accessScope;

  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const seededFor = useRef<string | null>(null);

  const key = compagnieKey(compagnie?.nom);

  // The other compagnies an account can be given (the account forms offer
  // the active ones).
  const { options: listOptions, loading: listLoading } = useOptions('compagnies');
  const otherKeys = useMemo(
    () => Array.from(new Set(listOptions.filter((o) => o.active !== false).map((o) => compagnieKey(o.label)))).filter((k) => k && k !== key),
    [listOptions, key],
  );

  useEffect(() => {
    if (!open || !db) return;
    const unsub = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list: Account[] = [];
        for (const d of snap.docs) {
          const u = d.data() as Record<string, unknown>;
          if (isInactiveAccount(u)) continue;
          const roleLabel = String(u.role ?? '');
          const access = resolveRoleAccess(roleLabel);
          list.push({
            uid: d.id,
            name: [u.prenom, u.nom].map((x) => String(x ?? '').trim()).filter(Boolean).join(' ') || String(u.email ?? d.id),
            email: String(u.email ?? ''),
            roleLabel,
            compagnies: Array.isArray(u.compagnies) ? (u.compagnies as unknown[]).map(String).filter((c) => c.trim()) : [],
            fullAdmin: access.role === 'Admin' && !access.scope,
          });
        }
        list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
        setAccounts(list);
      },
      (err) => {
        console.warn('[compagnie-access]', err);
        setAccounts([]);
      },
    );
    return () => unsub();
  }, [open, db]);

  const has = (a: Account) => a.compagnies.some((c) => compagnieKey(c) === key);
  const hasAllOthers = (a: Account) =>
    a.compagnies.length > 0 && otherKeys.length > 0 && !has(a) && otherKeys.every((k) => a.compagnies.some((c) => compagnieKey(c) === k));

  const lockOf = (a: Account): Lock => {
    if (a.compagnies.length === 0) return 'all';
    if (!editorIsFullAdmin && a.fullAdmin) return 'admin';
    const distinct = new Set(a.compagnies.map(compagnieKey));
    if (has(a) && distinct.size === 1) return 'only';
    return null;
  };

  // The ticks start from who has the compagnie now, once per opening — plus,
  // for a new compagnie, the accounts that had all the others.
  useEffect(() => {
    if (!open) {
      seededFor.current = null;
      setQuery('');
      return;
    }
    if (!accounts || !compagnie || seededFor.current === compagnie.id) return;
    if (isNew && listLoading) return;
    seededFor.current = compagnie.id;
    setSelected(
      new Set(
        accounts
          .filter((a) => (a.compagnies.length > 0 && has(a)) || (isNew && !lockOf(a) && hasAllOthers(a)))
          .map((a) => a.uid),
      ),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, accounts, compagnie, isNew, listLoading]);

  const preTicked = isNew ? (accounts ?? []).filter((a) => !lockOf(a) && hasAllOthers(a)).length : 0;

  const shown = useMemo(() => {
    const q = compagnieKey(query);
    if (!accounts) return [];
    if (!q) return accounts;
    return accounts.filter((a) => compagnieKey(`${a.name} ${a.email} ${a.roleLabel}`).includes(q));
  }, [accounts, query]);

  const changes = useMemo(() => {
    const added: Account[] = [];
    const removed: Account[] = [];
    for (const a of accounts ?? []) {
      if (lockOf(a)) continue;
      const now = selected.has(a.uid);
      if (now && !has(a)) added.push(a);
      if (!now && has(a)) removed.push(a);
    }
    return { added, removed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts, selected, key, editorIsFullAdmin]);

  const chips = (accounts ?? []).filter((a) => selected.has(a.uid) && a.compagnies.length > 0);

  const toggle = (a: Account, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(a.uid);
      else next.delete(a.uid);
      return next;
    });

  const save = async () => {
    if (!db || !compagnie) return;
    const { added, removed } = changes;
    if (added.length + removed.length === 0) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      const batch = writeBatch(db);
      for (const a of added) batch.update(doc(db, 'users', a.uid), { compagnies: [...a.compagnies, compagnie.nom] });
      for (const a of removed) batch.update(doc(db, 'users', a.uid), { compagnies: a.compagnies.filter((c) => compagnieKey(c) !== key) });
      await batch.commit();
      const parts = [
        added.length ? `${t('donnée à')} ${added.length} ${added.length > 1 ? t('comptes') : t('compte')}` : null,
        removed.length ? `${t('retirée de')} ${removed.length} ${removed.length > 1 ? t('comptes') : t('compte')}` : null,
      ].filter(Boolean);
      toast({ title: compagnie.nom, description: `${parts.join(', ')}.` });
      onOpenChange(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: t('Erreur'), description: String(e?.message ?? e) });
    } finally {
      setSaving(false);
    }
  };

  const lockCaption: Record<Exclude<Lock, null>, string> = {
    all: t('Voit déjà toutes les compagnies'),
    admin: t('Compte avec les droits Admin'),
    only: t('Seule compagnie de ce compte : la retirer lui ferait voir toutes les compagnies'),
  };
  const pending = changes.added.length + changes.removed.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(90dvh/var(--app-zoom))] flex-col gap-3 lg:max-w-lg" dirty={pending > 0} onDiscard={() => setSelected(new Set())}>
        <DialogHeader>
          <DialogTitle className="t-title">
            {t('Qui voit')} « {compagnie?.nom} » ?
          </DialogTitle>
          <DialogDescription>
            {t('Les comptes cochés voient les dossiers de cette compagnie. Cochez-en autant que nécessaire, puis enregistrez.')}
            {preTicked > 0 && ` ${t('Les comptes qui avaient toutes les autres compagnies sont cochés d’avance.')}`}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <Input
            className="pl-9"
            placeholder={t('Nom, rôle ou e-mail…')}
            aria-label={t('Rechercher un compte')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {chips.length > 0 && (
          <ul aria-label={t('Comptes cochés')} className="flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
            {chips.map((a) => {
              const locked = !!lockOf(a);
              return (
                <li key={a.uid}>
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-3 py-0.5 pl-2.5 pr-1 text-[12px] font-medium text-ink-2">
                    {a.name}
                    {locked ? (
                      <span className="w-1" aria-hidden />
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggle(a, false)}
                        className="rounded-full p-0.5 text-ink-3 hover:bg-surface-4 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        aria-label={`${t('Retirer')} ${a.name}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <ul
          aria-label={t('Comptes')}
          data-testid="compagnie-access-list"
          className="min-h-0 flex-1 divide-y divide-hairline overflow-y-auto rounded-md border border-hairline"
        >
          {accounts === null ? (
            <li className="t-caption px-3 py-6 text-center">{t('Chargement…')}</li>
          ) : shown.length === 0 ? (
            <li className="t-caption px-3 py-6 text-center">{t('Aucun compte pour cette recherche')}</li>
          ) : (
            shown.map((a) => {
              const lock = lockOf(a);
              const checked = lock === 'all' ? true : selected.has(a.uid);
              const disabled = lock === 'all' || lock === 'admin' || (lock === 'only' && checked);
              const id = `cie-access-${a.uid}`;
              const others = a.compagnies.filter((c) => compagnieKey(c) !== key);
              return (
                <li key={a.uid}>
                  <label
                    htmlFor={id}
                    className={cn('flex items-center gap-3 px-3 py-2', disabled ? 'cursor-default' : 'cursor-pointer hover:bg-surface-2')}
                  >
                    <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-3 text-[12px] font-semibold text-ink-2">
                      {initials(a.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="t-body-sm block truncate font-medium text-ink">{a.name}</span>
                      <span className="t-caption block truncate">
                        {[
                          t(a.roleLabel) || null,
                          lock ? lockCaption[lock] : hasAllOthers(a) ? t('A toutes les autres compagnies') : others.length ? others.join(', ') : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </span>
                    <Checkbox
                      id={id}
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={(v) => toggle(a, v === true)}
                      aria-label={a.name}
                    />
                  </label>
                </li>
              );
            })
          )}
        </ul>

        <DialogFooter className="items-center gap-2 sm:justify-between sm:gap-2">
          <p className="t-caption mr-auto tabular-nums" aria-live="polite">
            {pending === 0
              ? t('Aucun changement')
              : [
                  changes.added.length ? `+${changes.added.length} ${changes.added.length > 1 ? t('comptes') : t('compte')}` : null,
                  changes.removed.length ? `−${changes.removed.length} ${changes.removed.length > 1 ? t('comptes') : t('compte')}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              {t('Annuler')}
            </Button>
            <Button onClick={save} loading={saving} disabled={pending === 0}>
              {t('Enregistrer')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CompagnieAccessDialog;
