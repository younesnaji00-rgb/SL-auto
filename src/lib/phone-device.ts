'use client';

/**
 * « L'Agent de terrain n'accède à l'application que depuis un téléphone »
 * (owner ruling 2026-09-25). A phone is:
 *  - the SL-auto Android app (the Capacitor shell), or
 *  - a phone's browser, told by the browser's own mobile flag (User-Agent
 *    Client Hints) when it has one, else by the phone tokens of its user agent.
 * Tablets, laptops and desktops are not phones, and neither is a narrow
 * desktop window: the width is never used.
 */
import { Capacitor } from '@capacitor/core';

/** Roles that may only use the app on a phone. */
export const PHONE_ONLY_ROLES: ReadonlySet<string> = new Set(['Agent de Terrain']);

export function isPhoneOnlyRole(role: string | null | undefined): boolean {
  return !!role && PHONE_ONLY_ROLES.has(role);
}

const PHONE_UA = /iPhone|iPod|Android.+Mobile|Mobile.+Firefox|Windows Phone|IEMobile|Opera Mini/i;

export function isPhoneDevice(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (Capacitor.isNativePlatform()) return true;
  } catch {
    /* plain web */
  }
  const nav = window.navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  if (typeof nav.userAgentData?.mobile === 'boolean') return nav.userAgentData.mobile;
  return PHONE_UA.test(nav.userAgent || '');
}

/** One-shot flag: a phone-only account was closed on this device (read by /login). */
export const PHONE_ONLY_FLAG_KEY = 'sl-auto.phone-only-account';

/** French source string, translated where it is shown. */
export const PHONE_ONLY_MESSAGE =
  'Le compte Agent de terrain ne s’ouvre que sur téléphone : connectez-vous depuis l’application SL-auto ou le navigateur de votre téléphone.';
