# Sales Advantage — Line Review Synthesis

> Track: `sales_advantage_review_20260626`
> Parent: `monorepo_feature_review_masterplan_20260626`
> Baseline SHA: `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
> Date: 2026-06-27
> **Line-review synthesis only. NO acceptance or closeout determination is made by this document. NO remediation was performed.**

This document synthesizes the completed line-by-line review of
`apps/sales-advantage` and its shared backing packages into the consolidated
artifact set required by the track spec. It is built **exclusively** from the
six per-batch reports and the coverage manifest; no source code was read or
edited to produce it.

## Inputs

- `line-review-coverage.md` (manifest: 110 files, 6 batches)
- `line-review/sales-batch-00.md` … `line-review/sales-batch-05.md`

## Coverage metrics

| Metric | Value |
|--------|-------|
| In-scope tracked files reviewed | **110** |
| Batches | **6** |
| Batch reports | **6** |
| Total batch-report lines | **1,675** |
| Per-batch report lines | B00=384, B01=228, B02=214, B03=272, B04=409, B05=168 |
| Distinct finding IDs | 138 (`F-SALES-B00-001`…`F-SALES-B05-022`) |
| Source code edited | none |
| Code executed | only batch-05's 2 domain test files (10 passed, mock-DB) |

## Batch → scope map

| Batch | Files | Primary scope |
|-------|-------|---------------|
| B00 | 20 | App pages, layouts, auth/chat/roleplay/lesson/trpc route handlers |
| B01 | 20 | Components (incl. recorder, chat-tutor, quiz), i18n, lib, messages |
| B02 | 20 | App config, seeds, `packages/ai` docs/config + closeout/version tests |
| B03 | 20 | `packages/ai` adapter source (`client`/`index`/`errors`) + test suite |
| B04 | 20 | AI providers, AI types, sales router + test, sales schema/migration/parity |
| B05 | 10 | `packages/domain/src/sales` source + tests (final batch) |

## Synthesis artifacts (this set)

| Artifact | Purpose |
|----------|---------|
| `00-inventory.md` | File classification, domain fns, schema tables, coverage metrics |
| `workflow-map.md` | 7 principal workflows annotated with source finding IDs |
| `ai-audio-boundary-map.md` | Browser audio → storage → AI eval/fallback/privacy boundary |
| `findings.md` | Deduplicated catalogue, split Section A (runtime) / Section B (content/docs/tests) |
| `checklist.md` | Spec-acceptance & focus-area coverage matrix; phase status PENDING |
| `test-gaps.md` | Consolidated test coverage/quality gaps |
| `migration-tracks.md` | Proposed remediation tracks (triage only) |
| `executive-summary.md` | Risk-ranked summary |

## Method & guarantees

- **Deduplication:** recurring issues are collapsed into clusters C1–C13 in
  `findings.md`; each cluster lists its member batch IDs.
- **Runtime vs content/docs/test separation:** `findings.md` Section A holds
  live runtime/production-code findings; Section B holds curriculum/seed content,
  documentation drift, test-fixture, and test-quality findings.
- **Audio boundary mapping:** `ai-audio-boundary-map.md` traces browser recording
  through the storage adapter and the AI evaluation/fallback/privacy boundary.
- **Domain contracts + app usage together:** `findings.md` and `workflow-map.md`
  cross-reference batch-04/05 contracts/schema/router against batch-00/01 app
  usage (e.g. `audioStorageKey` nullability across migration→schema→domain→client;
  draft gating across query→page; role enum across context→tRPC→app).
- **Traceability:** every finding in every artifact cites a canonical
  `F-SALES-Bxx-###` source batch ID.

## Highest-priority themes (see `executive-summary.md` and `findings.md`)

1. Authorization & tenant isolation — C1/C2/C3 (incl. IDOR `F-SALES-B05-001`, cross-tenant `F-SALES-B05-002`, tRPC enum `F-SALES-B00-030`).
2. Audio/AI privacy — C5.
3. Audio input hardening — C4.
4. AI adapter boundary leak — C6.
5. Curriculum integrity (XSS, cosmetic gating, draft leak) — C7/C8 + `F-SALES-B00-011`.
6. Schema/contract drift — C13.
7. Test coverage of the audio path & mutation layer.

## Status — PENDING

Phase 0–3 acceptance, Phase 3 verification gates (lint/type/test/build — **not
run here**), and track closeout are all **PENDING** and remain the
responsibility of the Measure acceptance/closeout phases. This synthesis records
findings only.
