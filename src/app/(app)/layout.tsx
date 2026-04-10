'use client';

import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { OfflineIndicator } from '@/components/offline-indicator';
import { CurrentUserProvider, useCurrentUser } from '@/hooks/use-current-user';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { firebaseUser, loading } = useCurrentUser();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !firebaseUser) {
      router.replace('/login');
    }
  }, [loading, firebaseUser, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser) {
    return null;
  }

  return <>{children}</>;
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CurrentUserProvider>
      <AuthGuard>
        <SidebarProvider>
          <div className="relative flex min-h-screen w-full">
            <AppSidebar />
            <SidebarInset className="flex flex-col transition-all duration-300 ease-in-out">
              <Header />
              <OfflineIndicator />
              <main className="flex-1 overflow-y-auto bg-background/50">
                <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
                  {children}
                </div>
              </main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </AuthGuard>
    </CurrentUserProvider>
  );
}
