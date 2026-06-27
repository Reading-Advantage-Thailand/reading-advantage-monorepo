# Line Review Evidence: primary-advantage-100

Reviewer: coder-minimax-m3/primary-advantage-100
Files assigned: 3
Lines assigned: 537

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/server/utils/genaretors/image-generator.ts` | 1-459 | reviewed | 13 |
| `apps/primary-advantage/server/utils/genaretors/la-question-generator.ts` | 1-36 | reviewed | 4 |
| `apps/primary-advantage/server/utils/genaretors/mc-question-generator.ts` | 1-42 | reviewed | 4 |

## Findings

### LR-100-001 — Massive block of dead commented-out code in image-generator

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:156-458`
- Evidence: Lines 156-458 (303 lines, ~66% of the file) are commented-out alternative implementations: (a) old DALL-E-3 character-sheet + DALL-E-2 edit approach (lines 173-216), (b) experimental `generateImages` per-prompt loop (lines 218-242), (c) `googleImages` single-call with aspectRatio (lines 251-302), (d) `openaiImages` single-call (lines 304-342), (e) old sequential per-image loop with single-file TTS-style retry (lines 362-434). The active code path is lines 31-153. The dead code references provider SDKs (`openaiClient.images.generate`, `openaiClient.images.edit`) that are not even imported in the live path.
- Impact: Reviewer confusion, grep false positives, dead-code branches that may be uncommented by mistake. The same pattern was flagged as LR-098-009 in `audio-flashcard-generator.ts` (also a `genaretors/` file).
- Recommendation: Delete the commented-out blocks in their entirety; the live path (lines 31-153) is the only supported one. If historical context is needed, move it to a git commit message or design doc.

### LR-100-002 — Eight unused imports in image-generator active header

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:1-17`
- Evidence: The header imports `experimental_generateImage as generateImages` (line 2), `NoImageGeneratedError` (line 4), `APICallError` (line 5), `generateText` (line 6), `vertex` (line 8), `sharp` (line 11), `Uploadable` from `openai/uploads` (line 16) — none are referenced in the active code (lines 31-153). The names appear only inside commented-out blocks. In addition, `googleModelLite` from `@/utils/google` (line 13) and `openaiImages` from `@/utils/openai` (line 12) are unused even though the named model constants are imported.
- Impact: Bundle size bloat, lint warnings, surface area confusion. `Uploadable` from `openai/uploads` is a legacy OpenAI SDK type that is not used by any active code path. The same dead-import pattern appears throughout the `genaretors/` directory.
- Recommendation: Remove the unused imports; rely on `tsc --noUnusedLocals` (or ESLint `@typescript-eslint/no-unused-vars`) once the live path is locked in.

### LR-100-003 — OutDir directory created but never written to

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:44-47`
- Evidence: Lines 44-47 compute `path.join(process.cwd(), "public/story")` and call `fs.existsSync` + `fs.mkdirSync(outDir, { recursive: true })`. The variable `outDir` is never referenced again in the active code (lines 48-153). The commented-out blocks at lines 181, 214 previously wrote to that path.
- Impact: Side effect creating an empty `public/story/` directory on every cold start of the function. In read-only container environments this throws and aborts the entire generation. Surprising behavior for callers that only need the in-memory PNGs uploaded to the bucket.
- Recommendation: Delete the unused `outDir` setup. If a local cache is required, document it explicitly and only create it on demand.

### LR-100-004 — Unused `passage` parameter in GenerateImageParams

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:19-35`
- Evidence: `interface GenerateImageParams` (lines 19-23) declares `imageDesc`, `articleId`, `passage`. The function signature on line 31 destructures `const { imageDesc, articleId, passage } = params;` (line 35) but `passage` is never used in the active code (lines 36-153). Only `imageDesc` is interpolated into the prompt for the `generateObject` call (line 71).
- Impact: Callers must thread `passage` through `articleModel.ts:208` and `actions/test.ts:117` for no behavioral reason. The unused parameter invites future divergence between what the model sees (imageDesc only) and what the caller believes the model sees.
- Recommendation: Remove `passage` from the interface and from all three call sites; or interpolate it into the `imageDesc`-expansion prompt so the model has access to the full passage when generating scene prompts.

### LR-100-005 — Local PNG write / upload / delete cycle fails in serverless

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:108-128`
- Evidence: Lines 108-116 decode each base64 image into a Buffer, call `fs.writeFileSync(localPath, base64Image as Uint8Array)` (line 111), then `await uploadToBucket(localPath, ...)` (line 114), then push the key `images/${articleId}_${index + 1}.png`. Lines 119-128 iterate `tempFiles` and call `fs.unlinkSync` on each. The `uploadToBucket` helper in `utils/storage.ts:24-54` uses `@google-cloud/storage` SDK and assumes the local file exists on disk. There is no streaming alternative.
- Impact: Fails on Cloud Run with read-only rootfs (the standard primary-advantage deployment), fails on Vercel and other ephemeral filesystems. Same anti-pattern as LR-098-007 in `audio-flashcard-generator.ts`. Also fails on transient I/O errors between the write and the upload because the cleanup step would still attempt `fs.unlinkSync`.
- Recommendation: Replace the local-file round trip with a direct buffer upload — `bucket.file(destination).save(buffer, { contentType: "image/png", resumable: false })` — and drop the local `fs.writeFileSync` / `fs.unlinkSync` pair entirely.

### LR-100-006 — Synchronous filesystem calls in async function

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:40-42, 111, 121`
- Evidence: The async `generateImage` function calls `fs.existsSync` (line 40), `fs.mkdirSync` (line 41), `fs.writeFileSync` (line 111), and `fs.unlinkSync` (line 121) inside what is otherwise an `await`-based flow. Same anti-pattern as LR-098-001 (`article-generator.ts:52`) and LR-098-007 (`audio-flashcard-generator.ts`).
- Impact: Blocks the event loop on every image generation. Increases cold-start latency. Multiple parallel image generations (e.g., `Promise.all` at `articleModel.ts:203`) magnify the stall.
- Recommendation: Switch to `fs.promises.mkdir`, `fs.promises.writeFile`, and `fs.promises.unlink`. Once the buffer-direct upload path is in place (LR-100-005) most of these calls disappear.

### LR-100-007 — generateText used to produce image files instead of experimental_generateImage

- Severity: High
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:74-86`
- Evidence: Lines 74-86 call `generateText({ model: google(googleImage), prompt: ... })` and then read `result.files` (line 89). The `googleImage` constant is `"gemini-2.5-flash-image"` (a multimodal Gemini model that can return image files), but using the `generateText` path for image output is undocumented and depends on the SDK exposing `result.files` for the chosen model. The file even imports `experimental_generateImage as generateImages` (line 2) — the dedicated image adapter — but never uses it in the active code.
- Impact: Behavior depends on internal SDK assumptions that may shift between Vercel AI SDK minor versions. No fallback if the SDK returns `result.files === undefined`. The adapter's image helper (`experimental_generateImage`) is the contract documented by `@reading-advantage/ai` for this purpose; bypassing it leaves the migration to a shared-package AI image contract incomplete.
- Recommendation: Replace the `generateText` image-generation block with `experimental_generateImage({ model: google(googleImage), prompt, n: 3 })` (already imported on line 2), iterate `result.images`, and base64-decode `image.base64` directly. This matches the documented adapter contract and aligns with the AGENTS.md provider-neutrality rule.

### LR-100-008 — Local image filenames collide when an article is regenerated

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:110-115`
- Evidence: Lines 110-115 write local PNGs and bucket keys as `images/${articleId}_${index + 1}.png`. When an article is regenerated (e.g., teacher clicks "regenerate images"), the new files overwrite the previous bucket keys silently. The `deleteFile` helper in `utils/storage.ts:56-97` only enumerates the three image paths for a given article but is not called from `image-generator.ts`.
- Impact: Stale images remain accessible in storage after regeneration; the next read of the article may serve a mix of old and new illustrations if any of the three keys failed to upload.
- Recommendation: Call `deleteFile(articleId)` (or equivalent) before the new generation, or write images to a versioned key like `images/${articleId}/v${Date.now()}_${index + 1}.png` and update the article row to point at the new prefix.

### LR-100-009 — Magic number 3 hardcoded across the image pipeline

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:70, 71, 75, 80-85, 89`
- Evidence: The prompt templates at lines 70-85 instruct the model to generate "3 consecutive image generation prompts" and "exactly 3 separate images, 1 image per file". The `result.files.length !== 3` check (line 89) and the success branch (line 149) both depend on exactly 3 images. No named constant or parameter exposes this number.
- Impact: Any change to the desired image count requires editing seven locations. Future call sites that need a different count cannot reuse the helper.
- Recommendation: Lift `const IMAGES_PER_ARTICLE = 3` to module scope and interpolate it into both the prompt strings and the validation branch.

### LR-100-010 — storyParts.prompt array indexed without length check

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:80-82`
- Evidence: Lines 80-82 interpolate `storyParts.prompt[0]`, `storyParts.prompt[1]`, `storyParts.prompt[2]` directly into the user prompt. The Zod schema on lines 61-68 enforces `prompt: z.array(z.string())` but does not constrain `.length(3)`. If the model returns 0, 1, 2, or 4 strings, the values `undefined` are interpolated and the second-stage image-generation prompt becomes malformed.
- Impact: The retry loop catches the "got 3 files" mismatch (line 89) but not this prompt-templating failure — the call to `generateText` may silently produce unusable scene descriptions, then fail at the file count check, retrying without addressing the prompt issue.
- Recommendation: Add `.length(3)` to the `prompt` array schema on line 62; verify the array length before interpolating; or fall back to padding the array with copies of `storyParts.prompt[0]`.

### LR-100-011 — Image prompt has no age targeting for primary students

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:76-85`
- Evidence: The user prompt at lines 76-85 specifies "brightly colored cartoon illustration, storybook style" but does not reference the student's age band. The sibling prompt files at `data/cefr-article-prompts.json` and `data/new-article-prompts.json` both target age 6-12 / 8-12, but the image-generator prompt is age-agnostic. The same illustration pipeline serves kindergarteners and 6th graders.
- Impact: Primary Advantage targets ages 6-12 (per `apps/primary-advantage/AGENTS.md`). Without age targeting, images may include themes, character proportions, or color palettes inappropriate for the youngest students (e.g., complex facial expressions, scary creatures) or too juvenile for the oldest. The sibling generators at `article-generator.ts` (CEFR-prompt-driven) and `story-generator.ts` (`SYSTEM_PROMPT` at lines 14-26) both embed age guidance.
- Recommendation: Pass `params.cefrLevel` (or a derived age range) into `generateImage` and interpolate it into the image system prompt, e.g. `Style: brightly colored cartoon illustration, storybook style appropriate for ages {min}-{max}.`

### LR-100-012 — console.log leaks article ID and attempt counts to stdout

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:55, 98, 130, 142`
- Evidence: `console.log(\`Attempt ${attempts + 1}/${maxRetries} to generate 3 images for article ${articleId}\`)` (line 55) and `console.log(\`Waiting ${delay}ms before retry...\`)` (line 98) plus the success log on line 130 and the failure log on line 142 write to stdout. Same pattern as LR-098-003 in `article-generator.ts`.
- Impact: No data leakage of secrets, but article IDs and model retry state appear in centralized log streams, increasing log volume and making per-article traceability harder than a structured-log equivalent.
- Recommendation: Replace with a structured logger (`pino`/`winston`) keyed by `articleId`; demote retry chatter to `debug` level.

### LR-100-013 — createLogFile path fails on read-only filesystems

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/image-generator.ts:150`
- Evidence: Line 150 calls `createLogFile(articleId, errors, "error")` after the final retry failure. `createLogFile` (in `utils/logging.ts:11-37`) writes to `path.join(process.cwd(), "logs", "audio-processing")` via `fs.writeFileSync` and `fs.appendFileSync`. Same anti-pattern as the rest of the `genaretors/` directory.
- Impact: On Cloud Run with read-only rootfs the helper throws — but it swallows its own errors (logging.ts:36) and the caller (line 150) silently proceeds to return a synthetic failure response. Operators lose the diagnostic payload that was meant to explain the failure.
- Recommendation: Route error telemetry through a structured logger or a writable side-channel (e.g., a database row, a dedicated logging service); do not rely on local filesystem writes for diagnostic data in serverless deployments.

### LR-100-014 — `GenrateLAQuestionParams` interface name typo (and sibling pattern)

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/la-question-generator.ts:5`, `mc-question-generator.ts:5`, `sa-question-generator.ts:6`
- Evidence: The parameter interface in all three question generators is named `GenrateLAQuestionParams`, `GenrateMCQuestionParams`, `GenrateSAQuestionParams` — the `Generate` verb is missing its leading `e`. The function name (`generateLAQuestion`, etc.) is correct. The exported name is part of the public API of each module.
- Impact: Public API carries a pre-existing typo carried forward from Reading Advantage. Search/replace now becomes harder because the typo appears in three sibling modules.
- Recommendation: Add a JSDoc `@deprecated` alias or rename to `GenerateLAQuestionParams` (and matching MC/SA), updating all three call sites (`articleModel.ts:128, 136, 144, 252, 260, 268` and `articleController.ts:19-21`).

### LR-100-015 — LAQuestionSchema returns single object, MC/SA return arrays

- Severity: High
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/la-question-generator.ts:18-36`
- Evidence: `LAQuestionSchema` (in `lib/zod.ts:68-70`) is `z.object({ question: z.string() })` — a single question object. Compare to `MCQuestionSchema` (zod.ts:47-66) which wraps an array of `{ question_number, question, answer, options, textual_evidence }`, and `SAQuestionSchema` (zod.ts:72-82) which wraps an array of `{ question_number, question, answer }` with `.length(5)`. The article-level `articleGeneratorSchema.longAnswerQuestions` (zod.ts:280) and `storySchema.longAnswerQuestions` (data/story-schema.ts:123, 176) both declare arrays of LA questions. The result: this generator emits one LA question while every consumer expects an array. Also documented as LR-080-002 in batch 080.
- Impact: The DB insert at `articleModel.ts:212-215` (`db.insert(longAnswerQuestions).values({ question: laq.question, articleId })`) only persists one LA question per article, while the lesson UI and progress model expect N. Lesson summaries (`lesson-card.tsx`, `task-language-questions.tsx`) iterate `article.longAnswerQuestions` as an array. The structural divergence is undocumented; consumers see single vs. array contracts on the same `longAnswerQuestions` field.
- Recommendation: Either (a) extend `LAQuestionSchema` to `z.object({ questions: z.array(z.object({ question_number: z.number(), question: z.string() })).length(5) })` and update this generator to return the array; or (b) document the single-question contract explicitly and add a wrapper that loops to generate N LA questions per article. The first option matches the sibling generators and the articleGeneratorSchema contract.

### LR-100-016 — LA generator returns undefined prompts for A0 level

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/server/utils/genaretors/la-question-generator.ts:29`
- Evidence: This generator passes `promptFile: "prompts-combined-LA.json"` to `question-generator.ts:39`. `question-generator.ts:43-45` performs `prompt[params.type].find((item) => item.level === params.cefrlevel)`. The `prompts-combined-LA.json` file (lines 2-32 fiction block, lines 35-65 nonfiction block) starts at "A1" (line 4 fiction, line 37 nonfiction) — no "A0" entry exists. When `cefrlevel === "A0"`, the lookup returns `undefined`. The downstream `prompts?.user_prompt` and `prompts?.system_prompt` both evaluate to `undefined`, so the AI receives `prompt: "undefined\n\nPassage: ...\nTitle: ...\nSummary: ...\nImage Description: ..."` and `system: undefined`. The `level-test.json` (data/level-test.json:4) defines an A0 level; `new-article-prompts.json` (line 5) and `new-level-evaluation-prompts.json` (line 3) both define A0 system prompts aligned with "Cambridge YLE Starters" (ages 6-9). The article-generator's A0 path works; this LA path silently degrades. Same finding as LR-075-003 in batch 075.
- Impact: A0-classified primary students (Cambridge YLE Starters band, ages 6-9) cannot receive LA questions — the AI receives a malformed prompt and returns unconstrained output that may fail Zod validation. The article may be saved without LA questions.
- Recommendation: Add A0 entries to `prompts-combined-LA.json` (and MC, SA) mirroring the Cambridge YLE Starters band; or short-circuit in `question-generator.ts` to throw a structured error when `prompts === undefined`.

### LR-100-017 — LA generator has no error wrapping around question-generator

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/la-question-generator.ts:18-36`
- Evidence: The function delegates entirely to `generateQuestion<...>(generateParams)` (lines 33-34). The shared helper in `question-generator.ts:60-62` throws a template-literal string: `` throw `failed to generate ${...} question: ${error}` ``. The LA function does not wrap this in a try/catch and does not translate the template-literal string into an `Error` instance.
- Impact: Callers (`articleModel.ts:144, 268` and `articleController.ts:20`) receive a string, not an `Error`. `error instanceof Error` checks fail; structured error reporters (Sentry) lose the causal chain; HTTP error mapping loses the type discriminator.
- Recommendation: Wrap the call in `try { ... } catch (error) { throw new Error(\`generateLAQuestion failed: ${error}\`, { cause: error }); }`.

### LR-100-018 — MCQuestionSchema enforces 4 options but user prompt allows 3

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/mc-question-generator.ts:28-37`
- Evidence: `MCQuestionSchema` (lib/zod.ts:47-66) declares `options: z.array(z.string()).length(4).describe("Exactly 4 options including 1 correct answer...")`. The `prompts-combined-MC.json` user prompts explicitly say "three to four answer options" for the A1 nonfiction level (line 53) and A2 fiction level (line 16). The model is therefore prompted to produce 3-4 options while the schema rejects anything other than 4.
- Impact: The AI may return 3 options, Zod validation fails, and `question-generator.ts:58-62` throws a template-literal string. The whole MC question generation fails for an A1/A2 article rather than gracefully accepting 3 options or asking the model to retry.
- Recommendation: Either tighten the JSON user prompts to "exactly 4 options" to match the schema, or loosen the schema to `.min(3).max(4)` and add a code path that pads/truncates to 4 options before insertion.

### LR-100-019 — textual_evidence required by schema but only some prompts mention it

- Severity: Medium
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/mc-question-generator.ts:14-22`, `data/prompts-combined-MC.json`
- Evidence: `MCQuestionSchema` (lib/zod.ts:59-63) requires `textual_evidence: z.string().describe("A quote from the reading passage providing textual evidence for the correct answer")` for every MC question. The `prompts-combined-MC.json` user prompts at lines 20 (A1 fiction), 52 (A1 nonfiction), and 15 (A2 fiction) do not explicitly instruct the model to include a quote; only the system prompts at lines 21, 53, 16 mention evidence. The AI frequently omits the field on simpler levels.
- Impact: Zod validation fails when `textual_evidence` is missing or empty, the generator throws, and the article has no MC questions saved. This is most likely to hit A0-A1 levels where the model is explicitly asked for "very basic" comprehension.
- Recommendation: Make `textual_evidence` optional in the schema (`.describe(...).optional()`) OR update each user prompt to include "Include a direct quote from the passage as `textual_evidence`".

### LR-100-020 — MC generator A0 lookup returns undefined (same root cause as LR-100-016)

- Severity: High
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/server/utils/genaretors/mc-question-generator.ts:35`
- Evidence: `promptFile: "prompts-combined-MC.json"` is passed to `question-generator.ts:39`. The MC JSON file (lines 2-32 fiction block, lines 34-65 nonfiction block) starts at "B2" (lines 4, 36); "A1" is the lowest entry. No "A0" exists. When `cefrlevel === "A0"`, the lookup at `question-generator.ts:43-45` returns `undefined`. Same as LR-100-016.
- Impact: A0-classified primary students cannot receive MC questions. `articleModel.ts:128, 252` (`generateMCQuestion({...})`) throws and the article save fails or proceeds without MC questions.
- Recommendation: Add A0 entries to `prompts-combined-MC.json` (and SA, LA), or short-circuit in `question-generator.ts`.

### LR-100-021 — MC generator has no error wrapping (same pattern as LR-100-017)

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/server/utils/genaretors/mc-question-generator.ts:24-42`
- Evidence: `generateQuestion<GenerateMCQuestionResponse>(generateParams)` at lines 39-40 is called without a `try/catch`. The shared helper throws a template-literal string (question-generator.ts:60-62). Callers (`articleModel.ts:128, 252`, `articleController.ts:19`) receive a string, not an `Error` instance.
- Impact: Same as LR-100-017. `instanceof Error` checks fail downstream; error reporting loses the causal chain.
- Recommendation: Wrap the call in `try { ... } catch (error) { throw new Error(\`generateMCQuestion failed: ${error}\`, { cause: error }); }`.

## No-Finding Notes

None — every assigned file produced at least one material finding.