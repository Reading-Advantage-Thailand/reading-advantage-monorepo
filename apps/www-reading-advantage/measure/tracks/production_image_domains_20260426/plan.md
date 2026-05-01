# Production Image Domains — Implementation Plan

## Phase 1: Identify Domains [ ]
- [ ] List all image sources used in the app
- [ ] Identify production domain and CDN domain
- [ ] Document current remotePatterns config

## Phase 2: Update Config [ ]
- [ ] Add production domain to remotePatterns
- [ ] Add CDN domain to remotePatterns
- [ ] Remove localhost-only restriction

## Phase 3: Validate [ ]
- [ ] Test image loading in production build
- [ ] Verify no mixed content warnings
- [ ] Check CSP headers if applicable
