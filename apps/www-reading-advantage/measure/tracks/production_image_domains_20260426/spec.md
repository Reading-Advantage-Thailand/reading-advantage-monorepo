# Production Image Domains

## Problem
`next.config.ts` only allows `localhost` as image domain, breaking images in production.

## Solution
Add production/CDN domains to `remotePatterns` in next.config.ts.

## Acceptance Criteria
- [ ] Production domain added to remotePatterns
- [ ] CDN domain added to remotePatterns
- [ ] Images load correctly in production
- [ ] No security regressions
