# Sales Advantage — Test Gaps

> Track: `sales_advantage_review_20260626`
> Synthesized from batches B00–B05. No source code edited. No acceptance/closeout claim.
> Gaps are observations from static reading (and the two batch-05 domain tests that were executed). They identify **missing or weak** coverage; they do not assert defects beyond what `findings.md` records.

## High-impact coverage gaps

| Gap | Affected surface | Source |
|-----|------------------|--------|
| **No mutation unit tests** | `createRoleplayAttempt`, `saveAttemptEvaluation`, `submitRoleplayAttempt`, `submitQuiz`, `saveChatMessage`, `approveCurriculumContent`, `createRepAccount` — so the IDOR (`B05-001`), draft-leak (`B05-003`), and quiz-threshold logic are entirely unverified | `F-SALES-B05-017` |
| **Audio/roleplay path has no tRPC contract test** | Router test mocks 6 roleplay/audio fns the router never wires; the differentiating audio feature is the least-tested transport path | `F-SALES-B04-002` |
| **Schema parity test can't detect drift** | `arrayContaining` checks subset only; missed `audio_storage_key` nullability drift; claimed FK assertions don't exist | `F-SALES-B04-004` (relates to `B04-001`) |
| **No browser-API test harness** | `getUserMedia`/`MediaRecorder`/`createObjectURL`/streaming `fetch` unmocked in shared setup; recorder & chat-tutor components effectively untestable as-is | `F-SALES-B01-022` |

## Route-handler test gaps

- Chat route: no test for 429 rate-limit, 500 catch, or `SALES_ADMIN` role — `F-SALES-B00-018`.
- Roleplay route: no test for 401 / 403 (forbidden role) / 400 (missing fields) / 429; audio size/type limits not asserted — `F-SALES-B00-025`.
- `lesson-complete` route: no test covering it at all (and it has no role gate) — `F-SALES-B00-023`.

## Domain / evaluator coverage gaps

- Evaluator: only the double-failure path tested; primary-success and fallback-success (incl. `transcriptExcerpt` back-fill) untested — `F-SALES-B05-018`.
- `submitRoleplayAttempt` FR-4 excerpt path not covered by the excerpt-derivation regression guard — `F-SALES-B05-004`.
- `saveChatMessage` test bypasses tenant-scoped DB contract (hand-rolled `db.insert`) → false confidence — `F-SALES-B04-010`.

## Test-quality issues that weaken the suite as a regression net

| Issue | Source |
|-------|--------|
| Inert anti-fabrication gate-result test (artifact absent → silently green) | `F-SALES-B03-003` |
| Adversarial arch-guard codifies dynamic-import bypass as intended | `F-SALES-B03-001` |
| `streamText` adversarial test → unhandled promise rejections | `F-SALES-B03-004` |
| Brittle source-text/regex assertions (semantic-neutral refactors fail them) | `F-SALES-B03-002`/`-009`/`-011`/`-018` |
| Hand-copied fixture schema, no parity test (drift) | `F-SALES-B03-012`, `F-SALES-B03-015` |
| `phase-0-setup` runs real `tsc` / probes `node_modules` as a unit test | `F-SALES-B02-010` |
| Closeout/version tests assert Measure docs, lockfile text, commit SHAs (cross-track, rot-prone) | `F-SALES-B02-011` |
| Seed scripts excluded from test runner | `F-SALES-B02-007` |
| `tsconfig` excludes `__tests__` → test type errors not caught by `check-types` | `F-SALES-B02-014` |
| Package-wide 120s timeout masks hung unit tests | `F-SALES-B04-014` |
| Snapshot tests partly redundant; silent `-u` risk | `F-SALES-B03-006` |
| Mixed `process.env` save/restore vs `withEnv`/`vi.stubEnv` | `F-SALES-B03-008`/`-021` |

## Suggested coverage additions (from batch recommendations — not yet implemented)

- Mock-DB unit tests for all mutations: ownership scoping, 70% pass threshold, draft gating, null-`audioStorageKey` path (`B05-017`).
- tRPC contract test(s) for the roleplay/audio path or removal of dead router mocks (`B04-002`).
- Full-column + nullability parity test diffing Drizzle snapshot vs migration (`B04-004`/`B04-001`).
- Banned-phrase regression test asserting no banned phrase in `approved` lessons (`B02-016`).
- Browser-API mocks in shared setup so recorder/chat tests can exist (`B01-022`).

> Gates note: targeted `lint` / `check-types` / `test` / `build` for the sales
> app, domain, and API packages were **not executed** in this synthesis. Running
> them is part of Phase 3 and remains **PENDING**.
