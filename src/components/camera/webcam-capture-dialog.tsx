'use client';

/**
 * One photo from the computer's webcam (QA #063).
 *
 * A desktop browser ignores the `capture` attribute of a file input, so
 * « Scanner la plaque » / « Reprendre la photo » opened the file picker on the
 * web. On a computer they open this dialog instead: live webcam view, one
 * button to take the photo. Without a webcam (or when it is refused) the
 * dialog says so and offers to import a photo — the only other way in.
 *
 * A Radix dialog on purpose: it opens above the scan result dialog and takes
 * over its focus and outside clicks, where a plain full-screen layer would sit
 * under that dialog's modal shield.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Loader2, Upload, VideoOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n';

type CameraState = 'starting' | 'live' | 'denied' | 'none' | 'busy' | 'unsupported' | 'error';

interface WebcamCaptureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** The photo taken (JPEG). The dialog closes itself first. */
  onCapture: (file: File) => void;
  /** « Importer une photo » — the file picker, for a photo already on the computer. */
  onImport: () => void;
}

export function WebcamCaptureDialog({ open, onOpenChange, title, description, onCapture, onImport }: WebcamCaptureDialogProps) {
  const t = useT();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>('starting');
  const [detail, setDetail] = useState('');

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) {
      stop();
      return;
    }
    let cancelled = false;
    setState('starting');
    setDetail('');
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setState('unsupported');
        return;
      }
      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
            audio: false,
          });
        } catch (first: any) {
          if (first?.name === 'NotAllowedError' || first?.name === 'PermissionDeniedError') throw first;
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        if (!cancelled) setState('live');
      } catch (err: any) {
        if (cancelled) return;
        const name = err?.name;
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') setState('denied');
        else if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') setState('none');
        else if (name === 'NotReadableError' || name === 'TrackStartError') setState('busy');
        else {
          setState('error');
          setDetail(String(err?.message || name || ''));
        }
      }
    })();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, stop]);

  const shoot = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stop();
        onOpenChange(false);
        onCapture(new File([blob], `plaque-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92,
    );
  };

  const problem: Record<Exclude<CameraState, 'starting' | 'live'>, string> = {
    denied: t('L’accès à la caméra est refusé. Autorisez la caméra pour ce site dans le navigateur (icône à gauche de l’adresse), ou importez une photo.'),
    none: t('Aucune caméra détectée sur cet ordinateur. Importez une photo de la plaque.'),
    busy: t('La caméra est utilisée par une autre application. Fermez-la et réessayez, ou importez une photo.'),
    unsupported: t('Ce navigateur ne donne pas accès à la caméra. Importez une photo de la plaque.'),
    error: `${t('Impossible d’ouvrir la caméra')}${detail ? ` (${detail})` : ''}. ${t('Importez une photo de la plaque.')}`,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="lg:max-w-2xl" data-testid="webcam-dialog">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-ink-solid">
          <video ref={videoRef} autoPlay playsInline muted data-testid="webcam-video" className="h-full w-full object-contain" />
          {state === 'starting' && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-on-ink/80">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t('Ouverture de la caméra…')}
            </div>
          )}
          {state !== 'starting' && state !== 'live' && (
            <div role="alert" data-testid="webcam-problem" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ink-solid p-6 text-center text-sm text-on-ink">
              <VideoOff className="h-6 w-6 opacity-80" aria-hidden />
              <p className="max-w-md">{problem[state]}</p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              stop();
              onOpenChange(false);
              onImport();
            }}
          >
            <Upload aria-hidden />
            {t('Importer une photo')}
          </Button>
          <Button type="button" onClick={shoot} disabled={state !== 'live'} data-testid="webcam-shoot">
            <Camera aria-hidden />
            {t('Prendre la photo')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default WebcamCaptureDialog;
