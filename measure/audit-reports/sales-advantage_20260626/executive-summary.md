# Sales Advantage — Executive Summary

> Track: `sales_advantage_review_20260626`
> Parent: `monorepo_feature_review_masterplan_20260626`
> Baseline SHA: `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
> Synthesized from 6 line-review batches. No source code edited.
> **This summary makes NO acceptance or closeout claim and asserts NO remediation was performed.**

## Scope & coverage

A read-only, line-by-line review of `apps/sales-advantage` plus its shared
backing — `packages/domain/src/sales`, the sales schema/migration in
`packages/db`, the `packages/api` sales router, and `packages/ai` multimodal
support.

| Metric | Value |
|--------|-------|
| Files reviewed | 110 |
| Batches | 6 |
| Batch reports | 6 |
| Total report lines | 1,675 |
| Distinct findings catalogued | 138 (`F-SALES-B00-001`…`B05-022`) |
| Source code edited | none |
| Code executed | only the 2 batch-05 domain test files (10 tests passed, mock-DB) |

Artifacts produced by this synthesis: `00-inventory.md`, `workflow-map.md`,
`ai-audio-boundary-map.md`, `checklist.md`, `findings.md`, `migration-tracks.md`,
`test-gaps.md`, `line-review-synthesis.md`, and this summary.

## Top risks (deduplicated; see `findings.md` clusters)

1. **Authorization & tenant isolation (C1/C2/C3).** A genuine IDOR
   (`F-SALES-B05-001`: any rep can write an evaluation onto another rep's
   attempt), cross-tenant admin reporting (`F-SALES-B05-002`), two AI/write
   routes with no role gate (`F-SALES-B00-023`, `-027`), and a tRPC role-enum
   gap that may render the **entire sales tRPC surface unauthenticated at
   runtime** (`F-SALES-B00-030`, pending live `context.ts` confirmation). This is
   the single most important theme.

2. **Audio/AI privacy (C5).** Raw learner/prospect audio plus PII-bearing
   prompts are forwarded to third-party AI providers with no consent UI,
   redaction, or retention controls (`F-SALES-B01-018`, `F-SALES-B03-014`,
   `F-SALES-B04-003`, `F-SALES-B04-006`). Audio storage itself is correctly
   private and no-orphan (`F-SALES-B00-026`, positive).

3. **Audio input hardening (C4).** No size/MIME/duration validation before
   buffering or provider calls (`F-SALES-B00-028`, `F-SALES-B01-015`,
   `F-SALES-B04-007`); recorder hardcodes `audio/webm`, breaking Safari/iOS
   (`F-SALES-B01-014`).

4. **AI adapter boundary leak (C6).** The `@reading-advantage/ai` barrel
   re-exports the raw Vercel AI SDK, and the architecture guard can't see
   consumption through it — an adapter-bypass channel that passes the compliance
   test (`F-SALES-B03-010`, `-005`; `F-SALES-B02-001`).

5. **Curriculum integrity (C7/C8).** Lesson markdown is rendered unsanitized
   (XSS, `F-SALES-B00-011`); progression locking is client-side cosmetic
   (`F-SALES-B00-014/-015`); draft lessons leak into rep views and skew
   completion math (`F-SALES-B05-003/-009`); a seed bug orphans lessons under a
   sentinel FK (`F-SALES-B02-002`).

6. **Schema/contract drift (C13).** `audio_storage_key` nullability disagrees
   between migration `0021`, schema, and the domain output schema
   (`F-SALES-B04-001`, `F-SALES-B05-006`), and the parity test can't catch it
   (`F-SALES-B04-004`).

7. **Test coverage (test-quality theme).** The differentiating audio/roleplay
   path and the entire mutation layer are largely untested
   (`F-SALES-B05-017`, `F-SALES-B04-002`); several guard tests are inert or
   brittle (`F-SALES-B03-003`, `B02-011`). See `test-gaps.md`.

## What is working well (positives)

- Adapter discipline at the chat route, storage (`public:false`, user-keyed),
  and AI providers (no `process.env` reads, constructor-injected keys).
- FR-4 no-orphan storage-key invariant and excerpt forwarding at the route.
- FR-5 fallback ladder and FR-6 single-source permissions are implemented and
  test-pinned (`F-SALES-B05-019/-020/-021/-022`).
- Curriculum encodes honest-claims / banned-phrase governance
  (`F-SALES-B02-016`).

## Live runtime vs content/docs/test split

Per the synthesis requirement, `findings.md` separates **Section A** (live
runtime/production code: routes, components, domain, transport, adapter) from
**Section B** (curriculum/seed content, documentation drift, test fixtures, and
test quality). The highest-severity runtime items (C1–C6, XSS, drift) are in
Section A; seed-content governance, doc drift, and the large test-quality
cluster are in Section B.

## Status — explicitly PENDING

- Phase 0/1/2/3 acceptance: **PENDING**.
- Phase 3 targeted lint/type/test/build gates: **NOT run** in this synthesis — **PENDING**.
- Track closeout: **PENDING**.

Acceptance, verification gating, and closeout are the responsibility of the
designated Measure acceptance/closeout phases and are **not** determined here.
Proposed remediation tracks (`migration-tracks.md`) are triage suggestions only;
none has been created, started, or completed.
