'use client';

/**
 * ⌘K command palette — a navigation layer, not a chat box (Vercel Geist /
 * Linear): recents, records by ref · plaque · assuré, pages, actions. The AI
 * assistant is an explicit last row, never the default result.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Bell, Calculator, FolderOpen, Keyboard, Moon, Plus, Sparkles, Sun, ArrowRight, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Kbd } from '@/components/ui/kbd';
import { useVisibleNav } from '@/hooks/use-visible-nav';
import { useWorkspaceStore, useWorkspaceTabs, TAB_KINDS } from '@/hooks/use-workspace-tabs';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useDossiers } from '@/hooks/use-dossiers';
import { normalizePlate } from '@/lib/plate-match';
import { assureName, dossierLabel } from '@/lib/dossier-label';
import { getStatusBadgeStyles, STATUS_BADGE_CLASS } from '@/lib/status-colors';
import { getAiSuggestion } from '@/lib/actions/ai-search';
import { formatKeys } from '@/hooks/use-hotkeys';
import { cn } from '@/lib/utils';
import type { Dossier } from '@/lib/dossiers-data';

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
  onOpenShortcuts?: () => void;
  onCreateDossier?: () => void;
}

function fold(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Subsequence fuzzy match ("asc" ⊂ "assignations chiffrage") + plain includes. */
function fuzzy(haystack: string, needle: string): boolean {
  const h = fold(haystack);
  const n = fold(needle).replace(/\s+/g, '');
  if (!n) return true;
  if (h.includes(fold(needle))) return true;
  let i = 0;
  for (const ch of h) {
    if (ch === n[i]) i++;
    if (i === n.length) return true;
  }
  return false;
}

const dossierTabLabel = dossierLabel;

const MAX_RESULTS = 8;

function DossierResults({ query, onPick }: { query: string; onPick: (d: Dossier) => void }) {
  const { profile } = useCurrentUser();
  const userCompagnies = profile?.compagnies || [];
  const { dossiers, loading } = useDossiers(userCompagnies.length > 0 ? userCompagnies : undefined);

  const results = useMemo(() => {
    const q = query.trim();
    if (q.length < 2) return [];
    const qf = fold(q);
    const qp = normalizePlate(q);
    const out: Dossier[] = [];
    for (const d of dossiers) {
      const ref = fold(d.refExpert || '');
      const name = fold(assureName(d.assure));
      const comp = fold(d.compagnie || '');
      const plate = qp ? normalizePlate(d.matricule) : '';
      if (ref.includes(qf) || name.includes(qf) || comp.includes(qf) || (qp.length >= 3 && plate.includes(qp))) {
        out.push(d);
        if (out.length >= MAX_RESULTS) break;
      }
    }
    return out;
  }, [dossiers, query]);

  if (query.trim().length < 2) return null;
  return (
    <CommandGroup heading="Dossiers">
      {loading && results.length === 0 && (
        <div className="px-2 py-1.5 text-xs text-muted-foreground">Recherche…</div>
      )}
      {!loading && results.length === 0 && (
        <div className="px-2 py-1.5 text-xs text-muted-foreground">Aucun dossier ne correspond à « {query.trim()} ».</div>
      )}
      {results.map((d) => (
        <CommandItem key={d.id} value={`dossier:${d.id}`} onSelect={() => onPick(d)} className="gap-3">
          <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate">
            <span className="font-mono text-[13px] font-medium">{d.refExpert || 'Sans réf.'}</span>
            {assureName(d.assure) && <span className="text-muted-foreground"> · {assureName(d.assure)}</span>}
            {d.compagnie && <span className="text-muted-foreground"> · {d.compagnie}</span>}
          </span>
          {d.matricule && <span className="hidden font-mono text-[11px] text-muted-foreground sm:inline">{d.matricule}</span>}
          {d.statut && (
            <Badge variant="outline" className={cn(STATUS_BADGE_CLASS, getStatusBadgeStyles(d.statut), 'hidden shrink-0 sm:inline-flex')}>
              {d.statut}
            </Badge>
          )}
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

export function CommandPalette({ open, onOpenChange, initialQuery = '', onOpenShortcuts, onCreateDossier }: CommandPaletteProps) {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { items: navItems, isVisible } = useVisibleNav();
  const { recents } = useWorkspaceStore();
  const dossierTabs = useWorkspaceTabs('dossier');
  const chiffrageTabs = useWorkspaceTabs('chiffrage');
  const [query, setQuery] = useState(initialQuery);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setAiAnswer(null);
    }
  }, [open, initialQuery]);

  const close = () => onOpenChange(false);
  const go = (href: string) => {
    close();
    router.push(href);
  };

  const q = query.trim();
  const showRecents = q.length === 0;

  const recentEntries = useMemo(
    () =>
      recents
        .filter((r) => (r.kind === 'dossier' ? isVisible('/dossiers') : isVisible('/assignations-chiffrage')))
        .slice(0, 6),
    [recents, isVisible],
  );

  const openTabs = useMemo(
    () => [
      ...dossierTabs.tabs.map((t) => ({ kind: 'dossier' as const, id: t.id, label: t.label })),
      ...chiffrageTabs.tabs.map((t) => ({ kind: 'chiffrage' as const, id: t.id, label: t.label })),
    ],
    [dossierTabs.tabs, chiffrageTabs.tabs],
  );

  const navMatches = useMemo(() => navItems.filter((i) => fuzzy(`${i.label} ${i.title ?? ''}`, q)), [navItems, q]);

  const actions = useMemo(() => {
    const list: { id: string; label: string; icon: React.ElementType; keys?: string; run: () => void }[] = [];
    if (onCreateDossier) list.push({ id: 'new-dossier', label: 'Nouveau dossier', icon: Plus, keys: 'c', run: () => { close(); onCreateDossier(); } });
    if (isVisible('/mes-rappels')) list.push({ id: 'rappels', label: 'Voir mes rappels', icon: Bell, keys: 'g r', run: () => go('/mes-rappels') });
    list.push({ id: 'theme', label: theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre', icon: theme === 'dark' ? Sun : Moon, keys: 'shift+d', run: () => { setTheme(theme === 'dark' ? 'light' : 'dark'); close(); } });
    if (onOpenShortcuts) list.push({ id: 'shortcuts', label: 'Raccourcis clavier', icon: Keyboard, keys: '?', run: () => { close(); onOpenShortcuts(); } });
    return list.filter((a) => fuzzy(a.label, q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCreateDossier, onOpenShortcuts, isVisible, theme, q]);

  const pickDossier = (d: Dossier) => {
    dossierTabs.openTab(d.id, dossierTabLabel(d));
    go(`/dossiers/${d.id}`);
  };

  const askAssistant = async () => {
    if (!q) return;
    setAiLoading(true);
    setAiAnswer(null);
    try {
      const { suggestion, error } = await getAiSuggestion(q);
      setAiAnswer(error ? 'Suggestion indisponible pour le moment.' : suggestion || 'Aucune suggestion.');
    } catch {
      setAiAnswer('Suggestion indisponible pour le moment.');
    } finally {
      setAiLoading(false);
    }
  };

  const nothing = !showRecents && navMatches.length === 0 && actions.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[12%] translate-y-0 overflow-hidden p-0 shadow-xl sm:max-w-xl" onOpenAutoFocus={(e) => { e.preventDefault(); inputRef.current?.focus(); }}>
        <DialogTitle className="sr-only">Rechercher et naviguer</DialogTitle>
        <Command shouldFilter={false} loop className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground">
          <CommandInput ref={inputRef} placeholder="Réf., plaque, assuré, page ou action…" value={query} onValueChange={setQuery} />
          <CommandList className="max-h-[60vh]">
            {nothing && q.length < 2 && <CommandEmpty>Aucun résultat.</CommandEmpty>}

            {showRecents && (openTabs.length > 0 || recentEntries.length > 0) && (
              <CommandGroup heading="Récents">
                {openTabs.slice(0, 4).map((t) => (
                  <CommandItem key={`tab:${t.kind}:${t.id}`} value={`tab:${t.kind}:${t.id}`} onSelect={() => go(TAB_KINDS[t.kind].detailHref(t.id))} className="gap-3">
                    {t.kind === 'dossier' ? <FolderOpen className="h-4 w-4 text-muted-foreground" /> : <Calculator className="h-4 w-4 text-muted-foreground" />}
                    <span className="min-w-0 flex-1 truncate">{t.label}</span>
                    <span className="text-[11px] text-muted-foreground">ouvert</span>
                  </CommandItem>
                ))}
                {recentEntries
                  .filter((r) => !openTabs.some((t) => t.kind === r.kind && t.id === r.id))
                  .map((r) => (
                    <CommandItem key={`recent:${r.kind}:${r.id}`} value={`recent:${r.kind}:${r.id}`} onSelect={() => go(TAB_KINDS[r.kind].detailHref(r.id))} className="gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{r.label}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            )}

            {open && <DossierResults query={query} onPick={pickDossier} />}

            {navMatches.length > 0 && (
              <CommandGroup heading="Aller à">
                {navMatches.map((i) => {
                  const Icon = i.icon;
                  return (
                    <CommandItem key={i.href} value={`nav:${i.href}`} onSelect={() => go(i.href)} className="gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{i.title ?? i.label}</span>
                      {i.hotkey && (
                        <span className="flex items-center gap-1">
                          {formatKeys(i.hotkey).map((k, idx) => (
                            <Kbd key={idx}>{k}</Kbd>
                          ))}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {actions.length > 0 && (
              <CommandGroup heading="Actions">
                {actions.map((a) => {
                  const Icon = a.icon;
                  return (
                    <CommandItem key={a.id} value={`action:${a.id}`} onSelect={a.run} className="gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{a.label}</span>
                      {a.keys && (
                        <span className="flex items-center gap-1">
                          {formatKeys(a.keys).map((k, idx) => (
                            <Kbd key={idx}>{k}</Kbd>
                          ))}
                        </span>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {q.length >= 3 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Assistant">
                  <CommandItem value="ai:ask" onSelect={askAssistant} className="gap-3" disabled={aiLoading}>
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">
                      {aiLoading ? 'Réflexion…' : <>Demander à l&apos;assistant : « {q} »</>}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </CommandItem>
                  {aiAnswer && <p className="px-3 pb-2 pt-1 text-sm text-foreground/90">{aiAnswer}</p>}
                </CommandGroup>
              </>
            )}
          </CommandList>
          <div className="flex items-center justify-between gap-3 border-t px-3 py-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> naviguer</span>
            <span className="flex items-center gap-1.5"><Kbd>↵</Kbd> ouvrir</span>
            <span className="flex items-center gap-1.5"><Kbd>Échap</Kbd> fermer</span>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

/** @deprecated kept for older imports; the palette is mounted by ShellUiProvider. */
export default CommandPalette;
