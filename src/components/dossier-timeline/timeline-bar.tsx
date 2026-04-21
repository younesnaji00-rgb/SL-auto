'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface TimelineStep {
  id: number;
  label: string;
}

export interface TimelineBarProps {
  steps: TimelineStep[];
  activeId: number;
  onStepClick: (stepId: number) => void;
}

export function TimelineBar({ steps, activeId, onStepClick }: TimelineBarProps) {
  return (
    <div className="sticky top-[49px] z-30 w-full bg-background/95 backdrop-blur border-b" /* flush under action bar */>
      <div className="flex items-center justify-between gap-2 px-3 sm:px-6 py-3 overflow-x-auto">
        {steps.map((step, idx) => {
          const isActive = step.id === activeId;
          const isPast = step.id < activeId;
          return (
            <React.Fragment key={step.id}>
              <button
                type="button"
                onClick={() => onStepClick(step.id)}
                className={cn(
                  'flex items-center gap-2 shrink-0 transition-colors',
                  'hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded'
                )}
                aria-current={isActive ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'inline-flex items-center justify-center rounded-full border-2 text-xs font-bold',
                    'h-7 w-7 shrink-0 transition-colors',
                    isActive && 'bg-primary text-primary-foreground border-primary',
                    !isActive && isPast && 'bg-primary/20 text-primary border-primary/50',
                    !isActive && !isPast && 'bg-muted text-muted-foreground border-muted-foreground/30'
                  )}
                >
                  {step.id}
                </span>
                <span
                  className={cn(
                    'text-xs whitespace-nowrap',
                    isActive ? 'font-bold text-primary' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </button>
              {idx < steps.length - 1 && (
                <div className="flex-1 h-px bg-border min-w-4" aria-hidden />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
