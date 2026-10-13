import {
  type AccordeSourceDocType,
  mapToAccorde,
  parseAccordDocType,
  parseAccordeParent,
} from './docType-accorde';

/**
 * A group of slot labels that belong to the same parent garage (base or
 * gestionnaire-created extra).
 *
 * - `parent` is the garage slot label itself (`'Devis Garage'`, `'Devis Garage 2'`, …).
 * - `sourceDocType` is the canonical base family (always `'Devis Garage'` or `'Facture Garage'`).
 * - `parentOrdinal` is 1 for the base, 2+ for extras. Used for stable ordering.
 * - `slots` is the ordered list of slot labels to render inside the row:
 *   `[parent, <parent> accordé, <accord ordinals 2-3 present>, <propositions 1-3 present>]`.
 */
export interface DocFamily {
  parent: string;
  sourceDocType: AccordeSourceDocType;
  parentOrdinal: number;
  slots: string[];
}

/** Anything with a `type` or `typeDocument` field is considered a doc here. */
export interface DocTypeLike {
  type?: string;
  typeDocument?: string;
}

/**
 * Build the ordered list of Devis + Facture family groups from the live
 * `documents` subcollection contents.
 *
 * Rules:
 *   - The two base families (`Devis Garage`, `Facture Garage`) are always
 *     present, even with no documents — they're the entry points for uploads.
 *   - Extra families (`Devis Garage N` / `Facture Garage N`, N ≥ 2) appear
 *     only when a doc with a matching `type` (the garage itself OR one of its
 *     accord variants) exists in the Firestore subcollection.
 *   - Within each family, the slot order is fixed:
 *       [parent, accordé, 2ème accord, 3ème accord, 1ère prop, 2ème prop, 3ème prop]
 *     with the accord/proposition slots only appearing if a doc exists for them.
 *     The parent + its `accordé` slot are always included so the row never
 *     starts empty.
 *
 * The returned array is sorted: all Devis families first (base, then ordinal
 * 2, 3, …), then all Facture families in the same order.
 */
export function buildDocFamilies(docs: ReadonlyArray<DocTypeLike>): DocFamily[] {
  // Track which extra-garage families exist. Set of parent labels.
  const extraParents = new Set<string>();
  // Track which accord variants are actually present for each parent. Keyed by
  // parent label; value is the set of accord-variant slot labels that need to
  // render in that family's row.
  const variantSlotsByParent = new Map<string, Set<string>>();

  for (const d of docs) {
    const label = (d.type || d.typeDocument || '').trim();
    if (!label) continue;

    // Detect garage slots (base or extra) themselves.
    const asParent = parseAccordeParent(label);
    if (asParent && asParent.ordinal >= 2) {
      extraParents.add(label);
      continue;
    }

    // Detect accord variants. These contribute their parent (if extra) + the
    // variant's slot label.
    const parsed = parseAccordDocType(label);
    if (parsed) {
      if (parsed.parentOrdinal >= 2) {
        extraParents.add(parsed.parent);
      }
      if (!variantSlotsByParent.has(parsed.parent)) {
        variantSlotsByParent.set(parsed.parent, new Set());
      }
      // Only ordinals 2-3 for accord and 1-3 for proposition need to be
      // tracked as dynamic slots. Ordinal 1 for accord is included by default
      // as the primary "accordé" slot.
      if (parsed.kind === 'accord' && parsed.ordinal >= 2) {
        variantSlotsByParent.get(parsed.parent)!.add(label);
      } else if (parsed.kind === 'proposition-accord') {
        variantSlotsByParent.get(parsed.parent)!.add(label);
      }
    }
  }

  /** Build the slot list for a single family. */
  function buildSlots(
    parent: string,
    sourceDocType: AccordeSourceDocType,
  ): string[] {
    // Lineage order, as the chiffreur's pipeline showed it: the source, the
    // accords in round order, then the propositions. The 1ère proposition is
    // a default slot, but placed right after « accordé » it sat between the
    // 1er and the 2ème accord (QA 035).
    const accordSlots = [mapToAccorde(parent, 'accord', 1)];
    const propositionSlots = [mapToAccorde(parent, 'proposition-accord', 1)];
    const extras = variantSlotsByParent.get(parent);
    if (extras) {
      // Collect every accord / proposition ordinal ≥ 2 that has a doc for
      // this parent. No upper cap — 4ème, 5ème, … render as long as they
      // exist in Firestore. Sorted ascending so the row order stays stable.
      const accordOrdinals = new Set<number>();
      const propositionOrdinals = new Set<number>();
      for (const label of extras) {
        const parsed = parseAccordDocType(label);
        if (!parsed || parsed.parent !== parent) continue;
        if (parsed.kind === 'accord' && parsed.ordinal >= 2) {
          accordOrdinals.add(parsed.ordinal);
        } else if (parsed.kind === 'proposition-accord' && parsed.ordinal >= 2) {
          propositionOrdinals.add(parsed.ordinal);
        }
      }
      for (const ord of [...accordOrdinals].sort((a, b) => a - b)) {
        accordSlots.push(mapToAccorde(parent, 'accord', ord));
      }
      for (const ord of [...propositionOrdinals].sort((a, b) => a - b)) {
        propositionSlots.push(mapToAccorde(parent, 'proposition-accord', ord));
      }
    }
    return [parent, ...accordSlots, ...propositionSlots];
  }

  /** Collect extras for a given source, sorted by ordinal ascending. */
  function extrasFor(source: AccordeSourceDocType): string[] {
    const out: Array<{ label: string; ordinal: number }> = [];
    for (const p of extraParents) {
      const parsed = parseAccordeParent(p);
      if (parsed && parsed.sourceDocType === source) {
        out.push({ label: p, ordinal: parsed.ordinal });
      }
    }
    out.sort((a, b) => a.ordinal - b.ordinal);
    return out.map((x) => x.label);
  }

  const families: DocFamily[] = [];

  // Devis families first: base, then extras.
  families.push({
    parent: 'Devis Garage',
    sourceDocType: 'Devis Garage',
    parentOrdinal: 1,
    slots: buildSlots('Devis Garage', 'Devis Garage'),
  });
  for (const extra of extrasFor('Devis Garage')) {
    const parsed = parseAccordeParent(extra)!;
    families.push({
      parent: extra,
      sourceDocType: 'Devis Garage',
      parentOrdinal: parsed.ordinal,
      slots: buildSlots(extra, 'Devis Garage'),
    });
  }

  // Facture families next: base, then extras.
  families.push({
    parent: 'Facture Garage',
    sourceDocType: 'Facture Garage',
    parentOrdinal: 1,
    slots: buildSlots('Facture Garage', 'Facture Garage'),
  });
  for (const extra of extrasFor('Facture Garage')) {
    const parsed = parseAccordeParent(extra)!;
    families.push({
      parent: extra,
      sourceDocType: 'Facture Garage',
      parentOrdinal: parsed.ordinal,
      slots: buildSlots(extra, 'Facture Garage'),
    });
  }

  return families;
}

/**
 * Build a set of every slot label that belongs to some family. Useful to
 * exclude them from a generic "non-family" grid.
 */
export function collectFamilySlotLabels(families: DocFamily[]): Set<string> {
  const set = new Set<string>();
  for (const fam of families) {
    for (const slot of fam.slots) set.add(slot);
  }
  return set;
}

/** The fields of a slot's document that tell a received file from a placeholder. */
export interface SlotDocLike {
  url?: string | null;
  pendingUpload?: boolean;
}

const isReceived = (d: SlotDocLike) => !!d.url && !d.pendingUpload;

/**
 * Why a block of a family band holds what it holds:
 * - `source`: the garage's devis / facture itself;
 * - `received`: the accord or proposition has its file;
 * - `awaiting`: the chiffreur's turn — the first round, or a round the
 *   gestionnaire asked for (a placeholder exists);
 * - `optional`: the round after the last answered one, which only happens if
 *   the dossier goes back to chiffrage;
 * - `other`: this round was answered by the other kind (an accord instead of
 *   a proposition, or the reverse).
 */
export type BandBlockState = 'source' | 'received' | 'awaiting' | 'optional' | 'other';

export interface BandBlock {
  slot: string;
  state: BandBlockState;
  /** Round of an accord / proposition; null for the source. */
  round: number | null;
  /** The block holds its file. */
  hasFile: boolean;
}

/**
 * The blocks a family band shows (tester, 2026-10-13: the empty accord and
 * proposition blocks must always be visible, not appear once the chiffreur
 * fills them). Every round reached — by a received file or a placeholder —
 * shows BOTH its accord and its proposition, and the round after the last
 * answered one shows as the optional next step. Order stays the pipeline's
 * (QA 035): the source, the accords by round, then the propositions; an empty
 * block says why it is empty instead of a bare « En attente de chiffrage »
 * next to a finished round.
 */
export function bandBlocks(group: DocFamily, docsOf: (slot: string) => ReadonlyArray<SlotDocLike>): BandBlock[] {
  const accordOf = (r: number) => mapToAccorde(group.parent, 'accord', r);
  const propositionOf = (r: number) => mapToAccorde(group.parent, 'proposition-accord', r);
  const received = (slot: string) => docsOf(slot).some(isReceived);
  // Rounds that exist (a doc of any kind, placeholders included) and the last
  // one answered.
  let existing = 1;
  let answered = 0;
  for (const slot of group.slots) {
    const parsed = slot === group.parent ? null : parseAccordDocType(slot);
    if (!parsed) continue;
    if (docsOf(slot).length > 0) existing = Math.max(existing, parsed.ordinal);
    if (received(slot)) answered = Math.max(answered, parsed.ordinal);
  }
  const rounds = Math.max(existing, answered + 1);
  const stateOf = (slot: string, sibling: string, round: number): BandBlockState => {
    if (received(slot)) return 'received';
    // A placeholder: the gestionnaire asked for this very block.
    if (docsOf(slot).length > 0) return 'awaiting';
    if (received(sibling)) return 'other';
    if (round === 1 || docsOf(sibling).length > 0 || round <= answered) return 'awaiting';
    return 'optional';
  };
  const block = (slot: string, state: BandBlockState, round: number | null): BandBlock => ({ slot, state, round, hasFile: received(slot) });
  const blocks: BandBlock[] = [block(group.parent, 'source', null)];
  for (let r = 1; r <= rounds; r++) blocks.push(block(accordOf(r), stateOf(accordOf(r), propositionOf(r), r), r));
  for (let r = 1; r <= rounds; r++) blocks.push(block(propositionOf(r), stateOf(propositionOf(r), accordOf(r), r), r));
  return blocks;
}

/** The slot labels of {@link bandBlocks}, in order. */
export function bandSlots(group: DocFamily, docsOf: (slot: string) => ReadonlyArray<SlotDocLike>): string[] {
  return bandBlocks(group, docsOf).map((b) => b.slot);
}

/**
 * « n/m reçus » of a band: the source, then one answer per round — not one
 * per block, since a round is answered by an accord OR a proposition and the
 * optional next round is not owed. Counts only the blocks shown.
 */
export function bandProgress(blocks: ReadonlyArray<BandBlock>): { received: number; expected: number } {
  let received = 0;
  let expected = 0;
  const rounds = new Map<number, { answered: boolean; owed: boolean }>();
  for (const b of blocks) {
    if (b.round === null) {
      expected += 1;
      if (b.hasFile) received += 1;
      continue;
    }
    const r = rounds.get(b.round) ?? { answered: false, owed: false };
    if (b.state === 'received') r.answered = true;
    if (b.state !== 'optional') r.owed = true;
    rounds.set(b.round, r);
  }
  rounds.forEach((r) => {
    if (r.answered) received += 1;
    if (r.answered || r.owed) expected += 1;
  });
  return { received, expected };
}

export type VersionState = 'actuel' | 'remplace';

/**
 * « Actuel » / « Remplacé » for each received accord or proposition of a
 * family, as the chiffreur's pipeline marked them: the latest version is
 * « Actuel » — accords by round, then any proposition — and every earlier
 * one « Remplacé ». The source and the slots still awaiting a file get none.
 */
export function versionStates(
  group: DocFamily,
  docsOf: (slot: string) => ReadonlyArray<SlotDocLike>,
): Map<string, VersionState> {
  const received: Array<{ slot: string; rank: number }> = [];
  for (const slot of group.slots) {
    const parsed = slot === group.parent ? null : parseAccordDocType(slot);
    if (!parsed || !docsOf(slot).some(isReceived)) continue;
    received.push({ slot, rank: parsed.kind === 'accord' ? parsed.ordinal : 100 + parsed.ordinal });
  }
  const latest = received.reduce<{ slot: string; rank: number } | null>((a, b) => (!a || b.rank > a.rank ? b : a), null);
  return new Map(received.map(({ slot }) => [slot, slot === latest?.slot ? 'actuel' : 'remplace']));
}
