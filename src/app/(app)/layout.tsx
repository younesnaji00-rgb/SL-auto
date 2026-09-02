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
          // THIS element is the page scroller (the viewport never scrolls) —
          // the gutter must be reserved here or a filter/tab change that
          // shrinks the content below one screen drops the scrollbar and
          // shifts the centered column (owner 2026-09-02, « par compagnie »).
          className="min-h-0 flex-1 overflow-y-auto bg-background/35 pb-[calc(60px+env(safe-area-inset-bottom))] [scrollbar-gutter:stable] lg:pb-0"
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
