# Plan: Testing Infrastructure Setup

---

## Phase 1: Vitest and React Testing Library Setup

### Task 1.1: Install Vitest and related dependencies
- [ ] Run `npm install --save-dev vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom`
- [ ] Verify all packages install without peer dependency conflicts
- [ ] Confirm `package.json` devDependencies reflect the new packages

### Task 1.2: Create `vitest.config.ts`
- [ ] Create `vitest.config.ts` at project root with jsdom environment, `@vitejs/plugin-react`, and the path alias `@/` → `./src/`
- [ ] Add `setupFiles` entry pointing to `src/test/setup.ts`
- [ ] Set `coverage.provider` to `v8`

### Task 1.3: Create test setup file
- [ ] Create `src/test/setup.ts` that imports `@testing-library/jest-dom/vitest`
- [ ] Add a mock for `next/navigation` (useRouter, usePathname) since components may use them
- [ ] Add a mock for `next-international` `useScopedI18n` and `getScopedI18n` that returns the key as the translation value

### Task 1.4: Add npm scripts for testing
- [ ] Add `"test": "vitest run"` to `package.json` scripts
- [ ] Add `"test:watch": "vitest"` to `package.json` scripts
- [ ] Add `"test:coverage": "vitest run --coverage"` to `package.json` scripts
- [ ] Run `npm test` and confirm it exits cleanly (even with zero test files)

**Manual Verification — Phase 1:**
1. Run `npm test` — should exit 0 with message "No test files found"
2. Run `npm run test:coverage` — should produce an empty coverage report without error

---

## Phase 2: Write Unit Tests for Core Components

### Task 2.1: Write failing test for HeroSection component
- [ ] Create `src/components/marketing/hero-section.test.tsx`
- [ ] Write test: renders `title` prop as a heading element
- [ ] Write test: renders `description` prop text
- [ ] Write test: renders the CTA button with correct `href` when `ctaButton` prop is provided
- [ ] Write test: does not render CTA button when `ctaButton` prop is omitted
- [ ] Run `npm test` and confirm tests FAIL (Red phase — component imports not yet mocked correctly)

### Task 2.2: Fix HeroSection test imports and confirm green
- [ ] Resolve any import errors (next/image mock, next/link mock if needed)
- [ ] Run `npm test` and confirm all 4 HeroSection tests PASS (Green phase)

### Task 2.3: Write failing test for a utility function
- [ ] Identify a pure utility function in `src/lib/` (e.g., a string formatter, slug generator, or date helper)
- [ ] Create a corresponding `*.test.ts` file
- [ ] Write 3+ tests covering the main logic paths (happy path, edge case, error case)
- [ ] Run `npm test` and confirm tests FAIL (Red phase)

### Task 2.4: Implement or fix utility to make tests pass
- [ ] Make minimal changes to pass the utility tests
- [ ] Run `npm test` — all tests pass (Green phase)
- [ ] Run `npm run test:coverage` — verify coverage for the utility file is >80%

**Manual Verification — Phase 2:**
1. Run `npm test` — should show at least 7 passing tests
2. Run `npm run test:coverage` — verify HeroSection and the utility function appear in the coverage report

---

## Phase 3: Playwright E2E Setup

### Task 3.1: Install Playwright
- [ ] Run `npm install --save-dev @playwright/test`
- [ ] Run `npx playwright install --with-deps chromium` to install browser binary
- [ ] Verify `playwright` is in `devDependencies`

### Task 3.2: Create `playwright.config.ts`
- [ ] Create `playwright.config.ts` at project root
- [ ] Set `baseURL` to `http://localhost:3000`
- [ ] Set `testDir` to `./e2e`
- [ ] Configure `webServer` to run `npm run dev` before tests (for CI)
- [ ] Set `use.locale` to `en` to match `/en/` routing

### Task 3.3: Add E2E npm script
- [ ] Add `"test:e2e": "playwright test"` to `package.json` scripts

### Task 3.4: Write failing E2E test — homepage renders
- [ ] Create `e2e/homepage.spec.ts`
- [ ] Write test: navigates to `/en`, expects a heading containing "Reading Advantage" to be visible
- [ ] Run `npx playwright test` and confirm FAIL (Red phase — dev server may not be running)

### Task 3.5: Write E2E tests for navigation and contact
- [ ] Write test in `e2e/homepage.spec.ts`: click Products nav link → URL contains `/products`
- [ ] Create `e2e/contact.spec.ts`: navigate to `/en/contact`, expect a mailto link to be visible
- [ ] Run all E2E tests against a running dev server and confirm all PASS (Green phase)

**Manual Verification — Phase 3:**
1. Start dev server: `npm run dev`
2. In another terminal run: `npx playwright test`
3. Confirm 3+ tests pass and the Playwright HTML report shows green

---

## Phase 4: CI Integration

### Task 4.1: Update GitHub Actions workflow to run unit tests
- [ ] Locate the existing CI workflow file in `.github/workflows/`
- [ ] Add a step `npm test` after the `npm install` step
- [ ] Verify the YAML is valid

### Task 4.2: Add E2E test step to CI (optional, non-blocking)
- [ ] Add a separate job or step for `npm run test:e2e` using Playwright's GitHub Actions integration
- [ ] Mark this step as `continue-on-error: true` for the initial merge (E2E can be made blocking in a future track once stable)

### Task 4.3: Document testing conventions
- [ ] Create `measure/code_styleguides/testing.md`
- [ ] Document: naming conventions (`*.test.tsx` vs `*.spec.ts`), how to mock `next-international`, how to mock `next/navigation`, how to run tests locally, coverage targets

**Manual Verification — Phase 4:**
1. Open `.github/workflows/` and confirm `npm test` appears in the CI steps
2. Create a draft PR and confirm the CI pipeline runs and the test step appears in the checks
3. Read `measure/code_styleguides/testing.md` and confirm it provides enough context for a new contributor to write their first test
