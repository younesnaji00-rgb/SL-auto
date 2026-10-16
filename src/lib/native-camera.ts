/**
 * Does « take a photo » open the device's own camera?
 *
 * On a phone or a tablet, a `capture` file input opens the camera app. A
 * desktop browser ignores `capture` and shows the file picker instead (QA
 * #063: on the web, « Scanner la plaque » and « Reprendre la photo » both
 * opened the file import). There the app films with the webcam itself.
 */

export interface CameraEnv {
  userAgent: string;
  /** navigator.maxTouchPoints — iPadOS reports a Mac user agent. */
  maxTouchPoints: number;
}

export function opensNativeCamera(env: CameraEnv): boolean {
  if (/Android|iPhone|iPad|iPod|Mobile|Windows Phone/i.test(env.userAgent)) return true;
  // iPad on iPadOS 13+: « Macintosh » user agent, but a touch screen.
  return /Macintosh/i.test(env.userAgent) && env.maxTouchPoints > 1;
}

export function deviceOpensNativeCamera(): boolean {
  if (typeof navigator === 'undefined') return true;
  return opensNativeCamera({ userAgent: navigator.userAgent || '', maxTouchPoints: navigator.maxTouchPoints || 0 });
}
