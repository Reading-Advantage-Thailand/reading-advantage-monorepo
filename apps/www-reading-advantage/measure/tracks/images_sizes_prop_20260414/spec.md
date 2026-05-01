# Spec: Fix Missing `sizes` Props on `fill` Images

## Problem

Multiple `next/image` components using the `fill` prop lack the `sizes` attribute. Without `sizes`, the browser defaults to `100vw` and downloads the largest image variant even on small viewports, causing significant performance waste.

## Scope

Audit and fix all `next/image` components with `fill` prop across:

- Product pages (`src/app/[locale]/(marketing)/products/*/page.tsx`)
- Case-studies page
- Services pages (blended-learning, managed-service)
- Any other pages with `fill` images

## Requirements

1. Every `next/image` with `fill` prop MUST have a `sizes` prop.
2. Use appropriate responsive sizes values based on image context:
   - Hero/hero-background: `"(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 100vw"`
   - Feature cards: `"(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"`
   - Product logos (small): `"(max-width: 768px) 50vw, 25vw"`
   - Stat/result images: `"(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 50vw"`
3. Run `npm run build` after changes — must exit 0.
4. Run `npm test` — all tests must pass.

## Acceptance Criteria

- [ ] No `next/image` with `fill` prop exists without `sizes`
- [ ] `npm run build` succeeds
- [ ] `npm test` passes
