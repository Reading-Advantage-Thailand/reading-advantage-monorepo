# Line-by-Line Review: Reading Advantage — Batch 49

**Track ID:** `reading_advantage_full_review_20260626`
**Batch ID:** `ra-batch-49`
**Baseline SHA:** `f1266a9e2daac789d0d0c3e9fdfbd475f8e74f96`
**Current HEAD:** `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
**Review Date:** 2026-06-27
**Reviewer Role:** A — correctness / architecture / AI provider coupling / prompt injection / validation / privacy / storage / retry / idempotency

---

## Scope

All 20 files listed in `/tmp/opencode/ra-batch-49` were read in full. The
batch is heterogeneous: the first seven files are server-side utilities
under `apps/reading-advantage/server/utils/`; the next eight are
client-side Zustand stores and their Vitest test files under
`apps/reading-advantage/store/`; the final four are styling/configuration
files under `apps/reading-advantage/styles/` and the application's
`tsconfig.json`.

| # | File | Lines / Bytes Reviewed |
|---|------|------------------------|
| 1 | `apps/reading-advantage/server/utils/generators/word-list-generator.ts` | 1–141 |
| 2 | `apps/reading-advantage/server/utils/handle-request.ts` | 1–9 |
| 3 | `apps/reading-advantage/server/utils/read-json.ts` | 1–8 |
| 4 | `apps/reading-advantage/server/utils/route-adapter.ts` | 1–25 |
| 5 | `apps/reading-advantage/server/utils/send-discord-webhook.ts` | 1–74 |
| 6 | `apps/reading-advantage/server/utils/validators/article-validator.ts` | 0 (empty file) |
| 7 | `apps/reading-advantage/server/utils/verify-user-expired.ts` | 1–5 |
| 8 | `apps/reading-advantage/store/classroom-store.ts` | 1–100 |
| 9 | `apps/reading-advantage/store/question-store.ts` | 1–41 |
| 10 | `apps/reading-advantage/store/useGameStore.test.ts` | 1–70 |
| 11 | `apps/reading-advantage/store/useGameStore.ts` | 1–112 |
| 12 | `apps/reading-advantage/store/usePotionRushStore.test.ts` | 1–254 |
| 13 | `apps/reading-advantage/store/usePotionRushStore.ts` | 1–774 |
| 14 | `apps/reading-advantage/store/useRPGBattleStore.test.ts` | 1–239 |
| 15 | `apps/reading-advantage/store/useRPGBattleStore.ts` | 1–204 |
| 16 | `apps/reading-advantage/styles/globals.css` | 1–505 |
| 17 | `apps/reading-advantage/styles/theme-base-colors.ts` | 1–756 |
| 18 | `apps/reading-advantage/styles/theme-base-style.ts` | 1–12 |
| 19 | `apps/reading-advantage/styles/themes.css` | 1–863 |
| 20 | `apps/reading-advantage/tsconfig.json` | 1–42 |

**Total lines reviewed:** ~4,232 across 20 files (one file is empty).
**No file was partially reviewed.**

---

## Executive Summary

This batch mixes three concerns. The server utility files are mostly small
helpers, but `word-list-generator.ts` is a substantive AI generator that
has the same prompt-injection, validation, and provider-coupling issues
documented for batch 48. The store files implement Zustand state for
classrooms, three game subsystems (general "Game", Potion Rush, RPG
Battle), and questions; several of them contain logic that should live in
`/packages/backend` rather than in a Next.js app's `store/` directory.
The styling files are nearly identical copies of the shadcn/ui registry
themes, and `tsconfig.json` is conventional.

The most severe issues found are:

1. **`word-list-generator.ts` directly couples to both `@/utils/openai`
   and `@/utils/google` provider factories.** It imports both, hard-codes
   `google(googleModelAudio)`, and leaves commented-out OpenAI code in
   production. This violates the provider-neutrality rule.
2. **The function builds its user prompt via simple string interpolation
   of `params.passage`** (line 19), exposing a wide prompt-injection
   surface, and writes a system prompt with a typo ("assisstant" — line
   103). It throws a string instead of an `Error` (line 137).
3. **`article-validator.ts` is an empty file (0 lines).** Any caller that
   imports from it will fail at build time; if it was supposed to be a
   Zod validator (per AGENTS.md), the missing implementation is a known
   tech-debt item.
4. **`usePotionRushStore.ts` (774 lines) carries significant
   domain/transactional logic in a Zustand store.** It includes:
   - Random ID generation (`Math.random().toString(36).substr(2, 9)`) on
     lines 285, 323, 408, 513, 763 — duplicated across the file, prone
     to collisions, and not idempotent.
   - Cauldron state machine with strict 1:1 customer/cauldron mapping
     (lines 569–638) that performs state mutation in place using
     synchronous `.find`/`.filter`/`.map` over previous state without
     any transactional boundary.
   - `tick(dt, screenWidth)` (lines 342–567) handles spawning, patience,
     recycling, cauldron resets, reputation, day time, and effects in a
     single function that exceeds 200 lines; it mutates derived arrays
     with `splice` (lines 334, 523, 535) which interacts poorly with
     React/Zustand subscription semantics.
   - `handleServeCustomer` keeps a long comment block explaining the
     "FIX: Do NOT remove words here" (lines 691–696); the dead commented
     code remains in production.
5. **`useRPGBattleStore.ts` (lines 58, 138–162) maintains a module-level
   `revealTimeout`** that is shared across all subscribers and is cleared
   on every `submitAnswer` call; this works only because Zustand creates
   a single store instance, but the pattern is fragile and not isolated.
6. **`send-discord-webhook.ts` (line 29) defaults `webhookUrl` to
   `process.env.DISCORD_WEBHOOK_URL || undefined`.** The webhook payload
   embeds `process.env.NODE_ENV` (line 57) — non-secret but a hygiene
   item — and `Date.now()`-based timestamps are formatted as Discord
   relative time without sanity bounds.
7. **`question-store.ts` (lines 38–40) defines `setMCQuestion`,
   `setSAQuestion`, and `setLAQQuestion`** as state setters but does not
   list them in the `Question` interface, and the `create<Question>(...)`
   call (line 15) makes them part of the store type via inference rather
   than declaration.
8. **`tsconfig.json` uses `target: "ES2015"`** (line 3), which excludes
   modern syntax used elsewhere in the codebase (e.g., optional chaining
   is fine, but `ES2015` predates several Next.js requirement baselines
   and can force polyfills).
9. **`classroom-store.ts` fetches classrooms via `process.env.NEXT_PUBLIC_BASE_URL`** (line 65), coupling the client store to a build-time public env var. It also re-imports `persist` from `zustand/middleware` (line 2) but never uses it (the persisted version is commented out at lines 81–91).

---

## Findings by File

### 1. `apps/reading-advantage/server/utils/generators/word-list-generator.ts`

**Lines 1–6:** Imports `WordListResponse` from `./audio-words-generator`,
`generateObject` from `@reading-advantage/ai`, `openai` and `openaiModel`
from `@/utils/openai`, `google`, `googleModel`, `googleModelAudio` from
`@/utils/google`, and `z` from `zod`.

- The file imports the OpenAI factory but never uses it (only Google is
  used). The `openaiModel` import is also unused.
- Importing from `@reading-advantage/ai` is correct; importing the
  provider factories directly violates the provider-neutrality rule.

**Lines 7–9:** `GenerateWordListParams` interface — single field
`passage: string`. No Zod validation.

**Lines 11–13:** `GenerateWordListResponse` type — wraps a `word_list`
array. The type matches the Zod schema defined later, but the type is
declared by hand instead of inferred from Zod.

**Lines 15–17:** `generateWordList` is `async` and returns the inferred
shape.

**Lines 18–140:** Function body.

- **Line 19:** Builds `userPrompt` via direct template-literal
  interpolation of `params.passage` into a sentence. **Prompt injection
  risk.** No length limits, no escaping. A malicious or accidental
  passage containing `"Ignore previous instructions"`-style content can
  steer the model.
- **Lines 21–67:** Commented-out OpenAI `schema` object (50 lines of
  JSON-schema-as-object literal). **Dead code in production.** This
  block was superseded by the Zod schema below but was left in place.
- **Lines 69–90:** Zod schema for individual `vocabulary` objects with
  language-specific translations. Uses `.describe()` consistently — good
  practice for prompt guidance.
- **Lines 92–98:** Zod schema for `word_list` wrapping the vocabulary
  array. `.required()` is appended but is a no-op because every key in
  the schema object is required by default.
- **Lines 100–105:** `generateObject({ model: google(googleModelAudio),
  schema, system: "You are an article database assisstant.", prompt:
  userPrompt })` — Hard-coded provider and model. **Typo:** "assisstant"
  appears in the system prompt (also at line 112 in the commented-out
  block). The `googleModelAudio` constant is presumably a TTS/audio
  model used for vocabulary generation; if it is intended for text-only
  structured output, that is an architectural smell.
- **Lines 107–132:** Long commented-out OpenAI block left in production
  code. `resultWordList = await JSON.parse(...)` is dead.
- **Line 134:** Returns `response`. The return type is
  `Promise<GenerateWordListResponse>`, which matches the inferred Zod
  schema shape, but TypeScript cannot verify this — there is no runtime
  guard on the returned object.
- **Lines 135–140:** `try/catch`:
  - `console.log(error)` at line 136 leaks the raw error to stdout
    without structured logging.
  - **Line 137:** `throw \`failed to generate audio: ...\`` — Throws a
    string, not an `Error`. Loses stack trace.
  - **Line 139:** `(error as any).response.data` — `error` was cast to
    `unknown` on line 138 but then `as any` is used here; for `fetch`
    errors (Vercel AI SDK uses fetch) there is no `response` property,
    so this read yields `undefined` and the resulting template string
    is `${undefined}`. The expected message ("failed to generate audio")
    is also wrong: this function generates vocabulary words, not audio.

**Issues summary:**
- Direct provider coupling to Google.
- Unused OpenAI imports.
- Prompt injection via raw `passage` interpolation.
- No Zod input validation for `passage`.
- Typo in system prompt ("assisstant").
- 80+ lines of commented-out dead code.
- Throws string, not `Error`.
- Wrong error message ("failed to generate audio").
- `googleModelAudio` used for non-audio structured output.
- No retry logic, no seed, no idempotency key — retries will produce
  different word lists.

---

### 2. `apps/reading-advantage/server/utils/handle-request.ts`

**Lines 1–2:** Imports `NextResponse` and `NextRequest` from
`next/server`.

**Line 3:** `export async function handleRequest(router: any, request:
NextRequest, ctx: { params?: unknown })` — `router` is typed as `any`.

- The `ctx.params` field is typed `unknown`, which loses the
  Next.js 15 Promise shape. Callers that pass `{ params: Promise<{...}> }`
  must cast on every invocation.

**Line 4:** `const result = await router.run(request, ctx);` — Relies on
`router` having a `.run(request, ctx)` method. The structural contract is
unchecked.

**Lines 5–7:** `if (result instanceof NextResponse) return result;` —
This guards against non-NextResponse returns. The check is correct.

**Line 8:** `throw new Error("Expected a NextResponse from router.run");`
— Generic error with no detail. If the router throws synchronously, the
caller will receive an unhandled rejection; if it returns something
unexpected, the error message gives no hint as to what was returned.

**Issues summary:**
- `router: any` and `params?: unknown` weaken type safety.
- No JSDoc for the helper.
- No handling of `ctx` when params is a Promise (Next.js 15 contract is
  `params: Promise<{...}>`; this helper passes the Promise straight
  through to the router).

---

### 3. `apps/reading-advantage/server/utils/read-json.ts`

**Lines 1–7:** Minimal helper.

- **Line 1:** `import fs from "fs";` — Default import; under
  `moduleResolution: "bundler"` (per `tsconfig.json` line 15) and
  `esModuleInterop: true` (line 13) this is fine.
- **Lines 3–4:** Comments are placeholder / doc-style ("Read JSON file",
  "Read the content of a file..."). They restate the function name
  rather than describing semantics.
- **Line 5:** `readJsonFile<T>(filePath: string): T` — Generic, but no
  runtime validation. Callers receive `T` whether the file is valid JSON
  or not.
- **Line 6:** `fs.readFileSync(filePath, "utf-8")` — Synchronous read on
  the request thread. No try/catch; `ENOENT` and `EACCES` propagate as
  raw exceptions.
- **Line 7:** `return JSON.parse(fileContent) as T;` — Unchecked cast.

**Issues summary:**
- Synchronous I/O on hot path.
- No error handling for missing/unreadable files.
- No Zod validation; `as T` is a lie at runtime.
- Comment placeholder rather than documentation.

---

### 4. `apps/reading-advantage/server/utils/route-adapter.ts`

**Lines 1–6:** Header JSDoc explaining Next.js 15 params change.

**Lines 8–9:** Imports `NextRequest` (unused in the body) and exports
`awaitParams`.

**Lines 10–19:** JSDoc block for `awaitParams` with a `@example` that
uses `awaitParams(ctx)` where `ctx: { params: Promise<{ id: string }> }`
— but the example signature `export async function GET(request, ctx)`
appears accurate.

**Lines 20–24:** `awaitParams<T extends Record<string, any>>(ctx: {
params: Promise<T>; }): Promise<{ params: T; }>` — Returns a sync-shaped
context for legacy controllers.

- `<T extends Record<string, any>>` — The bound is loose; any object
  qualifies. The `any` inside the constraint is acceptable for legacy
  bridges but means type safety is partially forfeited.
- `NextRequest` import (line 8) is unused.

**Issues summary:**
- Unused `NextRequest` import.
- `any` inside generic bound.
- No test for `awaitParams`.

---

### 5. `apps/reading-advantage/server/utils/send-discord-webhook.ts`

**Lines 1–3:** Header comment and inline doc comment.

**Lines 4–11:** `SendWebhookParams` interface. All optional except
`title`, `embeds`, `reqUrl`.

**Lines 13–16:** `Embeds` interface — `description: Record<string, string>`.
Discord embed descriptions are strings, but the interface expects an
object, which `formatDetails` (line 20) converts to a string.

**Lines 20–24:** `formatDetails` joins entries as `**key:** value` lines.

**Lines 26–33:** `sendDiscordWebhook` destructures parameters; default
`color = 0x0099ff`.

- **Line 29:** `webhookUrl = process.env.DISCORD_WEBHOOK_URL ||
  undefined`. The default-`undefined` pattern is unnecessary in
  TypeScript; passing `webhookUrl` as `undefined` is the same as
  omitting it. If the env var is unset, the warning at line 35 fires
  and the function returns silently.

**Lines 34–37:** Missing-webhook guard.

**Lines 40–46:** Reformat `embeds` into a uniform shape.

**Lines 49–66:** Build `RequestInit`. The body embeds:

- `process.env.NODE_ENV` (line 57) — Useful for ops triage; not
  sensitive, but worth documenting.
- `Math.floor(Date.now() / 1000)` (line 59) — Discord's
  `<t:UNIX:R>` formatter expects seconds; this is correct.

**Lines 68–73:** `await fetch(webhookUrl, options)`. On error:

- `console.error("failed to send webhook", error)` — Structured?
  No, just an interpolated string.
- `throw new Error(\`failed to send webhook: ${error}\`)` — Stringifies
  the original error and wraps it, but loses stack trace and error type.
  If the fetch returned a non-2xx status, the response body is discarded.

**Issues summary:**
- Webhook URL leak risk: if a third party sees a thrown error or log
  line, the URL itself is not in the error, but `error.message` could
  contain it depending on the runtime.
- No retry on transient 5xx.
- No timeout (uses default `fetch` timeout, which is none in Node).
- Throws stringified error rather than structured `Error`.
- Embeds description is forced through `formatDetails` regardless of
  caller's intent.

---

### 6. `apps/reading-advantage/server/utils/validators/article-validator.ts`

**Lines 0:** The file is empty. The path suggests this is meant to host
Zod validation for article payloads, consistent with the monorepo's
mandate that every external boundary use Zod. As-is, any `import` from
this path will succeed (TS resolves an empty module to `undefined`), and
any attempt to call a named export will fail at runtime.

**Issues summary:**
- Empty file masquerades as a validator.
- Likely a known tech-debt item; should either be implemented or
  deleted.
- The batch-48 review referenced `validators/article-validator.ts` as
  expected Zod location; this batch's emptiness confirms the gap.

---

### 7. `apps/reading-advantage/server/utils/verify-user-expired.ts`

**Lines 1–5:** Single exported function `isUserExpired`.

- **Line 1:** `export const isUserExpired = (expiredDate: string):
  boolean` — Returns true if `expiredDate` is in the past.
- **Line 2:** `const currentDate = new Date();` — Local time.
- **Line 3:** `const expirationDate = new Date(expiredDate);` —
  `new Date(invalidString)` returns `Invalid Date`. Comparisons against
  `Invalid Date` always yield `false`.
- **Line 4:** `return expirationDate < currentDate;` — For `Invalid
  Date < currentDate`, the comparison is `false`. So an invalid
  `expiredDate` makes the user "not expired", which is the wrong
  default for a security check.

**Issues summary:**
- No input validation; invalid date strings return `false` (i.e., the
  user appears to still be valid).
- No Zod schema for `expiredDate`.
- Function does not handle the case where `expiredDate` is `undefined`
  or `null` (TS type is `string`, but JS callers might pass other
  values).
- No JSDoc.

---

### 8. `apps/reading-advantage/store/classroom-store.ts`

**Lines 1–3:** Imports `create` from `zustand`, `persist` from
`zustand/middleware` (unused — see lines 81–91), and `classroom_v1`
type from `googleapis`.

**Lines 5–10:** `CourseStore` interface — Google Classroom course
metadata. **Multi-tenancy issue:** nothing in this interface ties
courses to a `schoolId`.

**Lines 12–32:** `Classes` interface — local model for a classroom.
Includes `importedFromGoogle` and `googleClassroomId`. Re-exported as
type via `export type { Classes };` (line 34).

**Lines 36–43:** `StudentData` — student with `display_name`, `email`,
`last_activity`, `level`, `xp`. PII (`email`, `display_name`) is held in
client state via Zustand. There is no indication that this store is
persisted, but the store is module-scoped, so all subscribers share it.

**Lines 45–52:** `ClassroomState` — single selected classroom with
`studentInClass` array.

**Lines 54–58:** `ClassroomStore` — array of classrooms and a
`fetchClassrooms` action.

**Lines 60–72:** `useClassroomStore` — fetches
`${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/classroom`.

- **Line 64–67:** Hard-coded HTTP method `GET`, no auth header, no
  tenant scoping. If the endpoint is multi-tenant, the call relies on
  the cookie/session to carry the tenant.
- **Line 68:** Throws `Error("Failed to fetch ClassesData list")` on
  non-OK — generic.
- **Line 69:** `await res.json()` — Untyped; `fetchdata.data` is assumed.
- **Line 70:** Sets `classrooms: fetchdata.data` — Could overwrite with
  malformed data; no Zod parse.

**Lines 74–79:** `useCourseStore` — holds Google Classroom courses and
selection. No fetch.

**Lines 81–91:** Commented-out persisted version. The `persist` import
on line 2 is therefore unused.

**Lines 93–100:** `useClassroomState` — local UI state.

**Issues summary:**
- Unused `persist` import.
- No Zod validation on fetched data.
- `NEXT_PUBLIC_BASE_URL` couples the client store to a build-time env.
- PII (`email`, `display_name`) held in client state without
  retention policy.
- No tenant scoping on fetched data.
- Three stores in one file with overlapping responsibilities
  (`useClassroomStore`, `useCourseStore`, `useClassroomState`).

---

### 9. `apps/reading-advantage/store/question-store.ts`

**Lines 1–7:** Imports `create` from Zustand, `QuestionState` from a
question model, and three `QuestionResponse` aliases from MC/SA/LA
question cards.

**Lines 9–13:** `Question` type — composes the three question shapes
into one store.

- **Line 9–13:** All three fields are mandatory in the type but the
  store initializes them (lines 16–37) with empty/loading defaults.

**Lines 15–41:** `useQuestionStore` — initializer + three setter
actions.

- **Lines 16–37:** Initial state for MC, SA, and LA questions.
- **Lines 38–40:** `setMCQuestion`, `setSAQuestion`, `setLAQQuestion`
  are defined as part of the store but are **not declared in the
  `Question` interface**. TypeScript accepts this because the store is
  created with `create<Question>(...)` — the action signatures are
  inferred from the implementation, and the `Question` interface only
  constrains the state slice. This is a maintainability hazard because
  refactoring a setter signature will not produce a compile error if
  the call site uses an inconsistent shape.
- **Lines 22–30:** SA question initial state has `result.id = ""` and
  `result.question = ""` — empty-string sentinels. Callers must check
  for empty strings; there is no `QuestionState.IDLE` for SA in the
  initializer (only `LOADING`).
- **Lines 31–37:** LA question initial state has `result.id = ""`,
  `result.question = ""`, and `state: LOADING`. The LA type does not
  initialize `suggested_answer` or `answer` (unlike SA); call sites must
  not access those on a fresh store.

**Issues summary:**
- Setter actions not declared in the `Question` interface.
- Empty-string sentinels rather than discriminated unions.
- Multiple stores (`useQuestionStore`, plus the implicit state inside
  the question cards) make data flow hard to trace.
- No test file (the batch includes tests for game stores but not for
  this one).

---

### 10. `apps/reading-advantage/store/useGameStore.test.ts`

**Lines 1–20:** Imports and `resetStoreState`.

- **Lines 9–20:** `resetStoreState` writes a fixed initial state to
  the store before each test. Good test isolation practice. Note that
  `mana`, `missedWords`, and `combo` are NOT reset here — only
  `vocabulary`, `score`, `castles`, `status`, `correctAnswers`,
  `totalAttempts`, `lastXp`, `lastAccuracy`. Tests that mutate those
  fields may have cross-test contamination.

**Lines 22–34:** First test — asserts initial state.

- **Lines 27–34:** Reads `score`, `castles`, `status`, `vocabulary`
  directly from the store. The assertion is fine.

**Lines 36–44:** `setLastResult` test.

- **Lines 39–43:** Verifies `setLastResult(7, 0.7)` stores `lastXp = 7`
  and `lastAccuracy = 0.7`.

**Lines 46–69:** Castle damage test.

- **Lines 49–53:** Damages `left` three times, expects HP to be 0 and
  status to remain `'idle'` (because not all castles are destroyed).
- **Lines 56–61:** Same for `right`.
- **Lines 63–68:** Damages `center` three times; expects
  `status === 'game-over'` because all castles are at 0 HP. The
  transition logic in the store (lines 95–99 of the store) uses
  `every((hp) => hp <= 0)` to trigger `game-over`, so this is
  consistent.

**Issues summary:**
- `resetStoreState` does not reset all fields, creating a possible
  contamination vector for future tests that mutate `missedWords`,
  `combo`, or `mana`.
- No tests cover `addMissedWord`, `incrementCombo`, `resetCombo`,
  `addMana`, `spendMana`, `endGame`, `incrementAttempts`,
  `resetGame`, `quitGame`, or `increaseScore`.

---

### 11. `apps/reading-advantage/store/useGameStore.ts`

**Lines 1–6:** Imports only `create` from `zustand`. No `persist`
middleware — the store is in-memory only.

**Lines 3–7:** `VocabularyItem` interface — `{ term, translation, id? }`.

**Lines 9–16:** `CastleId` type and `DEFAULT_CASTLES` constant.

**Lines 18–45:** `GameState` interface — extends vocabulary with
score, castles, status, attempts, XP, accuracy, missed words, combo,
mana, plus twelve setter/action methods.

**Lines 47–112:** Store implementation.

- **Line 50:** Initial state uses `DEFAULT_CASTLES` (good).
- **Lines 60–70:** `resetGame` sets `status: "playing"`. **Issue:** if
  called from `'game-over'`, the player immediately transitions to
  `'playing'` without any explicit "start" trigger. Callers must be
  careful about lifecycle.
- **Lines 71–81:** `quitGame` sets `status: "idle"`. Note that
  `quitGame` and `resetGame` differ only in `status`.
- **Lines 82–87:** `increaseScore` increments score, correctAnswers,
  and totalAttempts in one call. **This conflates "scored" with
  "attempted."** If a player makes an incorrect answer that still
  scores partial points (a likely design), this action will over-count.
  The naming is misleading; consider `recordCorrectAttempt`.
- **Lines 88–100:** `damageCastle` decrements HP, clamps at 0, and
  transitions to `game-over` only when every castle is at 0 HP.
  Uses `Math.max(... - 1, 0)` — correct clamp.
- **Lines 101–102:** `incrementAttempts` only increments
  `totalAttempts`; no `correctAnswers` update.
- **Line 103:** `setLastResult` — stores XP and accuracy.
- **Lines 104–105:** `addMissedWord` appends to `missedWords`. No
  dedup; repeated misses will create duplicates.
- **Lines 106–110:** `incrementCombo`, `resetCombo`, `addMana`,
  `spendMana` (clamps at 0).
- **Line 111:** `endGame` — sets status to `game-over`. Does not
  reset other fields; presumably caller-driven.

**Issues summary:**
- `increaseScore` conflates score increment with attempt counters.
- `addMissedWord` lacks dedup.
- No persistence (no `persist`), so reload wipes state.
- No devtools middleware.
- Store logic is appropriate for UI state; business logic (XP
  calculation, scoring) would be better in a backend module.

---

### 12. `apps/reading-advantage/store/usePotionRushStore.test.ts`

**Lines 1–2:** Imports `act` from `@testing-library/react` and the store.

**Lines 4–9:** `describe` block. `beforeEach` calls `reset()` inside
`act()`.

**Lines 11–18:** Initial state test — `reputation: 100`, empty pool,
`completedSentences: 0`, `[null, null, null]` customers.

**Lines 20–37:** `spawnCustomer` test.

- **Lines 21–28:** Starts with one vocab item, spawns one customer.
- **Lines 30–37:** Asserts first slot is filled and `activeWordPool`
  contains both `"hello"` and `"world"` from the split term.

**Lines 39–70:** Pool stability on serve test.

- **Lines 51–60:** Manually sets cauldron 0 to `COMPLETED` with
  `targetSentence` and `currentWords`. Then `handleServeCustomer` is
  called.
- **Lines 67–69:** Comment explains the expected behavior: words are
  removed from the pool when spawned onto the belt, not on serve. The
  test asserts the pool still contains `"test"`.

**Lines 72–107:** Scoring/belt-speed test.

- **Lines 99:** Expects `completedSentences: 1` after one serve.
- **Lines 102–106:** After `tick(0.1, 1000)`, asserts `beltSpeed` is
  approximately 55 (initial 50 * 1.1^1 = 55 — matches the store's
  `Math.pow(1.1, completedSentences)` formula at line 430).

**Lines 109–128:** Customer-angry reputation test.

- **Lines 117–121:** Sets `vocabList: []` to disable auto-spawn, then
  `tick(61, 1000)` (patience is 60) to force the customer to leave.
- **Line 124:** Expects `reputation: 75` (100 - 25 — matches
  `nextReputation -= 25` in the store).
- **Line 127:** Expects `customers[0]?.state` is `LEAVING_ANGRY`.

**Lines 130–170:** Ingredient-only-from-pool test.

- **Lines 149:** `jest.spyOn(Math, "random").mockReturnValue(0)` —
  deterministic mock.
- **Lines 151–158:** Spawns one customer and 10 ingredients.
- **Lines 166–169:** Asserts every spawned word is in `["needed",
  "word"]` and never `"ignored"`.

**Lines 172–206:** Cauldron reset on angry leave test.

- **Lines 183–192:** Sets cauldron 0 to `BREWING` with
  `currentWords: ["orphan"]`.
- **Lines 195–197:** `tick(61, 1000)` makes customer leave.
- **Lines 199–205:** Asserts `customers[0].state === "LEAVING_ANGRY"`
  and cauldron 0 reset to `IDLE` with empty `currentWords`.

**Lines 208–253:** Cauldron-reset independence test.

- **Lines 211–217:** Starts game, spawns two customers (A and B).
- **Lines 222–233:** Sets cauldron 0 to BREWING for A.
- **Lines 236–244:** Manually reduces A's patience to 0.1, then ticks.
- **Lines 246–252:** Asserts A is `LEAVING_ANGRY`, B is `WAITING`,
  and cauldron 0 is `IDLE`.

**Issues summary:**
- Tests cover a good surface: spawn, serve, anger, recycle, cauldron
  reset, multi-customer isolation.
- Heavy reliance on `jest.spyOn(Math, "random")` and direct `setState`
  manipulation (e.g., lines 51–60, 83–92, 119, 183–192, 222–233,
  238–242) is a sign that the store does not expose enough
  functionality to drive these scenarios from public actions.
- Tests reach into `usePotionRushStore.setState((prev) => {...})` at
  lines 51, 83, 119, 183, 222, 238 — this couples the test to the
  store's internal field layout.

---

### 13. `apps/reading-advantage/store/usePotionRushStore.ts`

This is the largest file in the batch (774 lines). The findings below
focus on architecture and correctness hotspots.

**Lines 1–3:** Imports `create` from `zustand` and `VocabularyItem` from
`@/store/useGameStore`.

**Lines 6–123:** Type definitions.

- **Line 6:** `GameState` type — `'MENU' | 'PLAYING' | 'PAUSED' |
  'GAME_OVER'`. **Naming collision:** `useGameStore.ts` already exports
  a `GameState` interface (line 20 of that file) for a different domain
  (castles). The two `GameState` symbols live in different files but
  may cause confusion when imported in the same module.
- **Lines 8:** `CauldronState` — `'IDLE' | 'BREWING' | 'WARNING' |
  'COMPLETED'`.
- **Lines 10–17:** `Cauldron` interface. `targetSentence` is
  `VocabularyItem | null`. Note that `VocabularyItem` comes from
  `useGameStore.ts` (a "castle" game store) — **cross-store coupling
  via type import**. If `useGameStore.ts` renames or removes
  `VocabularyItem`, this file breaks.
- **Lines 28–37:** `Customer` interface with `state: 'WAITING' |
  'LEAVING_ANGRY' | 'LEAVING_HAPPY'`.
- **Lines 39–47:** `Ingredient` interface with `type: 'potion' |
  'mushroom' | 'mineral' | 'herb'`.
- **Lines 49–59:** Effect types.
- **Lines 61–123:** `PotionRushState` interface — large list of state
  fields plus thirteen actions.

**Lines 126–134:** Constants.

- **Line 126:** `BELT_Y = 500` and **Line 127:** `INGREDIENT_WIDTH = 80`
  are described as "Placeholder" in the comments but used directly in
  `spawnIngredient` (lines 326, 328) and `tick` (line 516, 518). They
  are not actually placeholders — they are magic numbers.

**Line 134:** `BASE_PATIENCE = 60` — used at lines 282 and 385.

**Lines 136–181:** Initial state.

- **Lines 144–166:** Three cauldrons are duplicated literally rather
  than initialized via a helper. **Maintenance hazard:** if a new
  cauldron field is added, three locations must change. The
  duplication is repeated in `startGame` (lines 202–224).

**Lines 183–225:** `startGame`.

- **Lines 184–224:** Duplicates the three-cauldrons initialization a
  third time. Also resets 13 state fields in one big `set({...})` call.
- **Lines 200–201:** `timeToNextCustomerSpawn: 0` (immediate spawn),
  `timeToNextIngredientSpawn: 0.5` (half-second delay).

**Lines 227–229:** `pauseGame` / `resumeGame` / `endGame`.

- **Line 229:** `endGame` sets `gameState: "GAME_OVER"` but does not
  reset `customers`, `conveyorItems`, `effects`, or other fields. A
  restart of the same store instance may carry residual state.

**Lines 231–244:** `reset` returns to `MENU` and zeroes most fields
but does not reset `timeToNextCustomerSpawn`,
`timeToNextIngredientSpawn`, `dayTime`, `difficulty`, or `timeLimit`.
These leftovers may cause subtle bugs on subsequent `startGame` calls.

**Lines 246–303:** `spawnCustomer`.

- **Lines 257–258:** Finds first empty slot; returns if none.
- **Line 260:** `vocabList[Math.floor(Math.random() * vocabList.length)]`
  — non-idempotent.
- **Lines 261–269:** `types: CustomerType[]` — array literal recreated
  on every call. Constant extraction would avoid the allocation.
- **Line 270:** `randomType = types[Math.floor(...)]` — non-idempotent.
- **Lines 275–279:** Difficulty multiplier logic. Same logic is
  duplicated in `tick` at lines 379–382. **Duplication.**
- **Lines 281–282:** Patience calculation using `Math.pow(0.9,
  completedSentences)`. **Issue:** `BASE_PATIENCE * 0.9^10 = ~23` — by
  sentence 10, patience is below half a minute. There is no clamp at a
  minimum, so for very long sessions patience can become very small
  (e.g., sentence 50 → `0.9^50 ≈ 0.005`). The store likely needs a
  `Math.max(MIN_PATIENCE, ...)` floor.
- **Line 285:** `id: Math.random().toString(36).substr(2, 9)` — random
  ID. `substr` is **deprecated**; should be `substring`. Also, 7 base-36
  chars give ~36^7 ≈ 78 billion combinations, but with `Math.random()`
  bias and birthday collisions, IDs can clash under heavy spawning.
  The same pattern is repeated at lines 323, 408, 513, 763 — five
  locations.

**Lines 305–340:** `spawnIngredient`.

- **Lines 311–312:** Picks from `activeWordPool` at a random index.
- **Line 323:** Same random-ID pattern as above.
- **Lines 333–334:** `nextActiveWordPool.splice(poolIndex, 1)` — mutates
  a local copy. The store's setter is `set(...)`; calling `splice` on a
  freshly cloned array is fine, but the variable name `nextActiveWordPool`
  shadows the broader pattern used elsewhere.

**Lines 342–567:** `tick(dt, screenWidth)`.

- **Lines 360:** Game-state guard returns early if not `'PLAYING'`.
- **Lines 363–368:** Time-limit decrement. On `newTimeLeft <= 0`,
  sets `GAME_OVER` and returns early **without updating conveyor,
  customers, cauldrons, or effects for that tick**. Visually, items
  freeze at their positions when time runs out.
- **Lines 374–375:** `let nextCustomers = [...customers]; let
  nextActiveWordPool = [...activeWordPool];` — local copies.
- **Lines 378–386:** Difficulty multiplier duplicated from
  `spawnCustomer` (lines 275–279). `customerSpawnInterval =
  currentPatience / 3` — a third of patience. **Issue:** patience can
  shrink rapidly (see line 282 analysis); the spawn interval also
  shrinks.
- **Lines 388–425:** Customer spawning block. Mirrors
  `spawnCustomer` (lines 246–303) but inlined. **Major duplication.**
- **Lines 430:** `targetSpeed = baseBeltSpeed * Math.pow(1.1,
  completedSentences)` — same compounding concern as patience.
- **Lines 436–448:** Conveyor item movement and recycling. Items past
  x = -200 are recycled (their words return to the active pool).
- **Lines 455–476:** Customer patience loop. On
  `LEAVING_ANGRY`, reputation is decremented by 25 and words are
  removed from the pool.
- **Lines 479–493:** Cauldron reset loop — if the customer for slot `i`
  is missing or `LEAVING_ANGRY`, the corresponding cauldron resets to
  `IDLE`. **Issue:** the cauldron is reset regardless of whether the
  cauldron was previously `BREWING` for a *different* customer's
  sentence (cauldrons can in principle receive drops for any customer
  that happens to match; the test at lines 208–253 verifies the
  cauldron-reset behavior is "owning" — see lines 246–252).
- **Lines 498–526:** Ingredient spawning block. Mirrors `spawnIngredient`
  (lines 305–340) but inlined. **Major duplication.**
- **Lines 529–537:** Pool reconciliation — recycled words added;
  wordsToRemove removed via `indexOf` + `splice`.
- **Lines 540:** `nextDayTime = dayTime + dt * 0.01` — day advances.
- **Lines 542–544:** Effects age and cull.
- **Lines 546–566:** Final `set`. If `nextReputation <= 0`, the store
  sets `GAME_OVER` and **does not update conveyor, customers, dayTime,
  activeWordPool, beltSpeed, cauldrons, timeToNextCustomerSpawn,
  timeToNextIngredientSpawn, or timeLeft** (lines 547–551). This is a
  substantial inconsistency on game-over.

**Lines 569–638:** `handleDropIngredient`.

- **Line 574:** Returns early if `!ingredient || !cauldron`.
- **Lines 577:** Removes the ingredient from the conveyor immediately.
  If the subsequent branches fail (e.g., `WARNING`/`COMPLETED` guard
  at line 580), the ingredient is already gone. **Side-effect ordering
  issue.**
- **Lines 580:** `WARNING`/`COMPLETED` cauldrons ignore drops — but
  the ingredient is already removed at line 577.
- **Lines 583–585:** `emitEffect` is a local helper that captures
  `dropPosition` and calls `get().spawnEffect`.
- **Lines 593:** **Strict 1:1 mapping** between cauldron index and
  customer index. This is a hard architectural constraint — if the
  customer in slot 2 is null, dropping into cauldron 2 always fails
  (sets `WARNING` at line 608).
- **Lines 600–601:** Compares lowercased strings. **No
  normalization** beyond `toLowerCase`; punctuation and whitespace
  differences will cause a mismatch.
- **Lines 612–632:** Brewing check — confirms next word matches.
- **Lines 627–631:** On mismatch, sets `WARNING`, plays SMOKE, and
  **puts the dropped word back into the active pool**. This is a
  per-call re-pool, not part of the recycling loop in `tick`.
- **Line 637:** Final `set({ cauldrons: nextCauldrons })`.

**Lines 640–659:** `handleDumpCauldron`.

- **Lines 644–645:** Returns cauldron's `currentWords` to the active
  pool. **Issue:** words that belong to a customer who has not yet
  spawned may be added to the pool, allowing them to be assigned to
  any cauldron. The "strict 1:1" mapping in
  `handleDropIngredient` is the only safeguard.
- **Line 649:** Cauldron id is set to `cauldronIndex`, which is the
  index passed by the caller. **Issue:** the cauldron's `id` field
  may already differ if the caller passed a wrong index. Cauldron IDs
  should be immutable.

**Lines 661–736:** `handleServeCustomer`.

- **Line 672:** Returns early if cauldron is not `COMPLETED`.
- **Line 676:** Strict index match: customer.id must equal
  customerId. Good defense against serving the wrong slot.
- **Line 678:** `customer.request.term !== cauldron.targetSentence?.term`
  — guards against mismatched sentences. The strict 1:1 should
  already prevent this, but the guard is defensive.
- **Lines 690–696:** Long comment explaining why words are NOT removed
  from the pool here. The commented-out code is dead.
- **Lines 708–722:** Scoring/XP calculation. `points = Math.floor(
  customer.patience)`; `xp = Math.floor(points * 0.1)`. Comment block
  notes the XP should "actually" be persisted by another store, but
  the cross-store sync is not implemented in this file.
- **Line 731:** Final `set({ customers, cauldrons, score, totalXpEarned,
  completedSentences })`.

**Lines 738–750:** `discardIngredient`. Returns the word to the pool.

**Lines 752–759:** `setIngredientDragging`. No-op for non-matching IDs.

**Lines 761–773:** `spawnEffect`.

- **Line 763:** Same random-ID pattern with `slice(2, 10)` (instead
  of `substr(2, 9)` — slightly different but same intent). The
  inconsistency between `slice` and `substr` is a minor smell.

**Issues summary:**
- `tick` is 226 lines and combines ten concerns.
- `spawnCustomer` and `spawnIngredient` are duplicated between the
  public actions and the inlined versions in `tick`.
- Difficulty/patience/belt-speed math is duplicated and uses
  `Math.pow` compounding with no floor — extreme values possible at
  high `completedSentences`.
- Five different random-ID sites use `Math.random()` plus `substr` (or
  `slice`).
- `substr` is deprecated.
- Game-over state on time-up and reputation-zero is partial (some
  fields not updated).
- Reset does not zero all timers/day/difficulty.
- `VocabularyItem` imported from a different game store creates
  cross-store coupling.
- Cauldron ID overwrite on dump is risky.
- Commented-out dead code (lines 690–696).

---

### 14. `apps/reading-advantage/store/useRPGBattleStore.test.ts`

**Lines 1–2:** Imports the store.

**Lines 3–20:** Initial state test — defaults for `playerHealth`,
`playerMaxHealth`, `enemyHealth`, `enemyMaxHealth`, `turn`, `status`,
`battleLog`, `streak`, `xpEarned`, `selectionStep`, and the three
selected IDs.

**Lines 22–30:** `initializeBattle` test — sets status to `playing`
and adds the "A wild monster appears!" log entry.

**Lines 32–39:** Scaled enemy health test.

**Lines 41–47:** `addLogEntry` test.

**Lines 49–58:** `setTurn` test.

**Lines 60–68:** `setStatus` test.

**Lines 70–81:** `damagePlayer` test — 30 damage keeps status at
`playing`; 200 damage triggers `defeat`.

**Lines 83–94:** `damageEnemy` test — 45 keeps playing; 200 triggers
`victory`.

**Lines 96–111:** `submitAnswer` wrong test.

- **Lines 97:** `jest.useFakeTimers()`.
- **Lines 101–106:** Submits "wrong" against "Correct" — returns
  `false`, sets `inputLocked` to `true`, reveals the translation,
  zeroes `streak`.
- **Lines 107–109:** `jest.advanceTimersByTime(2000)` — clears
  `inputLocked` and `revealedTranslation`.
- **Lines 110:** `jest.useRealTimers()`.

**Lines 113–122:** `submitAnswer` correct test — increments `streak`,
sets pose based on `attackPower`.

**Lines 124–134:** Player pose on damage — `hurt` on small damage,
`defeat` on lethal damage.

**Lines 136–147:** Enemy and player poses on enemy damage and victory.

**Lines 149–161:** Pose on answer — `miss` on wrong, `power-attack`
on `power`, `basic-attack` on `basic`.

**Lines 163–174:** `enemyAttack` test.

- **Lines 165–166:** Initialize, set turn to enemy.
- **Line 168:** `enemyAttack(12)` — player takes 12 damage, turn
  flips to player, enemy pose is `basic-attack`.

**Lines 176–186:** `enemyAttack` ignored when not in enemy turn.

**Lines 188–216:** Selection order test.

- **Lines 188–216:** Verifies that `selectLocation` before `selectHero`
  is a no-op, that the selection step transitions `hero → location →
  enemy → ready`, and that `selectEnemy` requires the prior step.

**Lines 218–238:** `resetSelection` test.

**Issues summary:**
- Good test surface; covers initialization, damage, answer feedback,
  timer behavior, and selection order.
- Relies on Jest's fake timers (line 97), which couples the test to
  Jest rather than a runner-agnostic mock.
- Tests directly call `useRPGBattleStore.setState({...})` only at lines
  190–195 and 220–225 for selection reset; otherwise uses public
  actions, which is a positive sign.

---

### 15. `apps/reading-advantage/store/useRPGBattleStore.ts`

**Lines 1–2:** Imports `create` from `zustand` and the `Battle*Id`
types from `@/lib/games/rpgBattleSelection`.

**Lines 4–22:** Type exports.

**Lines 24–56:** `RPGBattleState` interface.

- **Line 38:** `selectionStep: BattleSelectionStep` — strict union.
- **Lines 39–41:** Selected IDs typed against `Battle*Id` unions.

**Line 58:** `let revealTimeout: ReturnType<typeof setTimeout> | null
= null;` — **module-level mutable state shared across all subscribers.**
This works only because Zustand creates a single store instance per
module, but:

- It is reset only when a new wrong answer is submitted (lines
  138–141) — if the timeout fires, it nulls itself (line 161). Between
  battles, the previous timeout may still be scheduled if
  `submitAnswer` was never called again with a wrong answer.
- If the store is imported in a different module that calls
  `submitAnswer` (e.g., a server-side pre-render), the timeout can leak
  between requests.
- It is not cleared on `initializeBattle` or `resetSelection`.

**Lines 60–203:** Store implementation.

- **Lines 61–77:** Initial state.
- **Lines 79–97:** `initializeBattle(options)`:
  - **Line 80:** `const enemyMaxHealth = options.enemyMaxHealth ?? 100;`
    — `??` is correct.
  - **Line 89:** Initial battle log entry: "A wild monster appears!".
    Note that this entry is not localized.
  - **`return set({...})` at line 82:** The `return` is unnecessary; a
    bare `set({...})` works. Minor style.
- **Lines 102–111:** `damagePlayer`:
  - **Line 109:** `playerPose: nextStatus === 'defeat' ? 'defeat' :
    'hurt'` — overrides the existing pose even when status didn't
    transition. If `playerPose` was `'casting'` and damage hits, the
    pose becomes `'hurt'` immediately, which may interrupt animations.
- **Lines 113–123:** `damageEnemy`:
  - **Line 121:** `playerPose: nextStatus === 'victory' ? 'victory' :
    state.playerPose` — only updates pose on victory, preserving
    ongoing animations otherwise.
- **Lines 125–131:** `enemyAttack`:
  - **Lines 127:** Guard returns if not playing or not in enemy turn.
  - **Line 129:** Sets `enemyPose: 'basic-attack'`. **Issue:** the pose
    is set even if the attack is later overridden. There is no
    animation reset.
  - **Line 130:** Calls `damagePlayer(damage)`, which then re-enters
    `set(...)`. This double-`set` pattern is fine but introduces two
    render cycles in subscribers.
- **Lines 133–165:** `submitAnswer`:
  - **Lines 134–136:** Normalizes input/expected via `trim` +
    `toLowerCase`. **No fuzzy matching, no Unicode normalization, no
    punctuation stripping.**
  - **Lines 138–141:** Clears prior timeout. **Correct.**
  - **Lines 143–151:** On correct, returns `true` and updates
    `streak`/`playerPose`. **Issue:** the correct path does not lock
    input, so a player can submit multiple times in quick succession
    before the round transitions.
  - **Lines 153–158:** On wrong, locks input, reveals translation,
    zeroes streak, sets `playerPose: 'miss'`.
  - **Lines 159–162:** Schedules a 2-second unlock. **Module-level
    timer.**
- **Lines 167–169:** `addLogEntry` appends to `battleLog`.
- **Lines 171–178:** `selectHero`:
  - **Line 172:** Returns `{}` if not at the `hero` step. Returning an
    empty object from a Zustand setter is a valid no-op but means
    subscribers may still receive a re-render (state identity changes
    when set is called).
- **Lines 180–187:** `selectLocation`. Same pattern.
- **Lines 189–196:** `selectEnemy`. Same pattern.
- **Lines 198–203:** `resetSelection` resets the three selected IDs
  and `selectionStep`.

**Issues summary:**
- Module-level `revealTimeout` is a hidden global.
- `submitAnswer` does not lock input on correct answers.
- `damagePlayer` overwrites pose mid-animation.
- `enemyAttack` does not differentiate attack power.
- Selection actions return `{}` instead of no-op'ing silently.
- No persistence; reload wipes battle state.
- No test for `addLogEntry` ordering or `damagePlayer`/`damageEnemy`
  pose interactions beyond what is already covered.

---

### 16. `apps/reading-advantage/styles/globals.css`

**Lines 1–9:** Imports Tailwind, the animate plugin, and Radix color
CSS variables.

- **Lines 4–8:** `@import "@radix-ui/colors/..."` brings in raw CSS,
  which is acceptable but means color values are loaded as side-effect
  imports rather than as tokens.

**Lines 11–12:** Google Fonts imports for "Indie Flower" and "Amatic
SC". **Privacy/performance note:** these are external font requests on
every page load; if the app must comply with privacy regulations,
self-hosting fonts is preferable.

**Lines 14–69:** `@theme inline` block defines CSS variables for the
design tokens and keyframes (`accordion-down`, `accordion-up`,
`shake`, `fade-in-up`, `fade-out-down`).

**Lines 71–145:** `:root` and `.dark` blocks define the default light
and dark token values.

**Lines 147–155:** `@layer base` — `* { @apply border-border; }` and
`body { @apply bg-background text-foreground; }`. The universal `*`
border rule is from the shadcn/ui template.

**Lines 157–159:** `.font-heading` uses a CSS variable
`--font-cabin-sketch-bold`. **Issue:** this variable is not defined
elsewhere in this file; it must be supplied by `next/font` or a
similar mechanism in a layout file. If not provided, the rule
silently falls back to the system font.

**Lines 161–213:** Tabs component styles (Radix Tabs primitives).
The class names `TabsRoot`, `TabsList`, `TabsTrigger`, `TabsContent`
are conventional Radix patterns.

**Lines 215–266:** Glow keyframes and `.animate-glow` rule. Two
keyframes (`glow` and `animate-glow`) with identical bodies —
duplication.

**Lines 268–356:** Post-it note styling (`.quote-container`, `.note`,
`.yellow`, `.pin`, `.pin:after`, `.pin:before`).

**Lines 358–471:** Book and card styling — 3D card with `transform-style:
preserve-3d`. The `.card:hover` rule (line 388) applies a translation,
rotation, and scale; consumers must ensure no layout shifts.

**Lines 474–504:** Print styles for page numbers and article paragraphs.

**Issues summary:**
- `globals.css` is mostly fine; it is a copy of the shadcn/ui default
  template.
- `glow` and `animate-glow` keyframes are duplicates.
- `.font-heading` depends on a CSS variable defined elsewhere.
- External Google Fonts imports add a privacy/performance cost.

---

### 17. `apps/reading-advantage/styles/theme-base-colors.ts`

**Lines 1–754:** A large const array `baseColors` with one entry per
theme (`zinc`, `slate`, `stone`, `gray`, `neutral`, `red`, `rose`,
`orange`, `green`, `blue`, `yellow`, `violet`).

Each entry has `name`, `label`, `activeColor` (light/dark), and
`cssVars` (light/dark).

- **Line 119:** `slate.dark.ring = "212.7 26.8% 83.9"` — missing
  trailing `%` (compared to `slate.light.ring = "222.2 84% 4.9%"`).
  This is likely a typo; the same pattern occurs on line 138 in
  `themes.css` for `slate` dark ring. Browsers tolerate the missing
  `%`, but the value is no longer HSL — it is just `H S L` numbers
  with `L` in 0–1 range, not 0–100. Result: the ring color is
  effectively invisible (luminance ~83.9 instead of 83.9%).
- **Line 299:** `neutral.light.--radius` is missing its value — only a
  blank after the colon. **Bug:** `--radius: ;` is invalid CSS.
  (Compare with `themes.css` line 299, which has the same blank.)
- **Lines 754:** `as const` cast on the entire array.
- **Line 756:** `export type BaseColor = (typeof baseColors)[number];`
  — correct derived type.

**Issues summary:**
- Two likely typos affecting `slate` dark ring color and the
  `neutral` radius. These match identically in `themes.css`, which
  suggests they are copy-paste artifacts.
- The 754-line literal is unwieldy and could be generated, but the
  current shape is consistent with shadcn/ui's registry output.
- Some color values duplicate content in `themes.css` and
  `globals.css` — three sources of truth for the same tokens.

---

### 18. `apps/reading-advantage/styles/theme-base-style.ts`

**Lines 1–12:** Trivial:

- **Lines 1–10:** `styles` array with `new-york` and `default`.
- **Line 12:** `export type Style = (typeof styles)[number];`

**Issues summary:**
- No issues; minimal file.
- `as const` (line 10) preserves literal types for inference.

---

### 19. `apps/reading-advantage/styles/themes.css`

**Lines 1–863:** Mirror of `theme-base-colors.ts` in CSS form. Each
theme has `.theme-NAME` and `.dark .theme-NAME` blocks.

- **Line 119:** `--ring: 212.7 26.8% 83.9;` for `.dark .theme-slate`
  — missing trailing `%` (same typo as `theme-base-colors.ts`).
- **Line 299:** `--radius: ;` for `.theme-neutral` (light) — empty
  value (same bug as `theme-base-colors.ts`).
- **Lines 138:** Same `--ring: 212.7 26.8% 83.9;` typo in
  `.dark .theme-slate`.

**Issues summary:**
- Two confirmed bugs (lines 119, 299) shared with
  `theme-base-colors.ts`.
- The `.dark .theme-zinc` block (lines 40–75) does not override
  `--radius`; other dark blocks likewise do not. This is consistent
  with `theme-base-colors.ts` but means radius is light-only.

---

### 20. `apps/reading-advantage/tsconfig.json`

**Lines 1–42:** Standard Next.js `tsconfig.json`.

- **Line 3:** `"target": "ES2015"` — predates ES2017 async/await
  guarantees (which is irrelevant because async/await is ES2017) and
  excludes some modern syntax features (object spread, async
  iteration, optional chaining is ES2020 — wait, optional chaining is
  ES2020 and would require `target: "ES2020"` or `lib: ["ES2020"]`).
  Actually, `target` only governs emit; `lib` controls type-checker
  APIs. The codebase uses optional chaining widely (e.g., `customer
  ?.request`, `servePosition?.x`), which requires `lib` to include
  ES2020. The `lib` array (lines 4–8) is `["dom", "dom.iterable",
  "esnext"]` — `esnext` covers optional chaining. So `target:
  ES2015` is fine for type-checking, but means emitted JS may be
  transpiled down to ES2015 (with polyfills for some features).
- **Line 11:** `"strict": true` — good.
- **Line 13:** `"esModuleInterop": true` — good.
- **Line 14:** `"module": "esnext"` — good with Next.js.
- **Line 15:** `"moduleResolution": "bundler"` — appropriate for Next 13+.
- **Line 17:** `"isolatedModules": true` — required for Next.js
  webpack/SWC.
- **Line 18:** `"downlevelIteration": true` — necessary for `for..of`
  on iterables when `target` is pre-ES2015.
- **Lines 26–30:** Path alias `@/*` maps to `./*`. Consistent with the
  `@/` imports used throughout the batch.
- **Lines 32–38:** Includes `next-env.d.ts`, all TS/TSX, and Next.js
  dev/build types.
- **Lines 39–41:** Excludes `node_modules` only. Does not exclude test
  files, generated output, or other directories.

**Issues summary:**
- `target: "ES2015"` is conservative; many other Next.js projects use
  `ES2020` or `ES2022`.
- No `noUncheckedIndexedAccess` or `exactOptionalPropertyTypes` — the
  codebase misses two strictness flags that would catch many of the
  `?.` and array-index bugs observed in `usePotionRushStore.ts`.
- No `types` array; default behavior picks up `@types/*` from
  `node_modules`.
- No `baseUrl`; path alias works because Next.js synthesizes it.

---

## Cross-Cutting Themes

### Generator / AI Provider Coupling

`word-list-generator.ts` imports both `openai` and `google` provider
factories from `@/utils/*` and hard-codes `google(googleModelAudio)` for
the only call. As in batch 48, this bypasses the
`@reading-advantage/ai` adapter's model-selection surface. The file
also leaves 80+ lines of commented-out OpenAI code in production,
matching the same pattern in `article-generator.ts`,
`evaluate-rating-generator.ts`, `question-generator.ts`, and
`topic-generator.ts`.

### Prompt Injection

`word-list-generator.ts` builds `userPrompt` by raw interpolation of
`params.passage`. This is the same prompt-injection surface documented
in batch 48; this file alone has no Zod input validation, no length
limits, and no escaping.

### Validation

- `article-validator.ts` is **empty**.
- `verify-user-expired.ts` does not validate `expiredDate` and silently
  treats invalid dates as non-expired.
- `read-json.ts` returns `T` from unchecked `JSON.parse`.
- `handle-request.ts` types `router: any` and `ctx.params?: unknown`.
- `word-list-generator.ts` and all stores rely on TypeScript types
  with no Zod parsing at the boundary.

### Storage

Only `usePotionRushStore.ts` touches client-side data. `useGameStore.ts`
and `useRPGBattleStore.ts` are in-memory only. `classroom-store.ts`
imports `persist` but does not use it. No localStorage/IndexedDB use is
present in this batch.

### Retry / Idempotency

The generator file does not implement retries. The stores use
`Math.random()` for IDs and patience, which is non-deterministic; a
test rerun is reproducible only via `jest.spyOn(Math, "random")`.

### Architecture / Layering

- `usePotionRushStore.ts` carries ~770 lines of game domain logic in a
  client-side Zustand store. Per AGENTS.md, business logic belongs in
  `packages/backend`. The store's `tick` function effectively runs a
  per-frame state machine; this is borderline acceptable for a game
  but should be moved to a worker/loop module if it ever needs
  testing outside React.
- `word-list-generator.ts` is a server-side generator that should also
  live under `/packages/backend` per the monorepo layering rules.
- `classroom-store.ts` couples a client store to a public build-time
  env (`NEXT_PUBLIC_BASE_URL`).
- The dead `article-validator.ts` indicates incomplete migration to
  Zod at the boundaries.

### Privacy

- `classroom-store.ts` holds `email` and `display_name` in client
  state without retention policy.
- `globals.css` imports Google Fonts (`Indie Flower`, `Amatic SC`)
  directly, exposing user IP to Google on every page load.
- `send-discord-webhook.ts` embeds `process.env.NODE_ENV` in webhook
  payloads (line 57). Not sensitive but hygiene.

### Build / Type Safety

- `tsconfig.json` lacks `noUncheckedIndexedAccess`, which would have
  flagged several array-index reads in `usePotionRushStore.ts`.
- `target: "ES2015"` is conservative.

---

## Risk Matrix

| Risk | Severity | Files |
|------|----------|-------|
| Direct provider/model coupling + unused OpenAI imports | High | word-list-generator.ts |
| Prompt injection via raw `params.passage` interpolation | High | word-list-generator.ts |
| 80+ lines of commented-out OpenAI code in production | Medium | word-list-generator.ts |
| Empty validator file masquerades as a Zod boundary | High | validators/article-validator.ts |
| `isUserExpired` treats invalid date strings as non-expired | High | verify-user-expired.ts |
| `router: any` and `params?: unknown` in route helper | Medium | handle-request.ts |
| Synchronous `fs.readFileSync` on request path with no error handling | Medium | read-json.ts |
| `word-list-generator` throws string and reports "failed to generate audio" | Medium | word-list-generator.ts |
| Webhook helper throws stringified error without structured logging | Medium | send-discord-webhook.ts |
| `Math.random()` IDs at five call sites; `substr` deprecated | Medium | usePotionRushStore.ts |
| `tick` is 226 lines, inlined duplication of `spawnCustomer`/`spawnIngredient` | High | usePotionRushStore.ts |
| `Math.pow(0.9, completedSentences)` and `Math.pow(1.1, completedSentences)` with no floor/ceiling | High | usePotionRushStore.ts |
| Module-level `revealTimeout` shared across subscribers | High | useRPGBattleStore.ts |
| `submitAnswer` does not lock input on correct answers | Medium | useRPGBattleStore.ts |
| `damagePlayer` overwrites pose mid-animation | Low | useRPGBattleStore.ts |
| `classroom-store` imports `persist` but never uses it | Low | classroom-store.ts |
| `classroom-store` couples client to `NEXT_PUBLIC_BASE_URL` | Medium | classroom-store.ts |
| `question-store` setters not declared in `Question` interface | Low | question-store.ts |
| `resetStoreState` does not reset `mana`, `missedWords`, `combo` | Low | useGameStore.test.ts |
| `increaseScore` conflates score with attempt counters | Low | useGameStore.ts |
| `addMissedWord` lacks dedup | Low | useGameStore.ts |
| `slate` dark ring missing `%` (CSS bug) | Medium | theme-base-colors.ts line 119, themes.css lines 119/138 |
| `neutral` light `--radius: ;` (empty value, invalid CSS) | High | theme-base-colors.ts line 299, themes.css line 299 |
| Duplicate `glow` and `animate-glow` keyframes | Low | globals.css |
| External Google Fonts import without privacy/consent | Low | globals.css |
| `tsconfig.json` lacks `noUncheckedIndexedAccess` | Medium | tsconfig.json |
| `target: "ES2015"` is conservative | Low | tsconfig.json |

---

## Recommendations (Non-Exhaustive)

1. **Empty `article-validator.ts`** must be implemented (Zod schemas
   for the article payload) or deleted; the empty file currently
   silently breaks any caller that imports it.
2. **`word-list-generator.ts`** should:
   - Drop unused OpenAI imports and the 80+ lines of commented-out
     provider code.
   - Validate `passage` with Zod, enforcing maximum length.
   - Sanitize `passage` before prompt interpolation.
   - Use the `@reading-advantage/ai` adapter's model-selection surface
     rather than a hard-coded `google(googleModelAudio)`.
   - Throw an `Error` with a meaningful message; correct the
     "failed to generate audio" message.
   - Fix the "assisstant" typo in the system prompt.
3. **`isUserExpired`** should validate `expiredDate` via Zod or
   `Date.parse` and return `true` on invalid input (fail-closed for
   expiration checks).
4. **`usePotionRushStore.ts`** should be refactored:
   - Extract `tick`, `spawnCustomer`, `spawnIngredient` into pure
     functions (possibly in `packages/backend` per AGENTS.md) so they
     can be tested without Zustand's reactivity.
   - Replace `Math.random().toString(36).substr(...)` with a single ID
     generator (or `crypto.randomUUID()`).
   - Add minimum/maximum clamps on `patience` and `beltSpeed` driven
     by `completedSentences`.
   - Use `substring` instead of deprecated `substr`.
   - Replace `splice` with immutable array updates.
   - Centralize the three-cauldron initializer.
5. **`useRPGBattleStore.ts`** should encapsulate `revealTimeout` inside
   a closure or ref, not at module scope, so that test runs and
   server-side renders do not share state.
6. **`classroom-store.ts`** should remove the unused `persist` import,
   validate fetched data with Zod, and consider holding less PII.
7. **`question-store.ts`** should declare the setter actions in the
   `Question` interface to keep them refactor-safe.
8. **`theme-base-colors.ts` and `themes.css`** should fix the
   `--ring` typo on `slate` dark and the empty `--radius: ;` on
   `neutral` light. Three sources of truth (`globals.css`,
   `theme-base-colors.ts`, `themes.css`) should be reduced.
9. **`tsconfig.json`** should add `noUncheckedIndexedAccess` and
   consider `target: "ES2022"`.
10. **`send-discord-webhook.ts`** should structure its `console.error`
    log and wrap the thrown error in a richer object rather than
    stringifying it.

---

## Verification

- All 20 files in `/tmp/opencode/ra-batch-49` were read completely.
- No app code was modified.
- This report was written to
  `measure/audit-reports/reading-advantage-full_20260626/line-review/ra-batch-49.md`.

---

*No acceptance claims are made in this review. The report documents
observed conditions and risks for the current HEAD only.*