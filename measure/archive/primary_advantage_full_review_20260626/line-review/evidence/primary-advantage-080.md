# Line Review Evidence: primary-advantage-080

Reviewer: coder-minimax-m3/primary-advantage-080
Files assigned: 3
Lines assigned: 601

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/lib/test.ts` | 1-13 | reviewed | 0 |
| `apps/primary-advantage/lib/utils.ts` | 1-122 | reviewed | 2 |
| `apps/primary-advantage/lib/zod.ts` | 1-466 | reviewed | 2 |

## Findings

### LR-080-001 — `calculateLevelAndCefrLevel` matches against the activity delta instead of the cumulative XP

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/lib/utils.ts:51-60`
- Evidence: Lines 51-60 compute `const newXp = userXp + xpEarned;` (correct) but then run `LEVELS_XP.find((level) => xpEarned >= level.min && xpEarned <= level.max);`. The predicate is keyed on `xpEarned` (the per-activity delta), not `newXp` (the cumulative total). In production the per-activity delta is a small integer (e.g. `data.score ?? 0` in `actions/question.ts:108,112,116` and `xpEarned: number` in `actions/user.ts:21`). Every realistic delta falls into the first entry `{ min: 0, max: 4999, cefrLevel: "A0-", raLevel: 1 }`, so users always resolve to `raLevel=1, cefrLevel="A0-"` regardless of their real cumulative XP. The behavior is locked in by `lib/__tests__/utils.test.ts:105-128` (tests assert `cefrLevel === "A0-"` for `xpEarned=100, userXp=5000` and `cefrLevel === "B1"` only because they hand-pick `xpEarned=95000`). The equivalent Reading Advantage function `apps/reading-advantage/lib/utils.ts:138-167` (`levelCalculation(xp: number)`) correctly compares the input XP to `level.min`/`level.max`, confirming primary-advantage deviated from the upstream shape rather than inheriting a bug.
- Impact: The entire student leveling system is effectively frozen at level 1 across the fork. `actions/user.ts:55-58,83-98` and `actions/question.ts:123-126,151-167` both persist `users.level` and `users.cefrLevel` from this function inside a Drizzle transaction; every XP-earning event writes `level=1`. The XP bar (`components/progress-bar-xp.tsx`), the leaderboard (`components/leaderboard.tsx`), and the XP chart (`components/dashboard/user-xpoverall-chart.tsx`) all read `users.level`, so the platform-wide "RA Level" indicator never advances past 1. Existing unit tests greenwash the bug because they only assert the inputs that happen to align with the broken predicate.
- Recommendation: Fix the predicate to use the cumulative total: `LEVELS_XP.find((level) => newXp >= level.min && newXp <= level.max)`. Update `lib/__tests__/utils.test.ts:105-128` to assert correct level progression for cumulative XP (e.g. `xpEarned=100, userXp=5000 → cefrLevel="A0"`, `xpEarned=500, userXp=10000 → cefrLevel="A0"`), and add a regression test that proves the level advances when `userXp` crosses a `LEVELS_XP` boundary. Audit all callers (`actions/user.ts`, `actions/question.ts`, any future refactor of `flashcard.ts:533`) to ensure they continue to pass `userXp` as the cumulative value.

### LR-080-002 — React hook `useFormatDate` lives in `lib/utils.ts`, violating AGENTS.md file layout

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/lib/utils.ts:1` and `apps/primary-advantage/lib/utils.ts:96-117`
- Evidence: Line 1 imports `import { useTranslations } from "next-intl";` at module top-level, and lines 96-117 export `useFormatDate()` which calls `useTranslations("Overall.time")`. Both are client-only React APIs. `apps/primary-advantage/AGENTS.md` "Project Layout" reserves `hooks/` for "Reusable React hooks" and `lib/` for "Cross-cutting utilities (db helpers, FSRS, etc.)" — the existing `hooks/` directory contains six hook files (`use-current-role.ts`, `use-current-user.ts`, `use-layout.tsx`, `use-lock-body.ts`, `use-mobile.ts`, `use-permissions.ts`) and would be the natural home for `useFormatDate`. Additionally, several server-side modules import non-hook helpers from the same file: `actions/user.ts:16`, `actions/question.ts:15`, `actions/classroom.ts:3`, `server/models/articleModel.ts:47`, `server/utils/genaretors/new-generator.ts:16`, `app/api/licenses/route.ts:7`, and `app/api/upload/classes/route.ts:10`. Each of those server modules transitively pulls `useTranslations` from `next-intl`. Although `next-intl` 4.x ships a `react-server` export condition (see `node_modules/next-intl/package.json` exports map), keeping a client hook in a file consumed by `"use server"` modules couples the two execution environments and makes the file's client/server split ambiguous.
- Impact: Future contributors reaching for a hook will look in `hooks/` (per AGENTS.md) and miss `useFormatDate`, leading to duplicate implementations. Server modules can silently pick up client-only imports when refactoring, which is the kind of boundary violation AGENTS.md explicitly warns against.
- Recommendation: Move `useFormatDate` (and the `useTranslations` import on line 1) into `hooks/use-format-date.ts`. Update the four call sites that currently import it from `@/lib/utils` — `components/manage-tab.tsx:42`, `components/dashboard/article-records-table.tsx:31`, `components/dashboard/reminder-reread-table.tsx:29`, `components/dashboard/user-recent-activity.tsx:19`. After the move, `lib/utils.ts` becomes pure server-safe code again.

### LR-080-003 — `articleResponseSchema` in `lib/zod.ts` is unused dead code

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/lib/zod.ts:399-466`
- Evidence: A grep across the entire `apps/` tree for `articleResponseSchema` returns only the definition itself (`lib/zod.ts:399`); no file imports it. The schema describes a full article response payload including `audioUrl`, `sentences[]`, `flashcard`, `translatedPassage`, etc., but no route, server action, or test consumes it. In contrast, the production story/article generator responses (`server/utils/genaretors/story-generator.ts:12` and `server/utils/genaretors/article-generator.ts`) use `z.infer<typeof storyGeneratorSchema>` and `z.infer<typeof articleGeneratorSchema>` respectively, which are defined earlier in the same file. The shape in `articleResponseSchema` does not match the `articles` table row inferred from `@reading-advantage/db/schema`, and it is not the AI generator output schema, so it appears to be a leftover prototype contract.
- Impact: Dead exported Zod schema adds ~68 lines of misleading contract surface. Future contributors may reach for it assuming it describes the canonical article response shape and produce code that diverges from the actual runtime contract. Each call to `z.array(...)` and nested translation objects (lines 411-414, 442-448, 457-462) also adds bundle size if the file is imported anywhere that pulls in the whole `lib/zod.ts` barrel.
- Recommendation: Delete `articleResponseSchema` (lines 399-466). If a runtime response contract is desired, place it next to the route or controller that returns it (e.g. alongside the article controller in `server/controllers/` or `app/api/articles/route.ts`) and reference `InferSelectModel` from the Drizzle schema. If the schema is intentionally kept for forward compatibility, add a `@deprecated` JSDoc tag and reference back to the canonical response type.

### LR-080-004 — `LAQuestionSchema` is structurally inconsistent with `MCQuestionSchema`/`SAQuestionSchema`

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/lib/zod.ts:68-70`
- Evidence: `LAQuestionSchema` exports only `{ question: z.string() }` — no `question_number`, no `answer`, no array wrapper. Compare to `MCQuestionSchema` (lines 47-66) which wraps an array of `{ question_number, question, answer, options, textual_evidence }` with `.length(4)` constraint on `options`, and to `SAQuestionSchema` (lines 72-82) which wraps an array of `{ question_number, question, answer }` with `.length(5)` constraint on the array. The `articleGeneratorSchema` `longAnswerQuestions` (lines 280-288) similarly declares an array of `{ question }` objects with the prompt directive "Create a series of 5 long answer questions", so the generator emits five LA questions but the LA-specific schema can only parse a single one.
- Impact: The mismatch is small in practice — `server/utils/genaretors/la-question-generator.ts:28` passes `LAQuestionSchema` to `generateObject`, which forces the model to return a single `{ question }` object, but the lesson UI (`components/articles/questions/la-question-card.tsx`, `components/articles/questions/la-question-content.tsx`, and the lesson summary that aggregates scores) likely expects an array. Without a documented schema that matches the generator's prompt (5 questions, numbered, with reference answers for grading), the LA question feature is structurally divergent from MC/SA and the divergence is undocumented.
- Recommendation: Either (a) extend `LAQuestionSchema` to mirror `SAQuestionSchema` (array of `{ question_number, question, answer }` with `.length(5)`) and update `server/utils/genaretors/la-question-generator.ts:28` and the lesson UI to iterate; or (b) document explicitly in a JSDoc comment on `LAQuestionSchema` why a single question is the contract (e.g. "long-answer questions are generated one at a time and the orchestrator loops N times" — in which case the array length should live in a wrapper schema, not `articleGeneratorSchema`).

## No-Finding Notes

- `apps/primary-advantage/lib/test.ts`: reviewed line-by-line (lines 1-13). Single `testConnection()` helper gated by `proxy.ts:13` to the `system` role (`/system/test/page.tsx`). It correctly imports `bucket` from the shared `@/utils/storage` adapter rather than calling a GCS SDK directly, satisfying the AGENTS.md "Provider Neutrality Rule". The two `console.log`/`console.error` calls are non-structured but acceptable for a system-admin debug page; no business logic, no auth boundary, no DB. Reviewed line-by-line; no findings.