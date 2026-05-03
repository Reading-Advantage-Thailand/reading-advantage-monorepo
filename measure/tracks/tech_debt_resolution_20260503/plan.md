# Implementation Plan: Tech Debt Resolution

---

## Phase 1: Critical Infrastructure Blockers

*Severity: High. Must unblock production-readiness.*

- [x] Task: Generate Drizzle migration for unified auth schema
    - [x] Run `pnpm drizzle-kit generate` to produce migration SQL for current schema
    - [x] Verify migration SQL references correct tables (users, accounts, sessions)
    - [x] Run `pnpm turbo run test --filter=@reading-advantage/db`
    - [x] Commit generated migration files
- [~] Task: Migrate reading-advantage controllers from Prisma to Drizzle [DEFERRED]
    - [x] Audit complete: user-controller.ts (11 Prisma tables), license-controller.ts (5 tables), generator-controller.ts (5 tables)
    - [x] Gap analysis: Drizzle schema missing License, LicenseOnUser, Story, Chapter, StoryTimepoint, StoryAssignment, LongAnswerQuestion, RACEFRMapping, GenreAdjacency tables. Significant column divergence for userActivity, xpLogs, articles, learningGoals.
    - [x] Decision: Deferred to future "Prisma→Drizzle Schema Alignment" track. License system needs new Drizzle tables + domain functions. User activity schema needs redesign. Story subsystem is Prisma-only.
- [ ] Task: Measure - User Manual Verification 'Phase 1' (Protocol in workflow.md)

---

## Phase 2: App Build Configuration Cleanup

*Severity: Medium. Remove `ignoreBuildErrors` masks and fix underlying issues.*

- [x] Task: Remove `ignoreBuildErrors` from www-reading-advantage
    - [x] Run `pnpm turbo run build --filter=www-reading-advantage` to catalog TS errors
    - [x] Fix TypeScript compilation errors (added missing `github-slugger` dependency)
    - [x] Remove `ignoreBuildErrors: true` and `ignoreDuringBuilds: true` from next.config
    - [x] Verify build passes clean
- [x] Task: Fix advantage-games Difficulty type mismatches
    - [x] Identify all ~15 files using `"medium"` where `Difficulty` expects `"normal"`
    - [x] Replace `"medium"` with `"normal"` or update `Difficulty` type to include `"medium"`
    - [x] Remove `ignoreBuildErrors: true` from advantage-games next.config.ts
    - [x] Verify build passes clean
- [x] Task: Fix `prisma generate` build requirement for reading-advantage
    - [x] Add `prisma generate` as a prebuild step in reading-advantage package.json
    - [x] Verify `pnpm turbo run build --filter=reading-advantage` works without manual `prisma generate`
- [ ] Task: Measure - User Manual Verification 'Phase 2' (Protocol in workflow.md)

---

## Phase 3: Schema Integrity

*Severity: Medium. Fix data integrity gaps in Drizzle schema.*

- [ ] Task: Address `studentAnswers.questionId` polymorphic reference
    - [ ] Document the dual-reference pattern (multipleChoiceQuestions.id / shortAnswerQuestions.id) in schema comments
    - [ ] Add application-layer validation in domain functions that write to studentAnswers
    - [ ] Write tests verifying questionId validation for both question types
    - [ ] Commit
- [ ] Task: Address `lessonProgress.lessonId` text vs UUID mismatch
    - [ ] Investigate whether lessonId references external identifiers or internal UUIDs
    - [ ] If intentional: add schema comment documenting external reference pattern
    - [ ] If unintentional: migrate column to UUID type and update references
    - [ ] Commit
- [ ] Task: Migrate Firestore no-op stub callers (7 files)
    - [ ] Rewrite `validator-controller.ts` to use Prisma/Drizzle or return 501
    - [ ] Rewrite `deleteStories.ts` to use Prisma `story.delete()`
    - [ ] Delete dead `saveWordList` from `audio-words-generator.ts`
    - [ ] Delete dead `postFlashCard` from `stories-assistant-controller.ts`
    - [ ] Rewrite OAuth2 classroom route to use Prisma/Drizzle
    - [ ] Delete dead `generateChapterAudio` from `audio-generator.ts`
    - [ ] Remove `firestore-config.ts` no-op stub if all callers resolved
    - [ ] Write tests for any rewritten functions
    - [ ] Verify build passes
    - [ ] Commit
- [ ] Task: Document primary-advantage dual Prisma schema boundary
    - [ ] Write documentation in `packages/db/README.md` explaining the two-schema situation
    - [ ] Document which tables belong to which schema
    - [ ] Note migration path forward (unify or formalize boundary)
    - [ ] Commit
- [ ] Task: Measure - User Manual Verification 'Phase 3' (Protocol in workflow.md)

---

## Phase 4: App-Specific Cleanup

*Severity: Medium-Low. Fix remaining app-level issues.*

- [ ] Task: Fix www-reading-advantage Vite test failures
    - [ ] Run `pnpm turbo run test --filter=www-reading-advantage` and capture failures
    - [ ] Diagnose Vite transform errors in 2 failing suites
    - [ ] Fix transform configuration or skip with documented justification
    - [ ] Verify 403/403 individual tests pass
    - [ ] Commit
- [ ] Task: Clean up www-reading-advantage revideo devDependencies
    - [ ] Audit `@revideo/*` packages usage in www codebase
    - [ ] Remove unused revideo packages from devDependencies
    - [ ] If still used, document dependency justification
    - [ ] Run `pnpm install` to update lockfile
    - [ ] Commit
- [ ] Task: Verify primary-advantage base64-js dependency
    - [ ] Confirm `base64-js` is in primary-advantage package.json
    - [ ] Verify no runtime errors from missing dependency
    - [ ] Commit (if removal needed) or close as resolved
- [ ] Task: Measure - User Manual Verification 'Phase 4' (Protocol in workflow.md)

---

## Phase 5: Shared Tooling & Dependencies

*Severity: Low. Polish and alignment.*

- [ ] Task: Fix react-konva peer dependency warning
    - [ ] Check if React 19.2.x is available and compatible across monorepo
    - [ ] If yes: upgrade React across all apps and update peer deps
    - [ ] If no: suppress warning via pnpm peerDependencyRules or document as accepted
    - [ ] Commit
- [ ] Task: Reduce advantage-games ESLint warnings
    - [ ] Run `pnpm turbo run lint --filter=advantage-games` and categorize 6236 warnings
    - [ ] Auto-fix `prefer-const` warnings with `--fix`
    - [ ] Add `no-undef` globals or fix imports
    - [ ] Target: reduce to <500 warnings (remaining are `no-explicit-any`)
    - [ ] Commit
- [ ] Task: Clean up locale-config.ts usage
    - [ ] Identify the 5 files importing from `configs/locale-config.ts`
    - [ ] Migrate each to use next-intl routing config instead
    - [ ] Remove `localeImports` dead code
    - [ ] Delete `configs/locale-config.ts` if no remaining imports
    - [ ] Commit
- [ ] Task: Add shared i18n types to @reading-advantage/config
    - [ ] Define shared `Locale` type (union of supported locales)
    - [ ] Export from `@reading-advantage/config`
    - [ ] Update all 5 apps to import shared Locale type
    - [ ] Verify build passes across all apps
    - [ ] Commit
- [ ] Task: Update tech debt registry
    - [ ] Mark all resolved items in `measure/tech-debt.md`
    - [ ] Add any new items discovered during resolution
    - [ ] Ensure file stays within 50-line limit
- [ ] Task: Measure - User Manual Verification 'Phase 5' (Protocol in workflow.md)

---

## Total Estimated Tasks: 16
## Status: Not started
## Notes

### Key Decisions
- Items covered by existing pending tracks are excluded (reading-advantage lint/tests, primary-advantage lint/tests, ESLint v9, science-advantage auth)
- Firestore stub callers are migrated individually, not wholesale
- primary-advantage dual Prisma schema is documented, not unified (separate future track)
- advantage-games ESLint target is <500 warnings (not zero) since remaining are `no-explicit-any`

### Dependencies
- Phase 1 requires Docker Postgres running (`pnpm db:start`)
- Phase 2 depends on Phase 1 for reading-advantage (Prisma→Drizzle must complete first)
- Phase 3 can run in parallel with Phase 2 (different file surfaces)

### Risks
- Prisma→Drizzle controller migration is the largest task — may uncover missing Drizzle schema tables
- Firestore stub removal may reveal runtime callers not caught by build
- advantage-games Difficulty fix may require type definition changes affecting game logic
