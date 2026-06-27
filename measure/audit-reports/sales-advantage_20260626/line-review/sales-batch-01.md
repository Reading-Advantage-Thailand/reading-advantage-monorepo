# Line-by-Line Review — `sales-batch-01`

- **Track:** `sales_advantage_review_20260626`
- **Batch:** `sales-batch-01`
- **Reviewer model:** `ark-code-latest` (Doubao-Seed-Code)
- **Date:** 2026-06-27
- **Scope:** Read-only line review of the 20 files listed in `/tmp/opencode/sales-batch-01`. No source code was modified.
- **Finding ID prefix:** `F-SALES-B01-###`
- **Severity legend:** `critical` (security/data-loss/correctness blocker) · `high` (likely defect or policy breach) · `medium` (maintainability/robustness/UX) · `low` (style/nit) · `info` (observation, no action required)

> Focus areas evaluated per file: sales curriculum/progression, browser audio recording/upload, storage adapter use, AI evaluation/fallback/privacy, auth/role/tenant boundaries, admin reporting, AGENTS compliance, test quality.

---

## Files reviewed (20/20)

| # | File | Findings |
|---|------|----------|
| 1 | `apps/sales-advantage/components/chat-tutor.tsx` | F-SALES-B01-001, -002, -003, -004 |
| 2 | `apps/sales-advantage/components/header.tsx` | F-SALES-B01-005, -006 |
| 3 | `apps/sales-advantage/components/language-switcher.tsx` | F-SALES-B01-007 |
| 4 | `apps/sales-advantage/components/login-form.tsx` | F-SALES-B01-008, -009 |
| 5 | `apps/sales-advantage/components/providers.tsx` | F-SALES-B01-010 |
| 6 | `apps/sales-advantage/components/quiz-component.tsx` | F-SALES-B01-011, -012, -013 |
| 7 | `apps/sales-advantage/components/roleplay-recorder.tsx` | F-SALES-B01-014, -015, -016, -017, -018 |
| 8 | `apps/sales-advantage/components/roleplay-result.tsx` | F-SALES-B01-019 |
| 9 | `apps/sales-advantage/eslint.config.mjs` | F-SALES-B01-020 |
| 10 | `apps/sales-advantage/i18n/navigation.ts` | (clean) |
| 11 | `apps/sales-advantage/i18n/request.ts` | (clean) |
| 12 | `apps/sales-advantage/i18n/routing.ts` | F-SALES-B01-021 |
| 13 | `apps/sales-advantage/lib/__tests__/setup.ts` | F-SALES-B01-022 |
| 14 | `apps/sales-advantage/lib/i18n-font.ts` | F-SALES-B01-023 |
| 15 | `apps/sales-advantage/lib/i18n-messages.ts` | F-SALES-B01-024 |
| 16 | `apps/sales-advantage/lib/rate-limit.ts` | F-SALES-B01-025, -026 |
| 17 | `apps/sales-advantage/lib/trpc.ts` | (clean) |
| 18 | `apps/sales-advantage/messages/en.json` | F-SALES-B01-027 |
| 19 | `apps/sales-advantage/messages/th.json` | F-SALES-B01-028 |
| 20 | `apps/sales-advantage/next-env.d.ts` | (clean) |

Total findings: 28. Severity distribution: critical 0 · high 4 · medium 13 · low 8 · info 3.

---

## 1. `components/chat-tutor.tsx`

### F-SALES-B01-001 — Streaming response consumed as raw text but server returns AI "data stream" — verify protocol match — `medium`
Lines 47–58: the client reads `res.body` with a raw `TextDecoder` and appends bytes directly as assistant content. The chat route (`app/api/chat/route.ts:118`) returns `stream.toDataStreamResponse()`. I confirmed the AI adapter (`packages/ai/src/providers/openrouter.ts:184`, `openai.ts:159`, `google.ts:173`) implements `toDataStreamResponse()` as a pass-through to `toTextStreamResponse()`, i.e. a **plain text** stream. So today this works. The risk: the method name `toDataStreamResponse` implies the Vercel AI SDK data-stream protocol (SSE framing like `0:"..."`). If the adapter is ever "corrected" to emit the real data-stream protocol, this consumer will render raw protocol tokens. Recommend the consumer and adapter agree on an explicit, named contract (e.g. `toTextStreamResponse`) rather than a name whose semantics differ from its implementation.

### F-SALES-B01-002 — No client-side abort / unmount cleanup of the reader — `medium`
Lines 36–69: the `fetch` + `reader.read()` loop has no `AbortController`. If the component unmounts mid-stream (navigation away), the loop keeps calling `setMessages` on an unmounted component and the network request is never cancelled. Add an `AbortController` tied to effect/unmount and pass `signal` to `fetch`.

### F-SALES-B01-003 — Unused `err` binding in catch — `low`
Line 60: `catch (err)` does not use `err`. With the scripts-glob ESLint config (file 9) this is app code, so `no-unused-vars` may flag it depending on base config. Either log it (observability, see AGENTS "Structured logging") or use a bare `catch`.

### F-SALES-B01-004 — Empty-state copy is hardcoded English, bypassing i18n — `medium`
Line 81: `"Ask anything about sales technique."` is a literal string while the rest of the component uses `t(...)`. The app ships Thai as the default locale (file 12). This string will not localize. Move it into `messages/*.json` under `chat`.

---

## 2. `components/header.tsx`

### F-SALES-B01-005 — Admin link gated only client-side on `user.role === "SALES_ADMIN"` — `info` (UX gate, not the security boundary)
Lines 27–34: hiding the admin nav link client-side is correct UX but is not an authorization control. This is acceptable provided `/admin` routes and the underlying tRPC/domain calls enforce the role server-side (out of batch scope — flagged for the admin-reporting batch to confirm). No client-side action required; recorded so the server-side check is verified elsewhere.

### F-SALES-B01-006 — Logout button has no accessible label — `low`
Lines 41–43: the logout `Button` renders only a `LogOut` icon with no text or `aria-label`. Screen-reader users get an unlabeled button. Add `aria-label={t("logout")}` (the key already exists in both message files).

---

## 3. `components/language-switcher.tsx`

### F-SALES-B01-007 — Binary EN/TH toggle is not scalable and lacks ARIA state — `low`
Lines 13–22: the toggle hardcodes a two-locale flip. `routing.locales` (file 12) is the source of truth; if a third locale is added this silently breaks. Also no `aria-label` describing the action ("Switch language"). Minor today (only two locales) but brittle.

---

## 4. `components/login-form.tsx`

### F-SALES-B01-008 — Login error is generic but `err` is swallowed without observability — `medium`
Lines 25–26: every failure maps to `t("error")` regardless of cause (good for not leaking which field was wrong), but `err` is discarded — no structured logging or telemetry. AGENTS requires audit logging for security-sensitive events including login. Confirm the `useAuth().login` adapter performs the audit/rate-limit logging server-side; the client should still surface non-credential failures (network/500) distinctly for support.

### F-SALES-B01-009 — No client-side rate-limit / lockout feedback — `low`
Lines 19–30: repeated rapid submits are possible; only `loading` disables the button during the in-flight request. Login rate limiting must be server-side (AGENTS), so this is informational, but a 429 from the server currently collapses into the generic `t("error")` message with no `retryAfter` surfaced.

---

## 5. `components/providers.tsx`

### F-SALES-B01-010 — Hardcoded localhost base URL fallback and `PORT` coupling — `medium`
Lines 10–13: server-side base URL falls back to `http://localhost:${PORT ?? 3005}`. In SSR within a container/Cloud Run, the actual port and host may differ; this couples to a dev assumption. AGENTS calls for portable infra. Prefer a configured/validated env var (e.g. `NEXT_PUBLIC_APP_URL` via a Zod-validated env module) over a hardcoded host:port. `credentials: "same-origin"` (line 24) is correct for cookie-based auth.

---

## 6. `components/quiz-component.tsx`

### F-SALES-B01-011 — `correctAnswer` is part of the question prop type delivered to the client — `high`
Lines 16–22 (and confirmed in `app/[locale]/lesson/[id]/page.tsx:42–48`): the question shape includes `correctAnswer?: string`. Although this component never renders `correctAnswer`, the type indicates the field travels to the browser via the `trpc.sales.lesson` query. If the lesson query returns `correctAnswer` in its payload, any user can read the answer key from the network response before submitting. The grading already happens server-side (`submitQuiz` mutation returns `answers[].correct`), so `correctAnswer` should be **stripped from the lesson query output** and removed from the client type. Verify the server query projection in the domain/API batch; if the field is populated, this is a curriculum-integrity leak.

### F-SALES-B01-012 — `as unknown as` double-cast on mutation result defeats type safety — `medium`
Lines 31–33: `onSuccess: (data) => setResult(data as unknown as {...})`. Casting through `unknown` discards the tRPC-inferred output type. If the server contract changes, this silently mismatches at runtime. Define a shared Zod-inferred output type for `submitQuiz` and consume it directly (AGENTS: "TypeScript types should be inferred from Zod schemas").

### F-SALES-B01-013 — Retry resets state but reuses label `t("submit")` for a "Try again" action — `low`
Lines 74–78: on a failed quiz the retry button is labelled with the `submit` translation key, which reads "Submit"/"ส่งคำตอบ" rather than "Try again". Misleading copy; use a dedicated retry key (the `quiz` namespace has no retry key — add one).

---

## 7. `components/roleplay-recorder.tsx`

### F-SALES-B01-014 — Hardcoded `audio/webm` MIME with no `MediaRecorder.isTypeSupported` guard — `high`
Lines 42, 47: `new MediaRecorder(stream, { mimeType: "audio/webm" })` is hardcoded. Safari/iOS does not support `audio/webm` and will throw, sending the user straight to the generic `micDenied` error (line 59) — a misleading message for an unsupported-codec failure. Guard with `MediaRecorder.isTypeSupported(...)` and fall back to a supported type (e.g. `audio/mp4`), and surface a distinct "format unsupported" error. This directly impacts the core audio-recording feature on a major browser.

### F-SALES-B01-015 — No max-duration / max-size cap on recording before upload — `high`
Lines 37–66, 68–93: recording runs until the user presses stop, then the full blob is uploaded. There is no client-side cap on duration or byte size, so a user can record an arbitrarily large file and POST it to `/api/roleplay-attempts`. Combined with the per-hour limit of 10 uploads (file 16, line 86) this still permits very large payloads per request. Add a client max-duration auto-stop and a size check before submit; ensure the server also enforces a hard limit (verify in route batch).

### F-SALES-B01-016 — Object URL from `URL.createObjectURL` is never revoked — `medium`
Lines 49, 95–101: `setAudioUrl(URL.createObjectURL(blob))` creates a blob URL that is replaced/cleared on `reset()` (line 98) and on re-record, but `URL.revokeObjectURL` is never called. Each record/retry cycle leaks a blob URL for the page lifetime. Revoke the previous URL in `reset()` and on unmount.

### F-SALES-B01-017 — Upload response `data.evaluation` consumed without validation — `medium`
Lines 86–87: `const data = await res.json(); setResult(data.evaluation);` trusts the server JSON shape with no runtime validation, then passes it to `RoleplayResult` which assumes non-null arrays (`criteria`, `strengths`, `weaknesses`). AGENTS requires runtime validation at boundaries (Zod). A malformed/partial evaluation payload will crash `RoleplayResult` (see F-SALES-B01-019). Parse `data` with a Zod schema and handle parse failure as an error state.

### F-SALES-B01-018 — Privacy: no consent/notice that audio is uploaded and AI-transcribed — `medium`
Lines 68–93 plus `RoleplayResult.transcriptExcerpt` (file 8, lines 105–112): the user's voice recording is uploaded and an AI transcript excerpt is returned. There is no in-UI notice that audio leaves the device, is stored, and is processed by an AI provider. AGENTS treats AI/privacy as a first-class concern. Recommend a one-time consent/notice near the record button and confirmation of retention policy + storage-adapter usage (storage adapter use to be verified in the route batch — not in this batch's files).

---

## 8. `components/roleplay-result.tsx`

### F-SALES-B01-019 — Assumes `criteria`/`strengths`/`weaknesses` arrays are always present — `medium`
Lines 55, 72, 85: `result.criteria.length`, `result.strengths.length`, `result.weaknesses.length` are read without optional chaining or default. The `Result` type marks them required, but the producer (roleplay-recorder F-SALES-B01-017) does not validate. If the AI evaluation/fallback path returns an object missing these arrays, this throws `Cannot read properties of undefined`. Defensive default (`?? []`) plus upstream Zod validation. Also `overallScore`/`passed` drive the displayed tone (lines 21–26) — confirm fallback evaluations populate these.

---

## 9. `eslint.config.mjs`

### F-SALES-B01-020 — Duplicate/!split `ignores` blocks; `public/` ignored may hide lint of static tooling — `low`
Lines 4 and 30: two separate `ignores` entries (`{ ignores: [...] }` at line 4 and `{ ignores }` at line 30). This works but is confusing; the imported `ignores` and the inline list could be merged for clarity. The `scripts/**` globals block (lines 6–29) re-declares Node globals — acceptable, but consider inheriting from a shared Node config to avoid drift. Low impact.

---

## 10. `i18n/navigation.ts`
Clean. Standard `createNavigation(routing)` re-export. No findings.

## 11. `i18n/request.ts`
Clean. Correctly awaits `requestLocale`, resolves via the shared helper, and loads merged messages. No findings.

---

## 12. `i18n/routing.ts`

### F-SALES-B01-021 — `defaultLocale: "th"` with `localePrefix: "always"` — confirm SEO/redirect intent — `info`
Lines 4–6: default locale is Thai with always-on prefix. This is a deliberate product choice (Thailand sales org) and is internally consistent with the font helper (file 14) and chat prompt (always-Thai). Recorded for confirmation only; no action.

---

## 13. `lib/__tests__/setup.ts`

### F-SALES-B01-022 — Test setup only imports jest-dom; no global mocks for browser APIs used in components — `medium`
Line 1: setup only wires `@testing-library/jest-dom/vitest`. Components in this batch depend on `navigator.mediaDevices.getUserMedia`, `MediaRecorder`, `URL.createObjectURL`, and streaming `fetch` — none are polyfilled/mocked here. Any component test for `roleplay-recorder` or `chat-tutor` will need per-test mocks. This is a test-quality gap: the batch ships rich browser-API components but the shared setup provides no harness for them. Confirm component tests exist and mock these (component test files were not in this batch).

---

## 14. `lib/i18n-font.ts`

### F-SALES-B01-023 — `_locale` parameter is unused; both fonts always loaded — `low`
Lines 17–18: the function ignores `_locale` and always concatenates both font class names. The JSDoc (lines 10–16) explains this is intentional (Thai content can appear on any locale). Reasonable, but loading both font families on every page (including English-only views) has a minor performance cost. Acceptable given the documented rationale; flagged as info/low. The leading-underscore name correctly signals the unused param to lint.

---

## 15. `lib/i18n-messages.ts`

### F-SALES-B01-024 — `deepMerge` recursion has no cycle/depth guard and trusts JSON imports — `low`
Lines 13–33: `deepMerge` recurses on nested objects. Inputs are static local JSON (`messages/*.json`), so untrusted-input risk is nil, but a self-referential or pathologically deep structure would overflow. Given the trusted, flat-ish message files this is low risk. The en-as-base fallback merge (lines 43–46) is a good pattern for missing-key resilience. No functional defect.

---

## 16. `lib/rate-limit.ts`

### F-SALES-B01-025 — In-memory limiter is non-durable across instances (documented, but enforcement gap noted) — `medium`
Lines 1–16, 25: the banner transparently documents that this `Map`-based limiter is per-process and not durable across serverless/horizontal scaling, citing AC-7 and the Postgres-backed v2. This is good disclosure and AGENTS-aligned (documented decision). However, the practical consequence remains: on Cloud Run (the stated deploy target) with >1 instance, the chat (30/min) and roleplay (10/hr) limits are effectively multiplied by instance count, weakening the abuse protection for AI/audio endpoints. Severity kept at medium because it is the only limiter currently wired into both AI routes. Track the migration to the shared limiter before multi-instance rollout.

### F-SALES-B01-026 — Eviction scan is O(n log n) under load and runs inside the request path — `low`
Lines 48–62: when the map exceeds `RATE_LIMIT_MAX_ENTRIES` (10,000), the request that trips the threshold pays for a full scan plus a sort of all entries. Under a burst this adds latency to a request that is already on the hot path. Minor given the 10k ceiling, but consider amortized/periodic cleanup instead of inline. Note also the helpers `checkChatRateLimit`/`checkRoleplayRateLimit` (lines 79–87) are defined but the routes call `checkRateLimit` directly with duplicated literals (`app/api/chat/route.ts:56`, `app/api/roleplay-attempts/route.ts:30`) — the exported helpers are effectively dead code; consolidate to avoid limit-value drift.

---

## 17. `lib/trpc.ts`
Clean. Thin `createTRPCReact<AppRouter>()` typed against `@reading-advantage/api` — correct adapter usage. No findings.

---

## 18. `messages/en.json`

### F-SALES-B01-027 — Chat system prompt stored in i18n message files but route uses its own hardcoded prompt — `medium`
Lines 72–77: `chat.systemPrompt` defines a coaching system prompt in the message bundle. However the live chat route builds its **own** richer system prompt inline (`app/api/chat/route.ts:83–98`) and never reads `chat.systemPrompt`. Result: the message-file prompt is dead/misleading, and there are now two divergent "source of truth" prompts. AGENTS says prompts should be versioned and colocated with the owning backend module — not duplicated in a client i18n bundle. Remove the unused `systemPrompt` keys (both locales) or consolidate prompt ownership in the AI/backend module. Also: several keys (`navigation.modules`, `navigation.logout` used? `dashboard.*`, `result.attempts`, `quiz.passThreshold`) — verify they are referenced; `result.attempts` and `quiz.passThreshold` were not used by any component in this batch (possible dead keys; confirm against page batch).

## 19. `messages/th.json`

### F-SALES-B01-028 — Same dead/duplicated `systemPrompt` key plus prompt-in-translations privacy/maintenance concern — `medium`
Lines 72–77: mirrors F-SALES-B01-027 in Thai (`"...กรุณาตอบเป็นภาษาไทย"`). Same issue: the actual prompt lives in the route. Keep one source. Structurally the th bundle is key-parallel with en (good — supports the deep-merge fallback in file 15), and no English placeholder leakage was observed in the translated values. Equivalent severity to -027.

---

## 20. `next-env.d.ts`
Clean. Generated Next.js types file; correctly marked "should not be edited." No findings.

---

## Cross-cutting observations

- **AGENTS compliance — positives:** chat route uses the AI adapter (`getAIClient()`), the auth package (`validateSession`), and a domain authorization call (`sales.authorizeSalesChat`); tRPC is used as a typed transport only; i18n fallback-merge is robust; the rate-limit durability decision is explicitly documented with an AC reference.
- **AGENTS compliance — gaps:** prompt duplicated between i18n bundle and route (F-027/-028); client trusts unvalidated server JSON for AI evaluation results (F-017/-019) contrary to "runtime validation at all external boundaries"; possible answer-key leakage via `correctAnswer` in the client lesson payload (F-011); hardcoded localhost base URL (F-010).
- **Audio feature robustness:** the recorder hardcodes `audio/webm` (Safari-breaking, F-014), has no duration/size cap (F-015), and leaks object URLs (F-016) — the three most actionable defects in this batch.
- **Privacy:** no in-UI notice that voice audio is uploaded and AI-processed with a returned transcript (F-018).

---

## Limitations

1. **Read-only, batch-scoped:** Only the 20 files in `/tmp/opencode/sales-batch-01` were reviewed line-by-line. Server-side route handlers (`app/api/chat/route.ts`, `app/api/roleplay-attempts/route.ts`), the lesson page, domain functions, the tRPC `sales` router, the storage adapter, and the curriculum seed scripts were read **only as corroborating context** for findings (e.g. F-001, F-011, F-014/-015, F-027) and were **not** themselves audited here.
2. **Several findings require cross-batch confirmation:** F-005 (server-side admin role enforcement), F-011 (whether `correctAnswer` is actually returned by the lesson query), F-015 (server-side size/duration cap), F-018 (storage adapter usage + retention), and the dead-key claims in F-027 rely on files outside this batch and must be verified in the API/domain/admin/route batches.
3. **No execution:** no tests were run, no build/typecheck performed; findings are from static reading only. Test-quality assessment (F-022) is limited to the single setup file present in this batch — actual component test files were not in scope.
4. **AI behavior not exercised:** AI evaluation/fallback/privacy findings are inferred from type contracts and UI consumption, not from observing model output or the adapter at runtime.

---

## Status

This report is a **line-review work product only**. It makes **no acceptance or closeout claims** for track `sales_advantage_review_20260626`. Acceptance, verification gating, and closeout remain the responsibility of the designated Measure phases.
