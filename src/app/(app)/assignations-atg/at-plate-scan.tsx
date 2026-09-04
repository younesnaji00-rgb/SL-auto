'use client';

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import { t } from '@/i18n';

export interface PlateScanResult {
  /** Plate read off the photo (Latin letters, e.g. "12345-B-6"). */
  plate: string;
  confidence: 'high' | 'low';
}

/**
 * "Photographier la plaque → Gemini lit le matricule" step shared by the two
 * AT self-service flows. `trigger()` opens the phone's native camera directly
 * (a `capture` file input — autofocus/flash/zoom, and no `position:fixed`
 * overlay that a transformed Radix DialogContent would clip). The caller
 * renders `inputNode` once anywhere in its tree and owns all result UI:
 * `scanning`/`error` here, dossier matching and navigation in the flow.
 */
export function usePlateScan(onPlate: (result: PlateScanResult) => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trigger = useCallback(() => {
    setError(null);
    inputRef.current?.click();
  }, []);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setScanning(true);
    setError(null);
    try {
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          const idx = result.indexOf(',');
          resolve(idx >= 0 ? result.slice(idx + 1) : result);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const res = await apiFetch('/api/scan-plate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileBase64, contentType: file.type || 'image/jpeg' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `${t('Erreur serveur')} (${res.status})`);
      }
      if (!data?.registration) {
        setError(t('Plaque illisible sur la photo. Rapprochez-vous et réessayez.'));
        return;
      }
      onPlate({
        plate: String(data.registration),
        confidence: data.confidence === 'high' ? 'high' : 'low',
      });
    } catch (err: any) {
      console.warn('[at-plate-scan] scan failed', err);
      setError(err?.message || t('Échec de l’analyse de la photo. Réessayez.'));
    } finally {
      setScanning(false);
    }
  };

  const inputNode: ReactNode = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      capture="environment"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        // Reset so re-taking the same photo re-triggers onChange.
        e.target.value = '';
        void handleFile(file);
      }}
    />
  );

  return { trigger, scanning, error, inputNode };
}
