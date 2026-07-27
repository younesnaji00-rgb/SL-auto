'use client';

import React from 'react';
import { format } from 'date-fns';
import { useT, dateFnsLocale } from '@/i18n';
import { cn } from '@/lib/utils';
import { UserNameLink } from '@/components/user-name-link';

export interface TimelineStep {
  id: number;
  label: string;
}

export interface TimelineBarProps {
  steps: TimelineStep[];
  activeId: number;
  onStepClick: (stepId: number) => void;
  /** Map of step id → realised-at stamp. Steps without a stamp render no
   *  metadata row (the sticky bar stays tight). */
  stamps?: Map<number, { date: Date; user: string; userNom?: string }>;
}

export function TimelineBar({ steps, activeId, onStepClick, stamps }: TimelineBarProps) {
  const t = useT();
  const activeIdx = steps.findIndex((s) => s.id === activeId);
  return (
    <div className="sticky top-[49px] z-30 w-full bg-background/95 backdrop-blur border-b" data-tour="dosd-timeline" /* flush under action bar */>
      <div className="flex items-start gap-2 px-3 sm:px-6 py-3 overflow-x-auto">
        {steps.map((step, idx) => {
          const isActive = step.id === activeId;
          const isPast = activeIdx >= 0 && idx < activeIdx;
          const stamp = stamps?.get(step.id) ?? null;
          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => onStepClick(step.id)}
                data-tour={`dosd-step-${step.id}`}
                className={cn(
                  'flex flex-col items-start gap-1 shrink-0 transition-colors',
                  'hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded'
                )}
                aria-current={isActive ? 'step' : undefined}
              >
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center rounded-full border-2 text-xs font-bold',
                      'h-7 w-7 shrink-0 transition-colors',
                      isActive && 'bg-primary text-primary-foreground border-primary',
                      !isActive && isPast && 'bg-primary/20 text-primary border-primary/50',
                      !isActive && !isPast && 'bg-muted text-muted-foreground border-muted-foreground/30'
                    )}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className={cn(
                      'text-xs whitespace-nowrap',
                      isActive ? 'font-bold text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {t(step.label)}
                  </span>
                </div>
                {stamp && (
                  <span className="text-[10px] text-muted-foreground leading-tight ml-9 max-w-[180px] truncate">
                    {format(stamp.date, 'dd/MM/yyyy HH:mm', { locale: dateFnsLocale() })} —{' '}
                    <UserNameLink
                      entry={{ userNom: stamp.userNom, user: stamp.user }}
                      className="text-muted-foreground"
                    />
                  </span>
                )}
              </button>
              {idx < steps.length - 1 && (
                <div className="w-8 sm:w-12 h-px bg-border shrink-0 mt-3.5" aria-hidden />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
