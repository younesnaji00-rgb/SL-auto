"use client";

import { useState } from "react";
import { useChiffreurs, Chiffreur } from "@/hooks/use-chiffreurs";
import { useChiffreurWorkload } from "@/hooks/use-workload-counts";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2, Plus } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";
import { BRAND } from "@/lib/brand";
import { INPUT_EMAIL, INPUT_NAME, INPUT_TEL } from "@/lib/input-attrs";

const EMPTY_FORM = { nom: "", email: "", phone: "", active: true };

interface Props {
  /** Called when the user picks a chiffreur from the dropdown (returns ID) */
  onSelectId?: (id: string) => void;
  /** Currently selected chiffreur id */
  selectedId?: string;
}

export function ChiffreurDialog({ onSelectId, selectedId }: Props) {
  const t = useT();
  const { chiffreurs, loading, addChiffreur, updateChiffreur, deleteChiffreur } =
    useChiffreurs();
  const workload = useChiffreurWorkload();
  const { canDelete } = useCurrentUser();

  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Chiffreur | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Chiffreur | null>(null);

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(c: Chiffreur) {
    setEditTarget(c);
    setForm({ nom: c.nom, email: c.email, phone: c.phone ?? "", active: c.active });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.nom.trim()) return;
    setSaving(true);
    try {
      if (editTarget) {
        await updateChiffreur(editTarget.id, form);
      } else {
        await addChiffreur(form);
      }
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteChiffreur(id);
    } finally {
      setDeletingId(null);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedId || ""}
        onValueChange={(val) => onSelectId?.(val)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={loading ? t('Chargement…') : t('Choisir un chiffreur')} />
        </SelectTrigger>
        <SelectContent>
          {chiffreurs
            .filter((c) => c.active)
            .map((c) => {
              const count = workload[c.id] || 0;
              return (
                <SelectItem key={c.id} value={c.id}>
                  <span className="flex items-center gap-2">
                    <span>{c.nom}</span>
                    {count > 0 && (
                      // Workload count — element-specs §11: a plain count is
                      // information, not an exception → neutral count pill
                      // (`bg-surface-3 text-ink-2`, tabular), never a status pair.
                      <span
                        className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-surface-3 px-1.5 text-[11px] font-medium tabular-nums text-ink-2"
                        title={`${count} ${t('dossier(s) en cours')}`}
                      >
                        {count}
                      </span>
                    )}
                  </span>
                </SelectItem>
              );
            })}
        </SelectContent>
      </Select>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" onClick={openAdd} title={t('Ajouter / Gérer les chiffreurs')} aria-label={t('Ajouter / Gérer les chiffreurs')}>
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>

        {/* Dialog — element-specs §13 (M3: confirm at the edge, dismissive
            `outline` to its left, ≤ 560 px for forms). */}
        <DialogContent
          // Four controls + an inline list -> full-screen on a phone (D 2).
          fullScreen
          primary={{
            label: editTarget ? t('Mettre à jour') : t('Ajouter'),
            onClick: handleSave,
            loading: saving,
          }}
          dirty={!!(form.nom || form.email || form.phone)}
          className="lg:max-w-lg"
        >
          <DialogHeader>
            <DialogTitle className="t-title">
              {editTarget ? t('Modifier le chiffreur') : t('Nouveau chiffreur')}
            </DialogTitle>
          </DialogHeader>

          {/* Form — element-specs §9 (GOV.UK: visible label above each 40 px
              input, single column, rows 16 apart; placeholder = format cue
              only — the Moroccan phone cue). */}
          <div className="space-y-4 py-1">
            <div>
              <Label htmlFor="chiffreur-nom" className="t-label">{t('Nom')} *</Label>
              <Input
                id="chiffreur-nom"
                {...INPUT_NAME}
                className="mt-1"
                value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="chiffreur-email" className="t-label">{t('Email')}</Label>
              <Input
                id="chiffreur-email"
                {...INPUT_EMAIL}
                className="mt-1"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="chiffreur-phone" className="t-label">{t('Téléphone')}</Label>
              <Input
                id="chiffreur-phone"
                {...INPUT_TEL}
                className="mt-1"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder={BRAND.phonePlaceholder}
              />
            </div>
            <div className="flex min-h-11 items-center gap-3">
              <Switch
                id="chiffreur-active"
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
              <Label htmlFor="chiffreur-active" className="text-sm text-ink">{t('Actif')}</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving} className="max-md:hidden">
              {t('Annuler')}
            </Button>
            <Button onClick={handleSave} loading={saving} className="max-md:h-12 max-md:text-[15px] max-md:font-semibold">
              {editTarget ? t('Mettre à jour') : t('Ajouter')}
            </Button>
          </DialogFooter>

          {/* List management — element-specs §4 (M3 lists / GOV.UK summary
              list): 44 px hairline rows, `t-label` group heading, actions at
              the row end as 36 px `ghost` icon buttons. */}
          <div className="mt-2 border-t border-hairline pt-4">
            <p className="t-label mb-1">{t('Gestion de la liste')}</p>
            <div className="max-h-48 divide-y divide-hairline overflow-y-auto">
              {chiffreurs.map((c) => (
                <div key={c.id} className="flex min-h-[44px] items-center justify-between gap-2 text-sm">
                  <span className={c.active ? "truncate font-medium text-ink" : "truncate text-ink-3 line-through"}>
                    {c.nom}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-ink-3 hover:text-ink"
                      onClick={() => openEdit(c)}
                      title={t('Modifier')}
                      aria-label={`${t('Modifier')} ${c.nom}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {canDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-ink-3 hover:text-destructive"
                        onClick={() => setDeleteTarget(c)}
                        loading={deletingId === c.id}
                        title={t('Supprimer')}
                        aria-label={`${t('Supprimer')} ${c.nom}`}
                      >
                        {deletingId === c.id ? null : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && !deletingId && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="t-heading">{t('Supprimer ce chiffreur ?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.nom && <span className="font-semibold text-ink">{deleteTarget.nom}</span>} {t('sera retiré de la liste. Cette action est irréversible.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>{t('Annuler')}</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "destructive" }))}
              disabled={!!deletingId}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) handleDelete(deleteTarget.id);
              }}
            >
              {t('Supprimer')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
