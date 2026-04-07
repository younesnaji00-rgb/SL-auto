'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

const Breadcrumb = () => {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);

  return (
    <nav aria-label="breadcrumb" className="flex">
      <ol className="flex items-center gap-2 text-sm text-muted-foreground">
        <li>
          <Link href="/dashboard" className="hover:text-foreground font-semibold text-foreground">
            DashFlow
          </Link>
        </li>
        {segments.map((segment, index) => {
          const href = '/' + segments.slice(0, index + 1).join('/');
          const isLast = index === segments.length - 1;
          const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
          
          return (
            <React.Fragment key={href}>
              <li>
                <ChevronRight className="h-4 w-4" />
              </li>
              <li>
                <Link
                  href={href}
                  className={
                    isLast
                      ? 'font-medium text-foreground'
                      : 'hover:text-foreground'
                  }
                  aria-current={isLast ? 'page' : undefined}
                >
                  {label}
                </Link>
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
