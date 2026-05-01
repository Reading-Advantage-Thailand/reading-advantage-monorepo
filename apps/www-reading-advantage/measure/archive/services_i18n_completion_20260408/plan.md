# Plan: Services Pages i18n Completion

---

## Phase 1: Audit and Preparation

### Task 1.1: Verify locale file completeness for blended-learning
- [ ] Read `src/locales/pages/blended-learning.ts`
- [ ] Confirm all three language exports (en, th, zh) are present and non-empty
- [ ] List every top-level key (e.g., `hero`, `overview`, `features`, `forTeachers`, `levels`, `onboarding`, `cta`)
- [ ] Record any keys with empty or placeholder values — these must be filled before the component is wired

### Task 1.2: Verify locale file completeness for managed-service
- [ ] Read `src/locales/pages/managed-service.ts`
- [ ] Confirm all three language exports (en, th, zh) are present and non-empty
- [ ] List every top-level key (e.g., `hero`, `overview`, `features`, `benefits`, `roadmap`, `cta`)
- [ ] Record any keys with empty or placeholder values

### Task 1.3: Verify locale index registration
- [ ] Open `src/locales/en.ts` and confirm it imports and exports `blendedLearning` and `managedService` under `pages`
- [ ] Open `src/locales/th.ts` — same check
- [ ] Open `src/locales/zh.ts` — same check
- [ ] If any are missing, add the import and export entry now

### Task 1.4: Run i18n verify baseline
- [ ] Run `npm run i18n:verify`
- [ ] Record any existing errors before making changes (establishes a clean baseline to compare against)

**Manual Verification — Phase 1:**
1. Confirm locale files exist and are non-empty: `ls src/locales/pages/blended-learning.ts src/locales/pages/managed-service.ts`
2. Confirm `npm run i18n:verify` reports no new errors introduced by this audit step

---

## Phase 2: Wire i18n into Blended Learning Page

### Task 2.1: Fix the scope import in blended-learning/page.tsx
- [ ] Open `src/app/[locale]/(marketing)/services/blended-learning/page.tsx`
- [ ] Change `useScopedI18n("pages.services")` to `useScopedI18n("pages.blendedLearning")`
- [ ] Run `npm run build` — expect TypeScript errors for missing `t("...")` calls (this is the Red phase)

### Task 2.2: Replace hero section hard-coded strings
- [ ] Replace hard-coded badge text with `t("hero.badge")`
- [ ] Replace hard-coded title/heading with `t("hero.title")` (or the appropriate key)
- [ ] Replace hard-coded description paragraph with `t("hero.description")`
- [ ] Run `npm run build` — confirm these specific errors are resolved

### Task 2.3: Replace overview, features, and forTeachers hard-coded strings
- [ ] Replace all hard-coded strings in the Overview section with `t("overview.*")` calls
- [ ] Replace all hard-coded strings in the Features section with `t("features.*")` calls (including array mapping for feature items)
- [ ] Replace all hard-coded strings in the "Built for Thai Teachers" section with `t("forTeachers.*")` calls
- [ ] Run `npm run build` — confirm no remaining TypeScript errors for these sections

### Task 2.4: Replace levels, onboarding, and CTA hard-coded strings
- [ ] Replace all hard-coded strings in the CEFR Levels section with `t("levels.*")` calls
- [ ] Replace all hard-coded strings in the Onboarding section with `t("onboarding.*")` calls
- [ ] Replace all hard-coded strings in the CTA section with `t("cta.*")` calls
- [ ] Run `npm run build` — build must exit 0 with no TypeScript errors

**Manual Verification — Phase 2:**
1. Start dev server: `npm run dev`
2. Open `http://localhost:3000/en/services/blended-learning` — confirm all English text displays correctly
3. Open `http://localhost:3000/th/services/blended-learning` — confirm Thai text displays
4. Open `http://localhost:3000/zh/services/blended-learning` — confirm Chinese text displays
5. Check the browser console — confirm no missing i18n key warnings

---

## Phase 3: Wire i18n into Managed Service Page

### Task 3.1: Fix the scope import in managed-service/page.tsx
- [ ] Open `src/app/[locale]/(marketing)/services/managed-service/page.tsx`
- [ ] Change `useScopedI18n("pages.services")` to `useScopedI18n("pages.managedService")`
- [ ] Run `npm run build` — expect TypeScript errors for the incorrect key calls (Red phase)

### Task 3.2: Replace hero and overview hard-coded strings
- [ ] Replace all hard-coded strings in the Hero section with `t("hero.*")` calls
- [ ] Replace all hard-coded strings in the Overview section with `t("overview.*")` calls
- [ ] Run `npm run build` — confirm partial resolution

### Task 3.3: Replace features, benefits, roadmap, and CTA hard-coded strings
- [ ] Replace all hard-coded strings in the Features (Included) section with `t("features.*")` calls
- [ ] Replace all hard-coded strings in the Benefits section with `t("benefits.*")` calls
- [ ] Replace all hard-coded strings in the Roadmap section with `t("roadmap.*")` calls
- [ ] Replace all hard-coded strings in the CTA section with `t("cta.*")` calls
- [ ] Run `npm run build` — build must exit 0

**Manual Verification — Phase 3:**
1. Open `http://localhost:3000/en/services/managed-service` — confirm all English text displays correctly
2. Open `http://localhost:3000/th/services/managed-service` — confirm Thai text displays
3. Open `http://localhost:3000/zh/services/managed-service` — confirm Chinese text displays
4. Check browser console — confirm no missing i18n key warnings

---

## Phase 4: Final Verification and Cleanup

### Task 4.1: Run i18n verify
- [ ] Run `npm run i18n:verify`
- [ ] Confirm exit code 0 with no errors

### Task 4.2: Run full build
- [ ] Run `npm run build`
- [ ] Confirm exit code 0 with no TypeScript errors

### Task 4.3: Search for remaining hard-coded strings
- [ ] Search `blended-learning/page.tsx` for any remaining string literals that should be translated (look for English words in JSX text nodes)
- [ ] Search `managed-service/page.tsx` for the same
- [ ] Fix any found instances

### Task 4.4: Update tech-debt.md
- [ ] Mark the "Services pages have hard-coded English text" entry as resolved in `measure/tech-debt.md`

**Manual Verification — Phase 4:**
1. Run `npm run i18n:verify` — exits 0
2. Run `npm run build` — exits 0
3. Manually visit all 6 URL variants (EN/TH/ZH × 2 pages) and confirm correct language displays
4. No console warnings about missing keys in any locale
