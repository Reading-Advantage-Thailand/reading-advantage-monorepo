# CodeCamp Advantage — Proposed Migration / Remediation Tracks

- Track: `codecamp_advantage_review_20260626`
- These are **proposals** for follow-up work derived from the line review. **No remediation has been performed or is claimed.** Acceptance/closeout **PENDING**.
- Each proposed track lists the findings it would close (source batch IDs) and a suggested track id of the form `<name>_<YYYYMMDD>` for use when actually opened.
- Tracks are ordered by priority. Curriculum and test/process tracks are separated from live-runtime tracks.

---

## P0 — Blockers (must resolve before any acceptance)

### MT-1 — `codecamp_tenantdb_unscoped_<YYYYMMDD>`
- **Closes:** CR-1 (`F-CC-B10-001`, `F-CC-B09-001/003/006/013/020/025`, `F-CC-B08-001/003`).
- **Scope:** Audit every codecamp domain function; route REFERENTIAL-table access through `tenantDb.unscoped("codecamp tables have no schoolId")` (the pattern already used in `review-exercise.ts`, `chat.ts`, `progress.ts:updateUserProgress`, `modules.ts:checkModulePrerequisite`). Decide and document whether intern/account FLAT inserts are intentionally global.
- **Pre-req verification:** confirm against the **deployed artifact** that the throw reproduces live (line review confirmed against compiled `dist/` + unit suite only).
- **Gate:** new integration test (see MT-2) must fail before, pass after.

### MT-2 — `codecamp_tenant_scope_tests_<YYYYMMDD>`
- **Closes:** CR-2 (`F-CC-B08-002/033`, `F-CC-B09-002`, `F-CC-B10-015/018/023`).
- **Scope:** Add tests that run with the **real** `tenant-registry` (un-mocked) asserting codecamp tables classify `REFERENTIAL` and that a TenantDB select throws; add at least one webhook test exercising real domain functions against a mock DB. Root-cause the Vitest-vs-dist classification divergence.

### MT-3 — `codecamp_webhook_async_idempotent_<YYYYMMDD>`
- **Closes:** H-2 (`F-CC-B10-002`, `F-CC-B04-006`), H-6 (`F-CC-B07-039`), H-3 (`F-CC-B10-007`, `F-CC-B09-058`).
- **Scope:** ACK the webhook immediately and move `runReview` to a worker/queue (AGENTS "Jobs and Workers"); add `UNIQUE(delivery_id) WHERE delivery_id IS NOT NULL` + `ON CONFLICT DO NOTHING`; make `fetchPrDiff` fail closed (skip review / mark error) when no token, behind an explicit dev flag.

### MT-4 — `codecamp_webhook_auth_completion_<YYYYMMDD>`
- **Closes:** H-4 (`F-CC-B09-014`).
- **Scope:** Replace the forged-UserContext progress write with a dedicated privileged path taking `targetUserId` while authorizing the real (admin/system) caller.

---

## P1 — High (resolve before launch)

### MT-5 — `github_client_consolidation_<YYYYMMDD>`
- **Closes:** H-5 (`F-CC-B09-040`), M-15/M-16 (`F-CC-B09-049/041`), `F-CC-B09-032/042/043`, `F-CC-B10-009/010`.
- **Scope:** Consolidate webhooks onto `@reading-advantage/integrations-github`; key installation-token cache by `installationId`; fail fast on empty installation ID; standardize on `Bearer`; remove dead `postReviewComment` or wire it in.

### MT-6 — `codecamp_chat_streaming_fix_<YYYYMMDD>`
- **Closes:** H-1 (`F-CC-B00-001`), `F-CC-B04-019/020`, M-2 (`F-CC-B00-003/004`), M-1 (`F-CC-B00-002`, `F-CC-B04-023`).
- **Scope:** Reconcile stream response type with the client hook (`text/event-stream` + `0:` framing or switch both to the adapter's stream); add cross-chunk SSE buffering; move provider/baseURL behind the adapter and lazy-construct the client; move the rate limiter to a shared store.

### MT-7 — `codecamp_migration_integrity_<YYYYMMDD>`
- **Closes:** H-7 (`F-CC-B07-034/038`), M-5 (`F-CC-B07-036`), M-6 (`F-CC-B07-042`).
- **Scope:** Add dedup/cleanup pre-step before unique-index creation; constrain `phase` to a CHECK/enum; document `ALTER TYPE` txn/rollback handling.

### MT-8 — `codecamp_typed_domain_errors_<YYYYMMDD>`
- **Closes:** H-9 (`F-CC-B07-023`, `F-CC-B08-020/049`), M-12 (`F-CC-B07-026`, `F-CC-B09-051`).
- **Scope:** Introduce a structured `CodecampError` with `code`; switch `mapDomainError` to `instanceof`/code; add missing `.output()` schemas.

### MT-9 — `codecamp_pr_review_scoping_<YYYYMMDD>`
- **Closes:** M-3 (`F-CC-B09-015`), M-22 (`F-CC-B08-024`, `F-CC-B09-016/029`).
- **Scope:** Reconcile per-user vs global PR-URL uniqueness; normalize repo/PR URLs on write.

### MT-10 — `codecamp_test_harness_isolation_<YYYYMMDD>`
- **Closes:** C-H-5..C-H-9 (`F-CC-B03-001/002/030/041/053`), `F-CC-B07-002/004/016`.
- **Scope:** Move prod-smoke into an opt-in vitest project (default skip unless `RUN_PROD_SMOKE`); fix phase-4 trpcPost body; fix phase-7 `!notFound.status === 404` precedence; make launch gates assert consistency with `overall`; default playwright baseURL to localhost.

---

## P2 — Medium / cleanup

### MT-11 — `codecamp_progression_policy_<YYYYMMDD>`
- **Closes:** M-8 (`F-CC-B09-019`, `F-CC-B07-031`), M-9 (`F-CC-B09-007`, `F-CC-B04-016`), M-10 (`F-CC-B09-023`), quiz UI (`F-CC-B00-028/029`).
- **Scope:** Define score-preservation policy; enforce module `order` invariant / phase-scoped gating + server-side lock enforcement; document answer-key convention; fix quiz success/retry UI and 70-vs-80 threshold.

### MT-12 — `codecamp_seed_idempotency_<YYYYMMDD>`
- **Closes:** M-17 (`F-CC-B08-013/017`), `F-CC-B08-024/025`.
- **Scope:** Key seed lesson upserts on `(moduleId, order)`/`(moduleId,title)`; gap-free reordering in backfill; normalize repo URLs.

### MT-13 — `codecamp_permissions_least_privilege_<YYYYMMDD>`
- **Closes:** M-11 (`F-CC-B09-010/011/012`).
- **Scope:** Single source of truth for permission map; confirm cross-product grants; codecamp-scoped admin key.

### MT-14 — `codecamp_observability_<YYYYMMDD>`
- **Closes:** `F-CC-B08-026/027`, `F-CC-B01-004`, `F-CC-B09-054`, `F-CC-B07-040`/`B08-005`.
- **Scope:** Distinguish github auth/transport errors from empty results with structured logs; client error forwarding; webhook "processed" outcome; payload retention/PII policy.

---

## Curriculum tracks (teaching-risk, separate from runtime)

### MT-C1 — `codecamp_curriculum_security_patterns_<YYYYMMDD>`
- **Closes:** C-H-1 (`F-CC-B06-001` bcrypt→Argon2id), C-H-3 (`F-CC-B05-002` session-trust), `F-CC-B05-008` (wildcard CORS), `F-CC-B05-009` (innerHTML XSS), `F-CC-B06-004/005/007` (plaintext session, dropped schoolId).

### MT-C2 — `codecamp_curriculum_version_sync_<YYYYMMDD>`
- **Closes:** C-H-2 (`F-CC-B06-002`, `F-CC-B05-003` AI SDK v4→v5), `F-CC-B05-004/010`, `F-CC-B08-009` (single-source version table).

### MT-C3 — `codecamp_curriculum_correctness_<YYYYMMDD>`
- **Closes:** `F-CC-B02-005` (Module 4/5), `F-CC-B05-005/006/007/014/016`, `F-CC-B06-009/010/011` (Thai), `F-CC-B08-045` (Unit 11 fidelity), `F-CC-B05-012` (track-id).

### MT-C4 — `codecamp_docs_reconciliation_<YYYYMMDD>`
- **Closes:** `F-CC-B02-001/002/003/004/009/011`, `F-CC-B05-013` (PR-review loop mechanics/branch protection).

---

## Process / artifact track

### MT-X1 — `codecamp_qa_artifact_consistency_<YYYYMMDD>`
- **Closes:** C-H-7/C-H-11/C-H-12 (`F-CC-B03-030`, `F-CC-B04-001/002/003`), `F-CC-B03-003/004/016/026/031/032/035`, `F-CC-B10-021/024/025/026`.
- **Scope:** Reconcile parity matrix vs `report-summary.json`; remove process/bookkeeping tests from package suites; structural (not regex) seed oracles; fix `Blocker.phaseId`; CWD-stable file reads.

> No track listed here has been created or executed. They are recommendations for the track owner.
