# Line Review Evidence: primary-advantage-043

Reviewer: coder-minimax-m3/primary-advantage-043
Files assigned: 3
Lines assigned: 774

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/lesson/task/task-first-reading.tsx` | 1-570 | reviewed | 6 |
| `apps/primary-advantage/components/lesson/task/task-introduction.tsx` | 1-139 | reviewed | 4 |
| `apps/primary-advantage/components/lesson/task/task-language-questions.tsx` | 1-65 | reviewed | 1 |

## Findings

### LR-043-001 — `isAudioLoaded` state is permanently `false`; Play button is stuck on "Loading Audio" because the only place that ever sets it to `true` is inside a 31-line commented-out useEffect

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/task/task-first-reading.tsx:29, 37-67, 205-214, 225-229`
- Evidence: Line 29 declares `const [isAudioLoaded, setIsAudioLoaded] = useState(false);`. The only call site to `setIsAudioLoaded(true)` lives on line 53, which is inside the 31-line commented-out useEffect block on lines 37-67 (`audio.onloadeddata = () => { setIsAudioLoaded(true); };`). The active `<audio>` element on lines 205-214 attaches only `onTimeUpdate={handleTimeUpdate}` (line 208) and `onEnded={...}` (lines 209-213); it has no `onLoadedMetadata`, `onCanPlay`, `onCanPlayThrough`, or `onLoadedData` listener that would call `setIsAudioLoaded(true)`. As a result, `isAudioLoaded` is `false` for the entire lifetime of the component, and the conditional on lines 225-229 (`isPlaying ? t("controls.pause") : isAudioLoaded ? t("controls.play") : t("controls.loading")`) always renders `t("controls.loading")` (per `apps/primary-advantage/messages/en.json:1527` = "Loading Audio"). The same anti-pattern was independently flagged in the immediately preceding batch (`primary-advantage-042`, `task-deep-reading.tsx:216-225`) finding LR-042-007 — both `task-first-reading.tsx` and `task-deep-reading.tsx` share the same commented-out audio-init useEffect pattern, indicating a fork-wide scaffold-then-delete regression rather than an isolated mistake.
- Impact: High. Functional regression. A primary student navigating to the "First Reading" task sees a Play button permanently labelled "Loading Audio" even after the audio file is fully buffered. The audio may in fact play correctly when clicked (because `handlePlayPause` on lines 84-95 calls `audioRef.current.play()` unconditionally), but the button label never reflects that, and there is no `onError` handler — if the audio fails to load the user receives no feedback. The blocking-UI effect on motivation is significant: a primary-student lesson with a "loading" button that never resolves breaks the read-along UX contract.
- Recommendation: Wire `onLoadedMetadata` (or `onCanPlay`) on the `<audio>` element to call `setIsAudioLoaded(true)`. Concretely, add `onLoadedMetadata={() => setIsAudioLoaded(true)}` and `onError={() => setIsAudioLoaded(false)}` to lines 205-214, then delete the dead commented-out useEffect on lines 37-67. Track under a `primary_advantage_audio_loading_state_<date>` migration track that audits the 7 sibling task components (`task-deep-reading.tsx`, `task-vocabulary-flashcards.tsx`, `task-vocabulary-matching.tsx`, `task-sentence-flashcards.tsx`, `task-sentence-order.tsx`, `task-sentence-order-word.tsx`, `task-sentence-cloze-test.tsx`) for the same pattern.

### LR-043-002 — `lib/storage-config.ts` constructs Google Cloud Storage URLs directly without going through the shared `storage.getSignedUrl()` / `storage.get()` adapter required by AGENTS.md

- Severity: Medium
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/components/lesson/task/task-first-reading.tsx:20, 207, 339-342` (and shared helper at `apps/primary-advantage/lib/storage-config.ts:1-42`)
- Evidence: Line 20 imports `getArticleImageUrl, getAudioUrl` from `@/lib/storage-config`. `apps/primary-advantage/lib/storage-config.ts:6-9` declares a hardcoded `STORAGE_CONFIG = { bucketName: process.env.STORAGE_BUCKET_NAME || "primary-app-storage", baseUrl: "https://storage.googleapis.com" }`. Lines 16-20 export `getStorageUrl(filePath)` which constructs `${baseUrl}/${bucketName}/${cleanPath}` directly. Lines 28-33 (`getArticleImageUrl`) and 40-42 (`getAudioUrl`) both wrap `getStorageUrl` with no signing, no auth, and no fallback path. Per the root `AGENTS.md` Storage section: "Application code should call: storage.put(), storage.get(), storage.delete(), storage.getSignedUrl(). Application code must not directly call storage provider SDKs." Although `storage-config.ts` does not import the GCS SDK directly (it just constructs public URLs), it still bypasses the `storage.*` adapter contract that the AGENTS.md mandates. There is no shared `storage.getSignedUrl()` (or equivalent) helper being called. The Public Bucket pattern *can* be intentional for read-only public assets, but that intent is not documented at the call site, in the helper, or in any migration track.
- Impact: Medium. Architectural divergence. The fork constructs public-URL paths to a Google Cloud Storage bucket named `"primary-app-storage"` with no documentation that this bucket is intentionally public, no rotation of `STORAGE_BUCKET_NAME` per environment (only the env-var fallback to a default), and no validation that the asset exists before returning the URL. If the bucket is ever made private (or moved to a different provider), the URL pattern breaks silently because there is no abstraction boundary. Other Reading-Advantage-monorepo apps likely use a shared `@reading-advantage/storage` package whose `getSignedUrl()` returns time-limited signed URLs; if Primary Advantage needs to read the same objects, the URL shapes diverge. This is exactly the "Intentional product divergence that needs documentation" category — Primary may have made a deliberate choice for cheaper public-bucket serving, but no record of that decision exists.
- Recommendation: Either (a) add a shared `storage.getPublicUrl(bucket, key)` adapter to the storage package and route `storage-config.ts` through it, with an env-flag indicating "this app uses public GCS URLs for assets"; or (b) add a top-of-file JSDoc on `storage-config.ts` documenting the intentional choice, the security model (public-bucket assets are non-PII), and the migration path to signed URLs if private-bucket support is ever needed. Track under `primary_advantage_storage_adapter_<date>` alongside the broader Drizzle migration audit (per `apps/primary-advantage/AGENTS.md` § "Migration History").

### LR-043-003 — `getAudioUrl(article.audioUrl || "")` empty-src fallback causes a spurious network request to the bucket root when no audio is attached to the article

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/lesson/task/task-first-reading.tsx:207`
- Evidence: Line 207 reads `<audio ref={audioRef} src={getAudioUrl(article.audioUrl || "")} onTimeUpdate={handleTimeUpdate} onEnded={...} />`. When `article.audioUrl` is `undefined` or `null`, the `|| ""` fallback produces an empty string. `getAudioUrl("")` in `apps/primary-advantage/lib/storage-config.ts:40-42` calls `getStorageUrl("")`, which returns `${baseUrl}/${bucketName}/` = `https://storage.googleapis.com/primary-app-storage/` (an XML listing page). The browser interprets the empty-string `src` as a request to the current page URL in some browsers and as the constructed URL in others; in either case the audio element makes a network request that the application did not intend. This is the same anti-pattern as finding LR-038-016 (`lesson-language-question.tsx:224` — `<AvatarImage src={""} ...>`) in batch `primary-advantage-038`. Both files use `""` as a placeholder for "asset not yet available" and rely on event handlers to compensate, but no `onError` handler is attached here, so a 404 from the bucket is silently swallowed.
- Impact: Low. Each article without an audio file produces a console 404 (XML) and an `<audio>` element that stays in `READY_STATE HAVE_NOTHING` indefinitely. The play button on lines 215-230 still says "Loading" (per LR-043-001), so the user cannot tell whether the audio is loading or whether the file is missing. For a primary-student lesson, the inability to distinguish "loading" from "missing" is a UX regression.
- Recommendation: Either guard the `<audio>` element with a conditional render — `{article.audioUrl ? <audio src={getAudioUrl(article.audioUrl)} ... /> : null}` — or attach `onError={() => { setIsAudioLoaded(false); console.warn("Audio not available for article", article.id); }}` so missing audio surfaces a developer-visible signal. Combine this fix with LR-043-001 so that the loading state correctly tracks both "buffering" and "missing-asset".

### LR-043-004 — Recursive `setTimeout` chain in `highlightIntermediateWords` has no cleanup; if the component unmounts mid-animation, `setCurrentWordIndex` fires on a dead component

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/task/task-first-reading.tsx:152-163`
- Evidence: Lines 152-163 define `const highlightIntermediateWords = () => { if (intermediateIndex < foundWordIndex) { setCurrentWordIndex(intermediateIndex); intermediateIndex++; setTimeout(highlightIntermediateWords, 100); } else { setCurrentWordIndex(foundWordIndex); } };` invoked from line 163. The recursive `setTimeout` schedules itself every 100ms. There is no `useRef` to capture the timeout id, no `useEffect` cleanup, and no `isMounted` guard. If the student clicks "Next Task" (or navigates away from the lesson) while the audio playback is jumping several words forward, the recursive timeout continues to fire on the unmounted component, triggering React's "state update on an unmounted component" warning (suppressed in React 18+ but still indicative of a leak).
- Impact: Low. Memory leak + console noise. Each forward-jump in word highlighting schedules N pending timeouts where N is the word-difference; for an audio scrub across a 10-word sentence, that's 10 pending timeouts, each holding a closure over `intermediateIndex`, `setCurrentWordIndex`, `currentWordIndex`, and `foundWordIndex`. After unmount these timeouts still hold heap memory until they fire.
- Recommendation: Capture the timeout id in a `useRef<number | null>(null)`, clear it in a `useEffect` cleanup that runs on unmount, and re-set it inside `highlightIntermediateWords`. Alternatively, switch to a single `setInterval` that increments `currentWordIndex` until it reaches `foundWordIndex`, with `clearInterval` in cleanup.

### LR-043-005 — `handleLoadedMetadata` registered on the `timeupdate` event but only assigns `playbackRate`; the listener runs on every audio time tick (~4×/sec) just to update a value that only changes when `readingSpeed` changes

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/task/task-first-reading.tsx:69-82`
- Evidence: The useEffect on lines 69-82 declares `const handleLoadedMetadata = () => { audio.playbackRate = Number(readingSpeed); };` (lines 73-75), then registers it on `audio.addEventListener("timeupdate", handleLoadedMetadata)` (line 77), with cleanup on line 80. The handler is named `handleLoadedMetadata` but is attached to `timeupdate` (which fires ~4× per second while playing). It only ever does `audio.playbackRate = Number(readingSpeed);` — a value that changes at most once per `<Select onValueChange>` (lines 238-250). The handler name does not match the event, and the listener choice is wasteful. The same misuse was flagged in batch 042 finding LR-042-008 (`task-deep-reading.tsx:72-85` has the identical pattern). Both files inherited the same copy-paste scaffold.
- Impact: Low. Wasted CPU: every 250ms while audio plays, React re-binds the listener (because `readingSpeed` is in the dep array and `audioRef.current` may change) and the listener assigns the same playback rate. For a 5-minute primary-student lesson, this is ~1200 redundant assignments.
- Recommendation: Either (a) rename the handler to `handleTimeUpdatePlaybackRate` to match the event, and attach it to `audio.addEventListener("ratechange", ...)` instead, with a separate `audio.addEventListener("loadedmetadata", ...)` for the metadata-load case; or (b) merge this effect into the `<audio>` element's React event props (`onLoadedMetadata` for metadata, plus a separate `useEffect` watching `[readingSpeed]` to set `audioRef.current.playbackRate` directly). Track under `primary_advantage_audio_event_handlers_<date>` for the sibling files.

### LR-043-006 — `RotateCcwIcon` imported from `lucide-react` but never used; the only reference is inside the commented-out "Listen Again" button on line 272

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/task/task-first-reading.tsx:8, 272`
- Evidence: Line 8 imports `RotateCcwIcon` from `lucide-react`. Grepping the file shows the only occurrence of `RotateCcwIcon` is on line 272, which is inside the commented-out block (lines 265-275) for a "Reset Progress / Listen Again" button. The icon is not used anywhere in the active JSX. This is dead-code carried over from an older version of the component that had a re-listen feature. The same kind of dead-import pattern exists in `lesson-card.tsx` (not in this batch) and was flagged in finding LR-038-006.
- Impact: Low. Bundle weight (one unused named import — negligible), and a misleading signal that the component has a rewind feature. ESLint may not flag this if `no-unused-vars` is configured with `varsIgnorePattern: "^_"` and the import is type-erased at build.
- Recommendation: Delete `RotateCcwIcon` from the imports on line 8. If a re-listen button is added back later, re-import it.

### LR-043-007 — `TaskIntroduction` auto-marks itself complete via `useEffect(() => { onCompleteChange(true); }, [onCompleteChange])`; because both call sites in `lesson-progress-bar.tsx:387` and `standalone-lesson-progress-bar.tsx:298` pass a fresh inline `() => {}`, the effect runs on every parent render

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/task/task-introduction.tsx:30-33, 41-43` (callers at `apps/primary-advantage/components/lesson/lesson-progress-bar.tsx:385-389` and `apps/primary-advantage/components/lesson/standalone-lesson-progress-bar.tsx:298`)
- Evidence: Lines 30-33 declare `interface TaskIntroductionProps { article: Article; onCompleteChange: (complete: boolean) => void; }`. Lines 41-43 read `useEffect(() => { onCompleteChange(true); }, [onCompleteChange]);`. The dependency `onCompleteChange` is a fresh inline `() => {}` at both call sites: `lesson-progress-bar.tsx:387` and `standalone-lesson-progress-bar.tsx:298` each pass `onCompleteChange={() => {}}`. Because `() => {}` produces a new function reference on every render of the parent, the effect's dep array sees a new value on every render, causing the effect to fire on every parent render and call `onCompleteChange(true)`. This is a no-op today (the parent does nothing with the callback), but the contract is broken in three ways: (1) the introduction step is auto-marked complete the moment the user lands on it, defeating the pedagogical purpose of an introduction; (2) the dep array is wrong — if the parent ever wires this to a real state setter (e.g., `setCompletedTasks([...completedTasks, "introduction"])`), every render of the parent will produce a render loop, exponential state growth, and a React infinite-loop warning; (3) calling a parent callback from a child's mount-effect with the callback in the dep array is the canonical anti-pattern from the React docs (see https://react.dev/reference/react/useEffect#caveats).
- Impact: High. UX + correctness. (a) A primary student lands on the "Introduction" task and the task is immediately marked complete in the parent state. The `LessonProgressBar` likely advances to the next task without the student reading the article preview, defeating the lesson's pedagogical gating. (b) If a future developer connects this callback to state, the app will enter an infinite render loop. (c) The dead-callback pattern obscures the fact that `onCompleteChange` is required by the interface but unused by the parent — type drift.
- Recommendation: Either (a) delete the `useEffect` and the `onCompleteChange` prop entirely (auto-completion on mount means the callback adds nothing), and document the introduction as a passive "preview" task with no completion requirement; or (b) keep the prop but call it explicitly on a user gesture (e.g., a "Continue" button onClick) rather than via `useEffect`; or (c) wrap the prop in `useRef` inside the component so the latest callback is captured without re-firing the effect on every render. Track under `primary_advantage_task_introduction_auto_complete_<date>` and audit the same `onCompleteChange` shape in `lesson-card.tsx` (see batch 038 finding LR-038-010 about a similar dead `Props` interface).

### LR-043-008 — `TaskIntroduction` declares its own local `Article` interface with a 7-field subset instead of importing the shared `Article` from `@/types`; the local `translatedSummary` also relaxes required `th`/`vi`/`cn`/`tw` fields to optional, diverging from the shared type

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/task/task-introduction.tsx:15-28` (shared type at `apps/primary-advantage/types/index.d.ts:86-121`)
- Evidence: Lines 15-28 read:
  ```ts
  interface Article {
    id: string;
    title: string;
    summary: string;
    cefrLevel: string;
    raLevel: number;
    passage: string;
    translatedSummary: {
      th?: string; vi?: string; cn?: string; tw?: string;
    } | null;
  }
  ```
  This is a local re-declaration of a 7-field subset of the canonical `Article` interface from `@/types` (imported by the sibling file `task-language-questions.tsx:6`), which lives at `apps/primary-advantage/types/index.d.ts:86-121` and contains 20+ fields including `audioUrl`, `audioWordUrl`, `sentences`, `words`, `WordList`, `multipleChoiceQuestions`, `shortAnswerQuestions`, `longAnswerQuestions`, `sentencsAndWordsForFlashcard`, `imageDescription`, `rating`, `read_count`, `createdAt`, `subGenre`, `genre`, `type`, `translatedPassage`. Two contracts diverge: (1) the field count diverges (7 vs 20+), so any new Article field added to the shared type is invisible to this component; (2) the `translatedSummary` shape diverges — the shared type requires all four locales (`th: string; cn: string; tw: string; vi: string;` non-optional, lines 88-93 of `types/index.d.ts`), while the local type makes each field optional with `?:`. The parent (`lesson-progress-bar.tsx:386`, `standalone-lesson-progress-bar.tsx:298`) casts the assignment's article via `assignment?.article as Article` (or passes `article` directly), and since the local interface is structurally compatible (it has fewer required fields), TypeScript silently accepts the assignment. But the optional-field divergence means this component believes `article.translatedSummary?.th` could be `undefined` even though the runtime data guarantees it.
- Impact: Medium. Type drift. Any consumer of `article.translatedSummary` (lines 100-111, especially line 107 which does `article.translatedSummary?.[locale as "th" | "vi" | "cn" | "tw"]`) gets TypeScript's weaker optional-chaining protection but loses the runtime guarantee that all four locales are present. If a new translator is added to the system (e.g., `ja`), the shared `Article` type will gain a `ja: string` field, this component's local interface will not, and the lookup on line 107 will silently return `undefined`. Future maintainers must remember to update the local interface in addition to the shared one.
- Recommendation: Replace lines 15-28 with `import { Article } from "@/types";`. If `translatedSummary` is genuinely nullable per-locale (not just "all four are present or none are"), update the shared type at `types/index.d.ts:88-93` to make fields optional; do not fork the type per component. Track under `primary_advantage_local_type_drift_<date>` alongside the broader audit of locally-redeclared Drizzle/Prisma-era types.

### LR-043-009 — `Math.ceil(article.passage.split(" ").length / 20)` read-time estimate is English-only; CJK and Thai articles have no spaces between words, so the estimate is wildly wrong for non-English locales

- Severity: Medium
- Fork-divergence category: Primary-student adaptation risk
- File: `apps/primary-advantage/components/lesson/task/task-introduction.tsx:93-96`
- Evidence: Lines 93-96 read:
  ```tsx
  {t("estimatedReadTime", {
    time: Math.ceil(article.passage.split(" ").length / 20),
  })}
  ```
  The English assumption is "split on space and divide by 200 wpm". For Chinese (`cn`) text, words are not space-separated; `article.passage.split(" ").length` returns 1 (the whole passage is one "word" until the first space, which may not exist in classical Chinese). For Thai (`th`), words are separated by spaces in modern Thai but the count is still off because Thai tends to use fewer words per sentence. For Vietnamese (`vi`) and Taiwanese (`tw`), the count is closer to English but the 200-wpm constant is wrong for primary students (kids read at ~100-150 wpm). For a primary-student app whose product.md explicitly targets ages 8-12, the 200-wpm adult constant is an additional miss. The i18n key `estimatedReadTime` exists in `Lesson.Introduction` per `apps/primary-advantage/messages/en.json:1709` ("Estimated Read Time : {time}") and presumably the `time` placeholder expects minutes.
- Impact: Medium. Primary-student adaptation risk. A Chinese article shows "Estimated Read Time: 1" (one space → 1/20 = 0.05 → ceil = 1) regardless of actual length, misleading both the student and the parent about how long the lesson will take. The badge is rendered alongside `cefrLevel` and `raLevel` badges (lines 83-90), so the wrong estimate propagates into the user's mental model of the lesson's difficulty. Per the fork-divergence spec category "Primary-student adaptation risk": this is a localization adaptation that was not made.
- Recommendation: Locale-aware word counting. For `cn`/`tw`, use `article.passage.length` (character count) divided by 300 (Chinese chars per minute). For `th`, use `Intl.Segmenter("th", { granularity: "word" })` if available, falling back to `split(" ")` for environments without ICU support. For `vi` and `en`, keep the split-on-space heuristic but lower the constant from 20 to 15 (the divider is `length / 20` for words-per-minute → words/min; for primary students, 150 wpm = length / 8.33, so a divisor of 8-10 is more accurate). The constant 20 may itself have been copied from the Reading Advantage upstream's adult-learner configuration. Track under `primary_advantage_locale_aware_reading_time_<date>`.

### LR-043-010 — Unsafe type cast `locale as "th" | "vi" | "cn" | "tw"` on line 107 silently allows any locale string; when the active locale is `"en"` (the default) the lookup returns `undefined` and the fallback on line 108 is exercised

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/task/task-introduction.tsx:106-108`
- Evidence: Lines 105-109 read:
  ```tsx
  <p className="leading-relaxed text-gray-700 dark:text-gray-300">
    {article.translatedSummary?.[
      locale as "th" | "vi" | "cn" | "tw"
    ] ?? article.summary}
  </p>
  ```
  `locale` is the return value of `useLocale()` from `next-intl` (line 13, line 40). `next-intl` typically returns one of `"en" | "th" | "vi" | "cn" | "tw"` (or whatever locales the app declares in `apps/primary-advantage/i18n/`). The `as "th" | "vi" | "cn" | "tw"` cast is a structural lie: when `locale === "en"` (which is the default — see `apps/primary-advantage/messages/en.json` being the canonical message file), the cast still type-checks but the indexed access on line 106 returns `undefined` because the `Article.translatedSummary` shape has no `en` key. The `?? article.summary` fallback on line 108 handles the `undefined`, so the rendering is correct — but the cast hides the fact that English is the fallback case rather than a deliberate translation.
- Impact: Low. TypeScript type-safety regression. A future developer adding a new locale (say `"ja"`) gets no compile-time error if they forget to extend the union type — the cast is permissive. The runtime fallback works but is not documented. Per the root AGENTS.md Zod contracts section, locale-keyed data should be validated by a Zod schema (e.g., `z.enum(["th", "vi", "cn", "tw"])`), not cast.
- Recommendation: Replace the cast with a runtime check:
  ```tsx
  const supportedLocales = ["th", "vi", "cn", "tw"] as const;
  type SupportedLocale = typeof supportedLocales[number];
  const summaryKey = (supportedLocales as readonly string[]).includes(locale)
    ? (locale as SupportedLocale)
    : null;
  const localizedSummary = summaryKey
    ? article.translatedSummary?.[summaryKey]
    : undefined;
  ```
  Or wrap in a small helper function `getLocalizedSummary(article, locale)` colocated with the shared `Article` type. Track under `primary_advantage_locale_type_safety_<date>`.

### LR-043-011 — `TaskLanguageQuestions` wrapper has no loading, error, or empty state for the nested `LessonLanguageQuestion` chatbot; if the chatbot throws during its `useEffect`, the entire phase renders an empty container

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/task/task-language-questions.tsx:9-13, 53-62`
- Evidence: Lines 9-13 declare `export default function TaskLanguageQuestions({ article, }: { article: Article; })`. Lines 53-62 wrap `<LessonLanguageQuestion article={article} />` in a decorative card with no error boundary, no loading skeleton, and no empty state. The sibling component `LessonLanguageQuestion` (at `apps/primary-advantage/components/lesson/lesson-language-question.tsx`, batch `primary-advantage-038` finding LR-038-011 flagged its dead `loadingPage` state) runs an `initBotMessage` effect (lines 79-122 of that file) that fetches `/api/assistant/lesson-chatbot` (per LR-038-015). If the API fails or the `initBotMessage` throws, the chatbot component renders its own message list which may be empty. The wrapper here provides no fallback UI — the student sees an empty gradient container with only the header (lines 17-50) and the decorative top bar (line 56).
- Impact: Low. UX. A primary student whose chatbot fails to load sees a blank conversation area with no error message and no retry button. The header still says "Language Questions" and "Practice your language skills by answering questions about the article", but the actual conversation never appears. Without a retry mechanism or an explanatory message, the student may believe they have completed the task.
- Recommendation: Wrap `<LessonLanguageQuestion>` in a React error boundary (e.g., `import { ErrorBoundary } from "react-error-boundary"` or a small local class component). The error boundary should render a fallback card with `t("chatbotUnavailable")` (new i18n key) and a "Retry" button that resets a local `retryKey` state via `useState` + `key` prop. Add a `Suspense` boundary above the chatbot for the loading state. Track under `primary_advantage_chatbot_error_boundary_<date>` alongside the broader AI adapter work.

## No-Finding Notes

- `apps/primary-advantage/components/lesson/task/task-first-reading.tsx:1-7, 10-21` — imports block (excluding `RotateCcwIcon` flagged in LR-043-006): clean. All other imports (`Article`, `SentenceTimepoint` from `@/types`; `useEffect`, `useRef`, `useState` from `react`; `Book`, `PauseIcon`, `PlayIcon`, `Settings` from `lucide-react`; `Button` from `@/components/ui/button`; `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` from `@/components/ui/select`; `cn` from `@/lib/utils`; `Image` from `next/image`; `getArticleImageUrl`, `getAudioUrl` from `@/lib/storage-config`; `useTranslations` from `next-intl`) are used at least once in the component body. The Drizzle/Prisma boundary check is clean: no `db.`, `@reading-advantage/db`, or `@prisma/client` imports, no direct SQL, no Prisma references. The component is presentation-only and correctly does not bypass the data layer.
- `apps/primary-advantage/components/lesson/task/task-first-reading.tsx:23-36` — component signature, hook order (`useTranslations` first, then state), and `paragraphs` derivation are clean.
- `apps/primary-advantage/components/lesson/task/task-first-reading.tsx:84-95` — `handlePlayPause` toggle logic is correct (play → pause → play). The synchronous `handleTimeUpdate()` call on line 92 is a minor perf note (handled in LR-043-004 via the timeout-chain cleanup context, but the call itself is fine).
- `apps/primary-advantage/components/lesson/task/task-first-reading.tsx:170-183` — `handleWordClick` seeks audio and updates indices correctly; the `-0.1` offset on line 177 gives a slight pre-roll so the user hears context before the word. This is a thoughtful UX detail.
- `apps/primary-advantage/components/lesson/task/task-first-reading.tsx:185-277` — header section and reading-controls JSX: Tailwind classes, gradients, dark-mode alternates, icon choices are all correct and accessible (Book icon on line 191 has aria-label via context; PauseIcon/PlayIcon on lines 221, 223 swap correctly).
- `apps/primary-advantage/components/lesson/task/task-first-reading.tsx:279-452` — paragraph rendering IIFE: the fallback path (lines 290-300) for non-array `sentences` is correct defensive code; the array path is well-structured. The `Image` element on lines 337-347 uses `unoptimized` (line 346) intentionally for GCS-hosted assets.
- `apps/primary-advantage/components/lesson/task/task-first-reading.tsx:503-530` — reading-tips list: clean, accessible (`<li>` + decorative `<span>` dot + translation key). Good UX for primary students.
- `apps/primary-advantage/components/lesson/task/task-first-reading.tsx:1-570` — no direct DB / Prisma / Drizzle / auth imports; no `useSession`, `useRequireAuth`, or `@reading-advantage/auth-client` references. The component is presentation-only and does not bypass the data or auth layer.
- `apps/primary-advantage/components/lesson/task/task-introduction.tsx:1-13` — imports block: clean. `"use client"` directive on line 1 is correct (the component uses `useEffect`, `useLocale`). All imports (`React`, `useEffect`, `Badge` from `@/components/ui/badge`, `Image`, four `lucide-react` icons, `getArticleImageUrl`, `useTranslations`, `useLocale`) are used.
- `apps/primary-advantage/components/lesson/task/task-introduction.tsx:35-43` — component signature with the `TaskIntroductionProps` interface (lines 30-33). The interface mismatch with the local `Article` is flagged in LR-043-008; the rest of the destructuring is correct.
- `apps/primary-advantage/components/lesson/task/task-introduction.tsx:45-58` — header section JSX: gradient, icon, title, description with interpolated `{title}` are all correct.
- `apps/primary-advantage/components/lesson/task/task-introduction.tsx:60-72` — article image with `<Image fill priority>` and fallback `|| "/nopic.png"`. Same `getArticleImageUrl` always-returns-non-empty pattern as in `task-first-reading.tsx`; the `|| "/nopic.png"` is unreachable but harmless.
- `apps/primary-advantage/components/lesson/task/task-introduction.tsx:74-112` — article title, badges (CEFR / RA / estimated read time), and translated summary block are correctly structured. The fallback chain (translated → raw summary) is correct.
- `apps/primary-advantage/components/lesson/task/task-introduction.tsx:114-134` — learning objectives list: clean, accessible.
- `apps/primary-advantage/components/lesson/task/task-introduction.tsx:1-139` — no direct DB / Prisma / Drizzle / auth imports; no `useSession` etc.
- `apps/primary-advantage/components/lesson/task/task-language-questions.tsx:1-7` — imports block: clean. `"use client"` directive on line 1 is correct (matches the `useTranslations` call). All imports (`React`, four `lucide-react` icons, `LessonLanguageQuestion`, `Article` from `@/types`, `useTranslations`) are used.
- `apps/primary-advantage/components/lesson/task/task-language-questions.tsx:9-13` — component signature: simple, correct. The `Article` import from `@/types` is the canonical shared type (unlike `task-introduction.tsx`'s local re-declaration, which is flagged in LR-043-008).
- `apps/primary-advantage/components/lesson/task/task-language-questions.tsx:14-50` — header section with gradient, icon, title, subtitle, and three feature badges (AI Powered / Interactive / Ask Questions). All translation keys (`title`, `subtitle`, `badges.aiPowered`, `badges.interactive`, `badges.askQuestions`) are present in `apps/primary-advantage/messages/en.json:2015-2023`.
- `apps/primary-advantage/components/lesson/task/task-language-questions.tsx:52-62` — wrapper card with decorative top bar and nested `<LessonLanguageQuestion>`. The relative import path (`../lesson-language-question`) matches the convention used by sibling task components in this directory (verified via grep — `task-vocabulary-matching.tsx`, `task-sentence-activities.tsx`, `task-short-answer.tsx`, `task-multiple-choice.tsx`, `task-sentence-flashcards.tsx`, `task-vocabulary-flashcards.tsx` all use the same `../`-prefixed relative pattern).
- `apps/primary-advantage/components/lesson/task/task-language-questions.tsx:1-65` — no direct DB / Prisma / Drizzle / auth imports; no `useSession` etc.
