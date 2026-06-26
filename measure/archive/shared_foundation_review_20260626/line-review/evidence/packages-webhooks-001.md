# Line Review Evidence: packages-webhooks-001

Reviewer: Measure Review B (security and data handling)
Files assigned: 5
Lines assigned: 1127

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| packages/webhooks/eslint.config.mjs | 1-3 | reviewed | 0 |
| packages/webhooks/package.json | 1-34 | reviewed | 0 |
| packages/webhooks/src/__tests__/github-client.test.ts | 1-378 | reviewed | 1 |
| packages/webhooks/src/__tests__/github-review.test.ts | 1-377 | reviewed | 1 |
| packages/webhooks/src/__tests__/github-webhook.test.ts | 1-335 | reviewed | 1 |

## Findings

### LR-packages-webhooks-001-001 — Environment variable not saved before mutation in `generateAppJWT` test block

- **Severity:** Low
- **File:** `packages/webhooks/src/__tests__/github-client.test.ts:167-171`
- **Evidence:** The `generateAppJWT` test at line 167-171 deletes `process.env.GITHUB_APP_ID` and `process.env.GITHUB_PRIVATE_KEY` via `delete` without saving and restoring the original values. This is inconsistent with the `verifyWebhookSignature` test block at the same file (lines 74-82), which properly saves `const originalEnv = process.env.GITHUB_WEBHOOK_SECRET` in `beforeEach` and restores it in `afterEach`. While Vitest file isolation (default `--isolate`) mitigates cross-file pollution, within-file subsequent describe blocks (`getInstallationTokenForRepo` at line 179-182) re-set these env vars via their own `beforeEach`. The gap exists if a test between these blocks or a test-order change reads the deleted values.
- **Impact:** Potential for test flakiness if describe-block execution order changes or if a new test is inserted between the two blocks. The deleted env vars are not restored, so any test between line 172 and the `getInstallationTokenForRepo` `beforeEach` will see missing values.
- **Recommendation:** Adopt the save-then-restore pattern used by `verifyWebhookSignature` (lines 74 and 82). Wrap the `generateAppJWT` describe block with its own `beforeEach`/`afterEach` pair that saves, sets (or deletes), and restores the env vars.

### LR-packages-webhooks-001-002 — Environment variable deleted instead of restored in `afterAll`

- **Severity:** Low
- **File:** `packages/webhooks/src/__tests__/github-review.test.ts:258,261,284-285`
- **Evidence:** The `beforeAll` at lines 258 and 261 sets `process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET` and `process.env.AI_PROVIDER = "mock"` without first saving the original values. The `afterAll` at lines 284-285 uses `delete process.env.GITHUB_WEBHOOK_SECRET` and `delete process.env.AI_PROVIDER` instead of restoring the originals. If either env var was set to a meaningful value before test execution, that value is permanently lost for subsequent test files (if Vitest is not running with per-file isolation or in a shared worker context).
- **Impact:** Potential for downstream test pollution if Vitest worker reuse or `--no-isolate` mode is used. Loss of `AI_PROVIDER` could cause other tests to silently use the wrong provider. Loss of `GITHUB_WEBHOOK_SECRET` could cause other webhook tests to see a missing-secret state.
- **Recommendation:** Save original values before `beforeAll` mutations: `const originalSecret = process.env.GITHUB_WEBHOOK_SECRET; const originalProvider = process.env.AI_PROVIDER;` and restore them in `afterAll` with `process.env.GITHUB_WEBHOOK_SECRET = originalSecret;` etc., falling back to `delete` only when the original was `undefined`.

### LR-packages-webhooks-001-003 — Environment variable deleted instead of restored in `afterAll`

- **Severity:** Low
- **File:** `packages/webhooks/src/__tests__/github-webhook.test.ts:66,74`
- **Evidence:** The `beforeAll` at line 66 sets `process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET` without saving the original value. The `afterAll` at line 74 uses `delete process.env.GITHUB_WEBHOOK_SECRET` instead of restoring the original. Same pattern as finding LR-packages-webhooks-001-002 but in a different test file.
- **Impact:** Same as LR-packages-webhooks-001-002 — potential downstream test pollution if Vitest worker reuse or `--no-isolate` mode is used.
- **Recommendation:** Save the original value before mutation and restore it in `afterAll`, falling back to `delete` only when the original was `undefined`.

## No-Finding Notes

- `packages/webhooks/eslint.config.mjs`: reviewed line-by-line; no findings. Standard shared ESLint config import (`@reading-advantage/config/eslint`), 3 lines.
- `packages/webhooks/package.json`: reviewed line-by-line; no findings. Standard monorepo package config with ESM (`"type": "module"`), workspace protocol deps, no hardcoded secrets. Dependencies include `hono`, `zod`, and workspace packages (`ai`, `db`, `domain`, `types`). Dev dependencies include `vitest` and `typescript`.
- `packages/webhooks/src/__tests__/github-client.test.ts`: reviewed line-by-line; 1 Low finding (LR-packages-webhooks-001-001). Security-relevant test coverage observed: HMAC-SHA256 signature verification with edge cases (missing secret, invalid signature, mismatched lengths), timestamp replay-attack protection with boundary testing (exactly 300s, 301s, undefined for backward compatibility, NaN, Infinity), SSRF defense in `parsePrUrl` (path traversal rejection), `generateAppJWT` missing-config guard, `getInstallationTokenForRepo` missing-installation guard. No hardcoded real secrets — `"test-secret"` and truncated RSA key `"-----BEGIN RSA PRIVATE KEY-----\nMIIBOgIBAAJBALr"` are test fixtures.
- `packages/webhooks/src/__tests__/github-review.test.ts`: reviewed line-by-line; 1 Low finding (LR-packages-webhooks-001-002). Security-relevant test coverage observed: AIClient abstraction seam verification (no direct provider SDK coupling), `reviewResultSchema` contract enforcement, review status persistence (approved → `approved`, `passed: false` → `needs_changes`), fire-and-forget posture (AI failure responds 200, no error details leaked in response body). Mock AIClient validates Zod schema conformance.
- `packages/webhooks/src/__tests__/github-webhook.test.ts`: reviewed line-by-line; 1 Low finding (LR-packages-webhooks-001-003). Security-relevant test coverage observed: 401 on missing/invalid/malformed signature, 400 on invalid JSON, 401 on malformed timestamp header, 401 on stale timestamp with explicit "replay attack rejected" message, rejection of stale signed body timestamps, non-PR event filtering (200 ignored), Zod payload validation (400 on invalid), core webhook lifecycle flows (synchronize re-triggers review, opened creates review, closed is ignored). No-matching-repo and no-matching-user scenarios return 200 (do not leak user existence information).

## A2 / A6 Cross-check

- **A2 (consent-blind publish gate):** Not applicable. The webhooks package handles GitHub webhook ingress and AI PR review. None of the assigned test files involve draft-to-published status transitions, named subjects, or consent artifacts. No finding.
- **A6 (registry overstatement):** Checked `measure/tracks.md` for webhook-related claims. The registry references (lines 217, 225, 268-269, 423) describe completed verification states (e.g., "78/78 webhooks tests pass") and explicitly deferred work ("Webhook → LLM Review Reliability — still OPEN"). No claim of a resolved security state contradicts observed test reality. No finding.
