# Tech Debt Registry

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or summarize resolved items when they no longer need to influence near-term planning.
>
> **Severity:** `Critical` | `High` | `Medium` | `Low`
> **Status:** `Open` | `Resolved`

| Date | Track | Item | Severity | Status | Notes |
|------|-------|------|----------|--------|-------|
| 2026-04-29 | monorepo-scaffold | advantage-games TypeScript errors (Difficulty type mismatches) | Medium | Open | `ignoreBuildErrors: true` in next.config.ts as temporary workaround. ~15 files use `"medium"` where `Difficulty` expects `"normal"`. |
| 2026-04-29 | monorepo-scaffold | advantage-games ESLint 6236 warnings | Low | Open | Pre-existing code has many `prefer-const`, `no-undef`, and `no-explicit-any` warnings. Original app had 71 warnings. Shared config is stricter. |
| 2026-04-29 | monorepo-scaffold | Shared ESLint flat config doesn't resolve plugins across pnpm workspace boundaries | Medium | Open | `@reading-advantage/config/eslint` works for packages but app uses local flat config importing plugins directly. |
| 2026-04-29 | monorepo-scaffold | Tailwind shared config is v3-style, apps use v4 CSS-based config | Low | Open | `packages/config/tailwind/tailwind.config.ts` uses v3 API. Apps using v4 need `@theme inline` in CSS. Consider migrating shared config to v4 CSS or providing both. |
| 2026-04-29 | monorepo-scaffold | react-konva peer dependency warning (wants react 19.2.0, app has 19.1.0) | Low | Open | Doesn't block builds. Consider upgrading React to 19.2.x across the monorepo. |
