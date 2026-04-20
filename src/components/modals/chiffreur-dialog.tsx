
"use client";

import { useState } from "react";
import { useChiffreurs, Chiffreur } from "@/hooks/use-chiffreurs";
import { useChiffreurWorkload } from "@/hooks/use-workload-counts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";

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

  const [open, setOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Chiffreur | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    if (!confirm("Supprimer ce chiffreur ?")) return;
    setDeletingId(id);
    try {
      await deleteChiffreur(id);
    } finally {
      setDeletingId(null);
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
                      <span
                        className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold tabular-nums dark:bg-amber-900/40 dark:text-amber-300"
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
          <Button variant="outline" size="icon" onClick={openAdd} title="Ajouter / Gérer les chiffreurs">
            <Plus className="h-4 w-4" />
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editTarget ? "Modifier le chiffreur" : "Nouveau chiffreur"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label>Nom *</Label>
              <Input
                value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                placeholder="Jean Dupont"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="jean@example.com"
              />
            </div>
            <div>
              <Label>Téléphone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+33 6 00 00 00 00"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="chiffreur-active"
                checked={form.active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
              />
              <Label htmlFor="chiffreur-active">Actif</Label>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
            {editTarget ? "Mettre à jour" : "Ajouter"}
          </Button>

          <div className="mt-4 border-t pt-3 space-y-2 max-h-48 overflow-y-auto">
            <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Gestion de la liste</p>
            {chiffreurs.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm p-2 rounded hover:bg-muted/50">
                <span className={c.active ? "font-medium" : "text-muted-foreground line-through"}>
                  {c.nom}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => openEdit(c)}
                    title="Modifier"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    title="Supprimer"
                  >
                    {deletingId === c.id ? (
                      <Loader2 className="animate-spin h-3.5 w-3.5" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
