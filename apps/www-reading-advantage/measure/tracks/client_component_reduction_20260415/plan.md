# Plan: Reduce Excessive Client Component Boundaries

---

## Phase 1: Convert Pages to Server Components

### Task 1.1: Convert `primary-advantage/page.tsx`

- [ ] Remove `"use client"` directive
- [ ] Change `import { useScopedI18n } from "@/locales/client"` → `import { getScopedI18n } from "@/locales/server"`
- [ ] Change `const t = useScopedI18n(...)` → `const t = await getScopedI18n(...)`
- [ ] Add `async` to function declaration
- [ ] Run `npm run build` — confirm exit 0
- [ ] Run `npm test` — confirm passing

### Task 1.2: Convert `managed-service/page.tsx`

- [ ] Same pattern as 1.1
- [ ] Run `npm run build` and `npm test`

### Task 1.3: Convert `blended-learning/page.tsx`

- [ ] Same pattern as 1.1
- [ ] Run `npm run build` and `npm test`

### Task 1.4: Convert `(home)/page.tsx`

- [ ] Same pattern as 1.1
- [ ] Run `npm run build` and `npm test`

---

## Phase 2: Convert Components to Server Components

### Task 2.1: Convert `tutor-advantage.tsx`

- [ ] Remove `"use client"` directive
- [ ] Change `import { useScopedI18n }` → `import { getScopedI18n }`
- [ ] Change `const t = useScopedI18n(...)` → `const t = await getScopedI18n(...)`
- [ ] Add `async` to function declaration
- [ ] Run `npm run build` — confirm exit 0
- [ ] Run `npm test` — confirm passing

### Task 2.2: Convert `b2b-solutions.tsx`

- [ ] Same pattern as 2.1
- [ ] Run `npm run build` and `npm test`

---

## Final Verification

1. `npm run build` exits 0
2. `npm test` passes
3. Grep for remaining `"use client"` — verify only expected files have it
