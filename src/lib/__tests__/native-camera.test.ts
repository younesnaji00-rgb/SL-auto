// Run: npx tsx --test src/lib/__tests__/native-camera.test.ts
//
// QA #063: on a computer, « Scanner la plaque » opened the file picker.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { opensNativeCamera } from '../native-camera';

const desktopChrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const macSafari = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const android = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

test('phones open their camera app', () => {
  assert.equal(opensNativeCamera({ userAgent: android, maxTouchPoints: 5 }), true);
  assert.equal(opensNativeCamera({ userAgent: iphone, maxTouchPoints: 5 }), true);
});

test('an iPad on iPadOS (Mac user agent, touch screen) too', () => {
  assert.equal(opensNativeCamera({ userAgent: macSafari, maxTouchPoints: 5 }), true);
});

test('a computer does not: the app uses the webcam', () => {
  assert.equal(opensNativeCamera({ userAgent: desktopChrome, maxTouchPoints: 0 }), false);
  assert.equal(opensNativeCamera({ userAgent: desktopChrome, maxTouchPoints: 10 }), false); // touch laptop
  assert.equal(opensNativeCamera({ userAgent: macSafari, maxTouchPoints: 0 }), false);
});
