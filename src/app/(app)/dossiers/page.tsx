'use client';

import DossiersClientPage from './client-page';

export default function DossiersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dossiers</h1>
        <p className="text-muted-foreground">
          Gérer et suivre tous les dossiers de sinistres
        </p>
      </div>
      <DossiersClientPage />
    </div>
  );
}
