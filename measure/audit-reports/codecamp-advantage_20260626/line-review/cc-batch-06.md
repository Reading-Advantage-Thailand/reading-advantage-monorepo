# Line-by-Line Review — Batch `cc-batch-06`

**Track:** `codecamp_advantage_review_20260626`
**Batch:** cc-batch-06
**Reviewer:** ark-code-latest (subagent, line review)
**Date:** 2026-06-27
**Scope:** Curriculum/progression correctness, GitHub/webhook/AI integration risks, auth/role boundaries, production readiness, AGENTS compliance, test quality.
**Constraint:** Read-only. No source code was edited. This report makes **no acceptance or closeout claims**; it is line-review evidence only.

---

## Files Reviewed (20/20)

| # | File | Lines | Type |
|---|------|-------|------|
| 1 | apps/codecamp-advantage/measure/curriculum/unit-10-overview.md | 51 | curriculum doc |
| 2 | apps/codecamp-advantage/measure/curriculum/unit-11-class-period-plan.md | 541 | curriculum doc |
| 3 | apps/codecamp-advantage/measure/curriculum/unit-11-overview.md | 60 | curriculum doc |
| 4 | apps/codecamp-advantage/measure/curriculum/unit-12-class-period-plan.md | 594 | curriculum doc |
| 5 | apps/codecamp-advantage/measure/curriculum/unit-12-overview.md | 64 | curriculum doc |
| 6 | apps/codecamp-advantage/measure/curriculum/unit-13-class-period-plan.md | 552 | curriculum doc |
| 7 | apps/codecamp-advantage/measure/curriculum/unit-13-overview.md | 62 | curriculum doc |
| 8 | apps/codecamp-advantage/measure/curriculum/unit-14-class-period-plan.md | 315 | curriculum doc |
| 9 | apps/codecamp-advantage/measure/curriculum/unit-14-overview.md | 51 | curriculum doc |
| 10 | apps/codecamp-advantage/measure/curriculum/unit-15-class-period-plan.md | 547 | curriculum doc |
| 11 | apps/codecamp-advantage/measure/curriculum/unit-15-overview.md | 56 | curriculum doc |
| 12 | apps/codecamp-advantage/measure/curriculum/unit-16-class-period-plan.md | 265 | curriculum doc |
| 13 | apps/codecamp-advantage/measure/curriculum/unit-16-overview.md | 42 | curriculum doc |
| 14 | apps/codecamp-advantage/measure/curriculum/unit-17-class-period-plan.md | 411 | curriculum doc |
| 15 | apps/codecamp-advantage/measure/curriculum/unit-17-overview.md | 50 | curriculum doc |
| 16 | apps/codecamp-advantage/measure/curriculum/unit-18-class-period-plan.md | 302 | curriculum doc |
| 17 | apps/codecamp-advantage/measure/curriculum/unit-18-overview.md | 55 | curriculum doc |
| 18 | apps/codecamp-advantage/messages/en.json | 222 | i18n messages |
| 19 | apps/codecamp-advantage/messages/th.json | 222 | i18n messages |
| 20 | apps/codecamp-advantage/next.config.ts | 81 | app config |

**Note on file types:** 17 of 20 files are instructional Markdown (curriculum). These are not shipped runtime code, so "production readiness" findings against them are scoped to *what they teach interns to ship*. Curriculum that teaches insecure or stale patterns is a real risk because interns are explicitly told (`unit-18-overview.md:23`, `unit-18-class-period-plan.md:294`) to "contribute to the real codecamp-advantage app."

---

## Severity Legend

- **HIGH** — Security/correctness defect, or curriculum teaching a pattern that contradicts AGENTS mandates or would ship a vulnerability.
- **MEDIUM** — Misleading/stale guidance, integration risk, or maintainability concern that could cause interns to write broken/incorrect code.
- **LOW** — Minor inaccuracy, polish, consistency, or doc-hygiene issue.
- **INFO** — Observation / no action strictly required.

---

## Findings

### HIGH

#### F-CC-B06-001 — Curriculum teaches `bcrypt` for password hashing, contradicting AGENTS Argon2id mandate
**File:** unit-13-class-period-plan.md:36–46 (`src/auth/password.ts` example); echoed in unit-13-overview.md:23 ("bcrypt | Latest | Password hashing").
The auth unit teaches `import bcrypt from "bcrypt"` with `bcrypt.hash(password, 10)`. AGENTS.md ("Authentication Requirements") explicitly requires **Argon2id password hashing**, and the real repo already complies: `packages/auth/src/password.ts:1` uses `@node-rs/argon2` with "OWASP-recommended Argon2id parameters" (bcryptjs only retained as a legacy-verify fallback). The curriculum both (a) violates the stated security standard and (b) falsely claims under "Architecture Mirroring" (unit-13-overview.md:40–46) that it replicates `packages/auth`. An intern who later contributes to the real app will carry the wrong hashing primitive and a wrong cost factor (`10`). Recommend teaching Argon2id (or at minimum flagging bcrypt as non-conformant and pointing to `packages/auth`).

#### F-CC-B06-002 — AI unit teaches AI SDK v4 APIs while the real app ships AI SDK v5 (stale, non-mirroring, will not compile against current deps)
**File:** unit-15-class-period-plan.md:18, 88, 91, 132, 458, 464; unit-15-overview.md:11–14, 22–24, 37, 43.
Curriculum pins `ai@4.3.19`, `@ai-sdk/openai@1.3.24`, `@ai-sdk/react@1.2.12` and uses v4-era APIs: `maxTokens` (line 88, 462), `result.toDataStreamResponse()` (line 91, 464), and `useChat({ api, body })` returning `input/handleInputChange/isLoading` (lines 132–177). The actual app `package.json` ships `ai@^5.0.95`, `@ai-sdk/openai@^2.0.68`, `@ai-sdk/react@^2.0.0`. In v5 these APIs changed (`maxOutputTokens`, `toUIMessageStreamResponse`, transport-based `useChat`). The overview claims it "mirrors `apps/codecamp-advantage/app/api/chat/route.ts`" and uses "same API" (unit-15-overview.md:37,43) — but the real route also uses `maxTokens`/`toDataStreamResponse` only because the app itself may be on a transitional API; regardless, the version table is materially wrong vs the shipped lockfile. Interns following this verbatim against the monorepo's installed SDK will hit type/runtime errors. Recommend reconciling versions and API surface with the app's actual dependencies, or explicitly labeling the standalone tracker as pinned to v4.

---

### MEDIUM

#### F-CC-B06-003 — Auth login flow teaches no rate limiting and no audit logging on a security-sensitive endpoint
**File:** unit-13-class-period-plan.md:107–143 (login route), 176–193 (logout).
AGENTS.md requires "Rate limiting for login endpoints" and "Audit logging for security-sensitive events" (login, logout, password changes). The taught login/logout route handlers contain neither, and the unit never mentions them. Notably the *AI* unit does teach rate limiting (unit-15-class-period-plan.md:383–413), so the omission in the auth unit is an inconsistency that under-teaches the more security-critical surface. Recommend adding login rate-limit + audit-event guidance.

#### F-CC-B06-004 — Session tokens use `randomUUID()` and are stored/compared in plaintext; no rotation/regeneration on login
**File:** unit-13-class-period-plan.md:52–65 (`createSession`), 67–86 (`getSession`).
The session design stores the raw token in the DB (`token: text(...).unique()`, line 22) and looks it up by equality (line 71). Best practice (and the kind of thing an LLM PR reviewer should flag) is to store a hash of the session token so a DB leak does not yield live sessions, and to use a CSPRNG of sufficient length. `randomUUID()` is 122 bits (acceptable) but the plaintext-at-rest pattern is taught as canonical. There is also no session fixation mitigation (no regeneration after privilege change). Medium because it is teaching material, not shipped code, but it is presented as "matches Reading Advantage" (unit-13-overview.md:22).

#### F-CC-B06-005 — `getSession` performs an unscoped cross-table user lookup with no tenant scoping, taught as the canonical pattern
**File:** unit-13-class-period-plan.md:79–85.
After resolving the session, the user is fetched with `eq(students.id, session.userId)` and no `schoolId` consideration. While a user lookup by PK is inherently scoped, the broader auth examples repeatedly hand-roll `eq(table.schoolId, ...)` rather than the `TenantDB`/`createTenantDb` abstraction the Unit 11 plan introduces (unit-11-class-period-plan.md:419–451). The curriculum is internally inconsistent: Unit 11 says "TenantDB enforces this automatically" (line 436) and "Every query MUST include schoolId," yet Units 12–13 domain/auth examples bypass TenantDB and manually scope (and `getSession` omits scoping entirely). This risks teaching interns to forget tenant scoping — the single most-emphasized rule in AGENTS.md.

#### F-CC-B06-006 — RBAC model teaches flat per-role permission arrays labeled as "inherits," which they do not
**File:** unit-13-class-period-plan.md:355–393.
`ROLE_HIERARCHY` (line 355) is declared but never used. The `PERMISSIONS` map duplicates the full permission list per role with comments like "Inherits student permissions + these:" (line 367) and "Inherits everything + these:" (line 379), but there is no inheritance mechanism — it is copy-paste. This is fragile and teaches a pattern that drifts (a permission added to `student` will silently not propagate). Either implement real hierarchy resolution or drop the misleading "inherits" comments. The Unit 12 simplified version (unit-12-class-period-plan.md:100–104) also grants `student` the same `module:create`? No — Unit 12 gives student only read/progress/quiz, but `admin` and `teacher` are identical there (lines 102–103), which is itself a modeling smell carried into Unit 13.

#### F-CC-B06-007 — Server Action `updateProgress` drops `schoolId` from its WHERE clause
**File:** unit-12-class-period-plan.md:458–464.
The taught Server Action updates `progress` filtering only on `studentId` and `lessonId` (lines 461–463) — no `schoolId` predicate — directly contradicting the Unit 11 rule "Never forget schoolId!" (unit-11-class-period-plan.md:337) and the same file's domain example which *does* include it. Teaching a multi-tenant write without tenant scoping is exactly the cross-tenant footgun AGENTS warns against. (Mitigated only by `studentId === user.id` flowing from session, but the canonical example should still scope.)

#### F-CC-B06-008 — In-memory `Map` rate limiter taught as production hardening; breaks on multi-instance/serverless deploy
**File:** unit-15-class-period-plan.md:386–413, section titled "Rate Limiting and Production Concerns" (line 373).
`const rateLimits = new Map<string, RateLimitEntry>()` is per-process. The same course teaches Cloud Run / multiple instances (unit-17-class-period-plan.md:352–378), where a per-process Map gives each instance its own counter and resets on cold start — i.e., it does not actually rate-limit in the taught deployment target. It is presented as "harden the chat API for production" (line 381). Should note the need for a shared store (Redis/DB) in multi-instance environments.

#### F-CC-B06-009 — Thai mistranslation: `fork.step1Title` rendered as "การออกกำลังกาย" elsewhere and inconsistent "exercise" terminology
**File:** messages/th.json:207 (`lesson.forkExercise`: "การออกกำลังกายแบบ Fork").
"การออกกำลังกาย" means *physical exercise/workout*, not a coding/practice exercise. Elsewhere the same concept is correctly rendered "แบบฝึกหัด" (e.g., th.json:159 `step4Title` "ทำแบบฝึกหัด", th.json:211 `practiceExercises` "แบบฝึกหัด", th.json:47 `exerciseRepos` "โพรเจกต์แบบฝึกหัด"). This is a user-facing mistranslation in the lesson UI. Recommend "แบบฝึกหัดแบบ Fork" or similar.

#### F-CC-B06-010 — Thai `dashboard.title`/`subtitle` diverge in meaning from English source
**File:** messages/th.json:20–21 vs en.json:20–21.
EN: title "Welcome to CodeCamp Advantage" / subtitle "Master the monorepo stack one module at a time." TH: title "เรียนรู้การพัฒนาเว็บ" ("Learn web development") / subtitle "โมดูล 18 โมดูล ตั้งแต่พื้นฐานจนถึงระดับมืออาชีพ พร้อมการตรวจโค้ดด้วย AI" ("18 modules, from basics to professional, with AI code review"). The Thai is not a translation of the English — it is different copy. Not a defect per se (key parity is 188/188, confirmed), but content divergence means EN/TH users see materially different messaging. Flag for product/i18n review.

---

### LOW

#### F-CC-B06-011 — Leading whitespace in Thai fork step title
**File:** messages/th.json:153 — `"step1Title": " Fork โพรเจกต์"` has a stray leading space. Cosmetic but renders an indent. EN equivalent (en.json:153) has no leading space.

#### F-CC-B06-012 — `docker-compose.yml` example uses obsolete `version: "3.8"` key
**File:** unit-17-class-period-plan.md:246. The Compose Spec deprecated the top-level `version` field; modern `docker compose` warns on it. Minor, but teaches a deprecated convention.

#### F-CC-B06-013 — Compose example introduces `NEXTAUTH_SECRET` though the course never uses NextAuth
**File:** unit-17-class-period-plan.md:278, 320, 327. The auth unit (Unit 13) teaches a bespoke session implementation, not NextAuth. Referencing `NEXTAUTH_SECRET` is confusing/leftover and unused by the taught stack.

#### F-CC-B06-014 — tRPC client setup teaches two parallel, redundant client modules
**File:** unit-12-class-period-plan.md:286–305. `src/lib/trpc.ts` (`createTRPCClient`) and `src/lib/trpc-react.ts` (`createTRPCReact`) are both introduced with the same exported name `trpc`, and only the React one is used afterward (lines 339, 343). Mildly confusing; the vanilla client is never referenced again.

#### F-CC-B06-015 — `getModuleBySlug` referenced in router but never defined in the domain examples
**File:** unit-12-class-period-plan.md:178, 192–197. The router imports/calls `getModuleBySlug` but the Period-1 domain section only defines `getModules` and `createModule` (lines 44–85). An intern copying along has no implementation. Doc-completeness gap.

#### F-CC-B06-016 — TenantDB Proxy example is a no-op that "injects" nothing, undercutting the lesson
**File:** unit-11-class-period-plan.md:419–433. `createTenantDb` is presented as the mechanism that "injects schoolId automatically" (lines 425, 444 comment "schoolId injected!"), but the body just does `original.apply(target, args)` with a comment that the real implementation is elsewhere. The very next example (line 444) asserts the injection happened, which is false for the shown code. Risks teaching that the Proxy works when it does not. (Acknowledged as "simplified" at line 426, hence LOW.)

#### F-CC-B06-017 — Unit 12 claims to mirror `packages/api`/`packages/domain` but uses `students` table as the user/auth entity
**File:** unit-11-class-period-plan.md:155–162; unit-13-class-period-plan.md:21,29–32. Sessions FK to `students.id` and `passwordHash` is bolted onto `students` (with the self-aware comment "In a real app, passwords would be in a separate table," line 28). Conflating the learner-progress entity with the auth-principal entity diverges from the real `packages/db` users/auth split. Teaching-simplification, flagged for awareness.

#### F-CC-B06-018 — `next.config.ts` ships commented-out `typescript: { ignoreBuildErrors: true }`
**File:** next.config.ts:24. Dead commented config. Harmless now, but it is a latent footgun (a future maintainer could uncomment it and suppress type errors in a security-sensitive app). Recommend removing rather than leaving as a tempting toggle.

#### F-CC-B06-019 — CSP allows `'unsafe-inline'` and `'unsafe-eval'` in `script-src`
**File:** next.config.ts:62. `script-src 'self' 'unsafe-inline' 'unsafe-eval'` substantially weakens the CSP (XSS mitigation) the rest of the header block (X-Frame-Options, HSTS, nosniff, lines 70–73) is trying to establish. Often required by Next.js dev/runtime, but worth documenting why and tightening for production (nonces/hashes). Production-readiness observation.

#### F-CC-B06-020 — CORS `Access-Control-Allow-Origin` is a single hard-coded origin with no Vary handling
**File:** next.config.ts:39. `Access-Control-Allow-Origin: https://codecamp.reading-advantage.com` is applied to all `/api/(.*)`. If the app is ever served from a preview/staging origin, cross-origin API calls silently break. No `Vary: Origin`. Minor portability/production note (also note: `Authorization` is allowed in ACAH at line 41 though the taught auth is cookie-based, not bearer — minor inconsistency).

---

### INFO

#### F-CC-B06-021 — i18n key parity verified clean
en.json and th.json each contain 188 leaf keys with **zero** key-set differences (verified programmatically). Structural i18n integrity is sound; only value-level issues are noted (F-CC-B06-009/010/011).

#### F-CC-B06-022 — `next.config.ts` security posture is otherwise strong
HSTS with preload, `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy`, `Cache-Control: no-store, private` on `/api`, and a scoped `connect-src ... https://openrouter.ai` matching the AI gateway are all present and correct. `transpilePackages` and `outputFileTracingRoot` are appropriate for monorepo standalone output. This is a positive baseline; findings 018–020 are refinements.

#### F-CC-B06-023 — Webhook/PR-review integration appears well-modeled at the i18n/admin layer
The admin and review message namespaces (en.json:98–195) include webhook diagnostics for "ignored or failed GitHub webhook events" (lines 98–99, 148) and a full PR review state machine (pending → reviewed → needs-changes → approved). This suggests the actual webhook/PR-review feature handles failure/ignore paths — a good sign — but the **implementation files are out of this batch's scope** and were not reviewed. See limitations.

#### F-CC-B06-024 — Curriculum progression is internally consistent on phase/period accounting
Phase tags (A→D), prerequisite chains ("Units 01–NN complete"), and the capstone tally ("18 units. 85 class periods. 4 portfolio projects," unit-18-class-period-plan.md:300) are coherent across the batch. Unit 13 is correctly 4 periods (overview line 4 matches the plan's Period 1–4). Portfolio naming shifts from "Learning Dashboard" (Unit 10) to "Student Progress Tracker" (Units 11+) which matches the phase boundary narrative (unit-10-overview.md:35).

---

## Cross-Reference Evidence

- AGENTS Argon2id mandate vs curriculum bcrypt: confirmed real repo uses Argon2id at `packages/auth/src/password.ts:1,12,24`.
- AI SDK version drift: confirmed app `apps/codecamp-advantage/package.json` ships `ai@^5.0.95`, `@ai-sdk/openai@^2.0.68`, `@ai-sdk/react@^2.0.0`, `next@16.2.9`, `next-intl@^4.0.2`, `@trpc/server@^11.1.0` vs curriculum pins (`ai@4.3.19`, etc.).
- App chat route confirmed to use `maxTokens` + `toDataStreamResponse` at `apps/codecamp-advantage/app/api/chat/route.ts:105,108` (relevant to F-CC-B06-002 — note even the live route uses v4-style calls under a v5 dependency; deeper investigation is out of this batch's scope).
- i18n key parity computed via JSON leaf-key diff: 188 vs 188, empty symmetric difference.

---

## Limitations

1. **Scope boundary:** Only the 20 files in `/tmp/opencode/cc-batch-06` were reviewed in full. Cross-references to `packages/auth`, `package.json`, and `app/api/chat/route.ts` were consulted *only* to validate specific findings; those files were **not** line-reviewed here and may have their own issues.
2. **Curriculum vs code:** 17/20 files are instructional Markdown. Findings describe risks in *taught patterns*; they are not assertions that the shipped codecamp-advantage app contains these defects. The actual runtime auth, webhook, AI, and tenant-scoping implementations were not in this batch and require separate review (the admin/review i18n keys in F-CC-B06-023 strongly imply such code exists).
3. **No execution:** No build, typecheck, lint, or test was run against the curriculum code snippets; correctness assessments are by inspection. AI SDK API-compatibility claims (F-CC-B06-002) are based on documented v4→v5 API changes and observed dependency versions, not a compile.
4. **Thai language:** Translation-quality findings (F-CC-B06-009/010) are based on standard Thai meaning; a native-speaker product review is advisable before remediation.
5. **No remediation performed:** Per instructions, no source files were edited.
6. **No acceptance/closeout determination:** This document is line-review input only and intentionally makes no acceptance, sign-off, or track-closeout claim.

---

## Finding Index

| ID | Severity | File | Anchor |
|----|----------|------|--------|
| F-CC-B06-001 | HIGH | unit-13-class-period-plan.md | 36–46 |
| F-CC-B06-002 | HIGH | unit-15-class-period-plan.md / unit-15-overview.md | 18,88,91,132,458,464 / 11–14,22–24 |
| F-CC-B06-003 | MEDIUM | unit-13-class-period-plan.md | 107–143,176–193 |
| F-CC-B06-004 | MEDIUM | unit-13-class-period-plan.md | 52–86 |
| F-CC-B06-005 | MEDIUM | unit-13-class-period-plan.md | 79–85 |
| F-CC-B06-006 | MEDIUM | unit-13-class-period-plan.md | 355–393 |
| F-CC-B06-007 | MEDIUM | unit-12-class-period-plan.md | 458–464 |
| F-CC-B06-008 | MEDIUM | unit-15-class-period-plan.md | 386–413 |
| F-CC-B06-009 | MEDIUM | messages/th.json | 207 |
| F-CC-B06-010 | MEDIUM | messages/th.json | 20–21 |
| F-CC-B06-011 | LOW | messages/th.json | 153 |
| F-CC-B06-012 | LOW | unit-17-class-period-plan.md | 246 |
| F-CC-B06-013 | LOW | unit-17-class-period-plan.md | 278,320,327 |
| F-CC-B06-014 | LOW | unit-12-class-period-plan.md | 286–305 |
| F-CC-B06-015 | LOW | unit-12-class-period-plan.md | 178,192–197 |
| F-CC-B06-016 | LOW | unit-11-class-period-plan.md | 419–444 |
| F-CC-B06-017 | LOW | unit-11/13-class-period-plan.md | 155–162 / 21,29–32 |
| F-CC-B06-018 | LOW | next.config.ts | 24 |
| F-CC-B06-019 | LOW | next.config.ts | 62 |
| F-CC-B06-020 | LOW | next.config.ts | 39–41 |
| F-CC-B06-021 | INFO | en.json / th.json | — |
| F-CC-B06-022 | INFO | next.config.ts | 34–77 |
| F-CC-B06-023 | INFO | en.json | 98–195 |
| F-CC-B06-024 | INFO | unit-18-class-period-plan.md | 300 |

**Totals:** 2 HIGH, 8 MEDIUM, 10 LOW, 4 INFO across 20 files.
