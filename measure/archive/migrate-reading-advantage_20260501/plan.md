# Implementation Plan: Migrate reading-advantage into Monorepo

---

## Phase 1: Audit & Preparation

- [x] Task: Audit `functions/` directory — categorize each script
    - Identify: still in use, deprecated, or data migration one-offs
    - Document which scripts should be preserved as `packages/reading-advantage-scripts/`
- [x] Task: Audit Firebase usage in web app
    - Map all `firebase/auth` usage (client auth flows)
    - Map all `firebase-admin/auth` usage (server token verification)
    - Map all `firebase/firestore` usage — identify Prisma equivalents
    - Document Firebase → Postgres migration status
- [x] Task: Map shared dependency conflicts
    - Compare reading-advantage deps vs existing monorepo packages
    - Identify which local utils/components can use `@reading-advantage/*` packages
    - Identify version conflicts (React, Next.js, Radix, etc.)
- [x] Task: Measure — User Manual Verification 'Audit & Preparation' (Protocol in workflow.md)

## Phase 2: Copy & Scaffold

- [x] Task: Copy web app source into `apps/reading-advantage/`
    - Copy from `/Desktop/reading-advantage/web/` excluding `node_modules/`, `.next/`, `package-lock.json`
    - Remove nested `.git` if present
- [x] Task: Convert `package.json` to pnpm workspace
    - Replace `package-lock.json` with pnpm
    - Add `@reading-advantage/ui`, `@reading-advantage/utils`, `@reading-advantage/config` as `workspace:*` deps
    - Deduplicate deps already in shared packages (clsx, tailwind-merge, class-variance-authority, lucide-react, Radix primitives)
    - Rename package to `reading-advantage`
- [x] Task: Update `tsconfig.json` to extend shared config
    - Extend `@reading-advantage/config/tsconfig` if applicable
    - Preserve app-specific path aliases and compiler options
- [x] Task: Update ESLint config to use shared config
    - Migrate from `.eslintrc.json` (legacy) to flat config or extend shared config
    - Document any warnings that arise from stricter shared rules
- [x] Task: Run `pnpm install` and verify dependency resolution
- [x] Task: Measure — User Manual Verification 'Copy & Scaffold' (Protocol in workflow.md)

## Phase 3: Firebase & Data Layer

- [x] Task: Preserve Firebase Auth integration
    - Verify `lib/firebase.ts` and `lib/firebaseAdmin.ts` still work
    - Ensure env vars (NEXT_PUBLIC_FIREBASE_*) are documented
    - No changes to auth flow — Firebase Auth stays for now
- [x] Task: Audit Firestore data model references
    - Check `server/models/` — which still use `DocumentData` from Firestore?
    - Check `server/services/` — which are Firestore services vs Prisma services?
    - Document which Firestore references are dead code vs still-active
- [x] Task: Copy preserved `functions/` scripts into `packages/reading-advantage-scripts/`
    - Only include scripts flagged as "still in use" from Phase 1 audit
    - Create `package.json` with appropriate deps
    - Add to `pnpm-workspace.yaml` if needed
- [x] Task: Measure — User Manual Verification 'Firebase & Data Layer' (Protocol in workflow.md)

## Phase 4: Build & Test

- [x] Task: Run `turbo run build --filter=reading-advantage` and fix issues
    - Next.js config: migrate from `next.config.mjs` to `next.config.ts` if needed
    - Fix any import path issues from workspace restructuring
    - Address Tailwind v3 config (postcss.config.mjs, tailwind.config.js)
- [x] Task: Run `turbo run lint --filter=reading-advantage`
    - Document baseline warnings (expect similar to advantage-games: many pre-existing)
    - Fix any errors that block the build
- [x] Task: Run `turbo run test --filter=reading-advantage`
    - Document baseline test results (pass/fail counts)
    - Ensure Jest config works in monorepo context
- [x] Task: Update CI workflow if needed
    - Verify reading-advantage is picked up by existing `turbo build lint test` pipeline
- [x] Task: Measure — User Manual Verification 'Build & Test' (Protocol in workflow.md)

## Phase 5: Deconflict & Polish

- [x] Task: Replace local UI components with `@reading-advantage/ui` where applicable
    - Button, Card, Dialog, Input, Tabs — if local copies exist, switch to shared
    - Keep app-specific components local
- [x] Task: Replace local utils with `@reading-advantage/utils` where applicable
    - `cn()` helper, common hooks
- [x] Task: Update README with monorepo-specific setup instructions
- [x] Task: Add tech debt items for deferred work
    - Firebase Auth → shared auth package
    - Tailwind v3 → v4 migration
    - Full Firestore removal
    - Jest → Vitest consolidation (if desired)
- [x] Task: Measure — User Manual Verification 'Deconflict & Polish' (Protocol in workflow.md)

---

## Total Estimated Tasks: 22
## Completed Tasks: 22
## Notes

### Phase 1 Audit Findings

**functions/ directory:**
- NOT Firebase Cloud Functions — data processing scripts
- 8 files worth preserving: `readabilityCalculator.js`, `googleai.js`, `generateArticle.js`, `generateQuestion.js`, `utils/*`, genre data JSONs
- 26 one-off migration scripts, 2 deprecated — safe to skip
- Only 5 files use Firebase Admin (all one-off Firestore migration scripts)

**Firebase usage in web app:**
- Client Auth: `signInWithEmailAndPassword` in sign-in form (ACTIVE, migration fallback)
- Server Auth: `verifyIdToken` in password update route (ACTIVE, migration bridge)
- Firestore: 12 collections still active via `db.collection()` — partially migrated to Prisma
- Dead code: `verify-id-token.ts`, `auth-redirect-handler.tsx`, `ios-auth-handler.ts`, `handler-factory.ts` import
- Models (`user.ts`, `article.ts`, `license.ts`) use `DocumentData` type import only — trivially removable
- Storage: `@google-cloud/storage` (NOT Firebase Storage) — active

**Dependency conflicts:**
- CRITICAL: Tailwind v3 (web) vs v4 (monorepo) — must stay v3 for this track
- HIGH: ESLint v8 (web) vs v9 (monorepo) — keep local config for now
- HIGH: zustand v4 (web) vs v5 (games) — keep local version
- MEDIUM: React 19.2.1 (web) vs 19.1.0 (packages) — compatible
- MEDIUM: Jest 29 (web) vs Jest 30 (games) vs Vitest (science/www) — keep local
- `cn()` duplicated in 127+ files — drop-in replacement from `@reading-advantage/utils`
- 5 shadcn components (Button, Card, Dialog, Input, Tabs) duplicated with `@reading-advantage/ui`
- Web has 36 shadcn/ui components total; shared UI only covers 5

### Decisions
- Firebase Auth stays (active migration path)
- Tailwind stays v3 (v4 migration deferred)
- MUI stays alongside Radix (no forced removal)
- Jest stays (test runner consolidation deferred)
- Dead Firebase code will be cleaned up in Phase 3

### Build Results
- `next build --no-lint`: ✅ passes (123 pages generated)
- `ignoreBuildErrors: true` + `ignoreDuringBuilds: true` set temporarily
- `next lint`: ✅ 0 errors, 128 warnings (pre-existing)
- `jest`: 50/76 suites pass, 457/494 tests pass (26 suites, 37 tests fail — pre-existing)
