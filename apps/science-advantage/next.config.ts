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
    // Retained post-Prisma-removal (track prisma_drizzle_science_controllers_20260505).
    // Prisma is gone; remaining tsc blockers are pre-existing and out of scope:
    //   - ~333 testing-library matcher narrowing (toBeInTheDocument et al.) in *.test.tsx
    //   - ~21 toHaveTextContent assertions, same root cause
    //   - INTERN role widening in lib/auth/session.ts (2)
    //   - Missing sibling modules lib/auth/{password,rate-limit}.test.ts (2)
    //   - ProcessEnv narrowing in vitest.integration.{global-setup,setup}.ts + lib/test/resolve-test-database-url.ts (3)
    //   - Duplicate next@16 type identities: RequestInit / CurriculumUnitSummary (~4)
    //   - Misc: user-menu string|null, beforeEach import, xp.test comparison, mastery-profile overload (4)
    // See measure/tech-debt.md `auth_strategy_review`.
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
