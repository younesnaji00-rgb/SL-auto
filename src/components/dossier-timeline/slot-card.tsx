'use client';

import React, { useRef } from 'react';
import { FileText, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { parseAccordDocType } from '@/lib/docType-accorde';
import { cn } from '@/lib/utils';
import { PdfThumbnail } from '@/components/common/pdf-thumbnail';

export type ExtraSlotKind = 'devis' | 'facture';

export type TypedDoc = {
  id: string;
  nom?: string;
  fileName?: string;
  url?: string | null;
  type?: string;
  typeDocument?: string;
  uploadePar?: string;
  uploadedBy?: string;
  uploadedByName?: string;
  storagePath?: string;
  pendingUpload?: boolean;
  taille?: number;
  // Marks a document as belonging to a gestionnaire-created extra slot
  // (rendered after "Devis Garage" / "Facture Garage"). The slot grouping
  // key is still the `type` string; this field is used only to detect
  // which slots are user-managed (pimple + rename affordances).
  extraSlot?: ExtraSlotKind;
};

export const isImage = (name: string) =>
  /\.(jpe?g|png|gif|webp|bmp)$/i.test(name || '');

export const isPdf = (name: string) => /\.pdf$/i.test(name || '');

export interface SlotCardProps {
  slot: string;
  docs: TypedDoc[];
  canEdit: boolean;
  canDeleteDoc: (d: TypedDoc) => boolean;
  userRole?: string;
  isUploading: boolean;
  deletingId: string | null;
  extraSlotKind?: ExtraSlotKind;
  canManageExtraSlots: boolean;
  onUpload: (files: File[]) => void;
  onDelete: (d: TypedDoc) => void;
  onCreateNextCardinal: () => void;
  onCreateExtraSlot: (kind: ExtraSlotKind, files: File[]) => void;
  onRenameExtraSlot: () => void;
  onPreview: (d: TypedDoc) => void;
}

export function SlotCard({
  slot,
  docs,
  canEdit,
  canDeleteDoc,
  userRole,
  isUploading,
  deletingId,
  extraSlotKind,
  canManageExtraSlots,
  onUpload,
  onDelete,
  onCreateNextCardinal,
  onCreateExtraSlot,
  onRenameExtraSlot,
  onPreview,
}: SlotCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const extraSlotInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const dragDepth = useRef(0);

  const handlePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) onUpload(files);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleExtraSlotPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0 && baseExtraKind) {
      onCreateExtraSlot(baseExtraKind, files);
    }
    if (extraSlotInputRef.current) extraSlotInputRef.current.value = '';
  };

  // Task #26 — accord/proposition slot detection.
  const parsedAccord = parseAccordDocType(slot);
  const isReformeSlot = slot === 'Réforme technique' || slot === 'Réforme économique';
  // Cardinal accord/proposition rows must never accept manual uploads — the
  // chiffreur produces them via the editor save flow. Same applies to réforme
  // technique/économique slots.
  const hideUploadForAccord = !!parsedAccord || isReformeSlot;
  // Pimple "+" button appears on accord OR proposition slots; uncapped — chain
  // enforcement is via `cardinalPimpleDisabled` (current slot must be
  // chiffreur-filled before the next cardinal can be created).
  const showCardinalPimple =
    !!parsedAccord &&
    (parsedAccord.kind === 'accord' || parsedAccord.kind === 'proposition-accord');
  // Cardinal pimple is disabled until the current cardinal slot has a real (chiffreur-filled) doc
  // — not just a placeholder. Applies to all roles; the chiffreur produces the source doc via
  // the editor save flow, so other roles cannot bypass.
  const cardinalPimpleDisabled = !docs.some((d) => !d.pendingUpload && !!d.url);
  // Base-slot pimple: next to `Devis Garage` / `Facture Garage`, lets the
  // gestionnaire spawn a new numbered slot (first = "… 2", then 3, etc.).
  const baseExtraKind: ExtraSlotKind | null =
    slot === 'Devis Garage' ? 'devis'
    : slot === 'Facture Garage' ? 'facture'
    : null;
  // Extra garage slots created via the `+` file-picker are capped at 1 doc:
  // once they hold a file, hide the in-card Ajouter affordance. Base
  // `Devis Garage` / `Facture Garage` slots (extraSlotKind === undefined) keep
  // their multi-doc behaviour.
  const isFilledExtraSlot = !!extraSlotKind && docs.length >= 1;
  const showExtraSlotPimple = !!baseExtraKind && canManageExtraSlots;
  // Rename pencil: only on gestionnaire-managed extras (not on the base
  // `Devis Garage` / `Facture Garage` and not on cardinal accord variants).
  const showRenameButton = !!extraSlotKind && canManageExtraSlots;

  // Drop accepted only when the upload UI itself is allowed for this slot.
  const dropEnabled = canEdit && !hideUploadForAccord && !isFilledExtraSlot;

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    if (!dropEnabled) return;
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current += 1;
    setIsDragOver(true);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!dropEnabled) return;
    if (!e.dataTransfer.types.includes('Files')) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!dropEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!dropEnabled) return;
    e.preventDefault();
    e.stopPropagation();
    dragDepth.current = 0;
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files || []).filter(
      (f) => f.type.startsWith('image/') || /\.pdf$/i.test(f.name),
    );
    if (files.length > 0) onUpload(files);
  };

  return (
    <Card
      className={cn(
        'relative shadow-sm border rounded-lg overflow-visible flex flex-col transition-colors',
        isDragOver && 'border-2 border-dashed border-primary bg-primary/5',
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardHeader className="py-2.5 px-3 border-b">
        <CardTitle className="font-semibold text-sm flex items-center justify-between gap-2">
          <span className="truncate" title={slot}>{slot}</span>
          <span className="flex items-center gap-1 shrink-0">
            {showRenameButton && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={onRenameExtraSlot}
                title="Renommer"
                aria-label="Renommer le slot"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            <span className="text-[10px] font-normal text-muted-foreground">
              {docs.length}
            </span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2 space-y-1.5 flex-1">
        {docs.length === 0 ? (
          <p className="text-xs italic text-muted-foreground text-center py-3">
            {(parsedAccord || isReformeSlot) ? 'En attente de chiffrage' : 'Aucun document'}
          </p>
        ) : (
          <ul className="space-y-1">
            {docs.map((d) => {
              const name = d.nom || d.fileName || 'document';
              const img = d.url && isImage(name);
              const pdf = d.url && !img && isPdf(name);
              const clickable = !!d.url && !d.pendingUpload;
              return (
                <li
                  key={d.id}
                  className={cn(
                    'flex items-center gap-2 rounded-md border bg-card px-2 py-1.5 hover:bg-accent/40 transition-colors',
                    clickable && 'cursor-pointer',
                  )}
                  onClick={() => clickable && onPreview(d)}
                >
                  <div className="h-8 w-8 shrink-0 rounded bg-muted flex items-center justify-center overflow-hidden">
                    {img ? (
                      <img
                        src={d.url!}
                        alt={name}
                        className="object-cover w-full h-full"
                        loading="lazy"
                      />
                    ) : pdf ? (
                      <PdfThumbnail url={d.url!} className="w-full h-full" width={64} />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" title={name}>
                      {name}
                    </p>
                    {d.pendingUpload && (
                      <p className="text-[10px] text-amber-700">En attente…</p>
                    )}
                  </div>
                  {canDeleteDoc(d) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(d);
                      }}
                      disabled={deletingId === d.id || !!d.pendingUpload}
                      title="Supprimer"
                    >
                      {deletingId === d.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {canEdit && !hideUploadForAccord && !isFilledExtraSlot && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              onChange={handlePick}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full border-dashed"
              onClick={() => inputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Envoi…
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Ajouter
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>

      {showCardinalPimple && canEdit && (
        <button
          type="button"
          onClick={onCreateNextCardinal}
          disabled={cardinalPimpleDisabled}
          className={cn(
            "absolute -right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm shadow transition z-10",
            cardinalPimpleDisabled
              ? "opacity-40 cursor-not-allowed"
              : "hover:scale-110",
          )}
          title={
            cardinalPimpleDisabled
              ? "En attente de chiffrage : remplissez ce slot avant de créer le suivant."
              : "Créer le cardinal suivant"
          }
          aria-label="Créer le cardinal suivant"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}

      {showExtraSlotPimple && baseExtraKind && (
        <>
          <input
            ref={extraSlotInputRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            className="hidden"
            onChange={handleExtraSlotPick}
          />
          <button
            type="button"
            onClick={() => extraSlotInputRef.current?.click()}
            className="absolute -right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm shadow hover:scale-110 transition z-10"
            title={baseExtraKind === 'devis' ? 'Ajouter un devis' : 'Ajouter une facture'}
            aria-label={baseExtraKind === 'devis' ? 'Ajouter un devis' : 'Ajouter une facture'}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </Card>
  );
}
