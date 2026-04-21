'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Tableau de bord',
  dossiers: 'Gestion des dossiers',
  consultation: 'Consultation',
  'assignations-chiffrage': 'Assignations Chiffrage',
  'assignations-atg': 'Assignations Agent de Terrain',
  utilisateurs: 'Utilisateurs',
  compagnies: 'Compagnies',
  'signaler-bug': 'Signaler un bug',
  chiffrage: 'Chiffrage',
  'devis-editor': 'Éditeur de devis',
  editor: 'Éditeur PDF',
  viewer: 'Aperçu',
};

/** Detect Firestore-id-like segments (16+ alphanumeric chars) so we can skip them. */
const isIdSegment = (segment: string): boolean => /^[A-Za-z0-9_-]{16,}$/.test(segment);

const humanize = (segment: string): string => {
  if (ROUTE_LABELS[segment]) return ROUTE_LABELS[segment];
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
};

const Breadcrumb = () => {
  const pathname = usePathname();
  const rawSegments = pathname.split('/').filter(Boolean);
  const segments = rawSegments.filter((s) => !isIdSegment(s));

  return (
    <nav aria-label="breadcrumb" className="flex">
      <ol className="flex items-center gap-2 text-sm text-muted-foreground">
        <li>
          <Link href="/dashboard" className="font-semibold text-foreground hover:text-primary transition-colors">
            SL-auto
          </Link>
        </li>
        {segments.map((segment, index) => {
          const href = '/' + segments.slice(0, index + 1).join('/');
          const isLast = index === segments.length - 1;
          const label = humanize(segment);

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
