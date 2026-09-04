import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    // Stable public download URL for the Android APK. The file itself lives
    // in Firebase Storage at /public/sl-auto.apk — replacing it there is
    // enough to ship a new APK (no redeploy needed). 307 keeps it
    // re-resolvable in case we move the storage location later.
    //
    // Storage rules require auth for reads, so the download relies on the
    // object's Firebase download token rather than public-read rules. The token
    // below is STABLE — when you upload a new APK, preserve it with:
    //   gsutil setmeta -h "x-goog-meta-firebaseStorageDownloadTokens:<token>" \
    //     gs://studio-9568416614-6523a.firebasestorage.app/public/sl-auto.apk
    // (the Firebase Console keeps the token when you "replace" a file).
    // Firm-only APK download — white-label builds (NEXT_PUBLIC_BRAND set to
    // something else) must not expose the firm's APK.
    const brand = process.env.NEXT_PUBLIC_BRAND ?? 'slaoui';
    if (brand !== 'slaoui') return [];
    return [
      {
        source: '/downloads/sl-auto.apk',
        destination:
          'https://firebasestorage.googleapis.com/v0/b/studio-9568416614-6523a.firebasestorage.app/o/public%2Fsl-auto.apk?alt=media&token=857cc76f-ee7e-4fdf-8a19-cb4195dd44ae',
        permanent: false,
      },
    ];
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://www.gstatic.com https://www.google.com https://www.recaptcha.net",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://firebasestorage.googleapis.com https://*.cloudfunctions.net wss://*.firebaseio.com https://identitytoolkit.googleapis.com https://firestore.googleapis.com https://fcmregistrations.googleapis.com",
      "frame-src 'self' https://www.google.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy-Report-Only', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self), interest-cohort=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

export default nextConfig;
