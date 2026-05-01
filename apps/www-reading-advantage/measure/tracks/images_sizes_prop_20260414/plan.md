# Plan: Fix Missing `sizes` Props on `fill` Images

---

## Phase 1: Audit and Fix All `fill` Images

### Task 1.1: Find all `fill` image usages

- [ ] Run grep across codebase for `layout="fill"` and `fill` prop patterns
- [ ] List all files with `fill` images that lack `sizes` prop
- [ ] Categorize by context (hero, card, logo, background, etc.)

### Task 1.2: Add `sizes` prop to Product Pages

- [ ] Fix `reading-advantage/page.tsx`
- [ ] Fix `primary-advantage/page.tsx`
- [ ] Fix `math-advantage/page.tsx`
- [ ] Fix `science-advantage/page.tsx`
- [ ] Fix `stem-advantage/page.tsx`
- [ ] Fix `storytime-advantage/page.tsx`
- [ ] Fix `zhongwen-advantage/page.tsx`
- [ ] Fix `tutor-advantage/page.tsx`
- [ ] Fix `codecamp-advantage/page.tsx`

### Task 1.3: Add `sizes` prop to Other Pages

- [ ] Fix `case-studies/page.tsx`
- [ ] Fix `blended-learning/page.tsx`
- [ ] Fix `managed-service/page.tsx`
- [ ] Fix homepage (`src/app/[locale]/(marketing)/page.tsx`)
- [ ] Fix any other pages found in audit

### Task 1.4: Verify Build and Tests

- [ ] Run `npm run build` — confirm exit 0
- [ ] Run `npm test` — confirm all tests pass

---

## Final Verification

1. Grep for `fill` without `sizes` — result must be empty
2. `npm run build` exits 0
3. `npm test` passes
