'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import DossierCreationForm from './creation-form';

export default function NewDossierPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    // Layout has two <main> elements (SidebarInset + an inner overflow-y-auto main).
    // Pick the one that actually scrolls.
    const mains = Array.from(document.querySelectorAll('main'));
    const scroller = mains.find(m => {
      const style = getComputedStyle(m);
      return style.overflowY === 'auto' || style.overflowY === 'scroll';
    }) || mains[mains.length - 1] || document.scrollingElement;
    if (!scroller) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        setScrollY((scroller as HTMLElement).scrollTop);
        raf = 0;
      });
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    // Also listen to window scroll in case the outer viewport is what moves.
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const titleOpacity = Math.max(0, 1 - scrollY / 80);
  const titleTranslate = Math.min(scrollY / 4, 20);
  const isCompact = scrollY > 60;

  return (
    <div>
      <div
        className="flex items-center gap-4 mb-6 transition-opacity"
        style={{
          opacity: titleOpacity,
          transform: `translateY(-${titleTranslate}px)`,
          pointerEvents: titleOpacity === 0 ? 'none' : undefined,
          height: titleOpacity === 0 ? 0 : undefined,
          overflow: titleOpacity === 0 ? 'hidden' : undefined,
          marginBottom: titleOpacity === 0 ? 0 : undefined,
        }}
      >
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
      <DossierCreationForm stepperCompact={isCompact} />
    </div>
  );
}
