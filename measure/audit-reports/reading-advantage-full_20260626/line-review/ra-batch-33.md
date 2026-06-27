# ra-batch-33 — Line-by-Line Review (20 files)

- **Track**: reading_advantage_full_review_20260626
- **Batch**: ra-batch-33
- **Scope**: 20 files under `apps/reading-advantage/components/` (teacher sidebar/dialogs, theme customizer, tour, shadcn primitives, calendar test)
- **Method**: Each file was read in full. Findings are line-anchored; no app code was edited.
- **Cross-file context reviewed (not edited)**:
  - `apps/reading-advantage/types/index.d.ts` (to verify `SidebarTeacherNavItem.title` union)
  - `apps/reading-advantage/store/classroom-store.ts` (to verify `Classes` shape, including `isOwner`, `googleClassroomId`)
  - `apps/reading-advantage/components/models/article-model.ts` (to verify `Article.passage`, `image_description`, `cefr_level`)
  - `apps/reading-advantage/locales/en.ts` (to verify keys for `sidebarTeacherNav`, `myStudent.unEnrollPage`, `reports`, `articleRecordsTable`, `article.printButton`)
  - `apps/reading-advantage/components/icons.tsx` (to verify `Icons.delete`, `spinner`, `Refresh`, `CircleCheckBig`, `CircleAlert`, `UserRound`, `student` keys)
  - `apps/reading-advantage/hooks/use-config.ts` (to verify `useConfig`)
  - `apps/reading-advantage/components/ui/calendar.tsx` (to confirm `Calendar` named export referenced by the test)

---

## File 1: `apps/reading-advantage/components/teacher/leaderboard.tsx` (88 lines)

| Sev | Location | Finding |
|---|---|---|
| Low | L1 | `"use client"` is **not** declared; the component only uses static JSX, no hooks, no event handlers (besides the `Leaderboard` is rendered with no internal state). This is fine for a presentational component, but other teacher-table components in this batch declare `"use client"` even when they only need server-side rendering of static children. Inconsistency. |
| Low | L23-28 | `getInitials` builds initials via `reduce` and `slice(0, -1)`; it does not guard against `name` being empty (`""`), in which case the reducer starts with `""`, prepends `""[0]` (= `undefined`), and produces `undefined.` then slices off the trailing dot. Cell renders `undefined` for empty names. Edge case. |
| Low | L34 | Hardcoded English `"Leaderboard"` heading. No `useScopedI18n` — bypasses i18n. |
| Low | L36 | `new Date().toLocaleString("en-US", { month: "long" })` — hardcodes English month name regardless of `useCurrentLocale()`. Defeats locale awareness. |
| Low | L51 | `data.map((item, index) => <TableRow key={item.userId \|\| index>)` — falls back to `index` when `userId` is missing. `RankingType.userId` is optional (`?:`), so `undefined` is plausible. `key={index}` is an anti-pattern that produces reconciliation glitches when reordering. |
| Low | L54-62 | Renders rank `1..3` via `/rank-${item.rank}.png`. If `item.rank > 3` falls into the else branch; if `item.rank === 0` (no rank yet), `item.rank <= 3` is true and the path becomes `/rank-0.png`, which almost certainly does not exist → broken image icon. No fallback. |
| Low | L65 | `<TableCell className="flex gap-2 items-center">` — `<TableCell>` is a `<td>` (table cell); using `display: flex` on a `<td>` overrides the default `display: table-cell`. Works in practice but is a CSS smell and may produce inconsistent alignment across browsers. |
| Med | L79 | `"No data available for this month"` — hardcoded English string; the empty-state cell bypasses `useScopedI18n`. |
| Low | L31-87 | Component declares no input-prop validation: if `data` is `undefined`, `data.length > 0` (L50) throws. Defensive guard `data ?? []` is missing. |

---

## File 2: `apps/reading-advantage/components/teacher/my-classes.tsx` (645 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L39 | `const { classrooms, fetchClassrooms } = useClassroomStore();` — `fetchClassrooms` throws on `!res.ok` (see `classroom-store.ts:68`). The call at L234 `useEffect(() => { fetchClassrooms(); }, [])` is not wrapped in try/catch; an HTTP 401/403/500 raises an unhandled rejection in the client. |
| High | L56 | `import { array } from "zod";` — `array` is never used in the file. Dead import. |
| High | L84 | `studentCount?: any[]` on `CourseWithCount` — `any` defeats type safety. The same component then accesses `data?.studentCount?.length ?? 0` and `data?.studentCount.map((data, index) => … data?.profile.name.fullName)`, so the array element is implicitly typed as `{ profile: { name: { fullName: string } } }` from Google Classroom API. The `any` should be replaced with a typed shape. |
| High | L152 | `accessorKey: "student.lenght",` — typo: `lenght` instead of `length`. The accessor is never read (the cell at L156-160 uses `row.original?.student?.length`); if TanStack-Table filtering were later wired up by accessor key, the column would not function. |
| Med | L180-181, L189-190 | `router.push(\`${process.env.NEXT_PUBLIC_BASE_URL}/teacher/class-roster/${payment.id}\`)` and similarly for `/teacher/reports/`. Concatenating `NEXT_PUBLIC_BASE_URL` (an absolute origin) with a same-origin relative path produces a redundant fully-qualified URL like `https://app.reading-advantage.com/https://app.reading-advantage.com/teacher/class-roster/...` if `NEXT_PUBLIC_BASE_URL` is empty (falsy → template becomes `/teacher/...`, which is fine), but if the env var is set to an absolute URL the same-site navigation becomes cross-origin. Should use `router.push(\`/teacher/class-roster/${payment.id}\`)`. |
| Med | L196 | `{payment.isOwner && …}` — `isOwner` is **not** part of the `Classes` interface in `store/classroom-store.ts` (lines 12-32). It is only declared in this file's local `Classes` type (L78) as `isOwner?: boolean`. If `fetchClassrooms` ever returns the store's `Classes` shape, `isOwner` will be `undefined`, which still short-circuits to false. Latent type drift between the local type and the store. |
| Med | L203 | `"Manage Teachers"` hardcoded English string — no `useScopedI18n`. |
| Med | L259 | `const lastUrl = window.location.pathname;` — used for OAuth redirect back. If the dialog has already redirected away from `/teacher/my-classes`, `lastUrl` may point to the OAuth callback URL. |
| Med | L259 | `window.location.pathname` only captures the pathname; query string (active filters) is dropped from the redirect target. |
| Med | L261-263 | `redirect=${encodeURIComponent(lastUrl)}` — does not validate the target. A malformed URL or an open-redirect attempt could send the user back to an attacker-controlled host. |
| Med | L269 | `const data = await response.json();` — does not check `response.ok`. The `try` block at L258-285 then branches on `data.courses` truthiness; an HTTP 500 with `{ message: "..." }` body will fall through to the `else` at L279 and navigate to `data.authUrl` which is `undefined`. Sets `window.location.href = undefined`. |
| Med | L280 | `window.location.href = data.authUrl;` — full page reload (defeats Next.js client routing) and `data.authUrl` may be undefined. |
| Med | L299 | `if (res.ok) { … }` — no `else` branch to surface the import error. Failures are silently swallowed. |
| Med | L328 | `"Import a new class from"` hardcoded English string — no `useScopedI18n`. |
| Med | L344, L428, L437, L444, L501, L502, L517, L526, L545, L563, L572, L582, L586 | Many hardcoded English UI strings: `"Google Classroom"`, `"Import Your Google Classroom"`, `"Select a Google Classroom Class"`, `"Choose a class to sync…"`, `"Your Google Classroom Classes"`, `"students"` (count), `"No courses found"`, `"Refresh"`, `"Continue"`, `"Syncing Class..."`, `"Importing students from Google Classroom…"`, `"Sync Completed!"`, `"Students Added"`, `"No students found"`, `"Sync Another Class"`, `"Go to Class"`, `"About Google Classroom Sync"`, `"This feature allows teachers to easily import…"`. All bypass i18n. |
| Med | L452 | `key={i}` (the `i` from the map callback). Stable key for `RadioGroup` items — should be `data.id`. |
| Med | L479 | `onClick={() => syncClassroom()}` — the parent dialog uses both `syncClassroom` (Google OAuth) and `handleImportCourses`; the dialog title at L428 is `"Import Your Google Classroom"` and the back-button here re-triggers OAuth. Inconsistent UX. |
| Med | L492 | `<Button onClick={() => handleImportCourses()} disabled={!selected}>` — `handleImportCourses` does not call `setImportState(0)` to reset the slider when the user wants to start over. |
| Med | L519 | `selectedCourses.map((course: CourseWithCount) => (<>...</>))` — wrapped fragments inside a `.map` without `key` on the outer fragment. React 18 will warn about missing key. |
| Med | L531 | `<li key={index} ...>` — `index` key for student list; if the user clicks "Sync Another Class" and the second import has a different ordering, React reuses DOM incorrectly. Use `data?.profile?.id` if available. |
| Med | L535 | `data?.profile.name.fullName` — deep optional chain but `profile.name` is not optional-chained, only `data?`. If `data` exists but `data.profile` is missing (race condition, partial data), throws. |
| Med | L556 | `onClick={() => { setSelected(""); syncClassroom(); }}` — `setSelected("")` then immediately `syncClassroom()` overrides it; the cleared state is irrelevant. |
| Med | L602 | `isCreator={(classrooms.find(c => c.id === selectedClassroomId) as any)?.isOwner \|\| false}` — `as any` cast on the store type. Same drift as L196. The `isOwner` is not in the store's `Classes`. |
| Low | L49 | `import { Checkbox } from "../ui/checkbox";` — never used in this file. Dead import. |
| Low | L53 | `import { Label } from "../ui/label";` — never used. Dead import. |
| Low | L54 | `import { RadioGroup, RadioGroupItem } from "../ui/radio-group";` — `RadioGroupItem` never used; only `RadioGroup` at L449. Partial dead import. |
| Low | L174 | `<DropdownMenuTrigger asChild><Button variant="default" className="ml-auto">` — `variant="default"` for an actions menu is visually heavier than the surrounding UI; not consistent with the rest of the app's actions affordance (typically `variant="ghost"`). |
| Low | L395 | `"Empty"` hardcoded English. |
| Low | L466 | `"students"` pluralized inline as a string suffix — should use ICU pluralization. |
| Low | L612-616 | `State` array uses `"Select Class"`, `"Syncs Students"`, `"Complete"`. Pluralization on `no: 2` says `"Syncs Students"` (verb) but the visual is a number — copy/paste leftover. |
| Low | L621 | `key={index}` on state-slider circles. Stable, but `level.no` would be a better key. |
| Low | L643 | The progress-bar width formula `(currentLevel / (State.length - 1)) * 100` divides by `0` if `State.length === 1`. Not a current issue (`State.length === 3`), but no guard. |

---

## File 3: `apps/reading-advantage/components/teacher/my-students.tsx` (373 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L72-95 | `useEffect` (L68-95) fetches `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/classroom/students`. As noted for `my-classes.tsx`, the env-var-prefixed same-site URL is fragile; if `NEXT_PUBLIC_BASE_URL` is set to an absolute origin this becomes a cross-origin GET. Should be `/api/v1/classroom/students`. |
| High | L77-78 | `if (!response.ok) { throw new Error("Failed to fetch students list"); }` — error is then caught by the same `try`, which surfaces a generic toast. The error message has no user-meaningful detail (no status code, no body snippet). |
| Med | L97-137 | `handleResetProgress` PATCHes `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/users/${selectedStudentId}` with `{ xp: 0, level: 0, cefr_level: "" }`. The `selectedStudentId` parameter shadows the `selectedStudentId` state at L64 — same name, but state is the source of truth in the rest of the file; this is confusing but not a bug. |
| Med | L99-112 | PATCH body resets `xp`, `level`, `cefr_level`. These fields bypass any backend authorization check on the client; trusting the client to issue this PATCH means an attacker who can mutate the request body can wipe any user's progress. The reset should hit a backend function with explicit `assertCan(user, "student:resetProgress", tenant)` permission and a server-side authorization policy. |
| Med | L114-117 | On `response.ok`, the success toast at L115-118 says `"Student progress reset successfully."` but never refetches the table; the row shows stale `xp`/`level` until the user navigates. `router.refresh()` runs in `finally` (L134) which should re-run the server-rendered table, but the client state `students` (L65) is independent and stays stale until the next manual reload. |
| Med | L134 | `router.refresh()` in `finally` runs **even when the request fails** (the `else` at L120-124 toasts an error but does not early-return). The component then re-runs the `useEffect` (L68-95) on refresh, but the in-component `students` state is not refreshed by `router.refresh()` alone (it's an SWR-style server refresh). Result: error toast + stale table. |
| Med | L86-89 | Toast `title: "Error"` / `description: "Failed to load students. Please try again."` — hardcoded English. |
| Med | L115-118, L120-124, L128-132 | All four toast strings hardcoded English. Bypasses `useScopedI18n("components.myStudent")`. |
| Med | L157 | `studentName ? studentName : "Anonymous"` — "Anonymous" hardcoded English. |
| Med | L171 | `studentEmail ? studentEmail : "Unknown"` — "Unknown" hardcoded English. |
| Med | L201-209 | `router.push(\`${process.env.NEXT_PUBLIC_BASE_URL}/teacher/enroll-classes/${payment.id}\`)` and `/unenroll-classes/${payment.id}` — same env-var-prefixed URL anti-pattern as `my-classes.tsx`. |
| Med | L287-294 | Loading state shows `"Loading students..."` hardcoded English. |
| Med | L318 | `"No students found with your license"` — hardcoded English. |
| Low | L1 | `"use client"` declared; the only state is `useState`/`useEffect` plus router. Fine. |
| Low | L63 | `const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);` — naming: `isResetModalOpen` would be clearer as `isResetDialogOpen`. |
| Low | L348 | `onOpenChange={() => setIsResetModalOpen(!isResetModalOpen)}` — uses the function-form setter's negation instead of the value-form setter. Works but contradicts Radix's recommended pattern of `(open) => setIsResetModalOpen(open)`. |
| Low | L82 | `setStudents(studentsData.students \|\| [])` — `studentsData.students` may be `undefined`; the OR fallback prevents the crash but silently treats missing data as empty list. |
| Low | L135 | `setIsResetModalOpen(false)` is called unconditionally in `finally` — if the request succeeds the dialog closes before the user sees the success toast (toast still appears because the modal close does not unmount the toast layer). Minor UX bug. |

---

## File 4: `apps/reading-advantage/components/teacher/print-article.tsx` (363 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L16-20 | `useState<any[]>([])` for `laqQuestions`, `saqQuestions`, `maqQuestions`, `wordList`, `translated`. All five carry the `any[]` type. The question shapes are known (see `apps/reading-advantage/components/models/questions-model.ts`); they should be typed. |
| High | L35-44 | `fetchLAQQuestions` (and the sibling `fetchSAQQuestions`, `fetchMAQQuestions`, `fetchWordList`, `fetchTranslate`) calls `await response.json()` without checking `response.ok`. A 500 from any of these endpoints is silently parsed; the function then either sets state to an error envelope (`{ message: "..." }` is an array of length 0 when mapped) or, in `fetchWordList`, runs `Array.isArray(data)` which is false, then `data.word_list` which is undefined, then `data.message` which is truthy, so the function just `console.error`s and leaves `wordList` as the initial `[]`. The print then renders an empty word list. |
| High | L43 | `setLAQQuestions(data.result.question)` — `data.result` may be undefined; the subsequent `.question` access throws. No defensive `data?.result?.question`. |
| High | L46-56 | `fetchSAQQuestions` — same shape assumption as above (`data.result.question`). |
| High | L57-67 | `fetchMAQQuestions` reads `data.results` (note plural), not `data.result.question` (singular). Likely a server contract inconsistency; the failure mode is "MAQ list silently empty" while LAQ/SAQ would throw. Inconsistent API consumption. |
| High | L77 | `if (Array.isArray(data)) { setWordList(data); } else if (data.word_list) { setWordList(data.word_list); } else if (data.message) { console.error(data.message); }` — three contract assumptions; if the server returns `{ word_list: [] }` (empty array, truthy), the `if (Array.isArray(data))` is false but `data.word_list` is empty and the code does `setWordList([])` correctly. Edge: if the server returns `{ data: { word_list: [...] } }` (the typical envelope), `Array.isArray(data)` is false, `data.word_list` is undefined, `data.message` is undefined, and the function falls through with no error and no state update. Latent bug. |
| High | L86-95 | `type ExtendedLocale = "th" \| "cn" \| "tw" \| "vi" \| "zh-CN" \| "zh-TW";` — local cast to `ExtendedLocale` without runtime check; if `locale` is anything else (e.g., `"en"` or a future locale), `targetLanguage` is wrong but the `if (locale !== "en")` gate at L96 short-circuits the call. OK for non-`en`, but `cn` and `tw` are mapped to `zh-CN`/`zh-TW` only after this cast; the wider cast is just to satisfy the type checker, not the runtime. |
| High | L99 | `body: JSON.stringify({ passage: article.passage, targetLanguage })` — `article.passage` is the full article text; the assistant endpoint is invoked with the raw passage; if the article is 10k+ characters, the request exceeds typical assistant payload limits. No chunking or pagination. |
| High | L106-112 | `await Promise.all([fetchTranslate(), fetchWordList(), fetchSAQQuestions(), fetchMAQQuestions(), fetchLAQQuestions()]);` — five parallel network requests on the client; the print action triggers them all, blocking the print button for 1-3s. No AbortController; if the user clicks Print twice, two parallel requests fire (though `isLoading` guards the second button click at L151). |
| High | L114-115 | After `Promise.all` completes, `setIsDataLoaded(true)` and `setIsLoading(false)` fire regardless of fetch success. `reactToPrintFn()` is invoked inside a 500ms `setTimeout` regardless of whether the data was successfully fetched. So a 500 from any endpoint still triggers the print dialog with empty sections. |
| Med | L144 | `const paragraphs = article.passage.split("\n\n");` — assumes the passage uses `\n\n` (double newline) as paragraph separator; if the model uses `\n` or HTML `<p>` tags, every "paragraph" is the whole passage. |
| Med | L179 | `RALevel : {article.ra_level} / CEFR Level : {article.cefr_level}` — no spacing between the colon and the value for `RALevel` (missing space after the colon). Hardcoded English. |
| Med | L181 | `{article.summary}` — if `article.summary` contains HTML, it's rendered as plain text. Cross-site scripting risk if the article is user-supplied. |
| Med | L184-214 | Renders `<img src={`https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/images/${articleId}.png`} />` — direct GCS URL is provider-specific, violates the AGENTS.md provider-neutrality rule. If the bucket or object path changes, the print fails. |
| Med | L189-204 | `<ul> ... wordList.map((wordlist, index) => <li key={index}>)` — `key={index}` for vocabulary list. |
| Med | L192-194 | `wordlist.definition[locale as Locale]` — locale-keyed lookup; if the article has no `cn`/`tw` translation, the access returns `undefined` and renders nothing. No fallback to `en`. |
| Med | L200 | Hardcoded English `"Vocabulary List"` heading. |
| Med | L209 | Hardcoded English `alt="Article Illustration"`. |
| Med | L223 | `const shouldBreak = charCount > 3000;` — magic number; `charCount` accumulates across all paragraphs but is reset to `0` when `shouldBreak` is true (L224). This means the page break threshold is "more than 3000 chars since the last break" — works but the variable is shared with the translation loop at L330, so the translation page break threshold of `5000` is computed against the **same** `charCount`, which already accumulated from the English paragraphs. Off-by-one-class bug. |
| Med | L244 | `"Multiple Choice Questions"` hardcoded English heading. |
| Med | L252-262 | `questionCharCount` is module-scoped (declared at L147) and is reset at L262 only when `shouldBreak`. Same shared-state issue as `charCount`. |
| Med | L266-272 | Class names `maq-question`, `break-inside-avoid`, `break-before-page` rely on Tailwind utilities and CSS print rules; no inline `page-break-*` for browsers that don't support the modern Tailwind variants. |
| Med | L280-289 | Renders a native `<input type="radio" name={`q${index + 1}`}>` — radio inputs are not stateful across renders; printing twice resets the marks (acceptable for print, but the radio inside a hidden `div` will not be visible to screen readers, defeating accessibility). |
| Med | L304-308 | Renders `<p>{saqQuestions}:</p>` — `{saqQuestions}` is an **array** of question objects, not a string. React will throw "Objects are not valid as a React child" or render `[object Object],[object Object]`. The same bug at L312 for `laqQuestions`. Latent crash. |
| Med | L311 | `"Long Answer Question"` hardcoded English. |
| Med | L305, L312 | Empty `<div className="border-b border-gray-400 h-8 my-2" />` placeholders — 2 lines for SAQ, 10 lines for LAQ. The 10 lines are hardcoded (`[...Array(10)].map((_, i) => ...)` at L314-316). |
| Med | L326 | `"Translation"` hardcoded English. |
| Med | L330 | `charCount += paragraphLength;` — second use of the same shared `charCount` variable; the page-break threshold of `5000` is measured against the post-English-paragraph count. |
| Med | L355 | `<span className="text-sm">{article.title}</span>` — renders the article title in the print footer; if title is long, no truncation/ellipsis. |
| Med | L356 | Commented-out `<span className="text-gray-600 page-number" />` — dead comment. |
| Low | L2 | `useEffect` imported but never used. Dead import. |
| Low | L22 | `useReactToPrint({ contentRef })` returns `reactToPrintFn`. The hook's return type is `() => void`; called as `reactToPrintFn()` on L30 and L118 — fine, but no error handling for the print failure. |
| Low | L23 | `useCurrentLocale()` — locale is consumed at L88, L96, L200; missing locale fallback if `useCurrentLocale()` returns a new locale not in `ExtendedLocale`. |
| Low | L84 | `fetchWordList` — POST to `/api/v1/assistant/wordlist` with the whole `article` object in the body. Article may include non-serializable fields (`Date`, etc.); `JSON.stringify` drops them silently. |
| Low | L103 | `setTranslated(data.translated_sentences);` — snake_case field. If the API ever returns camelCase, this is `undefined` and `.map` at L328 throws. |
| Low | L150-153 | `<Button size="sm" onClick={handlePrint} disabled={isLoading}>` — fine, but the loading state at L34 doesn't reset if `handlePrint` throws. No try/catch. |
| Low | L117-119 | `setTimeout(() => { reactToPrintFn(); }, 500)` — hardcoded 500ms delay. If the user clicks print while the data is still rendering (slow DOM), the print misses content. |
| Low | L122-139 | `highlightVocabulary` is computed in JSX at L234 — re-computed every render. Performance hazard for long passages. |

---

## File 5: `apps/reading-advantage/components/teacher/remove-student-inclass.tsx` (132 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L49-91 | `handleRemoveStudentInClass` PATCHes `/api/v1/classroom/${studentInClass.id}/unenroll` with `{ student: studentDelete }` — the optimistic local filter (`studentDelete` at L53-55) is the source of truth. If the server rejects (returns 4xx/5xx), the local state is not rolled back; the server is then out of sync with the UI, and the next fetch returns the same student again. |
| High | L69-74 | `if (!response.ok) { toast({ variant: "destructive" }); }` — error toast is shown, but the function continues to L82 `finally`. |
| High | L82-90 | `finally` always shows a success toast (L83-87) **even when the response was not ok**. This is a textbook vacuous-pass-on-nothing-done anti-pattern (A1 family): the success toast is rendered regardless of whether the unenrollment succeeded. |
| Med | L58 | `PATCH /api/v1/classroom/${studentInClass.id}/unenroll` — `PATCH` is the right verb for partial update; full unenrollment is more naturally a `DELETE` on `/classroom/:id/members/:studentId`. |
| Med | L96 | `<Dialog open={open} onOpenChange={() => setOpen(!open)}>` — same function-form negation as `my-students.tsx:348`. |
| Med | L98-103 | `<DialogTrigger asChild><span title="remove student"><Icons.delete className="h-4 w-4 cursor-pointer" aria-label="remove student in class" /></span></DialogTrigger>` — the trigger is a `<span>` (non-interactive element) with an icon. Keyboard accessibility is broken: spans are not focusable by default, screen readers cannot activate them. Should be a `<button>` with the icon as its child. |
| Med | L121 | `{t("remove")}` — locale exists in `reports.removeStudent.remove`. OK. |
| Med | L1 | `"use client"` is missing. The component uses `useState` (L45) and `useRouter` (L46). The React Compiler or Next.js will detect this and complain; runtime error in production. **Critical bug.** |
| Low | L17-21 | `type StudentInClass = { studentId: string; email?: string; lastActivity: Date \| string; }` — same Date/string union as `my-classes.tsx`. |
| Low | L23-28 | `type Classrooms` — local type, but the shape is duplicated across `my-classes.tsx`, `reports.tsx`, etc. Should be sourced from the store. |
| Low | L30-33 | `interface RemoveStudentProps { userData: Student; classroomData: Classrooms; }` — naming: `Student` is the local type from L35-42 (snake_case fields), but the caller in `reports.tsx:201` passes `payment` which is typed as `StudentData` (L52-59) — `payment` lacks `last_activity`, `level`, `xp` matching the same `StudentData` shape, so the type alignment is actually correct, but the convention differs across files. |
| Low | L44 | `function RemoveStudent(...)` is declared without `export default` keyword; line 132 has `export default RemoveStudent;` separately. Fine. |
| Low | L47 | `useScopedI18n("components.reports.removeStudent")` — locales exist (see `en.ts:3268-3280`). |

---

## File 6: `apps/reading-advantage/components/teacher/reports.tsx` (417 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L50 | `import { set } from "lodash";` — never used in this file. Dead import (lodash `set` mutates nested object paths; not invoked anywhere). |
| High | L73 | `const [xpData, setXpData] = React.useState<any>({});` — `any` defeats type safety. Should be `useState<XpData | Record<string, never>>({})`. |
| High | L84-100 | `calculateAverageLevel` accepts `any`, iterates with `student: any`. The `level` field is then `Number(student.level)` — if `student.level` is `undefined`, `Number(undefined)` is `NaN`, which the `isNaN` guard at L93 catches. OK. But `student.level` may be a string like `"5"` from the DB; `Number("5")` is `5`, but `Number("five")` is `NaN`, caught. Edge: if `student.level` is `null`, `Number(null)` is `0`, which would skew the average. |
| Med | L120 | `<div className="captoliza ml-4" onClick={() => row.toggleSelected}>` — `onClick={() => row.toggleSelected}` returns the function reference (not invoked). The click handler does nothing. Latent bug from copy/paste. |
| Med | L200-202 | `!classes.importedFromGoogle && (<RemoveStudent userData={payment} classroomData={classes} />)` — the `RemoveStudent` component's `classroomData` prop type is `Classrooms` (from `remove-student-inclass.tsx`), not the `Classes` type from the store. Type mismatch at the call site is silently accepted because `classes` is `{} as Classes` (initialized in store at L94). |
| Med | L228-244 | `fetchStudentInClass` — `useCallback` with deps `[setStudentInClass, setClasses]` (store setters are stable; they will not change identity). The fetch response is read with `data.studentInClass` and `data.classroom`; no runtime guard against missing fields. |
| Med | L246-261 | `fetchXpPerStudents` — same pattern; `setXpData(data)` accepts whatever the API returned. |
| Med | L263-277 | `useEffect` depends on `[pathname, classrooms, setSelectedClassroom, setClasses, setStudentInClass, setXpData, fetchStudentInClass, fetchXpPerStudents]`. `fetchStudentInClass` and `fetchXpPerStudents` are stable (deps from useCallback don't change), so this is fine. But `pathname.split("/")[4]` (L265) extracts the classroomId from a path like `/teacher/reports/{classId}` — this is fragile; if the route segment order changes, the index `4` is wrong. Should use `useParams()`. |
| Med | L271-276 | `if (!currentClassroomId) { setClasses({} as Classes); setSelectedClassroom(""); setStudentInClass([]); setXpData({}); }` — `{} as Classes` is a runtime-unsafe cast; the `classes.importedFromGoogle` access at L200 then reads `undefined`, which is falsy, so the remove-student button appears. But other accesses like `classes.classroomName` (L316) yield `undefined`. Defensive coding missing. |
| Med | L285-294 | `handleClassChange` calls `await fetchStudentInClass(value)` then `router.push(\`/teacher/reports/${value}\`)`. The `useEffect` at L263-277 will re-fire because `pathname` changes, which re-fires `fetchStudentInClass` and `fetchXpPerStudents`. Net effect: every classroom change triggers **two** fetches (one from `handleClassChange`, one from the effect). Doubled network traffic. |
| Med | L299 | `<Header heading="Class Roster" />` — hardcoded English. The page is "Reports" (per the `useEffect` pathname is `/teacher/reports/...`), but the heading says "Class Roster". Either copy/paste or stale naming. |
| Med | L302 | `<SelectValue placeholder="Select a Classroom" />` — hardcoded English. |
| Med | L306 | `<SelectItem key={index} value={classroom.id}>` — `key={index}` (anti-pattern). |
| Med | L387 | `"Empty"` hardcoded English. |
| Med | L314 | `(studentInClass.length ? (<Header heading={trp("title", { className: classes.classroomName })} />) : (<Header heading={trp("noStudent")} />))` — braces around a single statement inside a JSX expression: `()` is redundant. Cosmetic. |
| Low | L39 | `import { useClassroomState, useClassroomStore, type Classes } from "@/store/classroom-store";` — fine. |
| Low | L62-68 | `useState<SortingState>`, `useState<ColumnFiltersState>`, `useState<VisibilityState>`, `useState<{}>` — duplicated boilerplate from `my-classes.tsx`, `my-students.tsx`, `unenroll-classes.tsx`. Could be a shared `useReactTableState()` hook. |
| Low | L83 | `const pathname = usePathname();` — but the hook at L263 re-reads `pathname.split("/")` to derive `classroomId`. |
| Low | L198 | `<div className="flex gap-2 justify-center">` — class string duplicates across columns; not a bug. |
| Low | L299 | Heading "Class Roster" is also used by `classRoster` locale at `en.ts:3165`. Likely the wrong page mounted under the reports route. |
| Low | L308 | `{classroom.classroomName}` — unescaped user-supplied string. React escapes by default for text nodes. OK. |

---

## File 7: `apps/reading-advantage/components/teacher/sidebar-teacher-nav.tsx` (79 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L16 | `const pathWithoutLocale = "/" + path.split("/").slice(2).join("/");` — assumes the path begins with `/{locale}/...`. If the route is rendered outside the `[locale]` segment (e.g., in `/login` or `/api`), the slice drops the empty leading segment and the result is `/` (which matches every `item.href.startsWith("/")` check). Active-link state becomes wrong on locale-less routes. |
| High | L34 | `const Icon = Icons[item.icon as keyof typeof Icons];` — `Icons` is the icon map from `apps/reading-advantage/components/icons.tsx`. `Icons[undefined]` returns `undefined`, which is then used as a component at L47 (`<Icon ... />`). React throws "Element type is invalid". The runtime check `if (!items?.length) return null;` at L17-19 doesn't guard against `item.icon` being undefined. |
| High | L37 | `<Link key={index} href={item.disabled ? "/" : item.href}>` — `key={index}` anti-pattern; navigation items may reorder. |
| High | L58-68 | `t(item.title as ... \| ... \| ...)` — the local type assertion adds `"dashboard"` and `"workbookGenerator"` to the `title` union, but the `SidebarTeacherNavItem` type at `types/index.d.ts:69-75` does **not** include `"dashboard"` or `"workbookGenerator"`. The cast is widening the union locally; if the parent passes an unknown title, `useScopedI18n` returns the raw string (no fallback key). Two drift points: (1) the local cast and (2) the type definition. |
| Med | L29 | `"Back"` hardcoded English; the back button is conditionally rendered only on `/settings/*` paths. |
| Med | L44 | `item.disabled && "cursor-not-allowed opacity-80"` — disabled links remain clickable; clicking goes to `/` (per L37 `item.disabled ? "/" : item.href`). Disabled items are not actually disabled. |
| Med | L59-67 | Cast list `"dashboard" \| "myClasses" \| "myStudents" \| "classRoster" \| "reports" \| "assignments" \| "passages" \| "workbookGenerator"` — 8 keys but `SidebarTeacherNavItem.title` in `types/index.d.ts:69-75` has only 6. Drift: types/index.d.ts is missing `dashboard` and `workbookGenerator`. |
| Med | L69 | Comment `{/* {t(item.title)} */}` — dead commented-out code. |
| Low | L1 | `"use client"` declared; uses `usePathname` (L15) and `useScopedI18n` (L14). Fine. |
| Low | L13-79 | Component is small and pure (no fetch, no state). Could be a server component if `useScopedI18n` were a server-side helper. |
| Low | L34 | `Icons[item.icon as keyof typeof Icons]` — type assertion is required because `item.icon?: keyof typeof Icons` is optional; at runtime `Icons[undefined]` is undefined. Should be `Icons[item.icon]` after a runtime guard. |

---

## File 8: `apps/reading-advantage/components/teacher/stories-assign-dialog.tsx` (36 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L13 | Component accepts `story: Article` (full Article object), `storyId: string`, `userId: string` — but `userId` is **never read** anywhere in the file. Dead prop. |
| High | L17 | `const storiesUri = \`https://app.reading-advantage.com/en/student/stories/${storyId}\`;` — hardcoded production domain and English locale segment (`/en/`). If the teacher is in Thai locale, the link points to an English page. Violates i18n. |
| High | L25 | `setShow(true)` is called inside the `.then()` of `navigator.clipboard.writeText`, but `show` is never read elsewhere — there is no UI bound to it. Dead state. |
| Med | L18 | `navigator.clipboard.writeText(storiesUri)` — silently fails in non-HTTPS contexts (or when clipboard permission is denied). The `.catch` at L27-32 catches the promise rejection, but the toast title is `"Link not copied to clipboard"` (hardcoded English). |
| Med | L22-24, L29-31 | Toast title and description strings hardcoded English. |
| Med | L17 | Story URL uses `storyId` from props, not `story.id` from the Article. If a caller passes a mismatched `storyId`, the link and the article diverge. |
| Low | L1 | `"use client"` declared; uses `useState` and the clipboard API. Fine. |
| Low | L13 | Component name is `StoriesAssignDialog` but it does not open a dialog — it copies a link to the clipboard. The name is misleading; a rename to `StoriesAssignLinkButton` or `CopyStoryLink` would be clearer. |
| Low | L35 | `<Button onClick={handleShow}>Copy Link</Button>` — button text hardcoded English. |
| Low | L2 | `useState` from React imported but the state (`show`) is unused beyond setting it. Should be removed. |

---

## File 9: `apps/reading-advantage/components/teacher/unenroll-classes.tsx` (315 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L91-99 | `fetch(\`/api/v1/classroom/${selectedClassroomId}/unenroll\`, { method: "PATCH", body: JSON.stringify({ studentId: params.studentId }) })` — body has `studentId`; server contract assumes snake_case elsewhere. No runtime validation that the response shape matches expectations. |
| High | L101-130 | The `else` branch (success path) mutates local state via `setData((prevData) => { ... })` and then `setTimeout(() => { router.push("/teacher/my-students"); }, 1000)`. The 1-second delay masks the optimistic local update; if the user clicks twice during the 1s, two parallel unenrollments fire for the same student/classroom pair. |
| Med | L80-86 | Toast `description: "Please select a classroom first."` — hardcoded English. |
| Med | L108-122 | The success `else` branch sets `isUnenrolling` is not reset to `false` before the `setTimeout`; the success path runs `setIsUnenrolling(false)` is **only** in the catch at L139 and the `else`-error path at L107. If the success path completes and the `setTimeout` fires, the button is still in `isUnenrolling=true` state until navigation completes — usually fine, but if `router.push` is cancelled, the spinner sticks. |
| Med | L109-122 | `setData((prevData) => { ... })` — `safePrevData.classroom.filter(...)` mutates the persisted local state. If the server later rejects the unenroll (e.g., 409 Conflict), the UI still shows the classroom removed. |
| Med | L158 | `<div className="captoliza ml-4" onClick={() => row.toggleSelected}>` — same bug as `reports.tsx:120`: the click handler returns the function reference without invoking. |
| Med | L195-212 | `useEffect` fetches `/api/v1/classroom/students/unenroll?studentId=${params.studentId}` but does not include `params.studentId` in the dependency array (L212 `}, []);`). If the route param changes (e.g., user navigates from `/unenroll-classes/A` to `/unenroll-classes/B`), the effect does not refetch. Stale data. |
| Med | L201-209 | `fetch(...).then((res) => { if (!res.ok) throw ...; return res.json(); }).then((res) => setData(res))` — sets `data` to the entire response envelope (`{ classroom, student }`), not the unwrapped payload. Consistent with `MyEnrollProps` type at L57-60, but only if the server returns that exact shape. |
| Med | L211 | `fetchData();` invocation inside the effect body but not in `useCallback`; the effect runs once on mount and re-runs on dep change (none), so the call site is fine but not idiomatic. |
| Med | L218-220 | `tu("title", { studentName: data ? data.student?.display_name : "Unknown" })` — `student` is typed as required (`MyEnrollProps.student: Student`) but accessed with `?.` — drift between type and access. |
| Med | L238 | `{isUnenrolling ? "Removing..." : tu("remove")}` — `"Removing..."` hardcoded English. |
| Med | L285 | `"Empty"` hardcoded English. |
| Low | L1 | `"use client"` declared. |
| Low | L32-60 | Local types (`Student`, `StudentInClass`, `Classroom`, `MyEnrollProps`) duplicate shapes from `my-classes.tsx` and the classroom store. |
| Low | L70-71 | `useState<string>("")`, `useState<boolean>(false)` — fine. |
| Low | L76 | `const [data, setData] = useState<MyEnrollProps>();` — `undefined` initial state. Every access at L218, L177 must guard with `data ? ... : ...`. |
| Low | L109 | `const safePrevData = prevData ?? { classroom: [], student: {} as Student };` — `{} as Student` is a runtime-unsafe cast; `student.id` etc. will be `undefined`. The first-run branch renders "Unknown" via the fallback at L218. |
| Low | L170 | `<RadioGroupItem value={row.original.id} />` — `value` is set but the parent `RadioGroup` uses `onValueChange={setSelectedClassroomId}` at L242; the inner `RadioGroupItem` lives inside a `<Table>` (not a real `<RadioGroup>` list). React-Hook-Form/shadcn semantics may not wire the inner items into the outer group. |
| Low | L242-291 | `<RadioGroup>` wraps the entire `<Table>`. Semantically a radio group should wrap the options, not the whole table. Likely UX glitch: clicking the radio doesn't actually toggle selection; clicking the row text doesn't either. |
| Low | L73 | `useScopedI18n("components.myStudent.unEnrollPage")` — locales exist at `en.ts:3149-3162`. |

---

## File 10: `apps/reading-advantage/components/theme-customizer.tsx` (209 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L20-21 | `const [config, setConfig] = useConfig();` — `setConfig` is destructured but never used in `ThemeCustomizer` (only the inner `Customizer` uses it at L62). Dead binding. |
| High | L22, L24-26 | `const [mounted, setMounted] = React.useState(false); React.useEffect(() => { setMounted(true); }, []);` — `mounted` is set but **never read** in `ThemeCustomizer`. Dead state. The mount-aware rendering is only done inside `Customizer` (L60, L110, L177). |
| Med | L76 | `"Theme Customizer"` hardcoded English. |
| Med | L79 | `"Customize your components colors."` hardcoded English. |
| Med | L95 | `<span className="sr-only">Reset</span>` — `Reset` hardcoded English. |
| Med | L100 | `<Label className="text-xs">Color</Label>` — `Color` hardcoded English. |
| Med | L138 | `{theme.label}` — `theme.label` from `theme-base-colors.ts` (need to verify it's localized; if not, hardcoded English). |
| Med | L148-205 | Three entire `<div>` blocks (radius, mode, etc.) are commented out (L148-173, L174-205). Dead commented-out code. |
| Low | L1 | `"use client"` declared. |
| Low | L15 | `import { BaseColor, baseColors } from "@/styles/theme-base-colors";` — `BaseColor` type imported but never used. Dead import. |
| Low | L17 | `//import "@/styles/mdx.css";` — dead commented-out import. |
| Low | L4 | `import { Check, Copy, Moon, Repeat, Sun, Palette } from "lucide-react";` — `Copy`, `Moon`, `Sun` are imported but never used. Dead imports. |
| Low | L9 | `import { ThemeWrapper } from "@/components/theme-warpper";` — note the typo in the file name (`warpper`); the import is correctly spelled. Path resolves. |
| Low | L60 | `function Customizer()` — not exported; only used internally. |
| Low | L62 | `const [config, setConfig] = useConfig();` — `config` is read (L108, L116-119, L116-119 inside the inner setConfig closure). Fine. |
| Low | L108 | `const isActive = config.theme === theme.name;` — fine. |
| Low | L116-119 | `setConfig({ ...config, theme: theme.name });` — fine. |
| Low | L128 | `theme?.activeColor[mode === "dark" ? "dark" : "light"]` — `theme?` is optional but the `.filter` above ensures `theme.name` is not in the excluded list, so `theme` is always defined. The optional chain is defensive but unnecessary. |
| Low | L131 | `style={{ "--theme-primary": `hsl(${theme?.activeColor[...]})` } as React.CSSProperties}` — `React.CSSProperties` cast. Fine. |
| Low | L154 | `variant="outline"` for a `Button` in a color grid — but the existing styles `border-2 border-primary` indicate "selected" state. Inconsistent visual: unselected buttons use `variant="outline"`, selected buttons get `border-2 border-primary` plus `variant="outline"` (likely renders double-border). |

---

## File 11: `apps/reading-advantage/components/theme-warpper.tsx` (35 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L9 | File name typo: `theme-warpper.tsx` (should be `theme-wrapper.tsx`). All importers (currently `theme-customizer.tsx:9`) reference the typo path; renaming requires coordinated edits. |
| Med | L16 | `const [config] = useConfig();` — `config` is read at L20 and L28; `useConfig` returns `[config, setConfig]`; `setConfig` is unused here. Not a bug, but the tuple destructuring is unnecessarily restricted. |
| Med | L20 | `\`theme-${defaultTheme \|\| config.theme}\`` — falls back to `config.theme` when `defaultTheme` is undefined; if both are undefined, the class is `theme-undefined`, which Tailwind won't recognize. No default. |
| Med | L28 | `--radius: ${defaultTheme ? 0.5 : config.radius}rem` — magic number `0.5` for default radius; should be a named constant. |
| Low | L1 | `"use client"` declared but the component only reads from a hook (`useConfig`) and applies CSS variables. Could be a server component if `useConfig` is server-safe (depends on the hook impl). |
| Low | L6-8 | `interface ThemeWrapperProps extends React.ComponentProps<"div">` — `React.ComponentProps<"div">` includes `children` implicitly via `React.ComponentProps`, so the explicit `children?: React.ReactNode` is not needed but not declared. |
| Low | L23 | `bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]` — inline arbitrary Tailwind values; equivalent CSS class would be more readable. |
| Low | L21 | `bg-foreground/10 dark:bg-foreground/0` — `dark:bg-foreground/0` is a no-op (0% opacity = fully transparent). Likely a typo for `dark:bg-foreground/5`. |
| Low | L11 | `defaultTheme?: string;` — `string` is too broad; should be `keyof typeof baseColors` to be type-safe. |

---

## File 12: `apps/reading-advantage/components/tour/CustomCard.tsx` (94 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L35-52 | `handleConfetti` does `fetch(\`/api/v1/users/${user?.id}\`, { method: "PATCH", body: JSON.stringify({ onborda: true }) })`. If `user?.id` is undefined (not signed in), the URL becomes `/api/v1/users/undefined` — backend will 404. No guard. |
| High | L36-41 | PATCH body is `{ onborda: true }` — the user toggles the `onborda` flag at the API. This is a direct client-to-API mutation of the user record bypassing any backend function contract. Violates AGENTS.md adapter rule. |
| High | L43 | `if (res.ok) { confetti({...}); closeOnborda(); router.push("/"); }` — on failure, no toast, no UI feedback. Silent failure. |
| Med | L50 | `router.push("/")` — hardcoded root path; no locale prefix. The next page is rendered for the current locale by Next.js middleware, but the URL `/` without `/en` or `/th` etc. may briefly show a redirect or fallback. |
| Med | L75 | `<Button onClick={() => prevStep()}>Previous</Button>` — `Previous` hardcoded English. |
| Med | L79 | `Next` hardcoded English. |
| Med | L84 | `"🎉 Finish!"` hardcoded English. |
| Med | L60 | `{step.icon} {step.title}` — `step.icon` and `step.title` come from the onborda configuration (typically defined in a separate `steps.ts`); not in the locale system. Likely hardcoded in the tour config. |
| Med | L9 | `import confetti from "canvas-confetti";` — client-side import; bundles ~14kb. Fine if intentional. |
| Med | L7 | `import { useSession } from "@reading-advantage/auth-client";` — `user` is fetched from auth session; `useSession` may return `undefined` for `user`. Guard missing. |
| Low | L1 | `"use client"` declared. |
| Low | L22 | `const CustomCard: React.FC<CardComponentProps>` — `React.FC` is fine; `displayName` not set. |
| Low | L55 | `<Card className="border-0 rounded-3xl w-[300px]">` — fixed width `300px`; not responsive. On small mobile screens (<300px), the card overflows. |
| Low | L62 | `{currentStep + 1} of {totalSteps}` — "of" is hardcoded English. |
| Low | L66 | `<Button variant="ghost" size="icon" onClick={() => closeOnborda()}>` — close button is icon-only with no `aria-label`; screen reader users cannot identify it. |
| Low | L82-86 | The finish button condition `currentStep + 1 === totalSteps` is correct but the previous button condition at L74 is `currentStep !== 0`; both are derived from `currentStep` (0-indexed) but the rendering logic could be condensed. |
| Low | L89 | `<span className="text-card">{arrow}</span>` — `text-card` is not a standard Tailwind class unless defined in the theme; if undefined, no styling. |

---

## File 13: `apps/reading-advantage/components/tour/StartTour.tsx` (34 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L5 | `import { BookOpen, Sparkles } from "lucide-react";` — `BookOpen` is imported but never used. Dead import. |
| Med | L23 | `"Start the tour 1"` — hardcoded English; the "1" is a leftover from a previous version with two tours. The mobile button text at L23 and desktop button text at L27 differ (`"Start the tour 1"` vs `"Start the tour"`) — likely a bug from incomplete rename. |
| Med | L9-15 | `handleStartOnborda(type: string)` accepts `string` instead of a literal union `"desktop" \| "mobile"`. If a caller passes an unknown string, the if/else-if chain falls through silently. |
| Med | L17 | `className="flex flex-col gap-4 lg:flex-row"` — the `<div>` contains both mobile (visible `sm:hidden`) and desktop (visible `sm:flex`) buttons. On screens where both are visible (e.g., during hydration), two buttons render simultaneously. |
| Low | L1 | `"use client"` declared. |
| Low | L8 | `const { startOnborda } = useOnborda();` — fine. |
| Low | L7 | `function StartTour()` is not exported as default with the `default` keyword (line 33 `export default StartTour;` is correct). |

---

## File 14: `apps/reading-advantage/components/ui/__tests__/calendar.test.tsx` (208 lines)

| Sev | Location | Finding |
|---|---|---|
| Med | L1-27 | Long docblock describes Phase 2 Red-phase tests for `<Calendar />` — accurate context. The test is intentionally failing (Red status) at HEAD due to the react-day-picker@8 / date-fns@4 peer mismatch. The test docblock says the tests are **expected to fail** against the current baseline and exit 0 after the Batch C migration. |
| Med | L34 | `const FIXED_MONTH = new Date(2026, 5, 1); // June 2026 (month is 0-indexed)` — pinned to June 2026 (today's month). If the test runs past June 2026, the comment becomes stale. Not a bug, just fragile. |
| Med | L50-51 | `screen.getByRole("gridcell", { name: /15/ }).querySelector("button") ?? screen.getByRole("button", { name: /15/ })` — regex `/15/` is loose; any cell whose accessible name contains "15" matches. If the day "15" and a header cell both contain "15", the assertion fails. |
| Med | L88-89 | Same loose regex pattern for `disabled` day test. |
| Med | L129-130 | `screen.getByRole("gridcell", { name: /^5$/ })` — anchored regex; less prone to false matches. |
| Med | L139-148 | `handleSelect.mock.calls.at(-1)?.[0]` — uses `at(-1)` for last call; safe but the destructuring with optional chaining `lastCall.from!` and `lastCall.to!` uses non-null assertions, which will throw if `from`/`to` is undefined. |
| Med | L110-112 | `const ariaDisabled = day20Button?.getAttribute("aria-disabled"); const disabledAttr = day20Button?.hasAttribute("disabled"); expect(ariaDisabled === "true" \|\| disabledAttr).toBe(true);` — `ariaDisabled === "true"` or `disabledAttr === true`. Note `day20Button` may be `null` if the gridcell doesn't contain a button; `.getAttribute` would throw. Defensive `?.` is used. |
| Low | L194-207 | "imports react-day-picker without throwing" — defensive test for module-load. Uses `jest.isolateModules` to re-require the module. Good. |
| Low | L29-32 | Standard imports; `render` from `@testing-library/react`, `screen` from same, `userEvent` from `@testing-library/user-event`. All standard. |
| Low | L26 | Doc says run via `pnpm --filter reading-advantage exec jest components/ui/calendar` — confirms Jest, not Vitest. AGENTS.md notes mixed Jest/Vitest. |
| Low | L36-72 | First describe block (`Calendar (single mode) – date selection contract`) covers two cases: click and selected prop. |
| Low | L74-114 | Second describe block (`Calendar – disabled-date contract`) covers two cases. |
| Low | L116-149 | Third describe block (`Calendar (range mode) – range-selection contract`) — single test. |
| Low | L151-191 | Fourth describe block (`Calendar – navigation contract`) — three tests. |
| Low | L193-207 | Fifth describe block (`Calendar – peer dependency contract`) — single defensive test. |
| Low | L25 | `path filter: components/ui/calendar` — note the test file is at `__tests__/calendar.test.tsx`, but the invocation passes `components/ui/calendar`. Jest's testMatch defaults to `**/__tests__/**/*.{ts,tsx}`; the path filter still works. |

---

## File 15: `apps/reading-advantage/components/ui/alert-dialog.tsx` (141 lines)

| Sev | Location | Finding |
|---|---|---|
| Low | L1 | `"use client"` declared — appropriate for Radix portal components. |
| Low | L9-13 | `AlertDialog = AlertDialogPrimitive.Root` etc. — straight re-exports. |
| Low | L15-28 | `AlertDialogOverlay = React.forwardRef<...>` — standard pattern. `data-[state=open]:animate-in` etc. relies on `tailwindcss-animate` plugin and Radix data attributes. |
| Low | L21 | `"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"` — animation classes; identical to the shadcn UI template. |
| Low | L30-46 | `AlertDialogContent` wraps `AlertDialogPortal` + `AlertDialogOverlay` + `AlertDialogPrimitive.Content`. `fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%]` — fixed positioning with centering. |
| Low | L39 | `data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]` — six animation data attributes; standard. |
| Low | L48-60 | `AlertDialogHeader` — no forwardRef. |
| Low | L62-74 | `AlertDialogFooter` — no forwardRef. |
| Low | L76-86 | `AlertDialogTitle` — forwardRef, standard. |
| Low | L88-99 | `AlertDialogDescription` — forwardRef, standard. |
| Low | L101-111 | `AlertDialogAction` — uses `buttonVariants()` (no size, no variant) — fine, defaults to `default` variant, `default` size. |
| Low | L113-127 | `AlertDialogCancel` — uses `buttonVariants({ variant: "outline" })`. |
| Low | L129-141 | Re-export list at the bottom — standard. |
| Low | L7 | `import { buttonVariants } from "@/components/ui/button"` — same path alias as the rest of the app. |
| Med | L1 | `"use client"` (no semicolon). Inconsistent with other files in the batch (most use `;` at end of `"use client";`). Cosmetic. |
| Med | L3 | `import * as React from "react"` (no semicolon). Same. |
| Med | L6 | `import { cn } from "@/lib/utils"` (no semicolon). Same. |
| Med | L101-111 | `AlertDialogAction` does not allow a `variant` or `size` override; consumers cannot style it as `destructive` without re-implementing. shadcn's official `alert-dialog.tsx` accepts `buttonVariants({ variant, size })` props. |
| Med | L113-127 | `AlertDialogCancel` is hardcoded to `variant: "outline"`. Same. |
| Low | L34 | `<AlertDialogPortal>` — the portal pattern auto-mounts the content into `document.body`; in tests using `jsdom`, this requires the testing environment to support portals. |

---

## File 16: `apps/reading-advantage/components/ui/alert.tsx` (59 lines)

| Sev | Location | Finding |
|---|---|---|
| Low | L1-19 | `alertVariants = cva(...)` — uses `class-variance-authority`. Variants: `default`, `destructive`. Default classes include `[&>svg+div]:translate-y-[-3px]` etc. — Tailwind arbitrary variants for child positioning. |
| Low | L22-33 | `Alert = React.forwardRef<HTMLDivElement, ...>` — standard. |
| Low | L28 | `role="alert"` — accessibility-friendly (screen readers announce alerts). |
| Low | L35-44 | `AlertTitle = React.forwardRef<HTMLParagraphElement, ...>` — typed as `HTMLParagraphElement` but rendered as `<h5>`. Mismatch: `forwardRef<HTMLParagraphElement>` should be `forwardRef<HTMLHeadingElement>`. |
| Low | L47-56 | `AlertDescription = React.forwardRef<HTMLParagraphElement, ...>` — `<div>` rendered but typed as `HTMLParagraphElement`. Same mismatch. |
| Low | L59 | `export { Alert, AlertTitle, AlertDescription }` — `alertVariants` is not exported. Consumers cannot extend variants. |
| Med | L35-44 | `AlertTitle`'s `forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>` — the props type is for `<h5>`, but the ref type is for `<p>`. The TypeScript type checker will complain when a parent tries to attach a `<h5>` ref. |
| Med | L47-56 | `AlertDescription` — same drift. |
| Low | L4 | `import { cn } from "@/lib/utils"` — fine. |
| Low | L2 | `import { cva, type VariantProps } from "class-variance-authority"` — fine. |

---

## File 17: `apps/reading-advantage/components/ui/avatar.tsx` (50 lines)

| Sev | Location | Finding |
|---|---|---|
| Low | L1 | `"use client"` declared — appropriate for Radix Image/Fallback. |
| Low | L8-21 | `Avatar = React.forwardRef<...>` — standard. |
| Low | L14 | `cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)` — fixed size 40x40; consumers must override via `className` for different sizes. |
| Low | L23-33 | `AvatarImage = React.forwardRef<...>` — standard. |
| Low | L29 | `cn("aspect-square h-full w-full", className)` — image fills the parent. |
| Low | L35-47 | `AvatarFallback = React.forwardRef<...>` — standard. |
| Low | L41 | `cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)` — `bg-muted` for fallback; consumer can override. |
| Low | L50 | `export { Avatar, AvatarImage, AvatarFallback }` — standard. |
| Med | L35-47 | `AvatarFallback` has no `delayMs` prop, which Radix supports to delay fallback display until the image loads. Without delay, fallback flashes briefly when the image loads. |
| Low | L4 | `import * as AvatarPrimitive from "@radix-ui/react-avatar"` — fine. |

---

## File 18: `apps/reading-advantage/components/ui/badge.tsx` (40 lines)

| Sev | Location | Finding |
|---|---|---|
| Low | L6-24 | `badgeVariants = cva(...)` — variants: `default`, `secondary`, `destructive`, `outline`. |
| Low | L26-29 | `interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}` — no children handling. |
| Low | L31-37 | `Badge` is a regular function component (not forwardRef). Consumers cannot attach a ref. Inconsistent with `AlertTitle` etc. |
| Low | L33 | `<span>` — span has no native semantics for "badge"; should be `<span>` with `role="status"` for accessibility, or `<div>` with `role="status"`. |
| Low | L40 | `export { Badge, badgeVariants }` — exports both. |
| Med | L31-37 | `Badge` is not a `React.forwardRef`; if a parent tries to attach a ref via `ref={someRef}`, React will warn or fail. |
| Med | L33 | `<span ... {...(props as React.HTMLAttributes<HTMLSpanElement>)} />` — `props` already extends `HTMLAttributes<HTMLSpanElement>`; the cast is a no-op but suggests the author was unsure. |
| Low | L1-4 | Standard React + cva + cn imports. |
| Low | L2 | Semicolons used consistently. |

---

## File 19: `apps/reading-advantage/components/ui/button.tsx` (57 lines)

| Sev | Location | Finding |
|---|---|---|
| Low | L7-35 | `buttonVariants = cva(...)` — `default`, `destructive`, `outline`, `secondary`, `ghost`, `link` variants; `default`, `sm`, `lg`, `icon` sizes. Standard shadcn. |
| Low | L37-41 | `ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean; }` — extends native button attrs plus variants. |
| Low | L43-54 | `Button = React.forwardRef<HTMLButtonElement, ButtonProps>(...)` — standard. |
| Low | L45 | `const Comp = asChild ? Slot : "button";` — `Slot` is from `@radix-ui/react-slot`; merging props via Slot is the Radix idiom. |
| Low | L55 | `Button.displayName = "Button"` — explicit. |
| Low | L57 | `export { Button, buttonVariants }` — standard. |
| Med | L8 | `"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"` — ring width `1` is thin; modern shadcn uses `focus-visible:ring-2`. |
| Med | L11-15 | `default: "bg-primary text-primary-foreground shadow hover:bg-primary/90"` — `shadow` (medium); modern shadcn uses `shadow-sm`. |
| Med | L15 | `destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90"` — uses `shadow-sm`; inconsistent with `default` variant's `shadow`. |
| Low | L1-5 | Standard imports. |
| Low | L45 | `asChild = false` default. |

---

## File 20: `apps/reading-advantage/components/ui/calendar-heatmap.tsx` (157 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L11-17 | `type OneOf<T extends {}[]>` uses `Partial<Record<Exclude<UnionKeys<T[number]>, keyof T[K]>, never>>` — a discriminated union type. The cast enforces "exactly one of the variants must be set" via `never` on the absent variant. Correct type-level technique. |
| High | L33 | `type VariantDatesInput = OneOf<[IDatesPerVariant, IWeightedDatesEntry]>;` — `OneOf` is sound but the input is a `OneOf<[A, B]>`, which is a union of `{ ...A, B-only-fields?: never } \| { ...B, A-only-fields?: never }`. The union is consumable; OK. |
| High | L96-105 | `CalendarHeatmap` destructures `variantClassnames, datesPerVariant, weightedDates, className, classNames, showOutsideDays = true, ...props` from `CalendarProps`. `OneOf` is not enforced at runtime: if a consumer passes both `datesPerVariant` and `weightedDates`, the component silently uses `datesPerVariant` (after `weightedDates = weightedDates ?? []`). The "exactly one" contract is violated silently. |
| Med | L40-61 | `useModifers` (note typo: should be `useModifiers`) builds two records by reducing over `variantLabels`. The function takes `variantClassnames` and `datesPerVariant`; if `datesPerVariant` has fewer items than `variantClassnames`, the missing modifier classes are `undefined`. If it has more, the extra dates are silently dropped (since the reduce stops at `noOfVariants`). |
| Med | L40 | `function useModifers(...)` — typo `useModifers`. Internal helper; not exported; lower severity. |
| Med | L63-85 | `categorizeDatesPerVariant` — sorts `weightedDates` in place via `sort((a, b) => a.weight - b.weight)`. Mutating the caller's array is a side-effect bug; React passes `weightedDates` prop and the helper mutates it. If the same prop is reused elsewhere, the sort order persists. |
| Med | L71-74 | `const minNumber = sortedEntries[0].weight; const maxNumber = sortedEntries[sortedEntries.length - 1].weight;` — if `weightedDates` is empty, `sortedEntries[0]` is `undefined`, `.weight` throws. Guard missing. |
| Med | L98-100 | `weightedDates = weightedDates ?? [];` followed by `datesPerVariant = datesPerVariant ?? categorizeDatesPerVariant(weightedDates, noOfVariants);` — the fallback assignment works only when both are `undefined`. If `weightedDates = []`, `categorizeDatesPerVariant([], n)` returns an array of `n` empty arrays, and `datesPerVariant` is set to that. Then `modifiers` and `modifiersClassNames` use empty arrays. Component renders DayPicker with no modifications. |
| Med | L113-146 | `classNames={{ months: ..., month: ..., caption: ..., ... }}` — class names hardcoded for the heatmap look. Note `caption_label: "text-sm font-medium"` — react-day-picker@8 uses `caption_label`; v9 uses `month_caption` (per the test comment). When migrating to v9, this prop name must change. |
| Med | L136-137 | `day_selected: "..."` is **commented out**. Selected days will not have a distinct background; consumers rely on `bg-accent` from the cell modifier. |
| Med | L148-149 | `<IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />` and `<IconRight>` — `...props` is ignored (the icon doesn't forward className from react-day-picker). Custom icon class merges break. |
| Med | L1 | `"use client"` declared — appropriate. |
| Low | L5 | `import { DayPicker } from "react-day-picker";` — same peer-mismatched library noted in the test file. |
| Low | L8 | `import { buttonVariants } from "@/components/ui/button";` — fine. |
| Low | L155 | `CalendarHeatmap.displayName = "CalendarHeatmap";` — fine. |
| Low | L157 | `export { CalendarHeatmap };` — single export. |
| Low | L21-24 | `WeightedDateEntry = { date: Date; weight: number; }` — fine. |
| Low | L26-32 | `IDatesPerVariant` and `IWeightedDatesEntry` interfaces — fine. |
| Low | L45-58 | Reducer pattern with `Record<string, Date[]>` and `Record<string, string>` — fine. |
| Low | L80 | `Math.min(Math.floor((entry.weight - minNumber) / range), noOfVariants - 1)` — fine, clamps to last variant. |
| Low | L126 | `head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]"` — fixed width `w-9`; not responsive. |

---

## Anti-Pattern Audit

| ID | Anti-pattern | Present in batch? | Evidence |
|----|--------------|-------------------|----------|
| A1 | Silent catch + happy UI | Yes | `remove-student-inclass.tsx:82-90` — `finally` always toasts success regardless of `response.ok`. `my-classes.tsx:299` — `handleImportCourses` only toasts on success, no error toast. `my-students.tsx:134` — `router.refresh()` in `finally` runs even on failure. |
| A2 | Silent scope expansion (any[]) | Yes | `my-classes.tsx:84` `studentCount?: any[]`. `reports.tsx:73, 84, 91` `any`/`any[]`. `print-article.tsx:16-20` five `useState<any[]>([])`. `unenroll-classes.tsx:109` `{} as Student`. |
| A3 | Digit-only as a "labeled count" | No | No magic status numbers in this batch. |
| A4 | Vacuous-pass on nothing-done | Yes | `remove-student-inclass.tsx:82-90` `finally` block toasts success unconditionally. `tour/CustomCard.tsx:43-51` `if (res.ok)` only fires confetti on success but no failure feedback. |
| A5 | False-claim text vs test reality | Yes (documented) | The `calendar.test.tsx` docblock (L1-27) explicitly states tests are RED against the v8/date-fns@4 baseline and will exit 0 only after Batch C migration. This is a deliberate, self-described red-phase gate — not a false claim; the file is honest about its expected failure mode. |
| A6 | Provider-specific hardcoded URLs | Yes | `print-article.tsx:209` direct `storage.googleapis.com` URL. `stories-assign-dialog.tsx:17` direct `app.reading-advantage.com` URL. `tour/CustomCard.tsx:50` `router.push("/")` (no provider concern but URL is hardcoded). |
| A7 | Magic numbers without enum | Yes | `print-article.tsx:223` `charCount > 3000`, `:260` `questionCharCount > 2500`, `:332` `> 5000`. `my-classes.tsx:639` `(currentLevel / (State.length - 1))`. `theme-warpper.tsx:28` `0.5`. |
| A8 | Direct client → API mutation | Yes | `tour/CustomCard.tsx:36` PATCH `/api/v1/users/${user?.id}` with `{ onborda: true }`. `my-students.tsx:99-112` PATCH `/api/v1/users/${id}` with `{ xp: 0, level: 0, cefr_level: "" }`. `remove-student-inclass.tsx:57` PATCH `/api/v1/classroom/:id/unenroll`. |
| A9 | Optimistic local update without rollback | Yes | `remove-student-inclass.tsx:53-55, 82-90` local filter is committed before server response; no rollback on failure. `unenroll-classes.tsx:109-122` local state filter on success branch; no rollback. |
| A10 | URL/env-prefixed same-site navigation | Yes | `my-classes.tsx:181, 190` and `my-students.tsx:73, 100, 195, 204, 213` all concatenate `process.env.NEXT_PUBLIC_BASE_URL` with a same-site path. |
| A11 | `key={index}` for mapped items | Yes | `leaderboard.tsx:52`, `my-classes.tsx:452, 531, 621`, `reports.tsx:306`, `sidebar-teacher-nav.tsx:37`, `print-article.tsx:196`, `tour/CustomCard.tsx` not affected. |
| A12 | Hardcoded English UI bypassing i18n | Yes | `leaderboard.tsx:34, 36, 79`; `my-classes.tsx:203, 328, 344, 428, 437, 444, 466, 488, 494, 501, 502, 517, 526, 545, 563, 572, 581, 585`; `my-students.tsx:86-89, 115-118, 120-124, 128-132, 157, 171, 287-294, 318`; `reports.tsx:299, 302, 387`; `sidebar-teacher-nav.tsx:29`; `stories-assign-dialog.tsx:22-31, 35`; `unenroll-classes.tsx:80-86, 218-220, 238, 285`; `print-article.tsx:152, 179, 181, 200, 209, 244, 304, 311, 326`; `tour/CustomCard.tsx:62, 75, 79, 84`; `tour/StartTour.tsx:23, 27`. |
| A13 | `"use client"` missing despite client hooks | Yes | `remove-student-inclass.tsx:1` (uses `useState`, `useRouter` — missing directive). |
| A14 | File name typo | Yes | `theme-warpper.tsx` (should be `theme-wrapper.tsx`). Internal helper `useModifers` in `calendar-heatmap.tsx:40` (should be `useModifiers`). Accessor key typo `student.lenght` in `my-classes.tsx:152`. |
| A15 | Type drift between local and store types | Yes | `my-classes.tsx:59-79` local `Classes` adds `isOwner?` not in store; `reports.tsx:200-202` uses `classes.importedFromGoogle` where store type's `Classes` is structurally compatible but the local type in `reports.tsx:39` imports `type Classes` from store. |
| A16 | `as any` cast suppressing type safety | Yes | `my-classes.tsx:602` `(classrooms.find(c => c.id === selectedClassroomId) as any)?.isOwner`. `unenroll-classes.tsx:109` `{} as Student`. |
| A17 | Click handler returning function reference | Yes | `reports.tsx:120`, `unenroll-classes.tsx:158`. |

---

## Test / Coverage Observations

1. **Tests in batch**: 1 file — `apps/reading-advantage/components/ui/__tests__/calendar.test.tsx`. The file is a deliberate Phase 2 Red-phase test against the react-day-picker@8 / date-fns@4 peer-mismatched baseline; it documents itself as expected-fail. It does **not** cover any of the 19 other files in this batch.
2. **No tests exist for**:
   - `teacher/leaderboard.tsx` (no test)
   - `teacher/my-classes.tsx` (no test) — TanStack-Table paging/filtering, Google Classroom OAuth flow, Dialog state machine
   - `teacher/my-students.tsx` (no test) — fetch + table
   - `teacher/print-article.tsx` (no test) — print-data orchestration
   - `teacher/remove-student-inclass.tsx` (no test)
   - `teacher/reports.tsx` (no test) — pathname-derived classroomId, double-fetch on class change
   - `teacher/sidebar-teacher-nav.tsx` (no test) — locale-prefixed path slicing, disabled-link routing
   - `teacher/stories-assign-dialog.tsx` (no test) — clipboard, hardcoded URL
   - `teacher/unenroll-classes.tsx` (no test) — RadioGroup-inside-Table, missed useEffect dep
   - `theme-customizer.tsx` (no test) — color grid, mounted state
   - `theme-warpper.tsx` (no test)
   - `tour/CustomCard.tsx` (no test) — fetch-then-confetti, fallback when user.id is undefined
   - `tour/StartTour.tsx` (no test)
   - `ui/alert-dialog.tsx`, `ui/alert.tsx`, `ui/avatar.tsx`, `ui/badge.tsx`, `ui/button.tsx`, `ui/calendar-heatmap.tsx` — shadcn primitives, no tests
3. **Behavior worth testing (representative, not exhaustive)**:
   - `leaderboard.tsx`: `getInitials` with empty string, single name, multi-word name; rank `0` and `>3` rendering
   - `my-classes.tsx`: filter classrooms by googleClassroomId, `handleImportCourses` success/error, OAuth redirect round-trip
   - `my-students.tsx`: `handleResetProgress` body shape, `router.refresh()` interaction with local `students` state
   - `print-article.tsx`: `fetchMAQResults` reads `data.results` not `data.result`; `saqQuestions` rendered as text throws; `targetLanguage` mapping for `cn`/`tw`
   - `remove-student-inclass.tsx`: success toast on `!response.ok` (vacuous-pass) — current bug
   - `reports.tsx`: classroomId extraction from pathname segments; double-fetch on class change; `isOwner` drift
   - `sidebar-teacher-nav.tsx`: locale-less path handling; `Icons[undefined]` crash; `key={index}` reconciliation
   - `stories-assign-dialog.tsx`: clipboard rejection; `userId` unused prop
   - `unenroll-classes.tsx`: `params.studentId` dep array missing; optimistic local state mutation
   - `theme-customizer.tsx`: outer `mounted` unused
   - `theme-warpper.tsx`: `bg-foreground/0` no-op
   - `tour/CustomCard.tsx`: `user?.id` undefined handling; `router.push("/")` locale-less
   - `tour/StartTour.tsx`: `BookOpen` dead import; `"Start the tour 1"` leftover
   - `ui/alert-dialog.tsx`: forwardRef on header/footer missing
   - `ui/alert.tsx`: `AlertTitle` ref type `<HTMLParagraphElement>` vs `<h5>`
   - `ui/badge.tsx`: `Badge` not forwardRef
   - `ui/calendar-heatmap.tsx`: `useModifers` typo; `weightedDates` mutation in place; empty `weightedDates` crash
4. **No test execution was attempted**. The docblock on `calendar.test.tsx` notes that running the full reading-advantage Jest suite hangs on the CI hardware, so tests are invoked focused. We did not run `pnpm` in this review.

---

## Files Not Fully Reviewed

**None.** All 20 files in the batch were read in their entirety. Cross-file references in `types/index.d.ts`, `store/classroom-store.ts`, `models/article-model.ts`, `locales/en.ts`, `components/icons.tsx`, `hooks/use-config.ts`, and `ui/calendar.tsx` were also read to verify contract alignment (none of those files were edited).

---

## Recommendations (focused, no broad refactor)

These are observations only — no code was changed.

1. **Remove the dead `"use client"`-missing directive in `remove-student-inclass.tsx:1`** — the component uses `useState` and `useRouter`, so the directive is required at runtime.
2. **Replace `success-toast-in-finally` with conditional success toast in `remove-student-inclass.tsx:82-90`** — current behavior toasts success even when the unenrollment API rejected the request.
3. **Move `Icons[item.icon as keyof typeof Icons]` behind a runtime guard in `sidebar-teacher-nav.tsx:34`** — `Icons[undefined]` returns undefined and is rendered as a component, which crashes.
4. **Stop concatenating `process.env.NEXT_PUBLIC_BASE_URL` with same-site paths in `my-classes.tsx`, `my-students.tsx`, `reports.tsx`** — pass relative paths to `router.push(...)` and `fetch(...)`.
5. **Replace `as any` casts in `my-classes.tsx:602` and `unenroll-classes.tsx:109`** — extend the store's `Classes` type to include `isOwner?`; remove the unsafe `{} as Student` cast.
6. **Fix the missing `params.studentId` dep in `unenroll-classes.tsx:195-212`** — current effect runs once on mount; route changes do not trigger a refetch.
7. **Fix the `onClick={() => row.toggleSelected}` references in `reports.tsx:120` and `unenroll-classes.tsx:158`** — the handler returns the function reference without invoking.
8. **Internationalize hardcoded English strings across `my-classes.tsx`, `my-students.tsx`, `reports.tsx`, `print-article.tsx`, `stories-assign-dialog.tsx`, `unenroll-classes.tsx`, `tour/CustomCard.tsx`, `tour/StartTour.tsx`, `theme-customizer.tsx`, `leaderboard.tsx`** — they all bypass `useScopedI18n`.
9. **Guard against `user?.id` being undefined in `tour/CustomCard.tsx:36`** — the URL becomes `/api/v1/users/undefined`.
10. **Validate `response.ok` in `print-article.tsx:35-105` fetch handlers** — current code parses error envelopes as data.
11. **Type the five `useState<any[]>([])` slots in `print-article.tsx:16-20`** — question/wordlist shapes are known.
12. **Remove dead imports**: `Checkbox`, `Label`, `RadioGroupItem`, `array` (zod) in `my-classes.tsx`; `lodash.set` in `reports.tsx`; `useEffect` in `print-article.tsx`; `BaseColor`, `Copy`, `Moon`, `Sun` in `theme-customizer.tsx`; `BookOpen` in `tour/StartTour.tsx`; outer `mounted` in `theme-customizer.tsx:22`.
13. **Fix the `student.lenght` typo in `my-classes.tsx:152`** — even though the cell function doesn't use the accessor, the typo is a latent bug if filter wiring is added later.
14. **Replace `useModifers` with `useModifiers` in `calendar-heatmap.tsx:40`** — typo.
15. **Rename `theme-warpper.tsx` to `theme-wrapper.tsx`** — file path typo propagated through all importers.
16. **Add tests for at least `print-article.tsx` (envelope-handling), `remove-student-inclass.tsx` (success-in-finally), `tour/CustomCard.tsx` (user.id undefined), and `sidebar-teacher-nav.tsx` (locale-less paths)** — these are the four highest-risk files in the batch.
17. **Make `AlertTitle` and `AlertDescription` in `ui/alert.tsx` use `<HTMLHeadingElement>` for both the ref type and the rendered tag**, or vice versa — currently mismatched.
18. **Make `ui/badge.tsx`'s `Badge` a `React.forwardRef`** for parity with the rest of the shadcn primitives in the batch.
19. **Remove the in-place `weightedDates.sort(...)` mutation in `ui/calendar-heatmap.tsx:67`** — copy before sort to avoid mutating the caller's array.
20. **Fix `print-article.tsx:209` and `stories-assign-dialog.tsx:17` to use the storage adapter / locale-aware URL helpers** — current URLs are provider/locale-hardcoded.

---

*End of line-review report for batch 33.*

MEASURE_AGENT_RESULT