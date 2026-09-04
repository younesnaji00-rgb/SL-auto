'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoicePlayerProps {
  url: string;
  duree: number;
}

export default function VoicePlayer({ url, duree }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 bg-primary/5 rounded-full px-3 py-1.5 min-w-[160px]">
      <audio ref={audioRef} src={url} preload="metadata" className="hidden" />
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-primary hover:text-primary"
        onClick={togglePlayback}
        type="button"
      >
        {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </Button>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        {/* scaleX, not width: progress must never animate a layout property
            (motion-spec §4.1). */}
        <div
          className="h-full w-full rounded-full bg-primary origin-left transition-transform duration-150 ease-standard motion-reduce:transition-none"
          style={{ transform: `scaleX(${Math.min(100, Math.max(0, progress)) / 100})` }}
        />
      </div>
      <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">
        {formatTime(duree)}
      </span>
    </div>
  );
}
