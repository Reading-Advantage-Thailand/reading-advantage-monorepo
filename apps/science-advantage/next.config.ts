import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@reading-advantage/api',
    '@reading-advantage/auth',
    '@reading-advantage/auth-client',
    '@reading-advantage/db',
    '@reading-advantage/domain',
    '@reading-advantage/types',
    '@reading-advantage/ui',
    '@reading-advantage/utils',
  ],
  typescript: {
    // TODO: remove once Next.js version is unified across workspace
    // Pre-existing type mismatch from multiple pnpm next instances
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
