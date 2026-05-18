'use client';

import React from 'react';
import { Bell, Inbox } from 'lucide-react';

export default function MesRappelsPage() {
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-2">
        <Bell className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Mes rappels</h1>
      </header>
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <Inbox className="h-10 w-10 mb-3 opacity-30" />
        <p className="text-sm">Aucun rappel pour le moment.</p>
        <p className="text-xs mt-1 opacity-70">Les rappels envoyés depuis Gestion des dossiers apparaîtront ici.</p>
      </div>
    </div>
  );
}
