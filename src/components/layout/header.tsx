import React from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import Breadcrumb from '@/components/breadcrumb';
import GlobalSearch from '@/components/global-search';
import Notifications from '@/components/layout/notifications';
import UserNav from '@/components/layout/user-nav';

const Header = () => {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-md px-6 shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <SidebarTrigger className="md:hidden h-9 w-9" />
        <div className="hidden md:block">
          <Breadcrumb />
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <GlobalSearch />
        <Notifications />
        <div className="h-8 w-px bg-border mx-1" />
        <UserNav />
      </div>
    </header>
  );
};

export default Header;
