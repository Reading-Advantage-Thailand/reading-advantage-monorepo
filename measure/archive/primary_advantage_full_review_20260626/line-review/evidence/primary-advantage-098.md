# Line Review Evidence: primary-advantage-098

Reviewer: coder-xiaomi-mimo-v2-5/primary-advantage-098
Files assigned: 3
Lines assigned: 617

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/server/utils/genaretors/__tests__/new-generator.test.ts` | 1-215 | reviewed | 0 |
| `apps/primary-advantage/server/utils/genaretors/article-generator.ts` | 1-88 | reviewed | 4 |
| `apps/primary-advantage/server/utils/genaretors/audio-flashcard-generator.ts` | 1-314 | reviewed | 7 |

## Findings

### LR-098-001 — Sync readFileSync blocks event loop in article-generator

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/article-generator.ts:52`
- Evidence: `const rawData = fs.readFileSync(dataFilePath, "utf-8")` uses synchronous filesystem read inside an async function. In serverless/edge environments this blocks the event loop for the duration of the read.
- Impact: Cold-start latency increase; potential function timeout under concurrent load.
- Recommendation: Replace with `fs.promises.readFile` or `await import("fs/promises")` to keep the function fully async.

### LR-098-002 — Error throw produces string instead of Error object in article-generator

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/article-generator.ts:86`
- Evidence: Line 86 reads `throw \`failed to generate article: ${error}\`` — a template literal string, not an `Error` instance. The catch block at line 85 types the error as implicit `any`. This loses the original stack trace and breaks any caller relying on `instanceof Error` checks.
- Impact: Downstream error handlers that check `error.stack` or `error.message` receive undefined values. Error monitoring (Sentry, etc.) cannot capture structured error data.
- Recommendation: `throw new Error(\`failed to generate article: ${error}\`, { cause: error })` to preserve the causal chain.

### LR-098-003 — console.log leaks model/params to stdout in article-generator

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/article-generator.ts:71-73`
- Evidence: `console.log(\`${params.cefrLevel} generating article model ID: ${googleModel} type: ${params.type}\`)` writes to stdout. In production serverless logs this leaks the model ID and CEFR level of every generation request.
- Impact: No data-classification breach (model ID is not secret), but operational noise and unnecessary log volume. In shared-hosting scenarios, stdout may be captured by untrusted observers.
- Recommendation: Remove or replace with structured logging at debug level.

### LR-098-004 — Hardcoded 9-12 age range in CEFR prompts referenced by article-generator

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/server/utils/genaretors/article-generator.ts:45-49`
- Evidence: Line 45-49 reads `data/cefr-article-prompts.json` via `path.join(process.cwd(), "data", "cefr-article-prompts.json")`. As confirmed in batch 074/075 evidence, this JSON file contains hardcoded "aged 9-12" AI system prompts. The article-generator is the active consumer of this file (confirmed by import chain). Primary Advantage targets ages 6-12, so students aged 6-8 receive articles written for a higher age band.
- Impact: Content quality regression for youngest primary students (grades 1-2). The `new-generator.ts` uses a separate `new-article-prompts.json` with Cambridge YLE-aligned age bands, creating two competing generators with different age assumptions.
- Recommendation: Audit which generator is active for which content flow; align age targeting to match the actual student population.

### LR-098-005 — Direct Google Text-to-Speech API calls bypass AI adapter in audio-flashcard-generator

- Severity: Critical
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/server/utils/genaretors/audio-flashcard-generator.ts:90-109`
- Evidence: Lines 90-109 make a raw `fetch()` call to `${BASE_TEXT_TO_SPEECH_URL}/v1beta1/text:synthesize?key=${process.env.GOOGLE_API_KEY}`. This directly couples to the Google Cloud Text-to-Speech v1beta1 API surface. The `fetch` import is not present in the file — it uses the global `fetch` available in Node 18+. The AGENTS.md provider-neutrality rule requires AI calls to go through an internal adapter (`ai.generateText()`, `ai.streamText()`, etc.), not direct provider SDK or API calls.
- Impact: Provider lock-in to Google TTS. Cannot swap to Azure, Amazon Polly, or another TTS provider without modifying this generator. The same direct-API pattern appears in `audio-generator.ts` and `audio-word-generator.ts`.
- Recommendation: Route TTS through the `@reading-advantage/ai` adapter or create a dedicated TTS adapter in `packages/backend/modules/ai/`.

### LR-098-006 — API key exposed as URL query parameter in audio-flashcard-generator

- Severity: Critical
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/server/utils/genaretors/audio-flashcard-generator.ts:91`
- Evidence: Line 91 constructs the URL as `${BASE_TEXT_TO_SPEECH_URL}/v1beta1/text:synthesize?key=${process.env.GOOGLE_API_KEY}`. The API key is embedded in the query string of every TTS request. Query parameters are logged in server access logs, CDN logs, and may appear in error reports. The same pattern is repeated at line 148.
- Impact: API key leakage via logs. If logs are shipped to a centralized logging service, the key may be exposed to unauthorized parties.
- Recommendation: Pass the API key via the `Authorization: Bearer` header instead of a query parameter. Or use the AI adapter which handles auth internally.

### LR-098-007 — Filesystem write/delete cycle incompatible with serverless in audio-flashcard-generator

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/audio-flashcard-generator.ts:129-142`
- Evidence: Lines 129-135 create a directory with `fs.mkdirSync`, write an MP3 with `fs.writeFileSync`, upload to bucket, then delete with `fs.unlinkSync`. This write-upload-delete cycle relies on a writable filesystem. In serverless environments (Cloud Run with read-only rootfs, Vercel, etc.) the write may fail or the file may not be visible to other instances.
- Impact: TTS generation fails in read-only container environments. The same pattern is repeated at lines 186-196 for word audio.
- Recommendation: Stream the response buffer directly to the storage adapter (e.g., `uploadToBucket` accepting a `Buffer` or `ReadableStream`) instead of going through a temporary filesystem path.

### LR-098-008 — SSML injection risk via unsanitized sentence text in audio-flashcard-generator

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/server/utils/genaretors/audio-flashcard-generator.ts:55-64`
- Evidence: The `contentToSSML` function at lines 55-64 builds SSML by interpolating `sentence` strings directly into `<s><mark name='sentence${i + 1}'/>${sentence}<break time="500ms"/></s>`. The input `sentenceTexts` (line 76-78) comes from the database `sentences` array without HTML/XML entity escaping. If a sentence contains `<`, `>`, `&`, or `"`, the SSML will be malformed. Primary-student content may contain special characters (ampersands in story titles, etc.).
- Impact: TTS API rejects malformed SSML or interprets embedded markup as SSML commands, producing incorrect audio output.
- Recommendation: Escape `<`, `>`, `&`, `"`, `'` before interpolation. Use a utility like `contentToSSML(sentenceTexts.map(escapeXml))`.

### LR-098-009 — Commented-out Firebase Firestore code in audio-flashcard-generator

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/audio-flashcard-generator.ts:225-314`
- Evidence: Lines 225-314 contain two large commented-out functions (`generateChapterAudioForWord` and `saveWordList`) that reference Firebase Firestore APIs (`db.collection("stories-word-list").doc(...)`). These are remnants of the pre-Drizzle migration. The active code at lines 199-216 correctly uses `db.insert(sentencsAndWordsForFlashcards)`.
- Impact: Code bloat. If uncommented by mistake, these would fail at runtime since `db` is a Drizzle client, not a Firestore client.
- Recommendation: Delete the commented-out code blocks entirely.

### LR-098-010 — Duplicate sentence/word generation blocks in audio-flashcard-generator

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/audio-flashcard-generator.ts:89-197`
- Evidence: The sentence generation block (lines 89-143) and word generation block (lines 146-197) are structurally identical: fetch TTS API, parse response, write to filesystem, upload to bucket, delete local file. This violates DRY and makes maintenance error-prone — any fix to the TTS call pattern must be applied in both blocks.
- Impact: Maintenance burden. Any API change (e.g., migrating off v1beta1) requires editing two nearly-identical code blocks.
- Recommendation: Extract a shared `generateTTSAndUpload(texts, outputKey)` helper that both blocks call.

### LR-098-011 — No retry logic for external TTS API calls in audio-flashcard-generator

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/audio-flashcard-generator.ts:90,147`
- Evidence: Lines 90 and 147 make single `fetch()` calls to the Google TTS API with no retry, backoff, or circuit-breaker logic. The catch block at lines 219-222 immediately re-throws on any error. Google Cloud APIs can return transient 429 (rate limit) or 503 (service unavailable) responses.
- Impact: A single transient failure during audio generation causes the entire flashcard creation to fail with no recovery. For a batch generation workflow serving primary students, this means broken flashcard decks.
- Recommendation: Add exponential backoff retry (e.g., 3 attempts with 1s/2s/4s delays) for transient HTTP errors.

## No-Finding Notes

- `apps/primary-advantage/server/utils/genaretors/__tests__/new-generator.test.ts`: reviewed line-by-line; no findings. This is a well-structured Vitest test file with proper mocking of DB, Google, OpenAI, and Zod dependencies. The three tests (broken MCQ answer, inner transaction failure, and background generator awaiting) are correctly scoped and use `vi.hoisted()` for setup. The directory name "genaretors" is a pre-existing typo but does not affect test correctness.
