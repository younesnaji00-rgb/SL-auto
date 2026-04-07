import UtilisateursClientPage from './client-page';

export default function UtilisateursPage() {
  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Utilisateurs</h1>
          <p className="text-muted-foreground">
            Ajouter, gérer et assigner des rôles aux utilisateurs.
          </p>
        </div>
      <UtilisateursClientPage />
    </div>
  );
}
