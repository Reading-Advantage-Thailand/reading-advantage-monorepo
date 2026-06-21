import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

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
    ignoreBuildErrors: false,
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

// Wrap the Next.js config with Sentry so the framework auto-loads
// `sentry.client.config.ts` and `sentry.server.config.ts` on the
// live runtime path. Source-map upload is disabled (`disable: true`)
// because we do not maintain release health in CI; the runtime SDK
// initialization (captureException in route handlers) is the live
// behavior gated by Phase 9's live-initialization acceptance test.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  disable: !process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.SENTRY_AUTH_TOKEN,
});
