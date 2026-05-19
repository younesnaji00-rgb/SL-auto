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
    return [
      {
        source: '/downloads/sl-auto.apk',
        destination:
          'https://firebasestorage.googleapis.com/v0/b/studio-9568416614-6523a.firebasestorage.app/o/public%2Fsl-auto.apk?alt=media',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
