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

const EMPTY_FORM = { nom: "", email: "", phone: "", active: true };

interface Props {
  /** Called when the user picks a chiffreur from the dropdown (returns ID) */
  onSelectId?: (id: string) => void;
  /** Currently selected chiffreur id */
  selectedId?: string;
}

export function ChiffreurDialog({ onSelectId, selectedId }: Props) {
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
          <SelectValue placeholder={loading ? "Chargement…" : "Choisir un chiffreur"} />
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
                      // Workload count — warning status pair (never hand-picked amber).
                      <span
                        className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-status-warning-bg px-1.5 text-[11px] font-semibold tabular-nums text-status-warning-fg"
                        title={`${count} dossier(s) en cours`}
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
          <Button variant="outline" size="icon" onClick={openAdd} title="Ajouter / Gérer les chiffreurs" aria-label="Ajouter / Gérer les chiffreurs">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>

        <DialogContent className="lg:max-w-lg">
          <DialogHeader>
            <DialogTitle className="t-heading">
              {editTarget ? "Modifier le chiffreur" : "Nouveau chiffreur"}
            </DialogTitle>
          </DialogHeader>

          {/* Form rows 16 px apart, t-label over the control (information-tab FieldRow). */}
          <div className="space-y-4 py-1">
            <div>
              <Label htmlFor="chiffreur-nom" className="t-label">Nom *</Label>
              <Input
                id="chiffreur-nom"
                className="mt-1 h-9"
                value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="chiffreur-email" className="t-label">Email</Label>
              <Input
                id="chiffreur-email"
                type="email"
                className="mt-1 h-9"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="chiffreur-phone" className="t-label">Téléphone</Label>
              <Input
                id="chiffreur-phone"
                className="mt-1 h-9"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+212 6XX XX XX XX"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="chiffreur-active"
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
              <Label htmlFor="chiffreur-active" className="text-sm text-ink">Actif</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Annuler
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editTarget ? "Mettre à jour" : "Ajouter"}
            </Button>
          </DialogFooter>

          {/* List management — hairline-separated rows, actions at the row end. */}
          <div className="mt-2 border-t border-hairline pt-4">
            <p className="t-label mb-1">Gestion de la liste</p>
            <div className="max-h-48 divide-y divide-hairline overflow-y-auto">
              {chiffreurs.map((c) => (
                <div key={c.id} className="flex min-h-[36px] items-center justify-between gap-2 text-sm">
                  <span className={c.active ? "truncate font-medium text-ink" : "truncate text-ink-3 line-through"}>
                    {c.nom}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-ink-3 hover:text-ink"
                      onClick={() => openEdit(c)}
                      title="Modifier"
                      aria-label={`Modifier ${c.nom}`}
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
                        title="Supprimer"
                        aria-label={`Supprimer ${c.nom}`}
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
            <AlertDialogTitle className="t-heading">Supprimer ce chiffreur ?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.nom && <span className="font-semibold text-ink">{deleteTarget.nom}</span>} sera retiré de la liste. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "destructive" }))}
              disabled={!!deletingId}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) handleDelete(deleteTarget.id);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
