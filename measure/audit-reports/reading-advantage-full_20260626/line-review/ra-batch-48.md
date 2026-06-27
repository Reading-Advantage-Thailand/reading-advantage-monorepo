# Line-by-Line Review: Reading Advantage — Batch 48

**Track ID:** `reading_advantage_full_review_20260626`
**Batch ID:** `ra-batch-48`
**Baseline SHA:** `f1266a9e2daac789d0d0c3e9fdfbd475f8e74f96`
**Current HEAD:** `7ad89ac39b6b871da0907c6b873329c75d6dc3b9`
**Review Date:** 2026-06-27
**Reviewer Role:** A — correctness / architecture / AI provider coupling / prompt injection / validation / privacy / storage / retry / idempotency

---

## Scope

All 20 files listed in `/tmp/opencode/ra-batch-48` were read in full. The
batch covers utility modules under `apps/reading-advantage/server/utils/`,
with a heavy concentration on AI/generator helpers in
`apps/reading-advantage/server/utils/generators/`.

| # | File | Lines / Bytes Reviewed |
|---|------|------------------------|
| 1 | `apps/reading-advantage/server/utils/CEFR-requirements.ts` | 1–357 |
| 2 | `apps/reading-advantage/server/utils/authorization.ts` | 1–366 |
| 3 | `apps/reading-advantage/server/utils/catch-async.ts` | 1–18 |
| 4 | `apps/reading-advantage/server/utils/generators/article-generator.ts` | 1–117 |
| 5 | `apps/reading-advantage/server/utils/generators/audio-generator.ts` | 1–234 |
| 6 | `apps/reading-advantage/server/utils/generators/audio-words-generator.ts` | 1–259 |
| 7 | `apps/reading-advantage/server/utils/generators/evaluate-rating-generator.ts` | 1–96 |
| 8 | `apps/reading-advantage/server/utils/generators/image-generator.ts` | 1–60 |
| 9 | `apps/reading-advantage/server/utils/generators/key-generator.ts` | 1 |
| 10 | `apps/reading-advantage/server/utils/generators/la-question-generator.ts` | 1–38 |
| 11 | `apps/reading-advantage/server/utils/generators/mc-question-generator.ts` | 1–75 |
| 12 | `apps/reading-advantage/server/utils/generators/question-generator.ts` | 1–91 |
| 13 | `apps/reading-advantage/server/utils/generators/random-select-genre.ts` | 1–40 |
| 14 | `apps/reading-advantage/server/utils/generators/sa-question-generator.ts` | 1–50 |
| 15 | `apps/reading-advantage/server/utils/generators/stories-bible-generator.ts` | 1–105 |
| 16 | `apps/reading-advantage/server/utils/generators/stories-chapters-generator.ts` | 1–476 |
| 17 | `apps/reading-advantage/server/utils/generators/stories-generator.ts` | 1–375 |
| 18 | `apps/reading-advantage/server/utils/generators/stories-topic-generator.ts` | 1–63 |
| 19 | `apps/reading-advantage/server/utils/generators/topic-generator.ts` | 1–47 |
| 20 | `apps/reading-advantage/server/utils/generators/translation-generator.ts` | 1–176 |

**Total lines reviewed:** ~2,821 across 20 files.
**No file was partially reviewed.**

---

## Executive Summary

This batch contains the core AI content-generation and authorization
utilities for `apps/reading-advantage`. The generator directory is where
nearly all LLM/TTS/image synthesis calls originate, and the three
non-generator files provide CEFR constraints, authorization predicates,
and a route-level async-error wrapper.

The most severe issues found are:

1. **Direct provider coupling and hard-coded models throughout the
   generator layer.** Files import `@/utils/openai` and `@/utils/google`
   directly and then hard-code either `google(...)` or `openai(...)` model
   instances. Commented-out OpenAI calls remain in production code. The
   `modelId` parameter passed by question wrappers is ignored by
   `question-generator.ts`. This violates the monorepo's adapter / provider-
   neutrality policy.
2. **Prompt injection surface is broad and unmitigated.** User-facing
   inputs (`genre`, `subgenre`, `topic`, `passage`, `title`, `summary`,
   `imageDesc`, word lists, and story metadata) are concatenated into
   prompts with no length limits, sanitization, or structured escaping.
3. **No input validation on generator parameters.** Every generator
   accepts interface-typed params and forwards them straight into prompts
   or storage without Zod parsing, even though the codebase mandates Zod
   at all external boundaries.
4. **Retry logic exists in only a few places and is coupled to no
   idempotency.** `image-generator.ts`, `translation-generator.ts`, and
   `stories-chapters-generator.ts` retry transient failures, but none use
   deterministic seeds/idsempotency keys, and partial failures in
   `stories-generator.ts` can leave DB rows, storage objects, and local
   temp files in an inconsistent state.
5. **`stories-generator.ts` orchestrates long-running, multi-stage work
   inside a Next.js Route Handler without transactions.** It performs
   multiple independent `db.insert` / `db.update` calls, generates images,
   audio, and word audio, and only attempts cleanup on some failure paths.
6. **Authorization helpers have incomplete tenant scoping.**
   `canAccessClassroom` and `canAccessStudent` return `true` for `ADMIN`
   without verifying the student's/classroom's school, and
   `buildStudentFilter` is typed as `any`.
7. **`catch-async.ts` leaks raw `Error.message` strings to HTTP clients
   with HTTP 500.** This can expose internal file paths, provider error
   details, or other sensitive implementation information.

---

## Findings by File

### 1. `apps/reading-advantage/server/utils/CEFR-requirements.ts`

**Line 1:** `import { z } from "zod";` — Zod used for output-side validation
of a static constant.

**Lines 3–39:** `CEFRLevelRequirementsSchema` — Comprehensive Zod schema for
CEFR constraints. Good practice for typed constraints.

**Lines 41–44:** `export const CEFRRequirements: Record<string, ...>` — The
outer `Record<string, ...>` weakens type safety; the keys are actually the
known CEFR levels. The schema parse at runtime compensates but the exported
type is overly permissive.

**Lines 344–356:** `getCEFRRequirements` — Validates a compile-time
constant on every call. The schema parse is redundant because
`CEFRRequirements` is a static object, but it does provide a runtime guard
if the file is ever mutated. Throws a generic `"Invalid CEFR data structure"`
after logging; the original Zod error is not surfaced to callers.

**Issues:**
- The `Record<string, ...>` export allows callers to index with arbitrary
  strings without TypeScript narrowing.
- Runtime validation of static data is harmless but wasteful.
- **No AI/provider coupling, prompt injection, storage, or retry concerns**
  in this file.

---

### 2. `apps/reading-advantage/server/utils/authorization.ts`

**Lines 16–18:** Imports `Role`, `db`, `eq`, and schema tables. Uses
Drizzle for school/classroom membership verification.

**Lines 20–26:** `UserContext` interface. Optional `school_id` and classroom
arrays. No validation; callers must ensure the context is trustworthy.

**Lines 35–51:** `canAccessSchool` — Correctly denies access when
`targetSchoolId` is missing and grants `SYSTEM` full access. All other roles
are compared by `school_id`.

**Lines 60–85:** `canAccessClassroom` — **Issue:** For `Role.ADMIN`, the
function returns `true` unconditionally (line 80–82). The JSDoc states
"ADMIN can access classrooms in their school (requires school check
separately)", but nothing in this function enforces that. A caller that
forgets the school check grants cross-tenant classroom access.

**Lines 95–123:** `canAccessStudent` — **Issue:** Same pattern as above:
`ADMIN` returns `true` without a school check (line 111–113). The JSDoc
again pushes the responsibility to the caller, creating an authorization
gap.

**Lines 132–134:** `isOwnData` — Simple identity check. Fine.

**Lines 153–166:** `buildSchoolFilter` — Uses `"__NO_SCHOOL__"` sentinel
when `user.school_id` is absent for non-SYSTEM users. This prevents
accidental cross-tenant reads, but the magic string is a fragile fallback.

**Lines 184–209:** `buildClassroomFilter` — Correctly restricts teachers
and students to their assigned classroom arrays; ADMIN sees all classrooms
(again relying on a separate school filter).

**Lines 219–245:** `verifyClassroomSchool` — Queries `classrooms` table and
throws if the classroom belongs to a different school. This is the correct
pattern, but it is separate from `canAccessClassroom`, so callers must
remember to invoke both.

**Lines 255–285:** `verifyStudentSchool` — Verifies school match and also
verifies `student.role === Role.STUDENT`. Good.

**Lines 293–303:** `getAccessibleClassroomIds` — Fine.

**Lines 314–344:** `buildStudentFilter` — **Issue:** Return type is
explicitly `any`. This undermines the tenant-scoping contract and makes it
easy for callers to misuse the filter. Also returns `{ id: "__NO_USER__" }`
sentinel for the default case.

**Lines 355–366:** `authorizationError` — Returns a plain object; no
`NextResponse` or HTTP status handling here.

**Cross-cutting issues:**
- ADMIN authorization is split across functions and relies on caller
  discipline, which is error-prone.
- `any` return type in `buildStudentFilter` weakens type safety.
- No Zod schemas for `UserContext` or filter outputs.

---

### 3. `apps/reading-advantage/server/utils/catch-async.ts`

**Lines 1–18:** Simple async wrapper for Next.js Route Handlers.

**Security issue (lines 9–11):** On any thrown `Error`, the raw
`error.message` is returned to the client with HTTP 500. This can leak:
- Internal file paths from filesystem errors.
- Provider error details from AI/storage failures.
- Database constraint messages.

**Correctness issue:** The wrapper returns HTTP 500 for all errors,
including validation failures (should be 400) and authorization failures
(should be 403). It does not distinguish error classes.

**No AI/provider coupling, validation, storage, retry, or idempotency**
concerns, but it magnifies the impact of those issues by exposing them to
clients.

---

### 4. `apps/reading-advantage/server/utils/generators/article-generator.ts`

**Lines 1–8:** Imports `z`, `path`, `readJsonFile`, `generateObject` from
`@reading-advantage/ai`, enums, and both `openai` and `google` provider
factories. Only Google is used; OpenAI import is dead weight plus a
commented-out call at line 105.

**Lines 9–16:** `GenerateArticleParams` interface. No Zod validation. The
`previousContent` field is declared but never used in the function body.

**Lines 25–35:** `CefrLevelPromptType` / `CefrLevelType` — Local types,
fine.

**Lines 38–69:** Output Zod schema. Good use of `.describe()` to guide the
model. The schema is created inside the module scope, so it is reused.

**Lines 71–117:** `generateArticle`

- **Line 74–78:** Reads `data/cefr-level-prompts.json` from `process.cwd()`.
  No validation that the file exists or that its contents match the
  expected shape.
- **Line 84–86:** `.find(...)` chains can return `undefined`; handled at
  line 88–90.
- **Lines 92–95:** `userPrompt = levelConfig.userPromptTemplate.replace(...)`
  — **Prompt injection risk.** `genre`, `subgenre`, and `topic` are inserted
  via simple string substitution with no escaping, length limits, or Zod
  validation. If any of these values originate from user input, they can
  alter system instructions or leak data.
- **Line 99–100:** Logs the hard-coded model ID `googleProPrewiew` and
  `params.type` to `console.log`.
- **Lines 103–111:** Calls `generateObject` with `model: google(googleProPrewiew)`,
  hard-coding the provider/model. The `seed` is random
  (`Math.floor(Math.random() * 1000)`), which means the call is **not
  idempotent** and retries will produce different outputs.
- **Line 105:** Commented-out `model: openai(openaiModel)` left in
  production code.
- **Line 115:** `throw \`failed to generate article: ${error}\`;` — Throws a
  string, not an `Error` instance. This loses the stack trace and breaks
  `instanceof Error` checks in callers.

**Issues summary:**
- Hard-coded Google model / provider coupling.
- No input validation (Zod) for `GenerateArticleParams`.
- Prompt injection via unescaped template substitution.
- Random seed prevents deterministic retries.
- Throws string instead of Error.
- Commented-out provider code in production.

---

### 5. `apps/reading-advantage/server/utils/generators/audio-generator.ts`

**Lines 1–19:** Imports include `splitTextIntoSentences` from `@/lib/utils`
(commented out at line 89), Google TTS constants, `base64-js`, `fs`,
`child_process` (unused `execSync`), `uploadToBucket`, `generateObject` from
`@reading-advantage/ai`, both OpenAI and Google factories (only Google
used), Zod, utility helpers, and Drizzle.

**Lines 20–25:** `GenerateAudioParams` interface. `userId` is added later
as optional but never used.

**Lines 27–34:** `contentToSSML` — Builds SSML by concatenating raw
sentences into `<speak>` tags. **SSML injection risk:** if a sentence
contains XML special characters (`<`, `>`, `&`, `"`, `'`) or nested SSML,
the resulting document may be malformed or execute unintended markup.

**Lines 36–83:** `generateSSML` — Uses `generateObject` with
`google(googleModelAudio)` to split an article into sentences. The entire
`article` string is concatenated into `userPrompt` (line 42) with no
escaping or length limits. The schema wraps the result in `input`/`output`
nesting for no clear reason. `temperature: 0.2` is set.

- **Line 81:** Throws a string, not an `Error`.

**Lines 85–110:** `splitTextIntoChunks`

- Uses the LLM-split sentences.
- Builds SSML chunks and checks byte length against `maxBytes`.
- **Line 98:** `new TextEncoder().encode(ssml).length` computes UTF-8 byte
  length; this is correct for Google TTS limits.

**Lines 114–233:** `generateAudio`

- **Lines 125–128:** Randomly selects a voice from `AVAILABLE_VOICES` and
  `NEW_MODEL_VOICES` (the latter is unused). Random voice choice makes
  regeneration non-idempotent.
- **Line 130:** Splits text into 5000-byte SSML chunks.
- **Lines 146–167:** Direct `fetch` to Google Cloud Text-to-Speech API with
  the API key in the query string: `?key=${process.env.GOOGLE_TEXT_TO_SPEECH_API_KEY}`.
  **Security risk:** API key appears in URL. Logs, proxies, or error
  reports may capture the full URL. This bypasses any internal storage/API
  adapter.
- **Lines 154–165:** Request body includes raw SSML built from article
  sentences. No sanitization of `ssml` content beyond the SSML helper.
- **Lines 169–171:** Throws a generic `Error` with only `response.statusText`;
  response body is not logged.
- **Line 177:** Writes chunk MP3 to `${process.cwd()}/data/audios/...`.
  **Storage risk:** local temp file path is hard-coded; if `process.cwd()`
  is not writable or the directory is missing, the function crashes. No
  cleanup on error.
- **Lines 182–190:** Builds timepoints. Uses `currentIndex++` and
  `sentences[currentIndex - 1]`. If the TTS response has fewer timepoints
  than expected (e.g., empty sentence handling), `sentences[currentIndex - 1]`
  may be `undefined`, producing `undefined` in the output array.
- **Line 194:** `probeDurationSeconds(localPath)` is called for every chunk;
  this is correct for cumulative timing but adds file I/O per chunk.
- **Lines 199–203:** Concatenates MP3 chunks with FFmpeg, then unlinks
  chunk files. If `concatMp3Files` throws, the chunk files are not cleaned
  up.
- **Line 205:** Uploads combined audio to bucket.
- **Lines 208–223:** Updates the `articles` table with `sentences` and
  `audioUrl`. This is done **outside any transaction**. If upload succeeds
  but DB update fails, the storage object exists but the row is not
  updated; the reverse is also possible.
- **Line 209:** `isChapter && chapterId` branch is a no-op comment; caller
  must update DB. This split responsibility is error-prone.
- **Line 229:** Throws a string, attempts to read `error.response?.data`
  (works only for Axios-style errors; `fetch` errors do not have this
  shape, so it often yields `undefined`).

**Issues summary:**
- Direct provider SDK URL usage (Google TTS) with API key in query string.
- SSML/XML injection risk from unescaped sentence content.
- No input validation for `passage`, `articleId`, etc.
- No retry logic for TTS or upload failures.
- Non-idempotent due to random voice and LLM sentence splitting.
- Local temp file cleanup is incomplete on errors.
- DB and storage are not atomic.
- Throws string, not Error.
- Unused imports (`execSync`, `openai`, `splitTextIntoSentences`).

---

### 6. `apps/reading-advantage/server/utils/generators/audio-words-generator.ts`

**Lines 1–11:** Similar imports to `audio-generator.ts` but without the
LLM sentence splitter.

**Lines 12–28:** `WordListResponse` / `GenerateAudioParams` /
`GenerateChapterAudioParams`. `userId` and `isUserGenerated` are accepted
but unused.

**Lines 41–50:** `contentToSSML` — Same SSML injection risk as
`audio-generator.ts`; raw vocabulary strings are inserted without XML
escaping.

**Lines 65–192:** `generateAudioForWord`

- **Lines 84–86:** `wordList` typed as `WordListResponse[]` but then cast
  to `any` when mapping. Filter only keeps truthy `vocabulary` values.
- **Line 89:** Logs vocabulary count.
- **Lines 102–121:** Direct Google TTS `fetch` with API key in URL, raw
  SSML in body. Same security and injection concerns as
  `audio-generator.ts`.
- **Lines 123–132:** Logs full error response body. This may include the
  API key if the request URL is logged elsewhere, and may leak user
  content in logs.
- **Lines 149–150:** Writes local MP3; no directory existence check.
- **Lines 152:** Uploads to bucket.
- **Lines 155–167:** Merges word list with timepoints. If a timepoint is
  missing, `timeSeconds` defaults to `0`. No validation that
  `wordList[index]` exists before accessing `.definition`.
- **Lines 170–185:** Updates `articles.words` and `articles.audioWordUrl`.
  Same non-transactional concern as `audio-generator.ts`.
- **Line 190:** Throws a string.

**Lines 194–258:** `generateChapterAudioForWord`

- **Lines 204–206:** Maps word list without `.filter(Boolean)`, so
  `undefined` vocabulary values can enter the SSML array.
- **Lines 210–229:** Direct Google TTS `fetch` with API key in URL.
- **Line 231–233:** Generic error throw without logging response body.
- **Line 237:** `allTimePoints = data?.timepoints` may be `undefined` if
  the API omits it; not handled.
- **Lines 240–246:** Writes local file and uploads.
- **Lines 248–251:** Firestore migration warning; fine.
- **Lines 253–256:** `throw \`... ${error.response.data}\`;` — **Bug:**
  `error.response` is likely undefined for `fetch` errors, causing a
  secondary `Cannot read properties of undefined` exception and masking
  the original failure.

**Issues summary:**
- Direct Google TTS fetch with API key in URL.
- SSML injection from vocabulary strings.
- No input validation.
- No retry logic.
- `error.response.data` crash in chapter function.
- DB/storage not atomic.
- Throws strings.

---

### 7. `apps/reading-advantage/server/utils/generators/evaluate-rating-generator.ts`

**Lines 1–9:** Imports both `openai` and `google`; only Google is used.
Commented-out OpenAI block at lines 50–64.

**Lines 11–20:** `EvaluateRatingParams` interface. All fields except
`passage` are optional. **No Zod validation.**

**Lines 32–96:** `evaluateRating`

- **Lines 35–39:** Reads JSON prompts from `process.cwd()/data/`; no shape
  validation.
- **Lines 41–44:** Reads a markdown file via `fs.readFileSync` into
  `systemPrompt`, but then never uses it (commented out at line 77).
- **Lines 49–64:** Large commented-out OpenAI implementation left in
  production.
- **Lines 66–88:** Calls `generateObject` with `model: google(googleModel)`,
  hard-coded provider. System prompt comes from a JSON lookup that may be
  `undefined` if `params.cefrLevel` is not found. `seed` is random, making
  the call non-idempotent. `temperature: 1`.
- **Line 78–85:** `prompt: JSON.stringify({ passage: params.passage })` —
  `passage` is inserted raw into a JSON wrapper. Other fields are
  commented out, but `passage` itself has no length limits or sanitization.
- **Line 94:** `throw \`failed to evaluate rating\`;` — Throws a string and
  swallows the original error.

**Issues summary:**
- Hard-coded provider/model.
- No input validation; `passage` can be arbitrary length/content.
- Random seed breaks idempotency.
- Dead code and unused imports.
- Throws string, swallows root cause.

---

### 8. `apps/reading-advantage/server/utils/generators/image-generator.ts`

**Lines 1–6:** Imports `experimental_generateImage as generateImages` from
`@reading-advantage/ai`, `uploadToBucket`, `fs`, constants, and the Google
provider factory. Only Google image generation is used.

**Lines 7–10:** `GenerateImageParams` interface — no Zod validation.

**Lines 12–60:** `generateImage`

- **Line 14:** `maxRetries = 5` default. Implements exponential backoff
  (line 55).
- **Lines 21–30:** Calls `generateImages` with
  `model: google.image(googleImages as any)`. The `as any` cast hides type
  issues. `providerOptions.vertex` includes `personGeneration: "allow_all"`,
  which is a policy decision but should be documented/audited.
- **Line 23:** `prompt: params.imageDesc` — direct prompt injection risk.
  No length limits, content filtering, or escaping.
- **Lines 32–36:** Converts base64 to buffer and writes PNG to
  `${process.cwd()}/data/images/${params.articleId}.png`. No directory
  check; no cleanup if upload fails.
- **Line 38:** Uploads to bucket at `${IMAGE_URL}/${params.articleId}.png`.
- **Lines 42–58:** Logs errors and retries. If all retries fail, throws an
  `Error`. The retry is good, but because there is no idempotency key and
  image models are stochastic, retries may produce a different image each
  time.

**Issues summary:**
- Hard-coded Google image provider/model.
- `as any` cast on model configuration.
- Prompt injection risk on `imageDesc`.
- No input validation.
- Local file cleanup missing on failure paths.
- Retry exists but is not idempotent/deterministic.
- `personGeneration: "allow_all"` policy should be explicitly approved.

---

### 9. `apps/reading-advantage/server/utils/generators/key-generator.ts`

**Line 1:** Comment-only stub: `// key generator using randomBytes`.

No security-sensitive implementation present. If this is meant to generate
API keys, it is currently non-functional.

---

### 10. `apps/reading-advantage/server/utils/generators/la-question-generator.ts`

**Lines 1–12:** Imports Zod, enums, and `generateQuestion`.

**Lines 5–11:** `GenrateLAQuestionParams` interface (typo in name:
"Genrate"). No Zod validation.

**Lines 18–38:** `generateLAQuestion`

- **Line 24–34:** Builds `GenerateQuestionParams` with
  `modelId: "gpt-4o-mini"` (line 32).
- **Line 36–37:** Calls `generateQuestion` and returns `.question`.

**Issue:** `modelId` is passed but ignored by `question-generator.ts`
(see below). The hard-coded model string is misleading.

**Issues summary:**
- No input validation.
- Misleading `modelId` parameter.
- Delegates all AI logic to `question-generator.ts`.

---

### 11. `apps/reading-advantage/server/utils/generators/mc-question-generator.ts`

**Lines 1–24:** Same structure as LA generator. `GenrateMCQuestionParams`
typo again.

**Lines 26–75:** `generateMCQuestion`

- Defines a rich Zod schema with `.describe()` for the model.
- **Line 68:** Hard-codes `modelId: "gpt-4o-mini"`, ignored downstream.
- **Line 74:** Returns `generateQuestionResponse.question`.

**Issues summary:**
- No input validation at the boundary.
- Misleading `modelId`.
- Delegates AI call to `question-generator.ts`.

---

### 12. `apps/reading-advantage/server/utils/generators/question-generator.ts`

**Lines 1–8:** Imports enums, Zod, `readJsonFile`, `generateObject`, both
OpenAI and Google factories. Only Google is used.

**Lines 9–19:** `GenerateQuestionParams<T>` — accepts a generic schema and
a `modelId: string` that is **not used**.

**Lines 44–91:** `generateQuestion`

- **Line 48–49:** Reads prompt file from `process.cwd()/data/`. No shape
  validation.
- **Lines 51–53:** Normalizes CEFR level by stripping `+`/`-` and
  uppercasing. No validation that the result is a known level.
- **Lines 55–63:** Checks type/level presence in the loaded prompt object;
  throws descriptive errors.
- **Line 68:** Builds `userPrompt` by concatenating `user_prompt` with raw
  `passage`, `title`, `summary`, and `imageDesc`. **Major prompt injection
  surface.** These values can contain model instructions or delimiters
  that alter behavior.
- **Line 70–72:** Logs modelId and metadata.
- **Lines 74–80:** Calls `generateObject` with `model: google(googleModel)`
  and `maxTokens: 4000`. Hard-coded provider; `modelId` parameter is
  ignored. No `seed`, so retries/regeneration produce different questions.
- **Line 85–90:** Catches error, logs it, and throws a string.

**Issues summary:**
- Hard-coded provider/model despite `modelId` parameter.
- `modelId` parameter is a dead contract; callers think they control the
  model.
- No input validation for `passage`, `title`, `summary`, `imageDesc`.
- Prompt injection via direct string concatenation.
- No retry logic.
- Non-idempotent output.
- Throws string, not Error.

---

### 13. `apps/reading-advantage/server/utils/generators/random-select-genre.ts`

**Lines 1–3:** Imports local JSON and enums.

**Lines 13–30:** `fetchGenresFromFile` — reads from `typeGenre` imported
JSON, picks random genre/subgenre.

**Lines 32–40:** `randomSelectGenre` — wraps the file helper.

**No AI/provider coupling, prompt injection, storage, or retry issues.**
The random selection is fine. No input validation for `params.type`, but
it is a typed enum.

---

### 14. `apps/reading-advantage/server/utils/generators/sa-question-generator.ts`

Same pattern as LA/MC generators.

- `GenrateSAQuestionParams` typo.
- Hard-codes `modelId: "gpt-4o-mini"`, ignored by `question-generator.ts`.
- No input validation.
- Delegates AI call to `question-generator.ts`.

---

### 15. `apps/reading-advantage/server/utils/generators/stories-bible-generator.ts`

**Lines 1–3:** Imports `generateObject`, `openai`, and Zod. This generator
uses OpenAI exclusively (`openaiModel4o`).

**Lines 5–63:** `StoryBibleSchema` — large, well-structured Zod schema for
story bibles.

**Lines 65–105:** `generateStoryBible`

- **Lines 80–91:** `prompt` is built via template literal with raw
  `genre`, `subgenre`, and `topic`. **Prompt injection risk.** No length
  limits or sanitization.
- **Lines 93–98:** Calls `generateObject` with `model: openai(openaiModel4o)`
  and `temperature: 1`. No `seed`; non-idempotent.
- **Line 102:** Logs error with `console.error`.
- **Line 103:** Throws a new `Error`, which is correct (unlike string
  throws elsewhere).

**Issues summary:**
- Hard-coded OpenAI model/provider.
- No input validation for `topic`, `genre`, `subgenre`.
- Prompt injection via template literal.
- No retry logic.
- Non-idempotent due to missing seed/high temperature.

---

### 16. `apps/reading-advantage/server/utils/generators/stories-chapters-generator.ts`

**Lines 1–13:** Imports enums, `generateObject`, OpenAI factory (unused),
Zod, CEFR helper, question generators, path utilities, readJsonFile, and
Google factory.

**Lines 14–111:** Large set of local TypeScript interfaces. These are not
validated at runtime; the LLM output is only checked against Zod schemas.

**Lines 123–169:** `ChapterSchema` and `ChapterWithoutQuestionsSchema` —
output schemas. Note that `ChapterWithoutQuestionsSchema` is missing the
`questions` field; `generateSingleChapter` uses it, then questions are
added separately.

**Lines 171–208:** `ChapterWithoutQuestionsSchema` is duplicated with the
same fields as the first part of `ChapterSchema`. This duplication is a
maintenance risk.

**Lines 211–304:** `generateChapters`

- Implements per-chapter retry loop (`maxRetries = 3`).
- **Line 241:** `previousChapters` is set to `chapters` array, but
  `generateSingleChapter` is called with it.
- **Lines 256–265:** Calls `evaluateRating` with `passage: chapters[i].summary`
  (likely a bug — should be `chapters[i].passage`). Sets `user_rating_count = 1`
  artificially.
- **Lines 267–272:** Generates questions. If question generation fails,
  the whole chapter attempt fails and retries.
- **Lines 292–293:** Exponential backoff between retries.
- **Line 285:** Throws new `Error` after retries.

**Lines 306–408:** `generateSingleChapter`

- **Line 319:** Loads CEFR requirements.
- **Lines 320–321:** Computes ±10% word count bounds.
- **Lines 323–334:** Loads `cefr-level-prompts.json` and finds the fiction
  level config. Uses `any[]` typing.
- **Lines 336–338:** Builds previous chapter summaries string.
- **Lines 340–391:** Massive template-literal prompt including raw
  `storyBible` fields (`premise`, `time`, `places`, `characters`, `themes`)
  and full CEFR requirements. **Large prompt injection surface.** Any
  untrusted value in the story bible can alter instructions.
- **Lines 393–401:** Calls `generateObject` with `model: google(googleProPrewiew)`,
  `temperature: 1`, random seed. Non-idempotent.
- **Line 397:** Concatenates `levelConfig.systemPrompt` with an additional
  instruction about translations. The schema actually used
  (`ChapterWithoutQuestionsSchema`) does not contain translation fields,
  so the instruction asks for fields that are then discarded.
- **Lines 403–407:** On error, returns `null`, which is treated as a
  failure by the caller.

**Lines 410–476:** `generateChapterQuestions`

- Calls `generateMCQuestion`, `generateSAQuestion`, and `generateLAQuestion`.
- **Lines 424–436:** Falls back to placeholder strings (`"Missing question"`,
  `"Option 1"`, `"No answer"`) when the AI response is missing fields.
  This can create invalid/empty questions that still pass schema checks
  because the fallback strings are non-empty.
- **Lines 453–469:** LA question fallback creates an answer of `""`.

**Issues summary:**
- Hard-coded Google model/provider.
- No input validation for `storyBible` contents.
- Large prompt injection surface from template literals.
- `passage: chapters[i].summary` likely passed wrong field to evaluator.
- Artificial `user_rating_count = 1` rating fabrication.
- Fallback placeholders allow low-quality content to be stored.
- Random seed and high temperature make retries non-deterministic.
- Schema duplication.

---

### 17. `apps/reading-advantage/server/utils/generators/stories-generator.ts`

**Lines 1–17:** Imports Next.js request/response, Drizzle, schema,
generators, image/audio helpers, delete helper, rating evaluator, level
helper, Discord webhook, and audio generators. This is a large
orchestrator function that still lives in `server/utils/generators/` but
is effectively a Route Handler body (it accepts `NextRequest` and returns
`NextResponse`).

**Lines 27–375:** `generateStories`

- **Line 30:** `const body = await req.json();` — **No validation.** The
  body is trusted.
- **Line 31:** `amountPerGenre` is used before validation; the check at
  line 32 only tests truthiness, not type/range.
- **Line 34:** `parseInt(amountPerGenre)` without radix or bounds check.
- **Lines 41–55:** Sends Discord webhook before starting work. The webhook
  embed description is a plain object; ensure the helper serializes it.
- **Lines 58–329:** `Promise.all(CEFRLevels.map(...))` processes all six
  CEFR levels in parallel. This can create heavy concurrency against AI
  and storage providers and may hit rate limits.
- **Lines 76–91:** Checks for existing story by `title` and `cefrLevel`.
  **Race condition:** between the select and the insert, another request
  could insert the same title/level. There is no unique constraint or
  transaction lock mentioned here.
- **Lines 113–135:** Inserts a new story row with `storyBible: storyBible as any`.
  The `as any` cast bypasses JSON typing. **Privacy note:** the entire
  story bible (characters, settings, themes) is stored in the database
  as JSON; ensure this is intentional and not user PII.
- **Lines 138–141:** Skips existing stories with chapters. Good deduplication
  intent, but not race-safe.
- **Lines 143–153:** Generates story image; on failure, calls
  `deleteStoryAndImages(storyId)` and increments `failedCount`.
- **Lines 155–157:** Random chapter count (6–8) and word count from CEFR.
- **Lines 163–172:** Calls `generateChapters` with `previousChapters: []`
  even when `existingStory` had chapters. The comment says "simplify for
  now".
- **Lines 174–178:** Checks chapter count. Then calls `calculateLevel` on
  the story bible summary again.
- **Lines 185–276:** Loop inserts each chapter, then generates audio and
  word audio with inner retry loops (5 attempts each). **No transaction:**
  each insert/update is independent. If audio fails after 5 attempts, the
  exception is thrown and the outer `catch` deletes the story, but partial
  chapter rows and storage objects may remain.
- **Lines 198–206:** Chapter insert sets `audioUrl` and `audioWordUrl`
  before audio is actually generated. If audio generation later fails and
  the story is deleted, these URLs may still point to non-existent objects
  if the delete helper is incomplete.
- **Lines 216–256:** Manual retry loops for `generateAudio` and
  `generateAudioForWord`. Good intent, but no exponential backoff here —
  immediate retries.
- **Lines 260–266:** Updates chapter with sentences/words after audio
  generation. Another non-atomic DB step.
- **Lines 278–291:** Computes average chapter rating and clamps to 1–5
  with quarter rounding.
- **Lines 293–302:** Updates story row with average rating, RA level, and
  CEFR level.
- **Lines 305–317:** Generates chapter images sequentially. On failure,
  throws, which triggers story deletion.
- **Lines 318–323:** Chapter generation failure deletes story and images.
- **Lines 331–353:** Sends completion webhook.
- **Lines 354–374:** Catches top-level errors, sends failure webhook, and
  returns 500.

**Issues summary:**
- No input validation on `req.json()` body.
- Route Handler logic mixed into a generator utility; violates monorepo
  layering (business logic should live in `packages/backend`).
- No database transaction across story/chapter/audio/image creation.
- Race condition on duplicate title/level detection.
- Heavy parallel processing of all CEFR levels without concurrency limits.
- `storyBible` stored as `any`; potential privacy exposure of generated
  character/plot data.
- Audio URLs written to DB before audio exists.
- Partial failure cleanup relies on `deleteStoryAndImages`; no guarantee
  of atomic rollback.
- No idempotency key; rerunning the endpoint can duplicate stories or
  leave orphans.

---

### 18. `apps/reading-advantage/server/utils/generators/stories-topic-generator.ts`

**Lines 1–4:** Imports `generateObject`, enums, Zod, and OpenAI factory.

**Lines 17–63:** `generateStoriesTopic`

- **Lines 24–43:** `prompts` object with identical fiction/nonfiction
  strings. The prompt interpolates `params.amountPerGenre`, `params.type`,
  `params.genre`, and `params.subgenre` directly. **Prompt injection risk.**
- **Lines 46–55:** Calls `generateObject` with `model: openai(openaiModel4o)`.
  Hard-coded provider. No seed; non-idempotent.
- **Line 52:** `.length(params.amountPerGenre)` enforces exact topic count
  in the Zod schema.
- **Line 61:** Throws a proper `Error`.

**Issues summary:**
- Hard-coded OpenAI model/provider.
- No input validation for `type`, `genre`, `subgenre`, `amountPerGenre`.
- Prompt injection via template literal.
- No retry logic.
- Non-idempotent.

---

### 19. `apps/reading-advantage/server/utils/generators/topic-generator.ts`

**Lines 1–5:** Imports `generateObject`, `generateText` (unused), enums,
Zod, OpenAI factory (unused), and Google factory.

**Lines 18–47:** `generateTopic`

- **Lines 24–27:** Identical fiction/nonfiction prompts with direct
  interpolation of `params` fields. **Prompt injection risk.**
- **Lines 29–39:** Calls `generateObject` with `model: google(googleModel)`.
  Commented-out OpenAI at line 30. Hard-coded provider. No seed.
- **Line 45:** Throws `Error`.

**Issues summary:**
- Hard-coded Google model/provider.
- Unused `generateText` and `openai` imports.
- Commented-out provider code.
- No input validation.
- Prompt injection.
- No retry; non-idempotent.

---

### 20. `apps/reading-advantage/server/utils/generators/translation-generator.ts`

**Lines 1–3:** Imports `generateObject`, Google factory, and Zod.

**Lines 33–74:** `generateTranslatedSummary`

- **Line 41:** `userPrompt` interpolates `params.summary` directly. **Prompt
  injection risk.**
- **Lines 43–49:** Zod schema for translations.
- **Lines 51–56:** Calls `generateObject` with `model: google(googleModel)`.
  Hard-coded provider. No seed.
- **Lines 59–73:** Retry loop with exponential backoff (`1s, 2s, 4s`).
  Good retry pattern, but no idempotency key.
- **Line 73:** Throws proper `Error` after retries.

**Lines 76–123:** `generateTranslatedPassage`

- **Lines 85–88:** Splits passage on `[.!?]+` and tries to re-add terminal
  punctuation. This naive regex is fragile: abbreviations ("Mr.", "e.g.")
  and decimals will be split incorrectly.
- **Line 90:** `userPrompt` interpolates full `params.passage` and the
  computed sentence count. **Prompt injection risk.**
- **Lines 92–105:** Schema and `generateObject` call with Google model.
- **Lines 108–122:** Retry with exponential backoff.

**Lines 125–176:** `generateTranslatedPassageFromSentences`

- **Lines 135–137:** Joins pre-split sentences and interpolates into
  prompt. **Prompt injection risk** still exists because sentences come
  from upstream content.
- **Lines 139–152:** Schema and `generateObject` call.
- **Lines 154–160:** Validates `response.en.length` only. If translation
  arrays are shorter/longer, only English is patched; other languages may
  be mismatched. No validation for `cn`, `th`, `tw`, `vi` lengths.
- **Lines 161–175:** Retry with exponential backoff.

**Issues summary:**
- Hard-coded Google model/provider across all three functions.
- No input validation for `summary`, `passage`, or `sentences`.
- Prompt injection via direct interpolation.
- Naive sentence splitting in `generateTranslatedPassage`.
- Length validation only checks English array; other languages may drift.
- Retries exist but are not idempotent.

---

## Cross-Cutting Themes

### AI / Generator Provider Coupling

Every generator file directly imports either `@/utils/openai` or
`@/utils/google` (often both) and constructs a concrete model instance.
The `@reading-advantage/ai` adapter is used only as a thin wrapper around
`generateObject` / `generateImage`. This violates the monorepo rule:

> Application code should call `ai.generateText()`, `ai.generateObject()`,
> etc. — never provider SDKs directly.

The presence of commented-out `openai(...)` calls in `article-generator.ts`,
`evaluate-rating-generator.ts`, `question-generator.ts`, and
`topic-generator.ts` is technical debt and a sign that model selection is
ad-hoc rather than configuration-driven.

### Prompt Injection

The generator layer builds prompts almost exclusively with template-literal
concatenation. Untrusted or semi-trusted values (article content, titles,
summaries, genres, subgenres, topics, word lists, story bibles) are placed
into user/system prompts without:

- Maximum length enforcement.
- Content sanitization or XML escaping.
- Structured delimiters that resist injection.
- Separation of system instructions from user content.

This is the dominant security risk in the batch.

### Validation

None of the generator functions validate their inputs with Zod, despite
AGENTS.md requiring:

> Every backend operation must define input schema and output schema using
> Zod. No external input should enter the system without validation.

Interfaces are used, but TypeScript interfaces are erased at runtime and
provide no protection against malicious or malformed request bodies.

### Privacy

- Article passages, summaries, and word lists are sent to external AI
  providers (Google, OpenAI).
- Generated story bibles containing character descriptions, settings, and
  themes are stored as JSON (`as any`) in the database.
- User ID parameters are accepted in some audio functions but unused;
  this suggests incomplete user attribution or audit logging.
- `catch-async.ts` leaks internal error messages to clients.

### Storage

- Local temp files are written to `${process.cwd()}/data/audios/`,
  `${process.cwd()}/data/audios-words/`, and
  `${process.cwd()}/data/images/`. There is no guarantee these directories
  exist, and cleanup on failure is incomplete.
- Uploads to bucket (`uploadToBucket`) are not atomic with database
  updates.
- Google TTS API key is sent in the request URL, risking exposure in logs.

### Retry / Idempotency

- Retry with exponential backoff exists in `image-generator.ts`,
  `translation-generator.ts`, and `stories-chapters-generator.ts`.
- `stories-generator.ts` has manual 5-attempt loops for chapter audio.
- However, none of these use deterministic seeds, idempotency keys, or
  conditional writes. Re-running the same generation request can produce
  duplicates, different content, or orphaned storage objects.
- `stories-generator.ts` has no transaction boundary; partial failures
  leave the system in an inconsistent state.

---

## Risk Matrix

| Risk | Severity | Files |
|------|----------|-------|
| Direct provider/model hard-coding | High | article-generator, evaluate-rating-generator, image-generator, question-generator, stories-bible-generator, stories-chapters-generator, stories-topic-generator, topic-generator, translation-generator |
| Prompt injection via unescaped user content | High | article-generator, audio-generator, audio-words-generator, evaluate-rating-generator, image-generator, question-generator, stories-bible-generator, stories-chapters-generator, stories-topic-generator, topic-generator, translation-generator |
| No Zod input validation on generator params | High | All generators |
| DB/storage non-atomic operations | High | audio-generator, audio-words-generator, stories-generator |
| Google TTS API key in URL | High | audio-generator, audio-words-generator |
| Error message leakage to client | Medium | catch-async.ts |
| ADMIN authorization without school check | Medium | authorization.ts |
| Race condition on duplicate story detection | Medium | stories-generator.ts |
| Random seed / non-idempotent generation | Medium | All AI generators except image/translation retries |
| Local temp file cleanup incomplete | Medium | audio-generator, audio-words-generator, image-generator |
| SSML injection | Medium | audio-generator, audio-words-generator |
| `error.response.data` crash | Medium | audio-words-generator.ts line 254 |
| `modelId` parameter ignored | Low | question-generator, la/mc/sa generators |
| Commented-out dead code | Low | article-generator, evaluate-rating-generator, question-generator, topic-generator |
| `Record<string, ...>` weak typing | Low | CEFR-requirements.ts |
| `key-generator.ts` stub | Low | key-generator.ts |

---

## Recommendations (Non-Exhaustive)

1. **Move generator orchestration out of the Next.js app layer.**
   `stories-generator.ts` is effectively a Route Handler; per AGENTS.md,
   business logic belongs in `packages/backend` modules.
2. **Introduce a provider-neutral AI adapter configuration.** Model
   selection should come from environment/config, not hard-coded in each
   generator. Remove commented-out provider calls.
3. **Add Zod input schemas to every generator function** and validate
   before constructing prompts. Enforce maximum lengths and allowed
   character sets where appropriate.
4. **Sanitize all values interpolated into prompts.** Use structured
   delimiters and/or JSON escaping. Consider separating system
   instructions from user content.
5. **Wrap story/chapter/audio/image creation in a database transaction**
   and make storage uploads idempotent (e.g., keyed by deterministic IDs).
6. **Move Google TTS API key out of the URL.** Use an internal storage/TTS
   adapter or at minimum place the key in an `Authorization` header.
7. **Fix `catch-async.ts`** to return safe error messages (e.g., "Internal
  error") and map error classes to appropriate HTTP status codes.
8. **Close ADMIN authorization gaps** in `canAccessClassroom` and
   `canAccessStudent` by requiring and verifying school membership.
9. **Add deterministic seeds or idempotency keys** to AI generation calls
   so retries produce consistent or deduplicated results.
10. **Clean up local temp files in `finally` blocks** and ensure target
    directories exist before writing.
11. **Validate array lengths consistently** in translation output (all
    languages, not just English).
12. **Fix `audio-words-generator.ts` line 254** to read
    `error?.response?.data` safely.

---

## Verification

- All 20 files in `/tmp/opencode/ra-batch-48` were read completely.
- No app code was modified.
- This report was written to
  `measure/audit-reports/reading-advantage-full_20260626/line-review/ra-batch-48.md`.

---

*No acceptance claims are made in this review. The report documents
observed conditions and risks for the current HEAD only.*
