'use client';

import ConsultationClientPage from './client-page';

export default function ConsultationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Consultation</h1>
        <p className="text-muted-foreground">
          Consulter tous les dossiers de sinistres (lecture seule)
        </p>
      </div>
      <ConsultationClientPage />
    </div>
  );
}
