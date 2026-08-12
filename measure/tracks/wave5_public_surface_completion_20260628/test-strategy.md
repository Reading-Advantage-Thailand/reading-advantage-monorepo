# Test Strategy: Wave 5 Phase 7 - Marketing Schema, UX, and i18n

> **Track:** `wave5_public_surface_completion_20260628`
> **Phase:** 7 (Marketing Schema, UX, and i18n)
> **Owner:** measure-strategy subagent
> **Method:** Contract-first TDD. Red tests before Green implementation.
> **Scope boundary:** `apps/marketing` and `packages/db/src/schema/marketing.ts` only.

## Git Baseline (discovered from Git)

- **role_base / current HEAD:** `aa9d4d651c442975abacdc46bbb8d11cb65d58d0`
- **Track creation commit** (the commit that added this track's `plan.md`):
  `792c900ad` - "docs(measure): add Wave 4-6 coverage tracks
  (track_id: monorepo_review_roadmap_20260626)".
- **phase_base_sha:** not embedded in this file. See
  [phase_base_sha capture point](#phase_base_sha-capture-point) below. The
  orchestrator must capture it from the strategy commit, not from any SHA that
  predates the committed strategy.

## Scope and Independence

Phase 7 is bounded to the Marketing app and its shared DB schema. It is the
third parallel Marketing lane.

- It does **not** depend on Phase 0 (pricing/legal decisions).
- It does **not** touch www (Phases 1 to 6) or Science (Phase 8).
- It does **not** change root `pnpm-lock.yaml` (no dependency additions or
  version moves). Root lock changes are out of scope.
- Wave 3 security behavior must be preserved: auth guards on every route,
  settings secret masking, no plaintext secret return, AI calls through the
  `ai.generateText()` adapter, and the `vinext` runtime build. Phase 7 adds
  schema, UX, and i18n contracts on top of that floor. It must not weaken it.

## Source-Grounded Gaps (evidence from `measure/audit-reports/marketing-app_20260626`)

| Gap | Evidence | Current state at HEAD |
|-----|----------|-----------------------|
| `pastTopics` lacks `UNIQUE(app, topic)` | LR-007-001 | `UNIQUE(app, normalized_key)` exists; `normalized_key` is derived from `topic` by a trigger in migration `0041`. Effective uniqueness is enforced via the derived column, not the raw `topic` text. Falsification target: a duplicate `(app, topic)` insert must be rejected end to end. |
| `videoProjects.script` is unconstrained `jsonb` | LR-007-005 | Column is `jsonb("script")` with no DB-level shape constraint. The API validates `script` with `scriptSchema` on POST/PATCH (`api/video/projects/route.ts:33,153`). Gap: the column has no array-type guard and the typed contract is not documented at the schema. |
| `videoProjects` and `videoAssets` lack `updatedAt` | LR-007-002, LR-007-003 | Both tables have `createdAt` only. No `updatedAt` column. |
| Marketing tables lack owner/audit columns (`createdBy`, `updatedBy`) | LR-007-007 | No `createdBy` or `updatedBy` column on any marketing table. |
| `appEnum` hardcodes the app catalog; duplicated in client maps | LR-007-006 | `appEnum` lists 8 apps. `appColors` (`campaigns/page.tsx:15`) and `appNames` (`campaigns/[id]/video/page.tsx:29`) each re-list the same 8 apps. No shared `APPS` tuple. |
| `settings.value` "encrypted at rest" comment unenforced by schema | LR-007-004 | Encryption runs at the API layer (`api/settings/route.ts:107-109` calls `encrypt()`). The schema comment is the only invariant marker. |
| No `res.ok` checks / substring error styling / `alert()` | LR-004-007/009/010, LR-marketing-app-006-007 | `res.ok` checks already exist on settings, campaigns, campaign detail, and video pages (Wave 3). Remaining gap: substring-based error styling in `settings/page.tsx:354,359` (`testResult.startsWith("Error")`, `testResult.includes("Error")`). No `alert()` calls remain in app source (verified). |
| `lang="th"` but UI is hardcoded English | LR-marketing-app-006-004 | `app/layout.tsx:16` sets `lang="th"`. All visible UI strings are English. No i18n layer. |

## Phase 7 Sub-Phase Map

The plan's Phase 7 has five tasks. This strategy maps them to sub-phases and
sets canonical TDD ordering. Only the first Red is executable at commit time.
The rest are dependency-blocked where the dependency is canonical (Green on
Red, closeout on Green).

| Sub-phase | Plan task | Marker after this strategy | Canonical dependency |
|-----------|-----------|----------------------------|----------------------|
| 7.1 | Task 1: Red tests for schema integrity | `[~]` (executable) | none |
| 7.2 | Task 2: migration + schema constraints + encryption invariant | `[b]` | 7.1 Red written |
| 7.3 | Task 3: `res.ok` + inline errors + replace substring styling | `[b]` | 7.2 Green (pages render schema columns; avoid double rewrite) |
| 7.4 | Task 4: i18n layer / `lang` / externalize strings | `[b]` | 7.3 Green (externalize the strings the UX task finalizes) |
| 7.5 | Task 5: run marketing targeted tests/build | `[b]` | 7.4 Green |

---

## Sub-Phase 7.1 - Schema Integrity Red

**Risk classification:** medium
(schema migration touches shared `packages/db`; blast radius is the marketing
app plus the `packages/db` schema test suite, but no live user traffic depends
on the missing columns yet.)

### Targeted Red command

```bash
CI=true pnpm vitest run \
  apps/marketing/app/__tests__/phase-7-schema-integrity.red.test.ts \
  packages/db/src/__tests__/phase-7-marketing-schema-integrity.red.test.ts
```

The Red author writes two files. The marketing-app file asserts the client
contract. The db-package file asserts the schema and migration contract. Both
must fail at HEAD because the columns, the typed-script guard, and the shared
`APPS` tuple do not exist.

### Red test claims (each must be falsifiable)

1. **`UNIQUE(app, topic)` end-to-end:** insert the same `(app, topic)` string
   twice into `past_topics` and assert the second insert throws. Falsification
   condition: if the `normalized_key` derivation already rejects the duplicate,
   this test passes at HEAD and is a characterization test, not a Red. In that
   case the author must add a second falsification: insert two topic strings
   that differ only by whitespace or case and assert they collapse to the same
   `normalized_key` and are rejected. If both already hold, the test is a
   contract test that must stay green and the task records that the Red is
   satisfied by the existing migration `0041`.
2. **`videoProjects.script` typed guard:** assert (a) a write path that sends
   an invalid script shape (wrong keys, fewer than 5 scenes, non-array) to
   `POST /api/video/projects` and `PATCH /api/video/projects` is rejected with
   status 400; (b) the `video_projects.script` column has a DB-level array-type
   guard (`jsonb_typeof(script) = 'array'` or equivalent) OR the schema
   documents the typed invariant. Falsification: at HEAD, (a) may already pass
   (Wave 3 added Zod); (b) fails because no DB guard exists.
3. **`updatedAt` columns:** assert `videoProjects.updatedAt` and
   `videoAssets.updatedAt` columns exist, are `timestamp`, are `notNull`, and
   auto-populate on insert and update. Falsification: the columns do not exist
   at HEAD, so the test fails.
4. **`createdBy` / `updatedBy` columns:** assert `createdBy` exists on
   `campaigns`, `videoProjects`, `videoAssets`, and `pastTopics`; assert
   `updatedBy` exists on `campaigns`, `videoProjects`, and `videoAssets`. Type
   must be `uuid` (nullable on backfill, `notNull` after backfill or documented
   as nullable). Falsification: none of these columns exist at HEAD.
5. **Shared `APPS` tuple:** assert a single exported `APPS` tuple is the only
   source of the app list, and that `appEnum`, `appColors`, and `appNames` all
   derive from it. Falsification: at HEAD, three independent lists exist; a
   test that adds a ninth app to `APPS` and asserts all three maps reflect it
   fails because the maps are hardcoded.

### Green gate

- All five Red claims pass.
- `packages/db/src/__tests__/phase-2-marketing-schema.test.ts` and
  `phase-2-marketing-schema-adversarial.test.ts` still pass (they assert the
  column set; they must be updated to include the new columns, not deleted).
- `tenant-coverage.test.ts` still exits 0 (marketing tables are EXEMPT/
  REFERENTIAL; new columns must not add a `schoolId` classification).

### Closeout gate

```bash
CI=true pnpm turbo run test --filter=@reading-advantage/db
CI=true pnpm turbo run check-types --filter=@reading-advantage/db --filter=marketing
```

### Fixtures and mocks

- Use the existing `apps/marketing/app/__tests__/helpers/testDb.ts` and
  `@electric-sql/pglite` for real-DB assertions (UNIQUE rejection, column
  existence, auto-population).
- Use the existing `helpers/auth-mock.ts` for route-handler script-shape tests.
- No live network. No real AI provider.

### Anti-pattern coverage (7.1)

- **A3 (digit-only labeled count):** the `APPS` tuple test must assert the
  exact app list by labeled value (`APPS.length === 8` and
  `APPS.includes("reading-advantage")`), not a bare digit match.
- **A4 (vacuous-pass on nothing-done):** the UNIQUE test must not pass on an
  empty table. It must insert a first row, then attempt the duplicate.
- **A5 (false-claim text vs test reality):** if the UNIQUE invariant already
  holds via `normalized_key`, the plan must say "characterization test" and not
  "Red fails at HEAD". The strategy forbids writing "Red fails" when the test
  passes.
- **A10 (generated-facts drift):** after schema columns land, the
  `measure/generated/` facts must be regenerated. The Green gate includes a
  `measure/doctor.sh` Check 5 note.

---

## Sub-Phase 7.2 - Migration, Schema Constraints, Encryption Invariant (Green)

**Risk classification:** medium
(shared migration file; must be additive and non-destructive.)

### Targeted Red command (the Green that satisfies 7.1)

```bash
CI=true pnpm vitest run \
  packages/db/src/__tests__/phase-7-marketing-schema-integrity.red.test.ts \
  packages/db/src/__tests__/marketing-topic-normalization-migration.test.ts
```

### Green gate

- A new Drizzle migration file lands under `packages/db/drizzle/` (next
  sequence number after `0050`). It must be additive: `ADD COLUMN` for
  `updatedAt`, `createdBy`, `updatedBy`; `ADD CONSTRAINT` for the script
  array-type guard if chosen. No `DROP COLUMN`.
- The migration backfills `updatedAt` to `now()` for existing rows.
- `createdBy` / `updatedBy` are nullable in the migration (backfill deferred)
  unless a separate backfill task is accepted.
- The `settings` encryption invariant is documented: either a CHECK constraint
  is infeasible (documented in the migration header) or a property test proves
  a secret key written via `POST /api/settings` is stored as ciphertext.

### Encryption invariant proof (live-behavior)

- A live-behavior test writes a secret setting through the settings route, then
  reads the raw `settings.value` from the DB and asserts it does not contain
  the plaintext and matches the `encrypt()` format (`iv:authTag:ciphertext`).
- A refutation test asserts `GET /api/settings` never returns the plaintext for
  a secret key (already covered by `phase-w3-settings-auth.test.ts`; this
  sub-phase must not weaken it).

### Changed-contract risks

- Adding `updatedAt`/`createdBy` to `videoProjects` changes the row shape
  returned by `GET /api/video/projects`. The client `VideoProject` interface
  (`campaigns/[id]/video/page.tsx:20`) must be updated or the typed response
  check must tolerate extra fields.
- The `packages/db` schema tests assert exact column sets. They must be
  updated, not deleted, or A5 (false claim) applies.

### Anti-pattern coverage (7.2)

- **A6 (registry-note overstatement):** the plan must not say "encryption
  resolved" unless the property test passes. If the invariant is documented
  only, the plan must say "documented, not enforced at DB layer".
- **A12 (dangling guard-references):** if a new guard test is referenced, it
  must exist.

---

## Sub-Phase 7.3 - UX Error States (res.ok, inline errors, no substring styling)

**Risk classification:** low
(client-only; Wave 3 already laid the res.ok floor.)

### Targeted Red command

```bash
CI=true pnpm vitest run \
  apps/marketing/app/__tests__/phase-7-ux-error-states.red.test.tsx
```

### Red test claims

1. **No `alert()` calls:** a source guard asserts no `alert(` or `window.alert`
   call exists in `apps/marketing/app/**/*.{ts,tsx}` (excluding test files and
   `role="alert"` ARIA attributes). Falsification: at HEAD this likely already
   passes (verified). If so, it is a refutation/forbidden-pattern test that
   must stay green.
2. **No substring-based error styling:** assert the settings page does not
   derive error state from `testResult.startsWith("Error")` or
   `testResult.includes("Error")`. Falsification: at HEAD, `settings/page.tsx`
   lines 354 and 359 use substring matching, so the test fails.
3. **Status-driven error UI:** assert the settings test-connection result uses
   a typed status (e.g., `"success" | "error"`) to pick the ARIA role and
   color, not a substring. Falsification: no typed status exists at HEAD.
4. **`res.ok` contract:** for each client fetch in settings, campaigns,
   campaign detail, and video pages, assert the page sets an inline error
   state when `!res.ok` and does not crash. Falsification: at HEAD these
   largely pass (Wave 3). If they pass, they are characterization tests.

### Green gate

- Substring styling replaced with a typed status field.
- All client pages render an inline error (`role="alert"`) on `!res.ok` and a
  success message (`aria-live="polite"`) on success.

### Closeout gate

```bash
CI=true pnpm vitest run apps/marketing/app/__tests__/phase-7-ux-error-states.red.test.tsx
CI=true pnpm turbo run lint --filter=marketing
```

### Live-behavior vs artifact

- The no-`alert` and no-substring claims are **artifact tests** (static source
  parse/grep over the app source).
- The `res.ok` inline-error claim is a **live-behavior test** (jsdom render
  with a mocked fetch that returns a non-OK response).

### Anti-pattern coverage (7.3)

- **A7 (over-broad filter swallowing real hits):** the no-`alert` guard must
  exclude only test files and `role="alert"` ARIA strings, not bare English
  words. Use a path-context filter, not a word filter.
- **A4 (vacuous-pass):** the substring test must point at the real lines
  (`settings/page.tsx:354,359`), not a generic "no substring" assertion that
  passes on an unrelated file.

---

## Sub-Phase 7.4 - i18n Layer and `lang` Correction

**Risk classification:** medium
(new i18n surface; must not break the `vinext` build or the Thai narration
contract.)

### Targeted Red command

```bash
CI=true pnpm vitest run \
  apps/marketing/app/__tests__/phase-7-i18n-lang.red.test.tsx
```

### Red test claims

1. **`lang` matches the UI language:** assert `app/layout.tsx` sets `lang` to a
   value consistent with the rendered UI language. Falsification: at HEAD,
   `lang="th"` but the UI renders English, so a test that asserts the
   `<html lang>` equals the language of a visible UI string fails.
2. **Hardcoded strings externalized:** assert visible UI strings on settings,
   campaigns, and video pages come from a message dictionary, not inline
   string literals. Falsification: at HEAD, strings are inline.
3. **Thai narration contract preserved:** the `scriptSchema` /
   `thaiNarrationScriptSchema` Thai-letter check must remain intact.
   Falsification: if i18n refactoring weakens the Thai narration check, the
   existing `phase-6-script.test.ts` must fail.

### Green gate

- An i18n layer (message dictionary + accessor) exists and is consumed by the
  settings, campaigns, and video pages.
- `lang` is corrected to match the UI language (English UI -> `lang="en"`, or
  the UI is localized to Thai with `lang="th"`). The choice is a UX decision;
  the strategy requires consistency, not a specific language.
- `phase-6-script.test.ts` and `workflow-correctness.test.ts` still pass.

### Closeout gate

```bash
CI=true pnpm vitest run apps/marketing/app/__tests__/phase-6-script.test.ts \
  apps/marketing/app/__tests__/workflow-correctness.test.ts
CI=true pnpm turbo run check-types --filter=marketing
```

### Anti-pattern coverage (7.4)

- **A5 (false-claim text vs test reality):** the plan must not say "i18n
  complete" unless every visible string is externalized and the test passes.
- **A6 (registry-note overstatement):** do not claim "Thai localization
  complete" if only `lang` was corrected.

---

## Sub-Phase 7.5 - Marketing Targeted Tests and Build (Closeout)

**Risk classification:** low
(verification only; no new production code.)

### Targeted Red command (closeout verification)

```bash
CI=true pnpm turbo run test --filter=marketing
CI=true pnpm turbo run check-types --filter=marketing
CI=true pnpm turbo run lint --filter=marketing
CI=true pnpm turbo run build --filter=marketing
```

### Green gate

- All Phase 7 targeted tests pass.
- `check-types`, `lint`, and `build` exit 0 for `marketing`.
- The `vinext` build (`vinext build && node scripts/verify-vinext-runtime.mjs`)
  remains green. The strategy must not change `vinext` versioning or the
  build script.

### Intentionally-Red Aggregate-Suite Handling

- The marketing app has no `.red.test.ts` files today. The aggregate
  `pnpm turbo run test --filter=marketing` may carry pre-existing reds from
  other lanes or flaky jsdom behavior.
- Phase 7's Green gate is the **targeted** filter (file-name scoped), not the
  aggregate. The aggregate is intentionally-red-allowed for pre-existing and
  non-Phase-7 failures.
- The closeout (7.5) is the only sub-phase that runs the aggregate. If the
  aggregate is red from a pre-existing failure, the closeout records the
  failure as owner-labeled and does not block Phase 7 acceptance, provided
  every Phase 7 targeted test is green.
- This prevents A4 (vacuous-pass) and the false-green aggregate trap: a green
  aggregate must not be claimed unless every targeted Phase 7 file is also
  green.

---

## Architecture Guardrails

1. **Backend-as-code:** business logic stays in backend modules. Phase 7 adds
   schema columns and client UI; it must not push logic into Route Handlers or
   React components.
2. **Provider neutrality:** AI calls must continue through `ai.generateText()`.
   Phase 7 must not reintroduce per-request `createAIClient`.
3. **Zod at boundaries:** every external input stays Zod-validated. The new
   `APPS` tuple must feed the Zod `app` enum, not a separate hardcoded list.
4. **Tenant classification:** marketing tables are EXEMPT/REFERENTIAL. New
   columns must not add `schoolId`. `tenant-coverage.test.ts` must stay green.
5. **Vinext runtime:** the `vinext` pin (`0.2.0`) and the build script must not
   change. No root lock changes.
6. **Wave 3 security floor:** auth guards, settings masking, and the no-
   plaintext-secret return must remain intact. Phase 7 tests must include
   refutation assertions that these still hold.

## Changed-Contract Risks (summary)

| Change | Risk | Mitigation |
|--------|------|------------|
| `videoProjects`/`videoAssets` gain `updatedAt`/`createdBy` | Row shape changes; client `VideoProject` interface and db schema tests assert exact columns | Update interface and schema tests; do not delete assertions |
| Shared `APPS` tuple | `appEnum`, `appColors`, `appNames` all derive from one source | One tuple, three consumers; test that all three agree |
| i18n layer | String externalization may break snapshot/string assertions in existing tests | Re-run `phase-6-script` and `workflow-correctness` |
| `lang` correction | SEO/accessibility tools may index differently | Acceptable; the current `lang="th"` + English UI is the defect |

## Applicability Matrix

| Review type | Applicable? | Scope |
|-------------|-------------|-------|
| **Security review** | yes | Encryption invariant (7.2); Wave 3 auth/masking refutation (all sub-phases); `createdBy`/`updatedBy` do not leak PII |
| **UX / API review** | yes | `res.ok` and inline error states (7.3); API row-shape change for new columns (7.2); i18n `lang` consistency (7.4) |
| **Adversarial testing** | yes | UNIQUE duplicate rejection (7.1); invalid-script-shape rejection (7.1); no-`alert`/no-substring refutation (7.3); no-plaintext-secret refutation (7.2) |
| **Browser review** | deferred | Phase 7 is unit/jsdom. Live browser verification of i18n `lang` and error-state rendering is owner follow-up, not a Phase 7 gate. The `vinext` build is the closest gate. |

## Artifact vs Live-Behavior Test Notes

- **Artifact/documentation tests** (static source, no runtime): `APPS` tuple
  agreement; no-`alert` guard; no-substring-styling guard; `lang` attribute
  source read; migration SQL content read; encryption invariant documentation.
- **Live-behavior tests** (real DB or jsdom): UNIQUE rejection via pglite;
  `updatedAt`/`createdBy` auto-population via real DB insert; script-shape
  rejection via route-handler call; `res.ok` inline-error rendering via jsdom;
  encryption ciphertext property via real DB read.
- A claim that is only an artifact test must not be labeled as a live-behavior
  proof. This prevents A5 (false-claim text vs test reality).

## phase_base_sha Capture Point

The orchestrator must capture the immutable `phase_base_sha` immediately after
the strategy commit lands on `master`. The exact point is:

1. The measure-strategy subagent commits `test-strategy.md` and the Phase 7
   `plan.md` marker changes (this commit).
2. Immediately after that commit, the orchestrator runs:
   ```bash
   git rev-parse HEAD
   ```
   on the shared master worktree.
3. That SHA is the `phase_base_sha` for Phase 7. It must not be a SHA from
   before the strategy commit. It must not be `aa9d4d651` (role_base) and must
   not be `792c900ad` (track creation).

The strategy file itself does not embed the `phase_base_sha`, because the SHA
does not exist until the strategy is committed. Embedding a pre-commit SHA
would violate the "do not embed a SHA that predates the committed strategy"
rule.

## Falsifiability Summary

Every test in this strategy has a falsification condition:

- UNIQUE: a duplicate insert that is accepted falsifies the invariant.
- Typed script: an invalid shape that is accepted falsifies the invariant.
- `updatedAt`/`createdBy`: a missing column or a null-on-insert falsifies the
  invariant.
- `APPS` tuple: a map that does not reflect a tuple change falsifies the
  single-source claim.
- Encryption: a plaintext value in the DB or in a GET response falsifies the
  invariant.
- No `alert`/no substring: a matching line in app source falsifies the guard.
- i18n `lang`: a `lang` value that disagrees with the rendered UI language
  falsifies the consistency claim.

A test without a falsification condition is forbidden (A4).
