# Sales Advantage — Proposed Remediation / Migration Tracks

> Track: `sales_advantage_review_20260626`
> Synthesized from batches B00–B05. No source code edited. **No remediation has been performed.**
> These are *proposed* follow-up tracks for triage. Sequencing/sizing are reviewer suggestions only; nothing here is committed, accepted, or closed.

Each proposed track lists the source batch findings it would resolve. IDs are the
canonical batch finding IDs; see `findings.md` for full detail.

---

## T1 — Sales authorization & tenant isolation (HIGHEST PRIORITY)

**Why:** authorization is uneven across the sales surface and one path is an IDOR; admin reporting crosses tenant boundaries.

- `F-SALES-B05-001` — IDOR: `saveAttemptEvaluation` updates by id without ownership/tenant predicate.
- `F-SALES-B05-002` — `getCohortOverview` unscoped across schools.
- `F-SALES-B00-027` — `/api/roleplay-attempts` no role gate.
- `F-SALES-B00-023` — `/api/lesson-complete` no role gate.
- `F-SALES-B00-030` (+`-029`) — tRPC `roleSchema` enum missing `SALES_REP`/`SALES_ADMIN` (confirm `context.ts`).
- `F-SALES-B02-009` — record explicit single-tenant decision (or implement owner-FK scoping).

**Note:** if `F-SALES-B00-030` is confirmed live, this becomes a release blocker (sales tRPC unauthenticated). Verify before scoping.

## T2 — Audio input hardening & recorder robustness

- `F-SALES-B00-028`, `F-SALES-B01-015`, `F-SALES-B04-007` — size/MIME/duration validation (route + adapter `MediaInput`).
- `F-SALES-B01-014` — codec negotiation (`isTypeSupported`, Safari/iOS fallback).
- `F-SALES-B01-016` — revoke object URLs.
- `F-SALES-B01-017`/`-019` — Zod-validate the evaluation payload client-side.

## T3 — AI/audio privacy & retention

- `F-SALES-B01-018` — in-UI consent/notice before audio upload + AI processing.
- `F-SALES-B03-014`, `F-SALES-B04-003` — redaction / retention annotation / provider zero-retention routing at the adapter.
- `F-SALES-B04-006` — transcript redaction + storage `max` on `transcriptExcerpt`.
- Honors spec non-goal (no real recordings to providers during review).

## T4 — AI adapter boundary integrity

- `F-SALES-B03-010` — stop the barrel re-exporting raw SDK (or isolate to a named escape hatch) + tighten arch-guard to catch raw-SDK named imports through the barrel.
- `F-SALES-B03-005`/`-001` — adversarial tests entrench/lock the bypass; revise alongside the guard.
- `F-SALES-B02-001` — remove direct `@ai-sdk/*` app dependencies if unused.
- **Cross-track:** likely coordinates with `ai_adapter_package_20260603` / `ai_sdk_major_migration`.

## T5 — Curriculum integrity & progression gating

- `F-SALES-B00-011` — sanitize lesson markdown (DOMPurify + real markdown lib).
- `F-SALES-B00-014`/`-015` — enforce sequential progression server-side, not CSS.
- `F-SALES-B05-003`/`-009`/`-010` — filter draft lessons; gate quiz on approval; fix module docstring.
- `F-SALES-B01-011` — strip `correctAnswer` from client lesson payload; `F-SALES-B02-018` index-based answer ref.

## T6 — Seed safety & content governance

- `F-SALES-B02-002` — fix `"fallback-id"` orphan inserts.
- `F-SALES-B02-003` — env-guard destructive `--force`.
- `F-SALES-B02-004` — static seed should land `draft` (or guarded).
- `F-SALES-B02-005` — wrap seeds in transactions.
- `F-SALES-B02-006` — env var for enablement docs + clear fallback logging.

## T7 — Schema/contract consistency

- `F-SALES-B04-001` — confirm `0023` always applied; full-column+nullability parity test.
- `F-SALES-B05-006` — make `audioStorageKey` output schema nullable.
- `F-SALES-B04-009` — enum/check constraint on `salesChatMessages.role`.
- `F-SALES-B05-005` — enforce Zod parse at domain boundaries.
- `F-SALES-B05-008` — persist `rubricId`/version on attempts for audit.

## T8 — Reliability, transactions & rate limiting

- `F-SALES-B05-007` — transactional `submitRoleplayAttempt`; validate rubric before insert.
- `F-SALES-B05-013` — unique constraint / sequence for `attemptNumber`.
- `F-SALES-B01-025`/`-026` — migrate to durable (Postgres-backed) rate limiter before multi-instance; consolidate helpers.
- `F-SALES-B04-008`/`-011` — model-durability strategy (avoid `:free`/preview defaults for scoring).
- `F-SALES-B04-005` — `instanceof` error mapping in router.

## T9 — Observability & audit

- `F-SALES-B05-011` — structured logger in evaluator fallback.
- `F-SALES-B04-015` — audit + rate-limit on `admin.createRep`/`approveContent`.
- `F-SALES-B00-016`/`-017` — login/session logging & fail-open distinction.
- `F-SALES-B05-014` — sanitize plaintext password from domain return value.

## T10 — Test coverage & test-quality cleanup

- `F-SALES-B05-017`, `F-SALES-B04-002`, `F-SALES-B04-004`, `F-SALES-B01-022`, `F-SALES-B00-018`/`-025` — add missing mutation/route/parity/browser-API tests.
- `F-SALES-B03-003`/`-001`/`-004`, `F-SALES-B02-010`/`-011`/`-007`/`-014`, `F-SALES-B04-014` — relocate process/env smoke tests; fix inert/brittle/unhandled-rejection tests.
- `F-SALES-B03-012`/`-015` — parity tests for hand-copied fixture schemas.

## T11 — UX / i18n / a11y / type-safety polish

- `F-SALES-B01-004`/`-027`/`-028` — i18n: localize hardcoded copy; remove dead `systemPrompt` keys / consolidate prompt ownership.
- `F-SALES-B01-006`/`-007` — a11y labels on logout & language switcher.
- `F-SALES-B00-008`/`-009`/`-013`, `F-SALES-B01-012`, `F-SALES-B05-012` — remove `as unknown as` casts; flow tRPC/Zod types.
- `F-SALES-B01-010` — Zod-validated `NEXT_PUBLIC_APP_URL` instead of localhost fallback.
- `F-SALES-B00-003`/`-007` — dedicated rep-detail query; resolve N+1.

---

> All tracks above are **proposals for triage only**. None has been created,
> started, accepted, or closed. Priority ordering is a reviewer recommendation,
> not a Measure decision.
