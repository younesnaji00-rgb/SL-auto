'use client';

import UtilisateursClientPage from './client-page';
import { useT } from '@/i18n';

export default function UtilisateursPage() {
  const t = useT();
  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('Utilisateurs')}</h1>
          <p className="text-muted-foreground">
            {t('Ajouter, gérer et assigner des rôles aux utilisateurs.')}
          </p>
        </div>
      <UtilisateursClientPage />
    </div>
  );
}
