'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useT } from '@/i18n';
import { useGpsPublisher } from '@/hooks/use-gps-publisher';
import { useNativeBgGeolocation } from '@/hooks/use-native-bg-geolocation';
import { useFcmRegistration } from '@/hooks/use-fcm-registration';
import { useNativePushRegistration } from '@/hooks/use-native-push-registration';
import { useCurrentUser } from '@/hooks/use-current-user';
import { MapPin, Smartphone, X } from 'lucide-react';

const IOS_HINT_DISMISSED_KEY = 'sl-auto-ios-install-hint-dismissed';

export function GpsPublisherHost() {
  const { profile } = useCurrentUser();
  if (profile?.role !== 'Agent de Terrain') return null;
  return <GpsPublisherHostInner />;
}

function GpsPublisherHostInner() {
  const t = useT();
  const { permission, retry } = useGpsPublisher();
  // Inside the native Android shell this drives a background-capable foreground
  // service (every-minute tracking even when backgrounded / screen locked); on
  // the web it is an inert no-op and `useGpsPublisher` owns the foreground path.
  const native = useNativeBgGeolocation();
  // Web push token (browser / PWA). No-op inside the native WebView.
  useFcmRegistration();
  // Native FCM token (Capacitor APK). No-op on the web. This is what makes the
  // "Demande de position" notification reach the agent when the app has been
  // cleared from the background.
  useNativePushRegistration();
  const showIosHint = useIosInstallHint();

  return (
    <>
      {!native.isNative && showIosHint && <IosInstallHint />}

      {/* Native shell: location is handled by the OS foreground service. Only
          surface a banner if the agent declined background permission. */}
      {native.isNative
        ? native.status === 'denied' && (
            <div className="border-b border-amber-200/70 bg-amber-50/80 px-4 py-2 text-sm text-amber-800 flex items-center gap-3">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="flex-1">
                {t("Le partage de position est désactivé. Autorisez la localisation « Toujours » dans les paramètres de l'application pour que la planification tienne compte de votre position.")}
              </span>
            </div>
          )
        : permission !== 'granted' &&
          permission !== 'unavailable' && (
            <div className="border-b border-amber-200/70 bg-amber-50/80 px-4 py-2 text-sm text-amber-800 flex items-center gap-3">
              <MapPin className="h-4 w-4 shrink-0" />
              {permission === 'denied' ? (
                <span className="flex-1">
                  {t('Le partage de position est désactivé. La planification ne pourra pas tenir compte de votre position actuelle. Réactivez-le dans les paramètres du navigateur si nécessaire.')}
                </span>
              ) : (
                <>
                  <span className="flex-1">
                    {t('Activez le partage de position pour aider la planification de vos missions.')}
                  </span>
                  <Button size="sm" variant="outline" className="h-7" onClick={retry}>
                    {t('Activer')}
                  </Button>
                </>
              )}
            </div>
          )}
    </>
  );
}

function useIosInstallHint(): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const dismissed = window.localStorage.getItem(IOS_HINT_DISMISSED_KEY) === '1';
    if (dismissed) return;
    const ua = window.navigator.userAgent || '';
    const isIos = /iPhone|iPad|iPod/.test(ua);
    if (!isIos) return;
    // Safari exposes `navigator.standalone` when installed to the home screen.
    const standalone = (window.navigator as any).standalone === true;
    if (standalone) return;
    setShow(true);
  }, []);
  return show;
}

function IosInstallHint() {
  const t = useT();
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;
  const dismiss = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(IOS_HINT_DISMISSED_KEY, '1');
    }
    setHidden(true);
  };
  return (
    <div className="border-b border-sky-200/70 bg-sky-50/80 px-4 py-2 text-sm text-sky-800 flex items-center gap-3">
      <Smartphone className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        {t("Pour recevoir les notifications sur iPhone, ajoutez cette page à l'écran d'accueil : appuyez sur")} <strong>{t('Partager')}</strong> {t('puis')} <strong>{t("Ajouter à l'écran d'accueil")}</strong>.
      </span>
      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={dismiss} aria-label={t('Fermer')}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
