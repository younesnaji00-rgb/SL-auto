import React from 'react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="relative flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col transition-all duration-300 ease-in-out">
          <Header />
          <main className="flex-1 overflow-y-auto bg-background/50">
            <div className="p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
