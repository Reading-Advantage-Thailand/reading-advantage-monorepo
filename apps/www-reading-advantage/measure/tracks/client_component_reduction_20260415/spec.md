# Spec: Reduce Excessive Client Component Boundaries

## Problem

Several pages and components are unnecessarily marked `"use client"` even though they only use `useScopedI18n` for internationalization. Each `"use client"` boundary forces all child components into the client bundle, inflating JS weight and harming performance on mobile networks.

## Scope

Convert pages/components that **only** use `useScopedI18n` (no `useState`, `useEffect`, browser APIs, or event handlers) to server components using `getScopedI18n`.

### Pages to Convert

1. `src/app/[locale]/(marketing)/products/primary-advantage/page.tsx`
2. `src/app/[locale]/(marketing)/services/managed-service/page.tsx`
3. `src/app/[locale]/(marketing)/services/blended-learning/page.tsx`
4. `src/app/[locale]/(marketing)/(home)/page.tsx`

### Components to Convert

5. `src/components/products/tutor-advantage.tsx`
6. `src/components/products/b2b-solutions.tsx`

### Pages/Components to Keep as Client

- `reading-advantage/page.tsx` — uses `useState` for video expansion
- `locale-switcher.tsx` — needs locale state
- `header.tsx` — mobile menu state
- `contact-form.tsx` — form state
- `select.tsx`, `sheet.tsx` — UI state
- `table-of-contents.tsx` — IntersectionObserver
- `related-posts.tsx`, `blog-pagination.tsx` — UI state
- `product-card.tsx` — interaction state

## Requirements

1. Change `"use client"` → remove (server component default)
2. Change `useScopedI18n` → `getScopedI18n` from `@/locales/server`
3. Change hook call from `const t = useScopedI18n(...)` → `const t = await getScopedI18n(...)`
4. Run `npm run build` after each conversion — must exit 0
5. Run `npm test` — all tests must pass
6. Verify no regression in page rendering

## Acceptance Criteria

- [ ] All 4 pages converted to server components
- [ ] All 2 components converted to server components
- [ ] `npm run build` succeeds
- [ ] `npm test` passes
- [ ] No `"use client"` on converted files except where truly needed
