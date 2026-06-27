# Line Review Evidence: marketing-app-001

Reviewer: coder-vocengine-ark-code-latest/marketing-app-001
Files assigned: 5
Lines assigned: 909

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| apps/marketing/.env.example | 1-5 | reviewed | 1 |
| apps/marketing/.gitignore | 1-7 | reviewed | 0 |
| apps/marketing/app/__tests__/phase-1-boot-adversarial.test.ts | 1-209 | reviewed | 1 |
| apps/marketing/app/__tests__/phase-1-boot.test.ts | 1-213 | reviewed | 0 |
| apps/marketing/app/__tests__/phase-3-settings-adversarial.test.ts | 1-475 | reviewed | 2 |

## Findings

### LR-marketing-app-001-001 — Test comment claims an API-key leak that its own assertion forbids (stale/contradictory security documentation)

- Severity: High
- Category: tests-build
- File: `apps/marketing/app/__tests__/phase-3-settings-adversarial.test.ts:308-317`
- Evidence: The test "does NOT echo the apiKey back when the AI client error message contains it" asserts at line 316 `expect(bodyText).not.toContain("sk-leaked-real-key-DEADBEEF")`, but the inline comment at lines 310-314 documents the opposite: "The route currently echoes error.message directly. This test documents that the api key IS leaked in the response body... Until then, this test asserts the leak so the regression is explicit, not silent." The assertion (`not.toContain`) and the comment (key "IS leaked") are mutually exclusive: if the route truly echoes `error.message`, the error string includes `sk-leaked-real-key-DEADBEEF` and the assertion FAILS; if the assertion passes, the route already sanitizes and the comment is stale/false.
- Impact: A reviewer or future maintainer cannot tell from this file whether marketing's `test-connection` route actually leaks provider credentials in its error body. The misleading comment can either mask a real credential-leak regression (if the suite is run in a mode where the assertion is skipped) or perpetuate a false belief that a leak exists. Credential leakage through AI-provider error surfaces is exactly the `ai-boundary` risk the protocol flags (§Architecture guardrails: malformed-output / error-body safety).
- Recommendation: In a remediation track, reconcile the comment with the actual route behavior — confirm `app/api/settings/test-connection/route.ts` sanitizes provider error messages, then correct or delete the contradictory comment so the test documents real, verified behavior.

### LR-marketing-app-001-002 — Tautological assertion accepts both pass/fail outcomes, providing no real regression protection

- Severity: Medium
- Category: tests-build
- File: `apps/marketing/app/__tests__/phase-1-boot-adversarial.test.ts:172-187`
- Evidence: The test is titled "returns 500 when db.execute resolves to null (malformed result)" but asserts `expect([200, 500]).toContain(response.status)` (line 186). 200 and 500 are the only realistic status codes the handler can return, so this assertion can never fail regardless of behavior. The comment at lines 178-185 openly acknowledges this ("Today that's 200... Lock in current behavior"), yet the assertion does not pin a single expected status.
- Impact: The test name advertises a 500-on-null contract that the assertion does not enforce. A future regression that changes the null-handling path (e.g., a crash returning 503, or a contract change to actually require 500) would not be reliably caught — the test gives false confidence of malformed-result coverage.
- Recommendation: Replace the disjunctive assertion with a single expected status that matches the documented current behavior (e.g., `expect(response.status).toBe(200)`), or implement the intended 500 contract and assert it exactly.

### LR-marketing-app-001-003 — Test title disagrees with its assertion threshold (88 vs 122 hex chars)

- Severity: Low
- Category: tests-build
- File: `apps/marketing/app/__tests__/phase-3-settings-adversarial.test.ts:366-371`
- Evidence: The `it(...)` title states "ciphertext for a 32-byte plaintext is at least 88 hex chars (iv+tag+ct)" but the assertion is `expect(ciphertext.length).toBeGreaterThanOrEqual(122)` (line 371), with a comment computing "≥ 122". The advertised lower bound (88) and the enforced lower bound (122) differ.
- Impact: Minor, but a maintainer reading the test name may reason about the wrong invariant. If the encryption output format ever shrinks to between 88 and 121 chars, the test name implies it should still pass while the assertion would fail, causing confusion during triage.
- Recommendation: Update the test title to match the enforced threshold (122) or vice versa so the documented and enforced bounds agree.

### LR-marketing-app-001-004 — `.env.example` claims to list "required environment variables" but documents only one

- Severity: Low
- Category: tests-build
- File: `apps/marketing/.env.example:1-5`
- Evidence: The header at line 1 reads "Marketing Production Platform — required environment variables" and the file declares only `ENCRYPTION_KEY` (line 5). The app depends on `@reading-advantage/db`, `@reading-advantage/ai`, and `@reading-advantage/storage` (per package.json and `app/lib/db.ts` / `ai.ts` / `storage.ts` re-exports), which conventionally require connection/credential env vars (e.g., a database URL, AI provider key, S3 storage credentials). None are documented here.
- Impact: An operator following `.env.example` as the "required" list may miss DB/AI/storage configuration and hit runtime failures, or assume those are intentionally unmanaged. The header overstates completeness relative to the app's actual external dependencies.
- Recommendation: Either document the remaining required env vars (or reference where they are inherited from, e.g., the monorepo root `.env`) or soften the header to indicate it lists only marketing-app-specific variables.

## No-Finding Notes

- `apps/marketing/.gitignore`: reviewed line-by-line (1-7); standard ignore entries (`node_modules`, `.vinext`, `dist`, `.env`, `.env.local`, `.env.*.local`, `*.tsbuildinfo`). Correctly ignores `.env` family while keeping `.env.example` tracked. No findings.
- `apps/marketing/app/__tests__/phase-1-boot.test.ts`: reviewed line-by-line (1-213); scaffold/wiring/auth-route/boot-smoke assertions are coherent with their titles. Acknowledged substring-regex weakness (e.g., line 114 `export\s*\{\s*db`) is deliberately superseded by the comment-stripping checks in phase-1-boot-adversarial.test.ts, so no independent finding is raised here. No findings.
