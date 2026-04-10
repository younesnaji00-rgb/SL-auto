'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DossiersClientPage from './client-page';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/use-current-user';

export default function DossiersPage() {
  const { canWrite } = useCurrentUser();
  const canEdit = canWrite('dossiers');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dossiers</h1>
          <p className="text-muted-foreground">
            Gérer et suivre tous les dossiers de sinistres
          </p>
        </div>
        {canEdit && (
          <Button asChild>
            <Link href="/dossiers/new">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Dossier
            </Link>
          </Button>
        )}
      </div>
      <DossiersClientPage />
    </div>
  );
}
