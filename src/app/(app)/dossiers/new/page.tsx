import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import DossierCreationForm from './creation-form';

export default function NewDossierPage() {
  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
         <Button variant="outline" size="icon" asChild>
            <Link href="/dossiers">
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to dossiers</span>
            </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nouveau Dossier</h1>
          <p className="text-muted-foreground">
            Suivez les étapes pour créer un nouveau dossier de sinistre.
          </p>
        </div>
      </div>
      <DossierCreationForm />
    </div>
  );
}
