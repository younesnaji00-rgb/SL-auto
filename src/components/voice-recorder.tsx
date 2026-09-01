'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Square, Trash2, Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type RecorderState = 'idle' | 'recording' | 'preview';

interface VoiceRecorderProps {
  onRecorded: (blob: Blob, duration: number) => void;
  maxDuration?: number;
  disabled?: boolean;
}

export default function VoiceRecorder({ onRecorded, maxDuration = 120, disabled }: VoiceRecorderProps) {
  const [state, setState] = useState<RecorderState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, [audioUrl]);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        blobRef.current = blob;
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setState('preview');
        stream.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      };

      mediaRecorder.start();
      setState('recording');
      setElapsed(0);

      timerRef.current = setInterval(() => {
        setElapsed(prev => {
          const next = prev + 1;
          if (next >= maxDuration) {
            mediaRecorder.stop();
            if (timerRef.current) clearInterval(timerRef.current);
          }
          return next;
        });
      }, 1000);
    } catch {
      // Permission denied or no microphone
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleDiscard = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    blobRef.current = null;
    setElapsed(0);
    setIsPlaying(false);
    setState('idle');
  };

  const handleSend = () => {
    if (blobRef.current) {
      onRecorded(blobRef.current, elapsed);
      handleDiscard();
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (state === 'idle') {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="text-ink-3 hover:text-ink"
        onClick={startRecording}
        disabled={disabled}
        title="Message vocal"
        type="button"
      >
        <Mic className="h-5 w-5" />
      </Button>
    );
  }

  if (state === 'recording') {
    return (
      <div className="flex items-center gap-2">
        {/* Recording chip on the danger pair (the one "live" signal). */}
        <div className="flex items-center gap-2 rounded-full bg-status-danger-bg px-3 py-1 text-status-danger-fg">
          <span className="h-2 w-2 animate-pulse rounded-full bg-status-danger-fg motion-reduce:animate-none" />
          <span className="font-mono text-xs font-semibold tabular-nums">{formatTime(elapsed)}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-status-danger-fg hover:bg-status-danger-bg hover:text-status-danger-fg"
          onClick={stopRecording}
          title="Arrêter"
          type="button"
        >
          <Square className="h-4 w-4 fill-current" />
        </Button>
      </div>
    );
  }

  // preview state
  return (
    <div className="flex items-center gap-2">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-ink"
        onClick={togglePlayback}
        type="button"
        aria-label={isPlaying ? 'Pause' : 'Écouter'}
      >
        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </Button>
      <span className="font-mono text-xs tabular-nums text-ink-3">{formatTime(elapsed)}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-status-danger-fg hover:bg-status-danger-bg hover:text-status-danger-fg"
        onClick={handleDiscard}
        title="Supprimer"
        type="button"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        onClick={handleSend}
        type="button"
      >
        Envoyer
      </Button>
    </div>
  );
}
