
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useT } from '@/i18n';

type Zone = 'AV' | 'AVG' | 'AVD' | 'LATG' | 'LATD' | 'AR' | 'ARG' | 'ARD' | 'Toit';

const zones: { id: Zone; label: string }[] = [
    { id: 'AV', label: 'AV' },
    { id: 'AVG', label: 'AVG' },
    { id: 'AVD', label: 'AVD' },
    { id: 'LATG', label: 'LATG' },
    { id: 'LATD', label: 'LATD' },
    { id: 'AR', label: 'AR' },
    { id: 'ARG', label: 'ARG' },
    { id: 'ARD', label: 'ARD' },
    { id: 'Toit', label: 'Toit' },
];

export function CarDiagram() {
    const t = useT();
    const [selectedZones, setSelectedZones] = React.useState<Set<Zone>>(new Set(['AVD', 'LATD']));

    const toggleZone = (zone: Zone) => {
        setSelectedZones(prev => {
            const newSet = new Set(prev);
            if (newSet.has(zone)) {
                newSet.delete(zone);
            } else {
                newSet.add(zone);
            }
            return newSet;
        });
    };

    const ZoneCheckbox = ({ zone }: { zone: { id: Zone; label: string } }) => (
        <div className="flex items-center space-x-2">
            <Checkbox
                id={`zone-${zone.id}`}
                checked={selectedZones.has(zone.id)}
                onCheckedChange={() => toggleZone(zone.id)}
            />
            <Label htmlFor={`zone-${zone.id}`} className="text-sm font-normal cursor-pointer">
                {t(zone.label)}
            </Label>
        </div>
    );

    const CarSVG = ({ view, onZoneClick }: { view: 'top' | 'bottom', onZoneClick: (zone: Zone) => void }) => (
        <svg viewBox="0 0 200 100" className="w-full h-auto max-w-sm mx-auto" role="img" aria-labelledby={`car-title-${view}`}>
            <title id={`car-title-${view}`}>{view === 'top' ? t('Vue de dessus du véhicule avec points de choc') : t('Vue de dessous du véhicule avec points de choc')}</title>
            
            {/* Base car shape */}
            <path d="M 30 10 C 20 10, 10 20, 10 30 L 10 70 C 10 80, 20 90, 30 90 L 170 90 C 180 90, 190 80, 190 70 L 190 30 C 190 20, 180 10, 170 10 Z" className="fill-muted stroke-muted-foreground" strokeWidth="1" />
            
            {/* Windshield & Roof */}
            <path d="M 50,25 C 55,15 145,15 150,25 L 140,40 L 60,40 Z" className="fill-secondary stroke-muted-foreground" strokeWidth="0.5" />
            <path d="M 60 40 L 140 40 L 140 60 L 60 60 Z" className={cn("cursor-pointer", selectedZones.has('Toit') ? "fill-primary/30 stroke-primary" : "fill-secondary stroke-muted-foreground")} strokeWidth="0.5" onClick={() => onZoneClick('Toit')} />
            <path d="M 60 60 L 140 60 L 150 75 C 145 85, 55 85, 50 75 Z" className="fill-secondary stroke-muted-foreground" strokeWidth="0.5" />

            {/* Clickable Zones with Highlights */}
            {/* Rear */}
            <path d="M 30,10 C 20,10 10,20 10,30 L 10,70 C 10,80 20,90 30,90 L 40 90 L 40 10 Z" className={cn("cursor-pointer", selectedZones.has('AR') ? "fill-primary/30 stroke-primary" : "fill-transparent")} onClick={() => onZoneClick('AR')} />
            {/* Front */}
            <path d="M 170,10 C 180,10 190,20 190,30 L 190,70 C 190,80 180,90 170,90 L 160 90 L 160 10 Z" className={cn("cursor-pointer", selectedZones.has('AV') ? "fill-primary/30 stroke-primary" : "fill-transparent")} onClick={() => onZoneClick('AV')} />
            
            {/* Sides */}
            <path d="M 40 10 L 160 10 L 150 25 L 50 25 Z" className={cn("cursor-pointer", selectedZones.has('LATG') ? "fill-primary/30 stroke-primary" : "fill-transparent")} onClick={() => onZoneClick('LATG')} />
            <path d="M 50 75 L 150 75 L 160 90 L 40 90 Z" className={cn("cursor-pointer", selectedZones.has('LATD') ? "fill-primary/30 stroke-primary" : "fill-transparent")} onClick={() => onZoneClick('LATD')} />

            {/* Corners */}
            <path d="M 40,10 L 50,25 L 40,25 Z" className={cn("cursor-pointer", selectedZones.has('ARG') ? "fill-primary/30 stroke-primary" : "fill-transparent")} onClick={() => onZoneClick('ARG')} />
            <path d="M 150,25 L 160,10 L 160,25 Z" className={cn("cursor-pointer", selectedZones.has('AVG') ? "fill-primary/30 stroke-primary" : "fill-transparent")} onClick={() => onZoneClick('AVG')} />
            <path d="M 40,90 L 50,75 L 40,75 Z" className={cn("cursor-pointer", selectedZones.has('ARD') ? "fill-primary/30 stroke-primary" : "fill-transparent")} onClick={() => onZoneClick('ARD')} />
            <path d="M 160,90 L 150,75 L 160,75 Z" className={cn("cursor-pointer", selectedZones.has('AVD') ? "fill-primary/30 stroke-primary" : "fill-transparent")} onClick={() => onZoneClick('AVD')} />
        </svg>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="md:col-span-2 space-y-4">
                <div>
                    <p className="text-center text-sm font-medium mb-2">{t('Vue de dessus')}</p>
                    <CarSVG view="top" onZoneClick={toggleZone} />
                </div>
                <div>
                    <p className="text-center text-sm font-medium mb-2">{t('Vue de dessous')}</p>
                    <CarSVG view="bottom" onZoneClick={toggleZone} />
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 gap-x-4 gap-y-3 p-4 border rounded-lg bg-secondary/50">
                {zones.map(zone => <ZoneCheckbox key={zone.id} zone={zone} />)}
            </div>
        </div>
    );
}

