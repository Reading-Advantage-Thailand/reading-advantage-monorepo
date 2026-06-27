# Line Review: sa-batch-11

- **Track**: `science_advantage_review_20260626`
- **Batch**: sa-batch-11 (20 files)
- **Review date**: 2026-06-27
- **Reviewer**: automated agent
- **Focus areas**: correctness, security/tenancy/auth, AGENTS.md compliance, test quality, architecture baseline / golden-path patterns

---

## Files Reviewed

1. `apps/science-advantage/components/ui/radio-group.tsx`
2. `apps/science-advantage/components/ui/select.tsx`
3. `apps/science-advantage/components/ui/skeleton.tsx`
4. `apps/science-advantage/components/ui/table.tsx`
5. `apps/science-advantage/components/ui/tooltip.tsx`
6. `apps/science-advantage/contexts/display-preference-context.tsx`
7. `apps/science-advantage/contexts/language-context.tsx`
8. `apps/science-advantage/data/content/grade-4/standards-mapping.json`
9. `apps/science-advantage/docs/MIGRATION-REPORT.md`
10. `apps/science-advantage/docs/README.md`
11. `apps/science-advantage/docs/ai-image-generation.md`
12. `apps/science-advantage/docs/archive/README.md`
13. `apps/science-advantage/docs/archive/architecture/api-class-management.md`
14. `apps/science-advantage/docs/archive/architecture/api-spec.md`
15. `apps/science-advantage/docs/archive/architecture/backend-architecture.md`
16. `apps/science-advantage/docs/archive/architecture/checklist-results-report.md`
17. `apps/science-advantage/docs/archive/architecture/coding-standards.md`
18. `apps/science-advantage/docs/archive/architecture/components.md`
19. `apps/science-advantage/docs/archive/architecture/core-workflows.md`
20. `apps/science-advantage/docs/archive/architecture/data-models.md`

---

## File-by-File Findings

### File 1: `radio-group.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 9, 22 | Exports `RadioGroup` and `RadioGroupItem` — standard Radix UI primitive wrapper. Correct `"use client"` directive. Uses `cn()` for class merging. No business logic. | OK | — |
| 9, 22 | **No JSDoc on either exported function.** AGENTS.md requires "every exported function, class, interface, and type alias must have a JSDoc comment." Neither `RadioGroup` nor `RadioGroupItem` has any documentation. | Low | F-SA-B11-001 |
| 1 | `"use client"` is necessary for Radix interactive components. | OK | — |

**Verdict**: Functionally correct. Missing JSDoc on exported components.

---

### File 2: `select.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 9–129 | Exports 7 components (`Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`, `SelectLabel`, `SelectItem`, `SelectSeparator`). All use `React.forwardRef`. All set `displayName`. Correct `"use client"` directive. | OK | — |
| 9, 11, 13, 15, 37, 72, 84, 108 | **No JSDoc on any exported component.** Seven components exported without documentation. Violates AGENTS.md JSDoc requirement. | Low | F-SA-B11-001 |
| 22–23 | Uses two separate `className` template literals with different ring styles (`aria-expanded:ring-ring/30 ring-ring/30` at L22 plus `focus-visible:border-ring focus-visible:ring-ring/50` at L23). The duplication of ring styles is intentional for different states (aria-expanded vs focus-visible) but the first line includes `ring-ring/30` twice (identical to `aria-expanded:ring-ring/30` pattern). This is a minor CSS deduplication opportunity rather than a bug. | Low | — |
| 72–82 | `SelectLabel` renders `text-muted-foreground` — semantically a label should not be muted. Minor accessibility concern. | Info | — |

**Verdict**: Correct Radix adapter implementation. Missing JSDoc across all exports.

---

### File 3: `skeleton.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1 | `"use client"` directive present but **not strictly needed** — `Skeleton` is a pure `<div>` with CSS classes and no hooks, event handlers, or browser APIs. The `"use client"` directive forces client-side rendering unnecessarily. However, in the shadcn/ui ecosystem, all component files conventionally begin with `"use client"` for consistency, so this is not a deviation from project norms. | Info | — |
| 7 | Exports `SkeletonProps` type. | OK | — |
| 9 | Exports `Skeleton` function component. | OK | — |
| 7, 9 | **No JSDoc on exported type or function.** | Low | F-SA-B11-001 |
| 12 | Uses `bg-slate-200` for the pulse color. This is a hardcoded color value rather than a CSS variable (e.g., `bg-muted`). If the project supports theming (dark mode, accessibility high-contrast), `bg-slate-200` will not adapt. The `globals.css` in batch-05 defines CSS custom properties for colors. | Low | F-SA-B11-002 |

**Verdict**: Standard skeleton component. Hardcoded color prevents dark-mode adaptation.

---

### File 4: `table.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–117 | Exports 8 table components (`Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`). All use `React.forwardRef`. All set `displayName`. | OK | — |
| 1 | **No `"use client"` directive.** Unlike the other UI primitives in this batch, `table.tsx` correctly omits it — it renders only host elements (`<table>`, `<thead>`, etc.) with no hooks or event handlers. | OK | — |
| 1–117 | Uses **semicolons** for statement termination. All other UI files in this batch (radio-group, select, skeleton, tooltip) omit semicolons. This creates an inconsistency within the same directory. | Low | F-SA-B11-003 |
| 5, 19, 27, 39, 54, 69, 84, 96, 108 | **No JSDoc on any exported component.** Eight exported components missing documentation. | Low | F-SA-B11-001 |
| 14 | `caption-bottom` on the `<table>` element — correct placement for `caption-side: bottom`. | OK | — |
| 73 | `[&:has([role=checkbox])]:pr-0` — uses the `:has()` CSS selector which is well-supported in modern browsers but has no fallback for older clients. Acceptable for the target audience. | Info | — |

**Verdict**: Correct, clean table implementation. Semicolon inconsistency with sibling files.

---

### File 5: `tooltip.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–31 | Exports 4 components (`Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`). Correct Radix wrapper pattern with `"use client"`. Sets `displayName`. | OK | — |
| 8, 10, 12, 14 | **No JSDoc on any exported component.** | Low | F-SA-B11-001 |
| 31 | Trailing blank line after the last export — minor formatting inconsistency (other files in this batch do not have a trailing newline after the last line of exports). | Info | — |
| 22 | Uses hardcoded border/shadow colors (`border-gray-200`, `bg-white`, `text-gray-900`, `shadow-md`) instead of CSS custom properties (e.g., `border-popover`, `bg-popover`, `text-popover-foreground`). If the project supports dark mode, these hardcoded light-mode values will not adapt. Compare with `select.tsx` which correctly uses `border-input`, `bg-popover`, `text-popover-foreground`. | Medium | F-SA-B11-004 |

**Verdict**: Functionally correct. Hardcoded light-mode colors prevent dark-mode adaptation, unlike sibling components that use CSS variables.

---

### File 6: `display-preference-context.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–106 | Provides bilingual display preference context with three modes: `'en'`, `'th'`, `'side-by-side'`. Persists to `localStorage`. SSR-safe with `mounted` guard. | OK | — |
| 11 | `DisplayPreference` type is a union of three literal strings — correct. | OK | — |
| 24–29 | Context default value uses `'side-by-side'` with both `showThai` and `showEnglish` as `true`. Default matches the component's `useState` initial value — consistent. | OK | — |
| 49–63 | `useEffect` reads from `localStorage` — correct SSR hydration pattern. The `try/catch` at L51/59 correctly handles `localStorage` unavailability (SSR, incognito). | OK | — |
| 66–79 | `setDisplayPreference` persists to both `displayPreference` and legacy `preferredLanguage` keys. The legacy key backfill at L72–73 uses `pref === 'side-by-side' ? 'en' : pref` — this is reasonable for backward compatibility. | OK | — |
| 11, 13, 24, 42, 105 | **No JSDoc on `DisplayPreference` type, `DisplayPreferenceContextType` interface, context variable, or `useDisplayPreference` hook.** The provider component has JSDoc (L36–41) but the hook at L105 is a bare `export const` with no documentation. AGENTS.md requires JSDoc on all exported functions and types. | Low | F-SA-B11-001 |
| 60–61, 75–76 | Uses `console.warn` for localStorage failures. AGENTS.md states "avoid free-form console logging in production code." Should use the structured logger from `lib/observability/logger.ts` instead. | Low | F-SA-B11-005 |
| 84–86 | `if (!mounted) { return <>{children}</>; }` — correct SSR hydration guard. The context is not provided during SSR, so the default context value (L24–29) is used. Defaults are consistent with the initial state. | OK | — |

**Verdict**: Well-structured context with proper SSR handling. Missing JSDoc on the hook and types. Console.warn should be structured logger.

---

### File 7: `language-context.tsx`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–84 | Simpler binary language preference context (`'en'` | `'th'`). Same SSR-safe pattern as File 6. | OK | — |
| 30–45 | `useEffect` reads from `localStorage` key `preferredLanguage` — consistent with the legacy key that `DisplayPreferenceProvider` also writes to. | OK | — |
| 21–22 | JSDoc on `LanguageProvider` (L22–29) — present and descriptive. | OK | — |
| 75–83 | JSDoc on `useLanguage` hook — present, with `@returns` and `@example`. | OK | — |
| 5 | **No JSDoc on `LanguageContextType` interface** — minor violation of AGENTS.md requirement for exported types. | Low | F-SA-B11-001 |
| 43 | Uses `console.warn('[LanguageProvider] Unable to access localStorage')` — same concern as File 6. Should use structured logger. | Low | F-SA-B11-005 |
| 11–15 | Context default value defaults to `language: 'en'` and `showThai: false` — consistent with initial state. | OK | — |
| 57–59 | SSR hydration guard — correct. | OK | — |

**Verdict**: Clean context implementation with proper documentation on provider and hook. Console.warn concern (same as File 6).

---

### File 8: `standards-mapping.json`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–86 | Grade 4 science standards for the THAI framework. 20 standards across 7 categories (Sc1: Organ systems, Sc2: Ecosystems, Sc3: Matter, Sc4: Forces, Sc5: Energy, Sc6: Solar system, Sc7: Scientific method). | OK | — |
| 6–7 | First standard `Sc1.1-G4` — code format is consistent throughout. | OK | — |
| 3 | `"gradeLevel": 4` — integer, correct. | OK | — |
| 2 | `"framework": "THAI"` — matches the expected string literal from the seed data and schemas. | OK | — |
| 85 | No trailing comma after the last standard — valid JSON. | OK | — |
| — | **No cross-reference linkage**: This file defines standards codes (`Sc1.1-G4`, etc.) but there is no foreign-key or reference field connecting these codes to specific lessons or quiz questions in the seed data. The standards mapping is currently a standalone data file without consumers — it is not imported or referenced by any code in the batch scope. If it is intended to drive curriculum alignment, integration code is elsewhere. | Info | — |

**Verdict**: Clean, valid JSON. No functional issues. No code references this file within the batch scope.

---

### File 9: `MIGRATION-REPORT.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–66 | Reports a git-workflow migration completed 2025-10-22. Status: `final`. Documents archiving of legacy docs, spec rewrites, and outstanding tasks. | OK | — |
| 14 | "Prepared by: Codex (AI assistant)" — identifies AI authorship. | OK | — |
| 18–19 | Claims "Legacy documentation archived under `docs/archive/`" and "Core specs rewritten" — both are consistent with the current directory structure. | OK | — |
| 22 | References `CLAUDE.md` — at the time of writing, the file was named `CLAUDE.md`. The current codebase uses `AGENTS.md`. The reference is historically accurate for this archived doc but could mislead readers who don't know the rename history. | Info | — |
| 245 | References "Logged via Prisma middleware" — the codebase has since migrated from Prisma to Drizzle. This is expected in an archived document. | Info | — |
| — | No security, correctness, or compliance issues — purely a process documentation file. | OK | — |

**Verdict**: Accurate legacy document. No actionable findings.

---

### File 10: `docs/README.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–41 | Central documentation index pointing to project-brief, prd, specs, sprint, migration report, and legacy archive. Status: `active`. | OK | — |
| 18 | References `project-brief.md` — should verify this file exists at the expected path (the archive version references `docs/project-brief-monolithic.md`). | Info | — |
| 38 | References `CLAUDE.md` — should be updated to `AGENTS.md` to match current naming. | Low | F-SA-B11-006 |
| — | No other issues. Helpful, well-structured index. | OK | — |

**Verdict**: Active documentation index. One stale reference to `CLAUDE.md`.

---

### File 11: `ai-image-generation.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–11 | Short design note describing AI diagram generation. Status: `draft`. | OK | — |
| 7 | References `@reading-advantage/ai`'s `getAIClient()` provider selector — correctly follows the adapter pattern mandated by AGENTS.md. | OK | — |
| 9 | References `.env.example` for `AI_PROVIDER`, `GEMINI_API_KEY`, `OPENAI_API_KEY` — consistent with the environment variable contract. | OK | — |
| 8–10 | Describes config via `aiImageConfig` in `lib/config/ai-images` — the codebase does have this file (seen in batch-21). | OK | — |
| — | No security or correctness issues. | OK | — |

**Verdict**: Accurate, concise design note. Correctly references the AI adapter layer.

---

### File 12: `docs/archive/README.md`

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–28 | Archive index describing the contents of the legacy documentation directory. Status: `deprecated`. | OK | — |
| — | Accurately describes the archive contents. No actionable findings. | OK | — |

**Verdict**: Correct archive index. No findings.

---

### File 13: `api-class-management.md` (Archived)

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–356 | Legacy API design for class management endpoints. Status: `deprecated`. | OK | — |
| 24 | References "NextAuth.js" — the codebase now uses `@reading-advantage/auth`. Expected in archived docs. | Info | — |
| 186–189 | Join code generation algorithm: length 6, charset excludes ambiguous chars (`0, O, 1, I, L`) — this is a well-considered design. The current implementation in `lib/utils/generateJoinCode.ts` should be checked for consistency. | Info | — |
| 244–246 | References "Logged via Prisma middleware" — codebase now uses Drizzle. Archived legacy. | Info | — |
| 250–268 | Shows Prisma schema for `Class` model — superseded by Drizzle schema. Archived legacy. | Info | — |
| 343 | References "Prisma ORM provides protection" against SQL injection — the current codebase uses Drizzle which also provides parameterized queries. | Info | — |
| — | No actionable findings — this is a properly archived deprecated document. | OK | — |

**Verdict**: Correctly archived. Historical value only.

---

### File 14: `api-spec.md` (Archived)

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–913 | Legacy OpenAPI 3.0 specification. Status: `deprecated`. Comprehensive coverage of auth, classes, lessons, experiments, quizzes. | OK | — |
| 32–38 | Defines both `bearerAuth` (JWT) and `sessionAuth` (cookie) — reflects the dual-auth strategy that has since been simplified to session-based auth per AGENTS.md. | Info | — |
| 40–42 | Note explains dual-auth strategy — correctly describes the historical intent. | OK | — |
| 59 | Role enum: `[STUDENT, TEACHER, ADMIN]` — consistent with the current `@reading-advantage/auth` role definitions. | OK | — |
| 81 | Standards alignment: `enum: [THAI, NGSS]` — the THAI framework is present in the codebase; NGSS (Next Generation Science Standards) is defined but may not be implemented yet. | Info | — |
| 148 | Subject enum: `[PHYSICS, CHEMISTRY, BIOLOGY, GENERAL_SCIENCE]` — compare with the actual content data which covers broader topics (ecosystems, weather, etc.). The enum was aspirational. | Info | — |
| 203 | Status enum: `[NOT_STARTED, IN_PROGRESS, COMPLETED]` — consistent with current progress tracking. | OK | — |
| 382–412 | `/auth/login` path with username/password — consistent with the username/password-only auth model in AGENTS.md (no OAuth). | OK | — |
| — | No actionable findings — properly archived deprecated content. | OK | — |

**Verdict**: Comprehensive archived spec. Aligns with current architecture on several points.

---

### File 15: `backend-architecture.md` (Archived)

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–1125 | Legacy backend architecture document. Status: `deprecated`. Contains extensive code examples and architectural descriptions. | OK | — |
| 12–52 | Describes serverless architecture on Vercel with Next.js API Routes — still consistent with current deployment. | OK | — |
| 56–106 | Route handler examples use `prisma` (L60, 79, 125, 142) — migrated to Drizzle. Correctly archived. | Info | — |
| 100 | `console.error('Error fetching lesson completion:', error)` — uses raw console.error instead of structured logging. The current codebase has `lib/observability/logger.ts`. | Info | — |
| 190–287 | Prisma schema definitions — **important legacy reference**. These contain the full model relationships that were migrated to Drizzle. | Info | — |
| 291–524 | `ClassService` and `LessonService` classes — demonstrate the pre-domain-function pattern. Notable: the `generateJoinCode()` at L418–427 uses `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789` which **does include ambiguous characters** (0, O, I, 1, L). The archived `api-class-management.md` (File 13) specifically excluded these. This inconsistency within archived docs is not actionable but worth noting. | Info | F-SA-B11-007 |
| 419 | Join code charset includes `0, O, I, 1, L` — ambiguous characters that were intentionally excluded in the File 13 spec. The current implementation in `lib/utils/generateJoinCode.ts` should be checked for which approach it follows. | Info | — |
| 548–577 | Middleware examples use cookie-based session check — matches the current session auth pattern. | OK | — |
| 586–648 | Error handling uses `ApiError` class and `withErrorHandler` wrapper — conceptually similar to the current `api-helpers.ts` pattern. | OK | — |
| 651–676 | Validation uses manual field checks (`validateRequired`, `validateEmail`) instead of Zod — the current codebase uses Zod. Archived legacy. | Info | — |
| 688–716 | Rate limiting uses in-memory `Map` with IP-based tracking — serverless-friendly but not production-grade (lost on cold starts, not distributed). The current codebase has a Redis-based rate limiter. | Info | — |
| 739–757 | **`sanitizeInput` function strips only `<>` characters** — this is insufficient for XSS prevention. XSS can be delivered without angle brackets (e.g., through event handler attributes, `javascript:` URLs, or encoded variants). However, since this is archived/deprecated code, this is a historical concern, not a current vulnerability. | Info | — |
| 766–826 | `WebSocketManager` using Socket.io — aspirational design. The current codebase does not appear to have real-time WebSocket features implemented. | Info | — |
| 832–951 | `AIService` class calls OpenAI API **directly** via `fetch()` (L863, 914) — this violates the current AGENTS.md adapter rule which requires AI access through `@reading-advantage/ai`. As an archived document, this is expected to be outdated, but it's a good illustration of why the adapter rule exists. | Info | — |
| 958–1024 | Cache service using `ioredis` directly — the current codebase has a cache adapter in `lib/platform/cache-adapter.ts`. | Info | — |
| — | No actionable findings — correctly archived. The inconsistencies between archived documents (join code charset) and the direct OpenAI SDK calls are useful historical context. | OK | — |

**Verdict**: Valuable archived reference. No actionable findings in production code.

---

### File 16: `checklist-results-report.md` (Archived)

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–460 | Self-assessed architecture compliance report. Status: `deprecated`. Rates itself 95–100% pass across all sections. | OK | — |
| 57 | References "Next.js 14 App Router compliance" — the codebase now uses Next.js 15+. | Info | — |
| 60 | References "Prisma ORM" — migrated to Drizzle. | Info | — |
| 86 | References specific version numbers (Next.js 14.2.5, React 18.3.1) — outdated but expected in archived docs. | Info | — |
| 87 | References "Supabase" for PostgreSQL — the codebase now uses direct PostgreSQL via Drizzle. | Info | — |
| 104 | Claims "JWT-based authentication" — the codebase now uses session-based auth per AGENTS.md. | Info | — |
| 180 | References "Google OAuth 2.0" — the auth model is now username/password-only per AGENTS.md. | Info | — |
| 433 | Self-assesses as "ready for immediate development" — this was an optimistic assessment given that multiple technology decisions were subsequently changed (Prisma→Drizzle, Supabase→direct PG, JWT→session). | Info | — |
| — | No actionable findings — archived legacy self-assessment. | OK | — |

**Verdict**: Historical self-assessment. Many technology claims are now inaccurate, which is expected for archived content.

---

### File 17: `coding-standards.md` (Archived)

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–346 | Legacy coding standards. Status: `deprecated`. Contains both still-relevant advice and outdated patterns. | OK | — |
| 20–32 | Rule: shared types in `lib/types.ts` — good practice, still applicable. | OK | — |
| 38–53 | Rule: centralized API client in `lib/api.ts` — good practice, still applicable. | OK | — |
| 58–69 | Rule: env variables through `lib/env.ts` — the current codebase has `lib/env.ts` with Zod validation, consistent with this rule. | OK | — |
| 73–93 | Rule: standardized error responses — relevant, the current batch-05 report found inconsistency in this area (F-SA-B05-003). | OK | — |
| 128–140 | Recommends Zustand over React Context for global state — but Files 6 and 7 in this batch use Context for global state. The coding-standards.md rule (L138) says "Context for simple global state" is forbidden. However, the context files in this batch are for user preference (simple, rarely-changed state) which is a legitimate use case for Context. The rule's blanket prohibition is overly restrictive. | Info | — |
| 138–139 | "Context for simple global state: Use Zustand instead" — this prohibition is not followed by the codebase (see display-preference-context.tsx and language-context.tsx). For simple, low-frequency state like user language preference, React Context is architecturally appropriate and does not warrant Zustand overhead. | Info | — |
| 144–153 | "Server state must be synchronized with database state" with rule "Never cache user data in memory" (L148–153) — overly restrictive. Caching is a valid optimization strategy. The codebase does use caching (Redis adapter in `lib/platform/cache-adapter.ts`). | Info | — |
| 158–170 | Prisma usage rules — outdated; codebase now uses Drizzle. | Info | — |
| 198–233 | Zod validation rules — still good practice, still followed. | OK | — |
| 237–253 | Auth check rules — still good practice, still followed. | OK | — |
| 327–334 | Recommends `React.memo` — this advice is less critical in React 19+ which has improved compiler optimizations (React Forget/React Compiler). Still valid for specific cases. | Info | — |
| — | No actionable findings. The document is a useful historical reference showing which standards are still followed and which have evolved. | OK | — |

**Verdict**: Interesting historical reference. Some advice still relevant, some outdated. The Context-vs-Zustand rule is not followed by the current codebase.

---

### File 18: `components.md` (Archived)

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–532 | Legacy component architecture document with Mermaid diagrams. Status: `deprecated`. | OK | — |
| 18–96 | Mermaid architecture diagram — useful high-level reference showing four layers (Frontend, API, Service, Data). | OK | — |
| 119 | References "NextAuth.js" for authentication — migrated to `@reading-advantage/auth`. | Info | — |
| 124–126 | "JWT tokens for session persistence" — migrated to session-based auth. | Info | — |
| 214 | "MDX for lesson content rendering" — the current codebase uses structured JSON content blocks (text-block, quiz-block, etc.). | Info | — |
| 482 | References "Next.js 14" — codebase now on Next.js 15+. | Info | — |
| 491 | References "Supabase" for PostgreSQL — migrated to direct PG. | Info | — |
| 493 | References "NextAuth.js + Supabase Auth" — both have been replaced. | Info | — |
| — | No actionable findings — correctly archived. | OK | — |

**Verdict**: Archived architecture overview. Technology references are outdated but expected.

---

### File 19: `core-workflows.md` (Archived)

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–687 | Legacy workflow documentation with extensive Mermaid sequence diagrams. Status: `deprecated`. | OK | — |
| 14–51 | "User Authentication Flow (Google OAuth)" — the current auth model is username/password per AGENTS.md ("Features Not Included by Default" section explicitly excludes OAuth). This entire workflow is inaccurate for the current architecture. | Info | — |
| 28–50 | Describes Google OAuth flow with NextAuth.js and Redis — all three technologies have been replaced or removed. | Info | — |
| 79–113 | "Student Lesson Completion Workflow" — the core flow (FETCH → COMPLETE → UPDATE PROGRESS) is still conceptually accurate, though the specific service names differ. | OK | — |
| 138 | References OpenAI API for experiment analysis — the current AI integration uses `@reading-advantage/ai` adapter. | Info | — |
| 506–546 | "Teacher Classroom Management Workflow" — the high-level flow is still conceptually valid. | OK | — |
| 669–670 | "Google OAuth" and "Google Cloud Storage" as external services — GCS may still be used through the storage adapter, but OAuth is removed. | Info | — |
| — | No actionable findings — correctly archived. The Google OAuth workflow is misleading if read as current. | OK | — |

**Verdict**: Archived workflow documentation. The OAuth-centric auth flow is the most significant source of potential misinformation.

---

### File 20: `data-models.md` (Archived)

| Lines | Finding | Severity | ID |
|-------|---------|----------|----|
| 1–834 | Legacy data model reference with TypeScript interfaces and ER diagram. Status: `deprecated`. | OK | — |
| 18–80 | `User` model with `UserProfile`, `UserPreferences`, `EcosystemAccount` — the multi-product ecosystem account linking is a concept not yet observed in the current Drizzle schema. Important architectural context. | Info | — |
| 99 | `Student` model includes `schoolId` — consistent with the multi-tenancy requirement. | OK | — |
| 159 | `Teacher` model includes `schoolId` — consistent. | OK | — |
| 204–249 | `School` model includes `lmsIntegration` — LMS integration may be a future feature. | Info | — |
| 743–759 | `CrossSubjectLink` — aspirational cross-subject integration model. | Info | — |
| 764–794 | ER diagram — comprehensive but reflects the pre-Drizzle schema design. | OK | — |
| 800–801 | "UUIDs for all primary keys to support distributed systems" — consistent with the current Drizzle schema which uses UUIDs. | OK | — |
| — | No actionable findings. Well-organized data model reference that aligns with current architectural intent on many points (UUID PKs, schoolId tenancy, multilingual support, AI integration). | OK | — |

**Verdict**: Comprehensive archived data model reference. SchoolId-based tenancy and UUID PKs align with current architecture.

---

## Summary of Findings

### Critical (must fix)

None identified in this batch. This batch is predominantly UI components and archived documentation — no production route handlers or domain logic.

### Medium

| ID | File | Description |
|----|------|-------------|
| F-SA-B11-004 | `tooltip.tsx` (L22) | Uses hardcoded light-mode colors (`border-gray-200`, `bg-white`, `text-gray-900`) instead of CSS variables. Unlike sibling components (`select.tsx`, `card.tsx` from batch-10) which use `border-input`, `bg-popover`, `text-popover-foreground`, this component will not adapt to dark mode or theme changes. |

### Low

| ID | File | Description |
|----|------|-------------|
| F-SA-B11-001 | Files 1–7 (all seven source files) | Exported functions, components, types, and hooks lack JSDoc comments as required by AGENTS.md: `RadioGroup`, `RadioGroupItem` (file 1); all 7 Select components (file 2); `Skeleton`, `SkeletonProps` (file 3); all 8 Table components (file 4); all 4 Tooltip components (file 5); `DisplayPreference` type, `DisplayPreferenceContextType`, `useDisplayPreference` (file 6); `LanguageContextType` (file 7). Only `LanguageProvider` and `useLanguage` have JSDoc. |
| F-SA-B11-002 | `skeleton.tsx` (L12) | Hardcoded `bg-slate-200` instead of a CSS variable like `bg-muted`. Prevents dark-mode adaptation. |
| F-SA-B11-003 | `table.tsx` (all lines) | Uses semicolons for statement termination, inconsistent with sibling files (radio-group, select, skeleton, tooltip) which omit semicolons. |
| F-SA-B11-005 | `display-preference-context.tsx` (L60–61, L75–76), `language-context.tsx` (L43) | Uses `console.warn` for localStorage errors instead of the structured logger from `lib/observability/logger.ts`. AGENTS.md says "avoid free-form console logging in production code." |
| F-SA-B11-006 | `docs/README.md` (L38) | References `CLAUDE.md` which has been renamed to `AGENTS.md`. |
| F-SA-B11-007 | `backend-architecture.md` (L418–427) (archived) | Join code generation uses charset `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789` which includes ambiguous characters (0, O, I, 1, L). The archived `api-class-management.md` (File 13) explicitly excludes these. Not a production finding since both are archived, but the inconsistency should be resolved in the current `lib/utils/generateJoinCode.ts` implementation — whichever approach is used there should be the canonical one. |

### Info (non-blocking observations)

| ID | File | Description |
|----|------|-------------|
| — | `coding-standards.md` (L138) | Archived rule forbidding React Context for global state is not followed by the codebase (Files 6 and 7 use Context). For simple preferences, Context is appropriate. |
| — | `core-workflows.md` (L14–51) | Archived Google OAuth auth flow is the most potentially misleading document — the current architecture uses username/password-only auth with no OAuth support. |
| — | `checklist-results-report.md` (L433) | Archived self-assessment claiming "architecture is ready for development" — subsequent technology migrations (Prisma→Drizzle, Supabase→PG, JWT→session) suggest this was premature. |

---

## Strengths Observed

1. **shadcn/ui primitives (Files 1–5)**: All correctly follow the Radix adapter pattern with proper `"use client"` directives (or intentional omission in `table.tsx`), `React.forwardRef`, `displayName` assignment, and `cn()` class merging. Consistent with the broader component library seen in batch-10.

2. **Context implementations (Files 6–7)**: Both contexts correctly implement the SSR hydration guard pattern (`mounted` state + `useEffect` for localStorage reads). Both handle `localStorage` unavailability gracefully with `try/catch`. The legacy key backfill in `display-preference-context.tsx` shows thoughtful backward compatibility.

3. **Archive taxonomy**: The `docs/archive/` structure is cleanly organized with a central README index (File 12) and properly deprecation-stamped frontmatter on every archived document. Migration between `CLAUDE.md`→`AGENTS.md` and spec-first workflow is well-documented in the MIGRATION-REPORT (File 9).

4. **Adapter-pattern compliance**: `ai-image-generation.md` (File 11) correctly references the `@reading-advantage/ai` adapter layer rather than direct provider SDK calls. The archived `backend-architecture.md` demonstrates *why* the adapter rule exists — the old code called OpenAI's API directly.

5. **Data model continuity**: The archived `data-models.md` (File 20) shows that core architectural decisions (UUID primary keys, `schoolId` tenancy, multilingual support) were established early and remain consistent in the current Drizzle schema.

6. **Standards coverage**: `standards-mapping.json` (File 8) provides 20 standards across 7 strands for Grade 4 THAI science curriculum — good breadth of coverage.

---

## Limitations

- **No route handlers or domain functions in this batch**: Unlike batch-05, this batch contains only UI components, contexts, a JSON data file, and documentation. There are no API routes, domain functions, or integration tests to assess for security/tenancy/auth correctness. Findings are limited to code quality, AGENTS.md compliance, and architectural consistency.
- **Documentation-only review constraints**: Files 9–20 are documentation files (active or archived). The review assessed them for accuracy, consistency with the current codebase, and potential to mislead, but did not verify every technical claim against the current implementation.
- **JSDoc burden**: The AGENTS.md requirement for JSDoc on all exported functions is clear, but in practice, shadcn/ui component files across the ecosystem (and in batch-10) commonly omit JSDoc. Finding F-SA-B11-001 covers 7 files in this batch but may generate volume across all remaining batches if applied strictly.
- **No test files in this batch**: Unlike batch-05 which included 6 integration test files, this batch has zero test files. Test quality could not be assessed.
- **`data/content/` isolation**: The `standards-mapping.json` file exists as a standalone data file with no observed consumers within the batch scope. Its integration with the broader curriculum system was not verifiable.

---

## Batch-Level Metrics

| Metric | Value |
|--------|-------|
| Files reviewed | 20/20 |
| shadcn/ui component files | 5 (files 1–5) |
| React context files | 2 (files 6–7) |
| JSON data files | 1 (file 8) |
| Active documentation files | 3 (files 9–11) |
| Archived documentation files | 9 (files 12–20) |
| Test files | 0 |
| Critical findings | 0 |
| Medium findings | 1 (F-SA-B11-004) |
| Low findings | 7 (F-SA-B11-001, F-SA-B11-002, F-SA-B11-003, F-SA-B11-005, F-SA-B11-006, F-SA-B11-007) |
| Info observations | 3 |
| Total findings | 8 |

---

*End of batch report. No acceptance or closeout claims are made in this document.*
