'use client';

import DossiersClientPage from './client-page';
import { useT } from '@/i18n';

export default function DossiersPage() {
  const t = useT();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('Dossiers')}</h1>
        <p className="text-muted-foreground">
          {t('Gérer et suivre tous les dossiers de sinistres')}
        </p>
      </div>
      <DossiersClientPage />
    </div>
  );
}
