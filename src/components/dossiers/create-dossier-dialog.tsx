'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Segmented } from '@/components/ui/segmented';
import { INPUT_EMAIL, INPUT_LAST, INPUT_NAME, INPUT_TEL } from '@/lib/input-attrs';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { useOptions } from '@/hooks/use-options';
import {
  createEmptyDossier,
  emptyExpertInfo,
  visibleExpertRoles,
  EXPERT_ROLE_LABELS,
  type ExpertRole,
  type ExpertInfo,
} from '@/lib/create-empty-dossier';
import { logHistorique } from '@/app/(app)/dossiers/[id]/log-historique';
import { useT } from '@/i18n';
import { BRAND } from '@/lib/brand';
import { tourDialogGuard } from '@/lib/tutorial/dialog-guard';

// Radix Select disallows empty-string values on <SelectItem>.
const NONE_VALUE = '__none__';

interface CreateDossierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (id: string) => void;
  initialCompagnie?: string;
}

type ExpertsState = Record<ExpertRole, ExpertInfo>;

function initialExpertsState(): ExpertsState {
  return {
    '1er': emptyExpertInfo(),
    '2eme': emptyExpertInfo(),
    arbitre: emptyExpertInfo(),
  };
}

export function CreateDossierDialog({
  open,
  onOpenChange,
  onCreated,
  initialCompagnie,
}: CreateDossierDialogProps) {
  const t = useT();
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const { profile } = useCurrentUser();

  const { options: dbCompagnies } = useOptions('compagnies');
  const compagnieOptions = React.useMemo(
    () => dbCompagnies.filter((o) => o.active !== false),
    [dbCompagnies],
  );

  const [compagnie, setCompagnie] = useState<string>(initialCompagnie || NONE_VALUE);
  const [expertRole, setExpertRole] = useState<ExpertRole>('1er');
  const [experts, setExperts] = useState<ExpertsState>(initialExpertsState);
  const [isCreating, setIsCreating] = useState(false);
  const [primedRole, setPrimedRole] = useState<ExpertRole | null>(null);

  const userName = React.useMemo(() => {
    const fbUser = auth?.currentUser;
    return profile
      ? `${profile.prenom ?? ''} ${profile.nom ?? ''}`.trim() ||
          profile.email ||
          fbUser?.email ||
          'Utilisateur'
      : fbUser?.displayName || fbUser?.email || 'Utilisateur';
  }, [auth, profile]);

  // Pre-fill the creator's row with their name whenever the role changes.
  // If we previously primed a different role (and the user didn't edit it),
  // clear that stale pre-fill so only the current role carries the name.
  React.useEffect(() => {
    if (primedRole === expertRole) return;
    setExperts((prev) => {
      const next = { ...prev };
      if (primedRole && primedRole !== expertRole && next[primedRole]?.nom === userName) {
        next[primedRole] = { ...next[primedRole], nom: '' };
      }
      next[expertRole] = { ...next[expertRole], nom: next[expertRole].nom || '' };
      return next;
    });
    setPrimedRole(expertRole);
  }, [expertRole, userName, primedRole]);

  React.useEffect(() => {
    if (open && initialCompagnie) {
      setCompagnie(initialCompagnie);
    }
  }, [open, initialCompagnie]);

  const resetForm = () => {
    setCompagnie(initialCompagnie || NONE_VALUE);
    setExpertRole('1er');
    setExperts(initialExpertsState());
    setPrimedRole(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && isCreating) return;
    if (!next) resetForm();
    onOpenChange(next);
  };

  const handleCancel = () => {
    if (isCreating) return;
    resetForm();
    onOpenChange(false);
  };

  const updateExpert = (role: ExpertRole, field: keyof ExpertInfo, value: string) => {
    setExperts((prev) => ({ ...prev, [role]: { ...prev[role], [field]: value } }));
  };

  // Unsaved work (§2.5): only a typed expert detail or a changed compagnie /
  // rôle counts — an untouched dialog closes without a question.
  const isDirty =
    compagnie !== (initialCompagnie || NONE_VALUE) ||
    expertRole !== '1er' ||
    Object.values(experts).some((e) => e.nom || e.telephone || e.email || e.compagnie);

  const handleConfirm = async () => {
    const fbUser = auth?.currentUser;
    if (!fbUser || !db) {
      toast({ variant: 'destructive', title: t('Erreur'), description: t('Utilisateur non connecté.') });
      return;
    }
    try {
      setIsCreating(true);

      const roles = visibleExpertRoles(expertRole);
      const expertsSeed: Partial<Record<ExpertRole, Partial<ExpertInfo>>> = {};
      for (const r of roles) {
        expertsSeed[r] = experts[r];
      }

      const seed = {
        compagnie: compagnie === NONE_VALUE ? '' : compagnie,
        expertRole,
        experts: expertsSeed,
      };

      const id = await createEmptyDossier({
        db,
        user: { uid: fbUser.uid, displayName: fbUser.displayName, email: fbUser.email },
        seed,
      });
      await logHistorique(
        db,
        id,
        'Création dossier',
        userName,
        `Dossier créé comme ${EXPERT_ROLE_LABELS[expertRole]}`,
        'statut',
        userName,
      );
      resetForm();
      onOpenChange(false);
      // Arrival moment (motion-spec §1.2 F3 — a dossier is born a few times a
      // day at most): the detail page reads this flag once and gives the new
      // ref one teal value-flash so the navigation lands somewhere visibly new.
      try {
        window.sessionStorage.setItem('dossier_just_created', id);
      } catch { /* ignore */ }
      onCreated?.(id);
    } catch (e: any) {
      console.error('Create dossier error:', e);
      toast({
        variant: 'destructive',
        title: t('Erreur'),
        description: e?.message || t('Impossible de créer le dossier'),
      });
    } finally {
      setIsCreating(false);
    }
  };

  const rolesToRender = visibleExpertRoles(expertRole);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Dialog — element-specs §13 (M3 dialogs: brief headline + one line of
          supporting text; ≤ 560 px for a form; confirm at the edge with the
          dismissive `outline` to its left; bottom sheet below `lg`). */}
      <DialogContent
        // A Select, a radio group and 4–12 text fields → full-screen on a
        // phone (research §2.4: > 3 controls or a picker).
        fullScreen
        primary={{ label: t('Créer'), onClick: handleConfirm, loading: isCreating }}
        dirty={isDirty}
        onDiscard={resetForm}
        className="max-h-[calc(85vh/var(--app-zoom))] overflow-y-auto lg:max-w-lg"
        {...tourDialogGuard()}
      >
        <DialogHeader>
          <DialogTitle className="t-title">{t('Nouveau dossier')}</DialogTitle>
          <DialogDescription>
            {t("Choisissez la compagnie et votre rôle d'expert. Les informations des autres experts peuvent être renseignées ici ou plus tard dans le dossier.")}
          </DialogDescription>
        </DialogHeader>

        {/* Form — element-specs §9 (GOV.UK: visible label above each 40 px
            control, rows 16 apart, placeholder only as a format cue). */}
        <div className="grid gap-4 py-2">
          <div className="grid gap-1" data-tour="dos-create-compagnie">
            <Label htmlFor="create-compagnie">{t('Compagnie')}</Label>
            <Select
              value={compagnie}
              onValueChange={setCompagnie}
              disabled={isCreating}
            >
              <SelectTrigger id="create-compagnie">
                <SelectValue placeholder={t('Choisir une compagnie')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>—</SelectItem>
                {compagnieOptions.map((c) => (
                  <SelectItem key={c.id} value={c.label}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1" data-tour="dos-create-role">
            <Label id="create-role-label">{t('Rôle')}</Label>
            {/* Three exclusive, short options: a segmented control on touch
                (M3 "2 to 5 options"; LukeW "dropdowns are the UI of last
                resort"), the rimmed radio cards on a desk. */}
            <Segmented
              className="md:hidden"
              aria-labelledby="create-role-label"
              disabled={isCreating}
              value={expertRole}
              onValueChange={(v) => setExpertRole(v as ExpertRole)}
              options={(['1er', '2eme', 'arbitre'] as ExpertRole[]).map((role) => ({
                value: role,
                label: t(EXPERT_ROLE_LABELS[role]),
                labelText: t(EXPERT_ROLE_LABELS[role]),
              }))}
            />
            <RadioGroup
              value={expertRole}
              onValueChange={(v) => setExpertRole(v as ExpertRole)}
              disabled={isCreating}
              className="hidden gap-2 md:grid"
            >
              {(['1er', '2eme', 'arbitre'] as ExpertRole[]).map((role) => (
                <label
                  key={role}
                  htmlFor={`role-${role}`}
                  className="flex cursor-pointer items-center gap-3 rounded-md border border-hairline bg-card p-3 transition-colors hover:bg-surface-2 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent/40"
                >
                  <RadioGroupItem value={role} id={`role-${role}`} />
                  <span className="text-sm font-medium text-ink">{t(EXPERT_ROLE_LABELS[role])}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Role sections — flat `surface-2` wells (nested-solid rule inside
              the glass-strong dialog), `t-heading` title, 16 px between fields. */}
          {rolesToRender.map((role) => (
            <section
              key={role}
              aria-label={t(EXPERT_ROLE_LABELS[role])}
              className="grid gap-4 rounded-lg bg-surface-2 p-4"
            >
              <h3 className="t-heading">{t(EXPERT_ROLE_LABELS[role])}</h3>
              {/* Single column below sm; the desktop 2-up grid stays.
                  Order per §2.4: Nom → Téléphone → Email → Compagnie. */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-1">
                  <Label htmlFor={`${role}-nom`}>{t('Nom complet')}</Label>
                  <Input
                    id={`${role}-nom`}
                    {...INPUT_NAME}
                    value={experts[role].nom}
                    onChange={(e) => updateExpert(role, 'nom', e.target.value)}
                    disabled={isCreating}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor={`${role}-telephone`}>{t('Téléphone')}</Label>
                  <Input
                    id={`${role}-telephone`}
                    {...INPUT_TEL}
                    placeholder={BRAND.phonePlaceholder}
                    value={experts[role].telephone}
                    onChange={(e) => updateExpert(role, 'telephone', e.target.value)}
                    disabled={isCreating}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor={`${role}-email`}>{t('Email')}</Label>
                  <Input
                    id={`${role}-email`}
                    {...INPUT_EMAIL}
                    value={experts[role].email}
                    onChange={(e) => updateExpert(role, 'email', e.target.value)}
                    disabled={isCreating}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor={`${role}-compagnie`}>{t('Compagnie')}</Label>
                  <Input
                    id={`${role}-compagnie`}
                    {...INPUT_NAME}
                    {...INPUT_LAST}
                    value={experts[role].compagnie}
                    onChange={(e) => updateExpert(role, 'compagnie', e.target.value)}
                    disabled={isCreating}
                  />
                </div>
              </div>
            </section>
          ))}
        </div>

        {/* Footer §13: [Annuler outline] [Créer default] — the dismissive
            action stays visible (outline, not ghost). */}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isCreating} className="max-md:hidden">
            {t('Annuler')}
          </Button>
          <Button onClick={handleConfirm} loading={isCreating} data-tour="dos-create-submit" className="max-md:h-12 max-md:text-[15px] max-md:font-semibold">
            {t('Créer')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CreateDossierDialog;
