# Test Strategy: Marketing Video Production Pipeline

> **Track ID:** `video_pipeline_20260613`  
> **App:** `apps/marketing`  
> **Updated:** 2026-06-29  
> **Scope:** Retroactive completion strategy for the Measure Orchestrator. Tests must distinguish artifact/documentation contracts from live behavior and avoid claiming aggregate green while unrelated marketing gates remain red.

## Current Evidence Snapshot

- Graph-aware probe: `graph.db` exists; `build-graph stats` sees 39 marketing files. `build-graph files ./graph.db apps/marketing/app/api/video` lists all four video route files. `deduplicateTopics`, `scriptSchema`, and `reorderScenes` are indexed.
- Targeted video slice passed on 2026-06-29:
  - `CI=true pnpm --filter marketing test phase-5-topics` → 18/18 passing.
  - `CI=true pnpm --filter marketing test phase-6-script` → 24/24 passing.
  - `CI=true pnpm --filter marketing test phase-4-campaigns phase-5-topics phase-6-script` → 69/69 passing.
  - `CI=true pnpm --filter marketing check-types` → passing.
  - `CI=true pnpm --filter marketing lint` → exit 0 with warnings.
- Aggregate gates are intentionally red today:
  - `CI=true pnpm --filter marketing test` fails in phase-1 boot and phase-3 settings tests.
  - `CI=true pnpm --filter marketing build` fails in `vinext build` because `vite` does not export `parseSync`.
- DB artifact contract is stale/red:
  - `CI=true pnpm --filter @reading-advantage/db test phase-2-marketing-schema` fails because tests expect `packages/db/drizzle/0021_marketing_tables.sql`, while the repo currently has marketing tables in `0021_sales_advantage.sql`.

## Fixtures, Mocks, and Live-Behavior Proof

- **Mocked LLM:** use the existing `vi.mock("@reading-advantage/ai")` fake client in `phase-5-topics.test.ts` and `phase-6-script.test.ts`; no real API key in automated Red/Green.
- **Mocked DB:** route unit tests may mock `@reading-advantage/db` for deterministic route behavior, but cannot be used as proof of migration/table existence or FK/JSONB runtime behavior.
- **Live DB proof:** schema/migration closeout needs either a live Postgres round-trip for `campaigns → video_projects → video_assets` cascade and JSONB script persistence, or an explicitly documented human-accepted deferral. Do not mark it `[x]` based only on source-text checks.
- **Manual/live QA:** final closeout must record a non-production workflow: research topics, select/approve a topic, generate a 5–7 scene Thai script with mocked/non-production LLM credentials, reorder/add/remove scenes, and save a project.

## Artifact vs Live Behavior

- Artifact tests: migration SQL/snapshot/schema-source parity, route export shape, and source-level page wiring checks. They can prove contracts exist but not runtime behavior.
- Live behavior tests: route handler execution with mocked dependencies, live DB insert/list round trips, manual UI flow, and build output. These must be used for completion claims.
- Falsification rule: every `[x]` in `plan.md` needs either a passing command, source evidence with exact file path, or a recorded manual proof. Otherwise leave `[~]`.

## Phase Strategy

### Phase 1 — Marketing Schema Reconciliation

- **Targeted Red command:** `CI=true pnpm --filter @reading-advantage/db test phase-2-marketing-schema`
- **Expected Red today:** fails with `ENOENT ... packages/db/drizzle/0021_marketing_tables.sql`.
- **Green gate:** the command exits 0 after reconciling the canonical migration filename/tag expectations with current repo history; then run `CI=true pnpm --filter @reading-advantage/db check-types`.
- **Closeout gate:** schema tests must state whether they are artifact-only or live-DB; if live-DB proof is absent, Phase 1 cannot claim runtime migration behavior.
- **Guardrails / contract risks:** do not silently rename migrations or snapshots in a way that breaks later 0022–0024 migrations; do not overwrite unrelated dirty migration work; keep `@reading-advantage/db/schema` exports stable for marketing routes.
- **Anti-pattern coverage:**
  - A1/A8: plan markers must use `[x]` or `[~]`, never free-text `deferred` or legacy `[ ]`.
  - A3: migration-count assertions must parse labeled counts/tags, not any digit.
  - A4/A5: a schema phase with failing ENOENT remains `[~]`; no "all checks pass" prose until the command is green.
  - A7: filters must exclude explicit paths only, not broad words like `never` or `do not`.
  - A9: tests must not hard-code archived track paths.
  - A10: if schema exports/imports change structurally, update or explicitly audit graph/generated facts.

### Phase 2 — Topic Research & Deduplication

- **Targeted Red command:** `CI=true pnpm --filter marketing test phase-5-topics`
- **Green gate:** 18/18 pass plus `CI=true pnpm --filter marketing check-types`.
- **Closeout gate:** route tests prove `research-topics` and `save-topics` POST behavior with mocked LLM/DB; plan may mark dedup unit/route coverage `[x]` only while this command remains green.
- **Fixtures/mocks:** fake `generateText` returns fixed arrays with duplicates; mocked `pastTopics` rows cover same-app duplicates.
- **Guardrails / contract risks:** preserve Thai NFC normalization and Latin lowercase/space normalization; no real LLM calls in CI; no API key exposure.
- **Anti-pattern coverage:**
  - A3: assert exact topic counts (`toHaveLength(5)`), not loose digit matching.
  - A4/A5: if any tier fails, do not describe the phase as fully green.
  - A7: duplicate filtering must compare normalized topics, not discard lines with broad English exclusion words.
  - A10: changing exported helper names requires graph/update awareness and route import checks.

### Phase 3 — Script Generation Prompt & Schema

- **Targeted Red command:** `CI=true pnpm --filter marketing test phase-6-script`
- **Green gate:** 24/24 pass plus `CI=true pnpm --filter marketing check-types`.
- **Closeout gate:** current prompt/route behavior may be marked `[x]`; the Zod replacement remains `[~]` until `scriptSchema` is actually Zod-backed or the plan/spec is formally revised.
- **Fixtures/mocks:** use a 5–7 scene `scriptFixture`; invalid fixture must omit at least one required field.
- **Guardrails / contract risks:** maintain Thai narration, English `imagePrompt`, `motionDirection`, and 5–7 scene bounds; settings-driven provider/model/API key must return 400 when missing key.
- **Anti-pattern coverage:**
  - A3: scene-count tests must assert `5 <= len <= 7`, not any digit in output.
  - A4/A5: custom `safeParse` green does not satisfy the Zod-specific task; keep that task `[~]` or revise it explicitly.
  - A6: tracks registry must not claim "fully solved" while Zod task and aggregate gates are open.
  - A10: schema/helper signature changes require route and test import verification.

### Phase 4 — Scene Editor

- **Targeted Red command:** `CI=true pnpm --filter marketing test phase-6-script -- -t "scene editor"`
- **Green gate:** scene-editor subset passes, then full `CI=true pnpm --filter marketing test phase-6-script` passes.
- **Closeout gate:** tests prove immutable reorder/add/remove behavior and bounds handling.
- **Fixtures/mocks:** static `scriptFixture` scenes; no DB/LLM.
- **Guardrails / contract risks:** helpers must return copies and not mutate inputs; invalid indices return a copied original array.
- **Anti-pattern coverage:**
  - A4: no vacuous pass; at least one positive reorder/add/remove assertion must execute.
  - A5: do not claim UI drag behavior solely from pure-function tests; UI behavior needs Phase 5/manual proof.
  - A10: exported helper renames require consumer page import checks.

### Phase 5 — API Routes & Campaign Video Page

- **Targeted Red command:** `CI=true pnpm --filter marketing test phase-4-campaigns phase-5-topics phase-6-script`
- **Green gate:** targeted route/page/source wiring slice passes and `CI=true pnpm --filter marketing lint` exits 0.
- **Closeout gate:** source-level page assertions are not enough for "component-level tests"; keep that task `[~]` until a render/interactions test exists or a human accepts deferral.
- **Fixtures/mocks:** route tests mock DB/LLM; component tests should mock `fetch`, `useParams`, and drag/drop or button reorder behavior.
- **Guardrails / contract risks:** do not turn source regex checks into live UI claims; avoid adding broad component tests that require real DB/LLM.
- **Anti-pattern coverage:**
  - A4/A5: source-level tests can mark wiring only, not live UI completion.
  - A7: source assertions should search exact labels/handlers, not broad English filters.
  - A10: page route or component tree changes should refresh graph/generated route facts if this repo requires them.

### Phase 6 — Project Persistence

- **Targeted Red command:** `CI=true pnpm --filter marketing test phase-6-script -- -t "video/projects"`
- **Green gate:** mocked POST insert and invalid-script rejection pass; add a GET/list test before marking list/create complete.
- **Closeout gate:** live behavior proof requires project create/list round trip against test DB or documented manual DB proof; POST-only mocked tests cannot close CRUD.
- **Fixtures/mocks:** `scriptFixture`, `mockProject`, mocked `db.insert().values().returning()`; live test should seed a campaign row and assert JSONB script persisted.
- **Guardrails / contract risks:** current route exports POST only; do not claim list endpoint exists until GET is implemented/tested. Preserve campaign FK semantics.
- **Anti-pattern coverage:**
  - A3: JSONB round-trip assertions must inspect labeled fields (`script[0].narration`) and row counts, not arbitrary digits.
  - A4/A5: mocked POST green is not CRUD green; keep list/live CRUD `[~]`.
  - A10: table/column signature changes require route import/typecheck and graph awareness.

### Phase 7 — QA, Build, and Closeout

- **Targeted Red command:** `CI=true pnpm --filter marketing test && CI=true pnpm --filter marketing build`
- **Expected Red today:** full tests fail in non-video phase-1/phase-3 tests; build fails with `vinext build` / `vite` `parseSync` export error.
- **Green gate:** full marketing test and build commands exit 0, or the orchestrator records a narrowly scoped, human-accepted aggregate-suite exception that does not call the suite green.
- **Closeout gate:** targeted video slice, typecheck, lint, aggregate disposition, manual/live QA evidence, and plan/tracks registry truthfulness all reconciled before archive.
- **Intentionally-red aggregate handling:** keep the aggregate-suite tasks `[~]` while red. If completion is accepted despite unrelated failures, record exact failing tests/build error and label it as an exception, not a pass.
- **Anti-pattern coverage:**
  - A1/A8: no `[ ]` markers; no free-text blocked/deferred bypass.
  - A4/A5: red aggregate gates cannot be described as "all marketing tests green".
  - A6: `measure/tracks.md` must remain `[~]` until closeout is true or explicitly exceptioned.
  - A9: archive movement must not leave tests pointing only at `measure/tracks/<id>`.
  - A10: if structural changes occur during closeout, update/audit graph/generated facts.

## Next Implementable Phase

**Recommended next phase:** Phase 1 — Marketing Schema Reconciliation. It is the earliest incomplete phase and has a crisp falsifiable Red command.

- `RED_TEST_COMMAND=CI=true pnpm --filter @reading-advantage/db test phase-2-marketing-schema`
- `GREEN_TEST_COMMAND=CI=true pnpm --filter @reading-advantage/db test phase-2-marketing-schema && CI=true pnpm --filter @reading-advantage/db check-types`

After Phase 1 is reconciled, proceed to the Zod-specific Phase 3 task or the Phase 6 GET/live-CRUD task; do not jump to Phase 7 closeout while aggregate tests/build are red.
