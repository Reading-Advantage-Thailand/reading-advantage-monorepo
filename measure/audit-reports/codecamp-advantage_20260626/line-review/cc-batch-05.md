# Line-by-Line Review — Batch `cc-batch-05`

**Track:** `codecamp_advantage_review_20260626`
**Batch:** cc-batch-05
**Reviewer:** ark-code-latest (subagent, line review)
**Date:** 2026-06-27
**Scope:** Curriculum/progression correctness, GitHub/webhook/AI integration risks, auth/role boundaries, production readiness, AGENTS compliance, test quality.
**Constraint:** Read-only. No source code was edited. This report makes **no acceptance or closeout claims**; it is line-review evidence only.

---

## Files Reviewed (20/20)

| # | File | Lines | Type |
|---|------|-------|------|
| 1 | apps/codecamp-advantage/measure/curriculum/course-spec.md | 124 | curriculum spec |
| 2 | apps/codecamp-advantage/measure/curriculum/unit-01-class-period-plan.md | 150 | curriculum doc |
| 3 | apps/codecamp-advantage/measure/curriculum/unit-01-overview.md | 47 | curriculum doc |
| 4 | apps/codecamp-advantage/measure/curriculum/unit-02-class-period-plan.md | 292 | curriculum doc |
| 5 | apps/codecamp-advantage/measure/curriculum/unit-02-overview.md | 45 | curriculum doc |
| 6 | apps/codecamp-advantage/measure/curriculum/unit-03-class-period-plan.md | 597 | curriculum doc |
| 7 | apps/codecamp-advantage/measure/curriculum/unit-03-overview.md | 52 | curriculum doc |
| 8 | apps/codecamp-advantage/measure/curriculum/unit-04-class-period-plan.md | 853 | curriculum doc |
| 9 | apps/codecamp-advantage/measure/curriculum/unit-04-overview.md | 53 | curriculum doc |
| 10 | apps/codecamp-advantage/measure/curriculum/unit-05-class-period-plan.md | 557 | curriculum doc |
| 11 | apps/codecamp-advantage/measure/curriculum/unit-05-overview.md | 50 | curriculum doc |
| 12 | apps/codecamp-advantage/measure/curriculum/unit-06-class-period-plan.md | 482 | curriculum doc |
| 13 | apps/codecamp-advantage/measure/curriculum/unit-06-overview.md | 51 | curriculum doc |
| 14 | apps/codecamp-advantage/measure/curriculum/unit-07-class-period-plan.md | 921 | curriculum doc |
| 15 | apps/codecamp-advantage/measure/curriculum/unit-07-overview.md | 54 | curriculum doc |
| 16 | apps/codecamp-advantage/measure/curriculum/unit-08-class-period-plan.md | 533 | curriculum doc |
| 17 | apps/codecamp-advantage/measure/curriculum/unit-08-overview.md | 52 | curriculum doc |
| 18 | apps/codecamp-advantage/measure/curriculum/unit-09-class-period-plan.md | 582 | curriculum doc |
| 19 | apps/codecamp-advantage/measure/curriculum/unit-09-overview.md | 54 | curriculum doc |
| 20 | apps/codecamp-advantage/measure/curriculum/unit-10-class-period-plan.md | 475 | curriculum doc |

**Note on file types:** All 20 files in this batch are instructional Markdown (the course spec plus Units 01–10, covering Phases A and B). These are not shipped runtime code, so "production readiness" findings are scoped to *what they teach interns to ship*. Curriculum that teaches insecure, stale, or non-mirroring patterns is a real risk because the course explicitly positions itself as "Architecture mirroring" of the Reading Advantage monorepo (course-spec.md:107) and interns later contribute to the real app.

---

## Severity Legend

- **HIGH** — Security/correctness defect, or curriculum teaching a pattern that contradicts AGENTS mandates or would ship a vulnerability/broken build.
- **MEDIUM** — Misleading/stale guidance, integration risk, or maintainability concern that could cause interns to write broken/incorrect code.
- **LOW** — Minor inaccuracy, polish, consistency, or doc-hygiene issue.
- **INFO** — Observation / no action strictly required.

---

## Cross-Cutting Version Verification

I verified curriculum version claims against the live monorepo lockfile/manifests:

| Tech | Curriculum claims (course-spec.md:34–56) | Actual repo | Verdict |
|------|------|------|---------|
| pnpm | 8.15.8 (course-spec.md:37; unit-01:53–63) | root `package.json` `packageManager: pnpm@11.8.0` | **Mismatch (MEDIUM)** |
| AI SDK `ai` | 4.3.19 (course-spec.md:50) | codecamp `ai@^5.0.95` | **Mismatch (MEDIUM, ties to AI unit)** |
| @ai-sdk/openai | 1.3.24 (course-spec.md:51) | codecamp `@ai-sdk/openai@^2.0.68` | **Mismatch (MEDIUM)** |
| @ai-sdk/react | 1.2.12 (course-spec.md:52) | codecamp `@ai-sdk/react@^2.0.0` | **Mismatch (MEDIUM)** |
| Drizzle ORM | 0.44.7 (course-spec.md:43) | root `drizzle-orm@0.45.2` | Minor drift (LOW) |
| Next.js | 16.0.0 (course-spec.md:39) | codecamp `next@16.2.9` | Minor drift (LOW) |
| React | 19.2.5 (course-spec.md:40) | codecamp `react@^19.2.7` | Minor drift (LOW) |
| next-intl | 4.11.0 (course-spec.md:49) | codecamp `next-intl@^4.0.2` | Mismatch (LOW) |
| Vitest | 4.1.5 (course-spec.md:47) | codecamp `vitest@^4.1.8` | Minor drift (LOW) |
| TypeScript | 5.9.3 (course-spec.md:38) | codecamp `typescript@^5.9.3` (root `^5.8.3`) | OK for app |
| Zod | 3.25.76 (course-spec.md:46) | codecamp `zod@^3.24.3` | Minor drift (LOW) |

Most version drift is benign caret-range float, captured as a single LOW finding (F-CC-B05-010). Two are escalated because they change taught APIs (pnpm major, AI SDK major).

---

## Findings

### HIGH

#### F-CC-B05-002 — Auth middleware example teaches a non-cryptographic, unverified session pattern (insecure pattern that contradicts AGENTS auth requirements)
**File:** unit-10-class-period-plan.md:147–161.
The middleware example reads `request.cookies.get("session")?.value` and, if present, immediately trusts it: `response.headers.set("x-user-id", decodeSessionToken(sessionToken))` (line 159). There is **no signature/verification step** — mere *presence* of any `session` cookie passes the gate (line 151), and `decodeSessionToken` is presented as a plain decode (not verify). AGENTS.md ("Authentication Requirements") mandates **PostgreSQL-backed sessions**, **HttpOnly secure cookies**, and **CSRF protection**; it also warns auth must be verified server-side. Teaching "cookie exists → authenticated → trust decoded user id in a header" is exactly the forgeable-header / unauthenticated-trust antipattern. An intern shipping this to the real multi-tenant app would create an auth bypass and a tenant-spoofing vector (downstream code trusting `x-user-id`). Even as a teaching simplification it should be explicitly flagged as *not production auth* and point to the session-validation adapter. **Action:** add an explicit verify step (DB/session lookup or signed-token verification) and a warning banner; do not present header-injected user id as safe.

### MEDIUM

#### F-CC-B05-001 — Spec conflates "Unit" and "Module" terminology, risking progression/prerequisite keying errors
**File:** course-spec.md:62 (table header "Unit | Module"), 64–96; course-spec.md:100 ("must complete Unit N before Unit N+1"); curriculum filenames `unit-NN-*.md`.
Period/unit arithmetic was verified and **does reconcile**: Phase A 2+4+6+8+5+4 = 29 (course-spec.md:60); Phase B 7+5+6+5 = 23 (md:71); Phase C 5+5+4 = 14 (md:80); Phase D 3+5+3+4+4 = 19 (md:88); total = **85** (md:13), ≈ 4 months at one period per workday — internally consistent. **However**, the structure tables present two parallel identifiers — a "Unit" column (01–18) and a "Module" column (the named module) under the same header (course-spec.md:62) — while the prerequisite rule (course-spec.md:100) and filenames use only "Unit." If any progress-tracking schema, quiz registry, or exercise registry keys off "module" while prerequisite enforcement keys off "unit," the two namespaces can drift and break sequential gating. **Action:** standardize on a single term (recommend "unit") across the spec, filenames, and any progress/prerequisite schema. (No numeric defect; reframed from an initial duration concern after verification.)

#### F-CC-B05-003 — AI SDK version table is two majors stale vs the shipped app (will mislead the later AI unit and any "mirroring" claim)
**File:** course-spec.md:50–52 (`ai 4.3.19`, `@ai-sdk/openai 1.3.24`, `@ai-sdk/react 1.2.12`).
The codecamp app actually ships `ai@^5.0.95`, `@ai-sdk/openai@^2.0.68`, `@ai-sdk/react@^2.0.0`, plus `@ai-sdk/google@^2.0.36` (not listed at all). The spec claims "All versions are pinned to match the Reading Advantage monorepo" (course-spec.md:32) — this is false for the AI stack. v4→v5 changed core APIs (`maxTokens`→`maxOutputTokens`, `toDataStreamResponse`→`toUIMessageStreamResponse`, transport-based `useChat`). Interns reaching Unit 15 with these pins will write code that won't compile against the installed SDK. (This batch only contains the spec table, not Unit 15 itself; the concrete API breakage is in cc-batch-06 F-CC-B06-002.) **Action:** reconcile the version table with the app's real dependencies, or state explicitly that the standalone tracker pins older versions.

#### F-CC-B05-004 — pnpm version mismatch (8.15.8 vs repo's pnpm 11.8.0) taught as a verification checkpoint
**File:** course-spec.md:37; unit-01-class-period-plan.md:53–63, 143; unit-01-overview.md:24.
Unit 01 instructs interns to `corepack prepare pnpm@8.15.8 --activate` and verify `pnpm --version # 8.15.8`, and even quizzes it ("What version of Node.js does this monorepo use?" / pnpm rationale, unit-01:143). The repo's root `package.json` declares `packageManager: "pnpm@11.8.0"`. An intern who installs 8.15.8 and then runs `pnpm install` in the monorepo may hit a `packageManager`/corepack enforcement mismatch, or a different lockfile format. **Action:** align taught pnpm version with the repo's `packageManager` field (11.x), and prefer reading the version from the repo rather than hardcoding.

#### F-CC-B05-005 — Broken relative doc links in the course spec (assessment/pacing references resolve outside the app)
**File:** course-spec.md:115.
The spec links assessment and pacing docs as `../../../docs/assessment-rubric.md` and `../../../docs/pacing-guide.md`. From `apps/codecamp-advantage/measure/curriculum/`, three `../` segments resolve to `apps/docs/...` — which does **not exist**. The real files live at `apps/codecamp-advantage/docs/assessment-rubric.md` and `.../pacing-guide.md` (confirmed present), reachable via `../../docs/...` (two `../`). The links are dead. **Action:** change `../../../docs/` to `../../docs/`.

#### F-CC-B05-006 — `useApi` hook teaches an exhaustive-deps violation (stale-closure / lint-error pattern)
**File:** unit-08-class-period-plan.md:160–187 (esp. 163–184).
`useApi<T>(fetcher, deps = [])` calls `useEffect(fetchData, deps)` where the effect body closes over `fetcher` but `fetcher` is **not** in the dependency array (only the caller-supplied `deps` is). This is precisely the `react-hooks/exhaustive-deps` violation the React unit warns against ("Never lie about dependencies (eslint-plugin-react-hooks catches this)," unit-07:291). Callers pass inline arrows (`useApi(() => fetchModules(), [])`, line 193) so `fetcher` is a new identity each render; the lint rule will flag it, and if `fetcher` ever captures changing state it goes stale. Teaching a hook that the project's own lint config rejects undermines the "Reading Advantage approach" framing. **Action:** include `fetcher` in deps (and wrap callers in `useCallback`), or document the trade-off explicitly.

#### F-CC-B05-007 — Quiz/form error mapping uses `issue.path[0].toString()` without guarding empty paths (runtime crash risk taught as the pattern)
**File:** unit-07-class-period-plan.md:704–707, 770–773.
Both the `ContactForm` and the `useFormState` hook do `const field = issue.path[0].toString();`. For Zod issues raised at the **root** of the object (e.g., `z.object(...).refine(...)` failures, or a non-object input), `issue.path` is `[]`, so `issue.path[0]` is `undefined` and `.toString()` throws `TypeError`. The taught pattern silently assumes every issue has a leaf path. For the simple field schemas shown it usually holds, but it's a fragile pattern being installed into a reusable hook (`useFormState`) that interns will copy. **Action:** guard with `issue.path[0]?.toString() ?? "_form"` or `String(issue.path[0] ?? "_form")`.

#### F-CC-B05-008 — Middleware CORS example teaches wildcard `Access-Control-Allow-Origin: *` on API routes (production-readiness/security smell)
**File:** unit-10-class-period-plan.md:182–188.
The "Middleware Patterns" section adds `response.headers.set("Access-Control-Allow-Origin", "*")` to all `/api/` routes. Combined with the cookie-session auth taught in the same file (lines 147–161), an open `*` CORS policy on authenticated, cookie-bearing endpoints is a recipe for cross-origin abuse once interns carry it forward. The example is presented without caveat. **Action:** note that `*` is for public/unauthenticated APIs only, and that credentialed endpoints require an explicit origin allowlist (and cannot combine `*` with credentials).

#### F-CC-B05-009 — `dangerouslySetInnerHTML`-equivalent `innerHTML` injection taught with unescaped interpolation (XSS pattern)
**File:** unit-04-class-period-plan.md:536–544, 640–648; unit-04:270; unit-07 reuses the rendered-card idea safely via JSX.
The JS unit renders user/data-driven content with `grid.innerHTML = projects.map(p => \`...${p.title}...${p.desc}...\`)` and `hero.querySelector("p").innerHTML = "..."`. With trusted local JSON this is benign, but the pattern (string-interpolating values into `innerHTML`) is taught as the normal way to render dynamic data, with no mention of escaping or the XSS risk when data is user-controlled. Since the very next phase moves to fetched/remote data (Unit 08) and the same shape of code recurs, the unescaped-`innerHTML` habit is a latent XSS teaching. **Action:** add a one-line caution that `innerHTML` with external data is unsafe and that React/JSX (taught later) escapes by default; prefer `textContent` or DOM creation for untrusted values.

#### F-CC-B05-010 — Aggregate version drift between curriculum and shipped manifests
**File:** course-spec.md:34–56 (table); echoed in every unit's "Technologies & Versions" table (e.g., unit-05:21–25, unit-06:20–24, unit-07:22–26, unit-09:20–24).
Beyond the escalated pnpm/AI items, multiple pinned versions float from the repo: Next.js 16.0.0 vs 16.2.9, React 19.2.5 vs ^19.2.7, Zod 3.25.76 vs ^3.24.3, Drizzle 0.44.7 vs 0.45.2, next-intl 4.11.0 vs ^4.0.2, Vitest 4.1.5 vs ^4.1.8. The spec's claim that versions "are pinned to match the Reading Advantage monorepo" (course-spec.md:32) is only loosely true. Because every unit restates exact versions, drift must be maintained in ~20 places. **Action:** state a tolerance ("matches the monorepo's current pinned ranges; exact patch versions may differ") and/or single-source the table.

### LOW

#### F-CC-B05-011 — `git remote -h` is taught as remote help but is not a valid Git invocation
**File:** unit-02-class-period-plan.md:121.
`git remote -h` prints `git remote` usage, which is fine, but it is listed inline alongside `git remote -v` as if `-h` were a remote subcommand for "Help" — interns may infer `-h` is a general remotes flag. Minor; clarify it's the help flag for the `remote` command.

#### F-CC-B05-012 — Conventional-commit teaching omits the repo's mandatory track-id requirement
**File:** unit-02-class-period-plan.md:63–72, 240–247; unit-02-overview.md:31–33.
The unit teaches Conventional Commits (`feat:`/`fix:`/`chore:`/`docs:`) but the monorepo's commitlint hook additionally requires non-chore subjects to carry a `(track_id: <name>_<YYYYMMDD>)` reference (AGENTS.md "Commit Style"). Interns who later commit to the real repo will be rejected by the hook. Worth a forward-reference note. (Scoped LOW because Unit 02 portfolio repos are standalone, not the monorepo.)

#### F-CC-B05-013 — `forking → PR → LLM review` exercise loop never specifies branch protection / who merges (GitHub workflow gap)
**File:** course-spec.md:106, 109; unit-02-class-period-plan.md:178–216, 238–247; recurring "opens a PR for LLM review" in unit-03:582, unit-04:838, unit-05:542, unit-06:466, unit-07:906, unit-08:518, unit-09:567, unit-10:459.
Every unit's exercise ends "opens a PR for LLM review," and the spec lists "fork-based exercises" + "GitHub Issues practice" as core (course-spec.md:106–109), but no file in this batch describes the integration mechanics: which GitHub App/webhook receives the PR, what scopes/permissions it needs, how the LLM review is posted back, or merge authority. This is the central GitHub/webhook/AI integration surface of the product and it is undescribed in the Phase A/B curriculum. (The integration spec may live in `docs/github-app-setup.md` / `docs/pr-review-e2e-runbook.md`, which exist but are out of this batch's scope — see Limitations.) Flagging as LOW here since these are teaching docs, not the integration code, but the repeated promise with no linkage is a documentation gap.

#### F-CC-B05-014 — Test-import extension `.js` for `.ts` sources may confuse interns under the app's Vitest config
**File:** unit-06-class-period-plan.md:53, 93, 190, 328.
Examples import source as `from "../utils.js"`, `from "../api.js"`, `from "../validate-email.js"` while the files are `.ts`. This NodeNext-style extension works under some resolver configs but contradicts the rest of the curriculum, which imports without extensions (e.g., unit-07 `from "./components/ModuleCard"`). Inconsistent and likely to error under a default Vitest/tsconfig `bundler` resolution (which unit-05:395 itself sets). **Action:** drop the `.js` extension for consistency with the bundler moduleResolution taught in Unit 05.

#### F-CC-B05-015 — `cache: "no-store"` + default-cache guidance is slightly stale for Next 16 semantics
**File:** unit-09-class-period-plan.md:255, 278–286.
The caching note states a bare `fetch(url)` is "cached until revalidated (like SSG)" by default. In Next.js 15/16 the default `fetch` cache changed (no longer cached by default in many configs / Cache Components). Teaching "default = cached SSG" can mislead interns on the installed `next@16.2.9`. **Action:** verify against Next 16 caching defaults and adjust.

#### F-CC-B05-016 — `params` typing inconsistency within and across units (Promise vs plain object)
**File:** unit-09-class-period-plan.md:293 (`params: { slug: string }`, used synchronously) vs unit-09:362–366 and unit-10:52–54 (`params: Promise<{ slug: string }>` with `await`).
Unit 09 Period 3 (line 293) accesses `params.slug` synchronously in `Promise.all`, while Period 4 (line 362) and Unit 10 (line 52) correctly type `params` as a Promise and `await` it — and line 383 explicitly states "In Next.js 16, `params` is a Promise." The earlier example (line 293) is therefore wrong for Next 16 and contradicts the later correct guidance. **Action:** make the Period 3 example `await params`.

#### F-CC-B05-017 — `next/font/google` (Inter) taught as privacy-preserving/self-hosted without noting build-time network dependency
**File:** unit-10-class-period-plan.md:366–386.
Minor: the claim "Privacy (no Google Analytics tracking)" and "self-hosted" is correct at runtime, but `next/font/google` still fetches font files from Google at build time, which can fail in air-gapped/CI environments. A one-line caveat would improve production-readiness accuracy. INFO-adjacent; LOW.

### INFO

#### F-CC-B05-018 — Strong, AGENTS-aligned teaching of Zod-at-boundaries and discriminated unions (positive)
**File:** unit-05-class-period-plan.md:250–355; unit-08:154–187 (`ApiState<T>` discriminated union); unit-07:591–600.
The TypeScript/Zod and API units correctly emphasize runtime validation at boundaries, `z.infer` single-source typing, `safeParse`, and discriminated-union state — all consistent with AGENTS "Contracts and Validation." No action; noted as evidence the curriculum aligns with core architecture in these areas.

#### F-CC-B05-019 — Route Handler Zod-validation example is correct and idiomatic (positive)
**File:** unit-10-class-period-plan.md:27–41, 50–71, 77–89.
The POST handler validates with `safeParse`, returns `400` with issues, and handles `SyntaxError`/`500` — good production hygiene and consistent with AGENTS "Runtime validation is required at all external boundaries." Note (non-blocking): `getQuizQuestions`/`saveQuizResult`/`calculateScore` (lines 64–68) are unscoped helpers with no tenant/`schoolId` context; if mirrored into the real multi-tenant app they must be tenant-scoped (AGENTS "Multi-Tenancy"). Tracked as INFO since this is standalone teaching code.

#### F-CC-B05-020 — Quiz scoring component computes score client-side only (acceptable for teaching, risky if mirrored)
**File:** unit-07-class-period-plan.md:800–859 (`Quiz` component, line 804–806 client scoring) vs unit-10:64–70 (server scoring).
Unit 07 scores the quiz in the browser by comparing against `q.correctAnswer` embedded in client props — fine for a static SPA lesson, and Unit 10 later correctly moves scoring server-side. Noted so the progression (client → server scoring) is intentional and not contradictory. No action.

---

## AGENTS Compliance Summary (batch scope)

| AGENTS area | Observation |
|-------------|-------------|
| Argon2id password hashing | Not violated in this batch (auth unit is Unit 13, cc-batch-06). Middleware session-trust pattern (F-CC-B05-002) is the auth concern here. |
| Zod at boundaries | Well taught (F-CC-B05-018, -019). |
| Multi-tenancy / `schoolId` scoping | Not addressed in Phase A/B teaching code; helpers in Unit 10 are unscoped (F-CC-B05-019 INFO). |
| Commit style + track-id | Partially taught; mandatory track-id omitted (F-CC-B05-012). |
| Provider-neutral adapters (AI/storage) | Out of scope for Units 01–10; AI adapter concern is the version table (F-CC-B05-003). |
| Testing | Vitest, AAA, mocking, TDD, >80% coverage all taught well; one import-extension nit (F-CC-B05-014). |

---

## Limitations

1. **Scope is exactly the 20 files in `/tmp/opencode/cc-batch-05`** — the course spec and Units 01–10 (Phases A and B). Units 11–18 (databases, tRPC, auth, i18n, AI, monorepo, Docker, real-world) are in other batches; auth/AI integration findings that depend on those units (e.g., bcrypt vs Argon2id, AI SDK v4 API breakage) are cross-referenced to cc-batch-06 but not re-verified here.
2. **Read-only review.** No source or curriculum files were edited; no commands mutated state. Version checks were read from `package.json` files only (not a full `pnpm install` resolution), so exact installed patch versions may differ from manifest ranges.
3. **These are teaching documents, not runtime code.** "Production readiness" and "security" findings are assessed against *what interns are taught to write*, weighted by the curriculum's explicit "architecture mirroring" claim. Where a pattern is a deliberate teaching simplification, that is noted.
4. **GitHub/webhook/AI integration mechanics** (the PR → LLM-review loop) are referenced repeatedly by the curriculum but the implementing code/specs (`docs/github-app-setup.md`, `docs/pr-review-e2e-runbook.md`) are outside this batch; F-CC-B05-013 flags the documentation gap but does not audit the integration itself.
5. **No execution/compilation was performed** on the example snippets; correctness findings (e.g., F-CC-B05-006, -007, -016) are by static reading against the documented Next 16 / React 19 / Zod 3 semantics and the repo's configs.
6. This report is **line-review evidence only** and makes **no acceptance or closeout determination** for the track.
