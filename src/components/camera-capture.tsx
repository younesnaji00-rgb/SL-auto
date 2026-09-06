'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Check, SwitchCamera } from 'lucide-react';
import { useT } from '@/i18n';
import { cn } from '@/lib/utils';

/**
 * Camera chrome sits on top of a live viewfinder whose brightness is unknown,
 * so every glyph carries a 1 px shadow (LeewayHertz camera study: "use a
 * gradient background or a single-pixel shadow behind the icons … to keep them
 * visible on all kind of camera view backgrounds").
 */
const GLYPH_SHADOW = 'drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]';

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

  // The strip always shows the shot just taken (Apple: confirm the capture
  // without leaving the camera).
  const stripRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = stripRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [captures.length]);

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

  // Strip caption: « 38/40 » against a finite cap, plain count otherwise.
  const stripCount = Number.isFinite(maxCaptures)
    ? `${captures.length}/${maxCaptures}`
    : String(captures.length);
  // At most 6 thumbnails are visible; the strip scrolls to the newest.
  const visibleCaptures = captures.slice(-24);

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-black">
      {/* Camera viewfinder — the whole screen; every control floats over it so
          the centre of the frame (what the agent is aiming at) stays clear. */}
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={cn('h-full w-full object-cover', facingMode === 'user' && 'scale-x-[-1]')}
        />
        <canvas ref={canvasRef} className="hidden" />

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
            <p className="text-center text-white">{error}</p>
          </div>
        )}

        {atCap && !error && (
          <div className="pointer-events-none absolute left-1/2 top-16 -translate-x-1/2 rounded-full bg-status-danger-bg px-3 py-1.5 text-xs font-semibold text-status-danger-fg">
            {`${t('Limite de')} ${maxCaptures} ${t('photos atteinte')}`}
          </div>
        )}

        {/* Top row — close only (the count lives on the « Terminé » badge and
            in the strip, where the eye already is). 44 px corner target. */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between pt-[env(safe-area-inset-top)]">
          <button
            type="button"
            onClick={handleClose}
            aria-label={t('Fermer')}
            className="inline-flex h-11 w-11 items-center justify-center text-white"
          >
            <X className={cn('h-6 w-6', GLYPH_SHADOW)} />
          </button>
          <span className={cn('px-3 text-sm font-medium tabular-nums text-white', GLYPH_SHADOW)}>
            {Number.isFinite(maxCaptures)
              ? `${captures.length} / ${maxCaptures} ${maxCaptures > 1 ? t('photos') : t('photo')}`
              : captures.length > 0
                ? `${captures.length} ${captures.length > 1 ? t('photos') : t('photo')}`
                : t('Prendre des photos')}
          </span>
          <span className="h-11 w-11" aria-hidden />
        </div>
      </div>

      {/* Captured-thumbnail strip — 56 px, ABOVE the shutter row so it never
          covers the centre of the viewfinder (WhatsApp's in-camera gallery
          strip is the counter-example the research calls out). Scrollable;
          each thumb carries a 44 px remove target. */}
      {captures.length > 0 && (
        <div ref={stripRef} className="flex shrink-0 items-center gap-2 overflow-x-auto bg-black px-3 py-2" aria-label={t('Photos prises')}>
          <span className="shrink-0 pr-1 text-[12px] font-medium tabular-nums text-white/70">{stripCount}</span>
          {visibleCaptures.map((c) => (
            <div key={c.id} className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/30">
              <img src={c.url} className="h-full w-full object-cover" alt="" />
              <button
                type="button"
                aria-label={t('Retirer la photo')}
                onClick={() => handleRemove(c.id)}
                className="absolute inset-0 flex items-start justify-end"
              >
                <span className="m-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/70">
                  <X className="h-3 w-3 text-white" />
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bottom controls — flip 44 left · shutter 72 centre · Terminé 44 right
          (Hoober: controls in the lower portion, corners for the edge actions). */}
      <div className="flex shrink-0 items-center justify-between bg-black px-4 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={toggleFacing}
          aria-label={t('Changer de caméra')}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors active:bg-white/15"
        >
          <SwitchCamera className={cn('h-6 w-6', GLYPH_SHADOW)} />
        </button>

        {/* Shutter — disabled once the per-section cap is reached so the user
            cannot tap their way past the limit (the parent uploader used to
            silently drop the excess). */}
        <button
          type="button"
          onClick={handleCapture}
          disabled={!cameraReady || atCap}
          aria-label={atCap ? t('Limite de photos atteinte') : t('Prendre une photo')}
          className="flex items-center justify-center rounded-full border-4 border-white transition-transform duration-150 ease-standard disabled:opacity-30 motion-safe:active:scale-90"
          style={{ width: 72, height: 72 }}
        >
          <span className="block rounded-full bg-white" style={{ width: 58, height: 58 }} />
        </button>

        <button
          type="button"
          onClick={handleConfirm}
          disabled={captures.length === 0}
          aria-label={`${t('Terminé')} (${captures.length})`}
          className={cn(
            'relative inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors',
            captures.length > 0 ? 'text-white active:bg-white/15' : 'text-white/30',
          )}
        >
          <Check className={cn('h-6 w-6', GLYPH_SHADOW)} />
          {captures.length > 0 && (
            <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[11px] font-semibold tabular-nums text-black">
              {captures.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
