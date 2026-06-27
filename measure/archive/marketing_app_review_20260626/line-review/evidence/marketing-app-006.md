# Line Review Evidence: marketing-app-006

Reviewer: coder-vocengine-ark-code-latest/marketing-app-006
Files assigned: 10
Lines assigned: 535

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| apps/marketing/app/lib/topic-research.ts | 1-27 | reviewed | 1 |
| apps/marketing/app/login/page.tsx | 1-147 | reviewed | 2 |
| apps/marketing/app/page.tsx | 1-34 | reviewed | 1 |
| apps/marketing/app/settings/page.tsx | 1-188 | reviewed | 3 |
| apps/marketing/eslint.config.mjs | 1-31 | reviewed | 1 |
| apps/marketing/next-env.d.ts | 1-6 | reviewed | 0 |
| apps/marketing/package.json | 1-33 | reviewed | 1 |
| apps/marketing/tsconfig.json | 1-26 | reviewed | 0 |
| apps/marketing/vite.config.ts | 1-11 | reviewed | 0 |
| apps/marketing/vitest.config.ts | 1-32 | reviewed | 1 |

## Findings

### LR-marketing-app-006-001 — Settings page collects and POSTs raw LLM API key with no client-side access control

- Severity: Medium
- Category: auth-api
- File: `apps/marketing/app/settings/page.tsx:35-51`
- Evidence: `handleSave` (lines 35-51) and `handleTestConnection` (lines 13-33) read a plaintext API key from React state (`apiKey`, line 8) and POST it to `/api/settings` and `/api/settings/test-connection` (lines 17-21, 37-46) with no auth check, no role gate, and no session guard on the page or the fetch. The page is a `"use client"` component (line 1) with no `useAuth`/redirect guard — unlike `app/login/page.tsx`, which does gate on `isAuthenticated`. The referenced `app/api/settings/route.ts` POST handler (context, not in batch) also accepts arbitrary key/value pairs with no auth, so any reachable client can write LLM provider credentials.
- Impact: Provider API keys (a privileged secret) can be set/overwritten by any actor who can load the page or hit the route, with no authorization enforcement. This violates the AGENTS.md rule that routes/handlers must enforce documented access rules and not trust unauthenticated callers.
- Recommendation: In a remediation track, gate the settings page behind the auth adapter (`requireUser`/role check) and enforce auth + Zod input validation on the settings API handlers; do not allow unauthenticated secret writes.

### LR-marketing-app-006-002 — `vinext` dependency pinned to floating `latest`

- Severity: Medium
- Category: tests-build
- File: `apps/marketing/package.json:23`
- Evidence: `"vinext": "latest"` (line 23) is an unpinned, floating version range; `dev`/`build`/`start` scripts (lines 7-9) all run `vinext`, so the entire build/runtime depends on a non-deterministic version.
- Impact: Violates the AGENTS.md Version Policy ("Use current stable versions pinned in package.json and lockfiles") and makes builds non-reproducible — an upstream `vinext` release can silently change build/runtime behavior of the marketing app.
- Recommendation: Pin `vinext` to an explicit stable version (matching the lockfile) in a follow-up chore.

### LR-marketing-app-006-003 — Vitest configured with `environment: "node"` despite client/DOM pages

- Severity: Medium
- Category: tests-build
- File: `apps/marketing/vitest.config.ts:21`
- Evidence: `environment: "node"` (line 21) with an `include` of `app/**/*.{test,spec}.{ts,tsx}` (lines 22-25). The app ships `"use client"` React components with hooks and DOM rendering (`app/login/page.tsx:1-7`, `app/settings/page.tsx:1-11`), which cannot be unit-tested under a Node environment without jsdom/happy-dom.
- Impact: Component/DOM behavior of the login and settings UI (form submission, auth-state branches, error surfaces) cannot be covered by tests as configured, leaving a test gap against the video-pipeline plan's UI coverage expectations.
- Recommendation: Add a jsdom/happy-dom environment (globally or per-file via `// @vitest-environment`) for component tests in a remediation track.

### LR-marketing-app-006-004 — UI strings hardcoded in English while document `lang="th"`; no i18n for Thai audience

- Severity: Medium
- Category: ux-i18n
- File: `apps/marketing/app/page.tsx:4-5`
- Evidence: The product targets Thai K-12 stakeholders (see `app/lib/topic-research.ts:14-17`) and the root layout declares `<html lang="th">` (context: `app/layout.tsx`), yet all rendered copy is hardcoded English with no i18n layer: home page "Marketing Production Platform"/"Welcome..." (`app/page.tsx:4-5`), nav labels "Settings"/"Campaigns" (`app/page.tsx:17,29`), login "Login"/"Username"/"Password"/"Loading..." (`app/login/page.tsx:16,64,86,109,142`), and settings "Settings"/"Configure LLM provider..."/"LLM Configuration" (`app/settings/page.tsx:55-56,68`).
- Impact: `lang="th"` declares Thai but the entire UI is untranslated English, misrepresenting document language to assistive tech and giving Thai users an English-only interface with no localization path.
- Recommendation: Introduce an i18n mechanism (or correct `lang`) and externalize user-facing strings in a remediation track.

### LR-marketing-app-006-005 — Topic dedup relies entirely on LLM prompt instruction, no programmatic guard

- Severity: Low
- Category: workflow
- File: `apps/marketing/app/lib/topic-research.ts:9-12`
- Evidence: De-duplication of marketing topics is expressed purely as prompt text — "do NOT repeat or near-duplicate any of these" (lines 9-12) and "Return ONLY a JSON array of exactly 5 strings" (line 26). The module only builds the prompt; there is no programmatic dedup, count enforcement, or schema validation of the model's output here.
- Impact: Topic uniqueness and the "exactly 5" contract depend solely on the model obeying instructions; malformed or duplicate output is not defended in this unit, pushing all validation responsibility to an unverified call site.
- Recommendation: Validate the parsed response (Zod array of 5 strings) and apply programmatic dedup against `pastTopics` at the call site; track as workflow hardening.

### LR-marketing-app-006-006 — ESLint config disables `no-explicit-any` to pin pre-existing tech debt

- Severity: Low
- Category: tests-build
- File: `apps/marketing/eslint.config.mjs:20-27`
- Evidence: A file-scoped override turns off `@typescript-eslint/no-explicit-any` for `app/campaigns/[id]/video/page.tsx` (lines 24-26), with a comment (lines 20-23) acknowledging Phase 2+ code was scaffolded ahead of its review gate and contains `any` types.
- Impact: Lint suppression hides type-safety debt rather than fixing it; if the override path is mistyped or the file moves, the suppression silently stops/leaks. It documents known debt but defers it past lint enforcement.
- Recommendation: Remove the override and fix the `any` usages when Phase 5 (video) is reviewed, as the comment itself anticipates.

### LR-marketing-app-006-007 — Brittle string-matching error surfaces and raw error passthrough in UI

- Severity: Low
- Category: ux-i18n
- File: `apps/marketing/app/settings/page.tsx:173-184`
- Evidence: Test-connection feedback styling is derived by substring matching — `testResult.includes("Error")` (line 178) toggles error vs. success colors, while the success/failure text is set from `data.message` / hardcoded English strings (lines 24-29). Save feedback uses blocking `alert()` calls (lines 47, 49). The login page similarly surfaces a raw `err.message` directly to users (`app/login/page.tsx:37`).
- Impact: Error/success presentation is fragile (any server message containing "Error" flips styling regardless of HTTP status), uses disruptive native `alert()`, and can leak raw/untranslated error text to a Thai-facing UI.
- Recommendation: Drive success/failure from response status rather than message substrings, replace `alert()` with inline UI, and map errors to localized, user-safe messages.

## No-Finding Notes

- `apps/marketing/next-env.d.ts`: reviewed line-by-line (1-6); generated Next/vinext type reference file marked "should not be edited"; no findings.
- `apps/marketing/tsconfig.json`: reviewed line-by-line (1-26); `strict: true` (line 7), bundler module resolution, and vinext plugin/path shims are consistent with the monorepo; no findings.
- `apps/marketing/vite.config.ts`: reviewed line-by-line (1-11); minimal vinext plugin + `@`→`./app` alias; consistent with app layout; no findings.
