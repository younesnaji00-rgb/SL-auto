'use client';

import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { OfflineIndicator } from '@/components/offline-indicator';
import { CurrentUserProvider, useCurrentUser } from '@/hooks/use-current-user';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Routes that want to use the full inset width (no padding, no max-w cap). */
const FULL_WIDTH_ROUTES = ['/devis-editor'];

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

function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const fullWidth = FULL_WIDTH_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  return (
    <div className="relative flex h-svh w-full overflow-hidden">
      <AppSidebar />
      <SidebarInset className="flex flex-col h-svh transition-all duration-300 ease-in-out overflow-hidden">
        <Header />
        <OfflineIndicator />
        <main className="flex-1 min-h-0 overflow-y-auto bg-background/50">
          <div className={cn(fullWidth ? 'w-full' : 'p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto')}>
            {children}
          </div>
        </main>
      </SidebarInset>
    </div>
  );
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
          <AppShell>{children}</AppShell>
        </SidebarProvider>
      </AuthGuard>
    </CurrentUserProvider>
  );
}
