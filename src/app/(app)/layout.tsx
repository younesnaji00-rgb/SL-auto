'use client';

import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/sidebar';
import { CompagnieLogosPreload } from '@/components/layout/compagnie-logos-preload';
import Header from '@/components/layout/header';
import { OfflineIndicator } from '@/components/offline-indicator';
import { GpsPublisherHost } from '@/components/gps-publisher-host';
import { CurrentUserProvider, useCurrentUser } from '@/hooks/use-current-user';
import { WorkspaceTabsProvider } from '@/hooks/use-workspace-tabs';
import { PageChromeProvider, SkipToContent } from '@/components/layout/page-chrome';
import { ShellUiProvider } from '@/components/layout/shell-ui';
import WorkspaceTabs from '@/components/layout/workspace-tabs';
import MobileNav from '@/components/layout/mobile-nav';
import { useRouter, usePathname } from 'next/navigation';
import { PageLoader } from '@/components/ui/page-loader';
import { cn } from '@/lib/utils';

/** Routes that want to use the full inset width (no padding, no max-w cap). */
const FULL_WIDTH_ROUTES = ['/devis-editor'];
/** Record pages own their padding (sticky record bar must span the inset). */
const FLUSH_ROUTE_PATTERNS = [/^\/dossiers\/[^/]+$/];

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
        <PageLoader label="Chargement..." />
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
  const fullWidth =
    FULL_WIDTH_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`)) ||
    FLUSH_ROUTE_PATTERNS.some((re) => re.test(pathname));

  return (
    <div className="relative flex h-svh w-full overflow-hidden">
      <SkipToContent />
      <CompagnieLogosPreload />
      <AppSidebar />
      <SidebarInset className="flex h-svh flex-col overflow-hidden transition-[margin,width] duration-300 ease-standard motion-reduce:transition-none">
        <Header />
        <OfflineIndicator />
        <GpsPublisherHost />
        <WorkspaceTabs />
        <main
          id="main-content"
          className="min-h-0 flex-1 overflow-y-auto bg-background/50 pb-[calc(60px+env(safe-area-inset-bottom))] lg:pb-0"
          tabIndex={-1}
        >
          <div className={cn(fullWidth ? 'w-full' : 'mx-auto max-w-[1600px] p-4 md:p-6 lg:p-8')}>
            {children}
          </div>
        </main>
        <MobileNav />
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
        <PageChromeProvider>
          <WorkspaceTabsProvider>
            <SidebarProvider>
              <ShellUiProvider>
                <AppShell>{children}</AppShell>
              </ShellUiProvider>
            </SidebarProvider>
          </WorkspaceTabsProvider>
        </PageChromeProvider>
      </AuthGuard>
    </CurrentUserProvider>
  );
}
