'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, X, Trash2, Check, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

interface CapturedPhoto {
  id: string;
  blob: Blob;
  url: string;
}

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (photos: File[]) => void;
  /**
   * Max photos accepted from this session. The shutter button hard-stops at
   * this count (Infinity = unlimited). Set by the parent based on existing
   * photos vs the per-section cap so the user cannot exceed the limit by
   * taking shots inside the camera — the previous behavior silently dropped
   * the excess on confirm, which surprised users.
   */
  maxCaptures?: number;
}

export default function CameraCapture({ open, onClose, onConfirm, maxCaptures = Infinity }: CameraCaptureProps) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [captures, setCaptures] = useState<CapturedPhoto[]>([]);
  const [cameraReady, setCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    setError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError(t("Votre navigateur ne supporte pas l'accès à la caméra. Utilisez Chrome ou Safari."));
      return;
    }

    try {
      // Try with preferred constraints first
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
      } catch {
        // Fallback: minimal constraints (some mobile browsers reject complex constraints)
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err: any) {
      console.error('Camera error:', err?.name, err?.message);
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setError(t("Accès à la caméra refusé. Allez dans les paramètres de votre navigateur pour autoriser l'accès à la caméra pour ce site."));
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        setError(t("Aucune caméra détectée sur cet appareil."));
      } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
        setError(t("La caméra est utilisée par une autre application. Fermez-la et réessayez."));
      } else {
        setError(`${t("Impossible d'accéder à la caméra:")} ${err?.message || t('erreur inconnue')}`);
      }
    }
  }, [t]);

  useEffect(() => {
    if (open) {
      startCamera(facingMode);
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setCameraReady(false);
    };
  }, [open, facingMode, startCamera]);

  const atCap = captures.length >= maxCaptures;

  const handleCapture = useCallback(() => {
    if (atCap) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const id = `capture_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const url = URL.createObjectURL(blob);
      setCaptures(prev => {
        // Defensive guard — block writes if a race somehow gets us past the
        // disabled-button gate (e.g. rapid taps before React re-renders).
        if (prev.length >= maxCaptures) return prev;
        return [...prev, { id, blob, url }];
      });
    }, 'image/jpeg', 0.9);
  }, [atCap, maxCaptures]);

  const handleRemove = useCallback((id: string) => {
    setCaptures(prev => {
      const photo = prev.find(p => p.id === id);
      if (photo) URL.revokeObjectURL(photo.url);
      return prev.filter(p => p.id !== id);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    const files = captures.map(c => new File([c.blob], `${c.id}.jpg`, { type: 'image/jpeg' }));
    // Cleanup object URLs
    captures.forEach(c => URL.revokeObjectURL(c.url));
    setCaptures([]);
    onConfirm(files);
  }, [captures, onConfirm]);

  const handleClose = useCallback(() => {
    captures.forEach(c => URL.revokeObjectURL(c.url));
    setCaptures([]);
    onClose();
  }, [captures, onClose]);

  const toggleFacing = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Camera viewfinder */}
      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn("w-full h-full object-cover", facingMode === 'user' && "scale-x-[-1]")}
        />
        <canvas ref={canvasRef} className="hidden" />

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
            <p className="text-white text-center">{error}</p>
          </div>
        )}

        {atCap && !error && (
          <div className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-status-danger-bg px-3 py-1.5 text-xs font-semibold text-status-danger-fg">
            {`${t('Limite de')} ${maxCaptures} ${t('photos atteinte')}`}
          </div>
        )}

        {/* Top bar */}
        {/* Camera chrome sits on a functional black backdrop (like the lightbox); flat scrim, no gradient. */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between bg-black/50 p-4">
          <Button variant="ghost" size="icon" onClick={handleClose} className="text-white hover:bg-white/20">
            <X className="h-6 w-6" />
          </Button>
          <span className="text-white text-sm font-medium">
            {Number.isFinite(maxCaptures)
              ? `${captures.length} / ${maxCaptures} photo${maxCaptures > 1 ? 's' : ''}`
              : (captures.length > 0 ? `${captures.length} photo${captures.length > 1 ? 's' : ''}` : t('Prendre des photos'))}
          </span>
          <Button variant="ghost" size="icon" onClick={toggleFacing} className="text-white hover:bg-white/20">
            <RotateCcw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Thumbnail strip */}
      {captures.length > 0 && (
        <div className="bg-black/90 px-3 py-2 flex gap-2 overflow-x-auto">
          {captures.map(c => (
            <div key={c.id} className="relative shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 border-white/30">
              <img src={c.url} className="w-full h-full object-cover" alt="" />
              <button
                type="button"
                aria-label={t('Retirer la photo')}
                onClick={() => handleRemove(c.id)}
                className="absolute right-0 top-0 rounded-bl-lg bg-status-danger-fg p-0.5 text-status-danger-bg"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bottom controls */}
      <div className="bg-black px-6 py-5 flex items-center justify-between safe-area-bottom">
        <Button
          variant="ghost"
          onClick={handleClose}
          className="text-white/70 hover:text-white hover:bg-white/10 text-sm"
        >
          {t('Annuler')}
        </Button>

        {/* Shutter button — disabled once the per-section cap is reached so
            the user cannot tap their way past the limit (the parent uploader
            used to silently drop the excess). */}
        <button
          onClick={handleCapture}
          disabled={!cameraReady || atCap}
          aria-label={atCap ? t('Limite de photos atteinte') : t('Prendre une photo')}
          className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-30 motion-safe:active:scale-90 transition-transform duration-150 ease-standard"
          style={{ width: 72, height: 72 }}
        >
          <div className="w-14 h-14 rounded-full bg-white" style={{ width: 58, height: 58 }} />
        </button>

        {/* Confirm button */}
        <Button
          variant="ghost"
          onClick={handleConfirm}
          disabled={captures.length === 0}
          className={cn(
            "text-sm font-semibold transition-colors",
            captures.length > 0
              ? "text-white hover:bg-white/10 hover:text-white"
              : "text-white/30"
          )}
        >
          <Check className="h-4 w-4 mr-1" />
          OK ({captures.length})
        </Button>
      </div>
    </div>
  );
}
