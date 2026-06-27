# Line-by-Line Review: Reading Advantage — Batch 35

**Track ID:** `reading_advantage_full_review_20260626`
**Batch ID:** `ra-batch-35`
**Baseline SHA:** `e4834085a2b1d9bab0e7be217d37b29b817c6da1`
**Current HEAD:** `e4834085a2b1d9bab0e7be217d37b29b817c6da1`
**Review Date:** 2026-06-27
**Reviewer Role:** A — correctness / architecture / anti-patterns

---

## Scope

All 20 files listed in the batch were reviewed in full, line by line.

| # | File | Lines Reviewed |
|---|------|----------------|
| 1 | `apps/reading-advantage/components/ui/select.tsx` | 1–164 |
| 2 | `apps/reading-advantage/components/ui/separator.tsx` | 1–31 |
| 3 | `apps/reading-advantage/components/ui/skeleton.tsx` | 1–15 |
| 4 | `apps/reading-advantage/components/ui/slider.tsx` | 1–28 |
| 5 | `apps/reading-advantage/components/ui/table.tsx` | 1–117 |
| 6 | `apps/reading-advantage/components/ui/tabs.tsx` | 1–55 |
| 7 | `apps/reading-advantage/components/ui/textarea.tsx` | 1–24 |
| 8 | `apps/reading-advantage/components/ui/toast.tsx` | 1–127 |
| 9 | `apps/reading-advantage/components/ui/toaster.tsx` | 1–111 |
| 10 | `apps/reading-advantage/components/ui/tooltip.tsx` | 1–30 |
| 11 | `apps/reading-advantage/components/ui/use-toast.ts` | 1–193 |
| 12 | `apps/reading-advantage/components/update-user-license.tsx` | 1–130 |
| 13 | `apps/reading-advantage/components/user-account-nav.tsx` | 1–165 |
| 14 | `apps/reading-advantage/components/user-avatar.tsx` | 1–22 |
| 15 | `apps/reading-advantage/components/user-reset-pass-form.tsx` | 1–109 |
| 16 | `apps/reading-advantage/components/user-role-management.tsx` | 1–589 |
| 17 | `apps/reading-advantage/components/user-signin-form.tsx` | 1–97 |
| 18 | `apps/reading-advantage/components/vocabulary/flash-card-vocabulary-practice-button.tsx` | 1–149 |
| 19 | `apps/reading-advantage/components/vocabulary/tab-flash-card.tsx` | 1–318 |
| 20 | `apps/reading-advantage/components/vocabulary/tab-manage.tsx` | 1–403 |

**Total lines reviewed:** 2,998
**No file was partially reviewed.**

This batch is a mix of three surfaces:

- **shadcn/ui primitive wrappers** (`select`, `separator`, `skeleton`, `slider`, `table`, `tabs`, `textarea`, `toast`, `toaster`, `tooltip`, `use-toast`) — mostly thin Radix wrappers, but `toaster.tsx` and `use-toast.ts` carry significant non-trivial logic.
- **User/account forms** (`update-user-license`, `user-account-nav`, `user-avatar`, `user-reset-pass-form`, `user-role-management`, `user-signin-form`) — forms, dropdowns, and TanStack Table admin pages.
- **Vocabulary practice** (`flash-card-vocabulary-practice-button`, `tab-flash-card`, `tab-manage`) — FSRS-based flashcard review/save with direct `fetch` to internal API routes.

---

## Executive Summary

The most severe issues in this batch are concentrated in the shadcn toast plumbing and the vocabulary/role-management client code, both of which bypass the application's contract system, perform direct `fetch` calls, and contain race conditions or type-safety holes that would cause user-visible breakage.

Headline findings:

1. **`use-toast.ts:184` `useEffect(…, [state])` re-subscribes on every toast change** — the dependency array includes `state`, so each `dispatch` (which calls `setState` in every subscribed listener) re-runs the effect, removing and re-adding the listener. With `TOAST_LIMIT=1` the visible behavior is rarely seen, but the effect is wrong; standard shadcn ships this with `[]`.
2. **`use-toast.ts:9–10` `TOAST_REMOVE_DELAY = 1000000` (1,000,000 ms ≈ 16 minutes)** — closed toasts linger in state for ~16 minutes before removal. Stale toast records will still appear in the `toasts` array whenever the limit is one, which is a real bug.
3. **`toaster.tsx:34` `getRandomImage` is computed on every render** — `Math.floor(Math.random() * imgArray.length)` runs every render, so the random image changes on each re-render of the Toaster, but the `<Image src={getRandomImage} />` (line 62) only renders inside the toast slot that contains `imgSrc`, so this is mostly cosmetic. Still, the calculation belongs in `useMemo` or in the toast payload itself.
4. **`toaster.tsx:48` `imgSrc == true` loose comparison** — comparing an arbitrary prop to `true` with `==`. The prop is typed `React.ReactNode`. The truthiness check works for nodes but `== true` will only be true for the literal boolean `true`. Most call sites pass `imgSrc: true` (e.g., `tab-flash-card.tsx:147`) so it works there, but is fragile and contradicts the type.
5. **`toaster.tsx:69–82` parses the description string by `startsWith("Congratulations")` and `indexOf(",")`** — UI logic hard-coupled to a localization key prefix. If the locale translator changes "Congratulations" the XP toast loses its bold/centered styling. This is a strong coupling between copy and styling.
6. **`user-account-nav.tsx:113–133` compares `user.role` (string) directly to `Role.TEACHER` (`"TEACHER"`)** — but at line 58 the same `user.role` is lowercased (`user.role || "").toLowerCase()`). If the database stores lowercase role strings, every `user.role === Role.X` check returns false, and the teacher/admin/system menu items never render.
7. **`user-account-nav.tsx:36–48` `useEffect` recomputes `daysLeft` from `currentDate`/`expirationDate` with `[currentDate, expirationDate]` deps** — `currentDate` is created in the render body (`new Date()` at line 37), so it is a fresh reference every render, causing the effect to re-run on every render. This computes the same value repeatedly.
8. **`user-account-nav.tsx:38` `new Date(user.expired_date || 0)` creates `Date(0)` = 1970-01-01** — when `expired_date` is undefined the comparison yields a giant negative number of days left. The current `daysLeft > 0 ? … : …` ternary happens to render the "expires" badge, but the dependency array still pins `expirationDate` to a value that drifts on every render in concert with `currentDate`.
9. **`user-role-management.tsx:113` `Payment` row interface declares `licenseId: string` but the column accesses `row.original.school_name`** — the row type union `Payment & { school_name: string }` is fine, but the column `accessorKey: "school_name"` (line 239) is at odds with the original `Payment.licenseId` data: the `mergedUserData` memo (line 335) adds `school_name` by looking up `schoolList` by `licenseId`, which is brittle — if `licenseId` is missing or a school is removed, the lookup yields `"-"` and there is no validation that the underlying `licenseId` actually maps.
10. **`user-role-management.tsx:121–159` `handleEditSubmit` PATCHes `/api/v1/users/${currentPayment?.id}` but does not check `response.ok` until after a `throw`** — line 134–136 does check, but the read of `currentPayment?.id` is unguarded: if a user closes the dialog then `setCurrentPayment(undefined)` is never called so the value persists, but on first render `currentPayment` is undefined and the URL becomes `/api/v1/users/undefined`. The button is gated by the dialog so this is not reachable in practice, but the unguarded path is fragile.
11. **`user-role-management.tsx:161–200` `handleAddSubmit` uses two `if` statements with non-overlapping HTTP statuses and **no `else`** — both `if (response.status === 404)` and `if (response.status === 200)` fire if a status is neither 404 nor 200, neither fires, but more importantly the function always calls `router.refresh()` in `finally` and never closes the dialog. The "Add User" dialog stays open after a successful add, so users can re-submit the same email.
12. **`user-role-management.tsx:516, 562` `role.map((role, index) => <SelectItem key={index} value={role.value}>` uses `key={index}`** — same anti-pattern flagged in earlier batches. The `schoolList.map((school) => <SelectItem key={school.id} …)` (line 564) does it correctly.
13. **`user-role-management.tsx:104–113` `useEffect` depends on `[dropdownOpen]` to set a 300 ms `isDisabled` flag** — magic 300 ms delay without comment or constant. The intent (prevent Radix from swallowing the click after Radix close animation) is undocumented; the constant 300 ms is the default Radix animation duration, so this couples to Radix internals without naming it.
14. **`user-role-management.tsx:497–501` `<AlertDialog open={isEditDialogOpen} onOpenChange={() => setIsEditDialogOpen(!isEditDialogOpen)}>`** — toggling `isEditDialogOpen` on open/close works for the user-facing button, but the same `<AlertDialogTrigger asChild></AlertDialogTrigger>` (line 501) is an empty element. The trigger does nothing — there is no child to act as the trigger button. The dialog is opened only via the dropdown row, never via the trigger, so the empty trigger is dead code.
15. **`user-role-management.tsx:433–494` "Add User" AlertDialog is inside a `flex-1 text-sm text-muted-foreground` wrapper with `licenseId !== "all"` guard** — when `licenseId === "all"`, no Add User button shows, but the layout still renders the wrapper div which leaves an empty `flex-1` cell. Visual artifact.
16. **`update-user-license.tsx:44` `const date = new Date(expired);`** with `expired: string` typed at line 33 — no try/catch. An invalid date string produces an `Invalid Date` whose `toUTCString()` returns `"Invalid Date"`. The displayed "Current License" then reads "Current License: Invalid Date".
17. **`update-user-license.tsx:96` `<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2 mb-3">`** — `mb-3` adds bottom margin to every form render. Inline styling anti-pattern; should be controlled by the parent layout.
18. **`update-user-license.tsx:113–117` "Current License: <date>" displays `date.toUTCString()`** — label says "Current License" but value is a date. Either the label is wrong (should be "Current Expiration") or the value should be a license string. Confusing copy.
19. **`update-user-license.tsx:23` `z.string().uuid({ message: "Invalid UUID format" })`** — accepts only UUIDs but the placeholder says `"update license"` and the toast on success says "The user license has been updated to <uuid>". The license key is being treated as a UUID; if the license key is in fact a short alphanumeric code (typical for license keys) the form will reject it.
20. **`user-signin-form.tsx:27` `window.location.href = "/"`** — full page reload instead of `router.push("/")`. Same anti-pattern as flagged in batch 31's `student-assignment-dashboard.tsx`. Loses client state, defeats Next.js client routing.
21. **`user-signin-form.tsx:43–53` `id="username"` with `placeholder={t('pages.signInForm.emailPlaceholder')}`** — the field is named `username` (HTML `id`/`autoComplete`) but the placeholder text and `autoComplete="username"` are mixed. The placeholder references `emailPlaceholder` (suggesting email). The form accepts `username`, but the i18n key path implies email. Confusing key/value mapping.
22. **`user-signin-form.tsx:45, 62, 85, 91` i18n keys reference `pages.signInForm.*` but the file is a generic `UserSignInForm`** — assumes the page-level i18n namespace exists. If `pages.signInForm.*` is missing in some locale JSONs, the form falls back to the key itself as the visible text.
23. **`user-reset-pass-form.tsx:21–24` `target.email.value` direct DOM access** — the form uses uncontrolled inputs (no `value`/`onChange`), so resetting the form mid-flight cannot be done without re-mounting. This matches the codebase style but does not match the controlled-input `user-signin-form.tsx`.
24. **`user-reset-pass-form.tsx:34` `data?.message || "Something went wrong"`** — uses i18n-less English fallback string for the error. The success view at line 102–103 is also hardcoded English.
25. **`user-reset-pass-form.tsx:86–100` Inline SVG `<svg>` for the success checkmark** — a 15-line SVG literal hardcoded with stroke color `#73f79c`. Could use `lucide-react` `ShieldCheck` (already a dependency, used elsewhere via `Icons`). Inline SVG duplicates styling.
26. **`user-reset-pass-form.tsx:101–104` Success copy hardcoded "The email has been sent!. Please check your email to reset your password."** — typo: "sent!." with both punctuation marks. Untranslated English. Both literal title and body should use i18n keys.
27. **`user-reset-pass-form.tsx:10` `UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement>`** — same dead prop type as in `user-signin-form.tsx:13`. The component accepts and spreads these props but does not document a use case.
28. **`user-avatar.tsx:6–8` `interface UserAvatarProps extends AvatarProps { user: … }`** — the same pattern is duplicated in `user-account-nav.tsx:19–29`. There is no shared `UserAvatarUser` type.
29. **`user-avatar.tsx:14` `referrerPolicy="no-referrer"` on `<AvatarImage>`** — correct privacy pattern, but the prop is the bare string `"no-referrer"` instead of the typed enum from React. Minor.
30. **`user-avatar.tsx:17` `<span className="sr-only">{user.name}</span>`** — exposes user.name to assistive tech but not to image alt text. If `user.image` is set, the `AvatarImage` gets `alt="Picture"` (line 14). The success view (line 102) is fine; the failure view alt is generic. Alt text should use `user.name`.
31. **`tab-flash-card.tsx:11` `import { filter, method } from "lodash";`** — `method` from lodash is imported but never called as a function. The literal `method: "POST"` and `method: "DELETE"` (lines 119, 130, 191) are object property shorthand for `fetch`, not lodash `method`. Dead import.
32. **`tab-flash-card.tsx:10` `import { date_scheduler, State } from "ts-fsrs";`** — `date_scheduler` is imported but never referenced. `State` is used as a type in the `Word` declaration (line 48). Dead import.
33. **`tab-flash-card.tsx:81` `const currentCardFlipRef = useRef<any>(null);`** — initialized to `null`. Passed to `<FlashcardArray currentCardFlipRef={currentCardFlipRef} />` (line 249). Then wrapped at line 278 as `currentCard={() => currentCardFlipRef.current()}` — calls `.current()` directly. If the ref is still `null` when the user clicks "Flip" before `FlashcardArray` has filled it, this throws `TypeError: currentCardFlipRef.current is not a function`. The component never null-checks.
34. **`tab-flash-card.tsx:80` `const controlRef = useRef<any>({});`** — initialized to `{}`. Same null-handling concern: line 285 calls `controlRef.current.nextCard()`. If `FlashcardArray` has not yet populated `nextCard`, this throws `TypeError: … is not a function`.
35. **`tab-flash-card.tsx:93–100` `data?.word.filter(...).sort(...)`** — assumes `data.word` is an array; if the API returns `{ message: "Unauthorized" }` (401 envelope), `data.word` is undefined and the call throws `Cannot read properties of undefined (reading 'filter')`. There is no `Array.isArray` guard.
36. **`tab-flash-card.tsx:107` `filter(data.sentences, ...)`** — `data.sentences` may also be undefined on 401. Same issue. The lodash `filter` returns `[]` for undefined inputs, but the implicit `state === 0 || state === 3` predicate at line 110 will throw if `param` is null/undefined.
37. **`tab-flash-card.tsx:113–158` loop calls two `fetch` requests serially (`await fetch(...)`, then `await fetch(...)`)** — sequential awaits. On N cards this is 2N round trips; could be `Promise.all` or batched.
38. **`tab-flash-card.tsx:115` `if (!filterDataUpdateScore[i]?.update_score)`** — re-checks the same condition that filtered the array at line 110–114. Either the predicate is incomplete (filter logic wrong) or this guard is redundant. Both call the same backend endpoint and may double-write.
39. **`tab-flash-card.tsx:144` `if (updateScrore?.status === 200)`** — assumes POST returns 200; the `tab-manage.tsx:150` equivalent uses `=== 201`. Inconsistent acceptance criteria for the same backend endpoint. If the backend returns 201, this branch silently never toasts.
40. **`tab-flash-card.tsx:156` `console.error(`Failed to update data`)`** — backtick-wrapped literal without an interpolation. The template literal is harmless but signals confusion (the developer probably meant to interpolate `error`).
41. **`tab-flash-card.tsx:199` `if (resData.status === 200)`** — assumes the API envelope includes `status`; on 500 or non-2xx with `{ message: "…" }` envelope, `resData.status === 200` is false and the toast is destructive, but the local state `words` is not updated, leaving a stale row that the user can re-attempt.
42. **`tab-flash-card.tsx:225–228` `useEffect(() => { getUserSentenceSaved(); }, []);`** — `getUserSentenceSaved` is a function declared in render scope and is captured by the empty-deps effect, so the linter would warn (already suppressed by `/* eslint-disable react-hooks/exhaustive-deps */` at line 1). The function reads `userId`, `t`, `tUpdateScore`, `router`, `setShowButton`, `setWords` from closure; `userId` and `tUpdateScore` are stable enough to be safe but `setShowButton` is a `Function` prop typed at line 35 — caller may pass a new function each render, breaking the stale-closure contract.
43. **`tab-flash-card.tsx:268–271` `audioUrl = data.word.audioUrl ? data.word.audioUrl : \`https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_WORDS_URL}/${data.articleId}.mp3\``** — provider-specific hardcoded URL (Google Cloud Storage). Same anti-pattern flagged in earlier batches. Violates AGENTS.md provider-neutrality.
44. **`tab-flash-card.tsx:261` `key={uuidv4()}`** — keys are recomputed every render via `uuidv4()` because the entire `.map(...)` reruns. This generates a new key per render per row, which causes React to unmount/remount each child every render. Performance bug and potential focus loss. Should use a stable key from `data.id` (which exists on the Word type at line 65).
45. **`tab-flash-card.tsx:267` `key={index}` on `<AudioButton>`** — uses `index` (the outer map index), not the stable id. Same anti-pattern.
46. **`tab-flash-card.tsx:162` `description: "Your word was not saved. Please try again."`** — hardcoded English. The same toast path at line 145–151 uses `tUpdateScore("yourXp", …)` (i18n). Inconsistent.
47. **`tab-flash-card.tsx:165` `variant: "destructive"`** — correct toast variant for the error case, but at line 161 the toast `title` is hardcoded `"Something went wrong."` (English) while line 211 uses `t("toast.error")`. Inconsistent i18n usage on the same component.
48. **`flash-card-vocabulary-practice-button.tsx:39–67` `handleClickFsrs` is async but the click handlers do not `await` it** — the click handlers at lines 83, 96, 109, 122 call `handleClickFsrs(...)` and then `nextCard()` synchronously. The FSRS computation completes before `nextCard()` runs, but the network `fetch` at line 53 is fire-and-forget — no error handling, no toast, no `await`.
49. **`flash-card-vocabulary-practice-button.tsx:41` `const scheduling_cards: any = fnFsrs.repeat(preCard, preCard.due);`** — typed `any`. The actual return type of `fsrs.repeat` is `RecordLogItem` (from ts-fsrs types). Loses type safety.
50. **`flash-card-vocabulary-practice-button.tsx:64` `if (index + 1 === words.length)`** — equality on `words.length`. The component receives `words` as a prop but maintains its own `cards` state initialized from `words` (line 34). If `words` changes upstream (parent re-fetch), `words.length` may grow, but `cards` does not auto-sync. Edge case: `index + 1 === words.length` may never match if the parent updates `words`.
51. **`flash-card-vocabulary-practice-button.tsx:72–75` `words[index].state === 0 || 1 || 2 || 3`** — four magic numbers that should be `State.New`, `State.Learning`, `State.Review`, `State.Relearning`. The `State` enum is not even imported in this file; only `Rating` and `FSRS` from `ts-fsrs`.
52. **`flash-card-vocabulary-practice-button.tsx:11, 14` `nextCard: Function; setShowButton: Function;`** — using the bare `Function` type disables parameter/return-type checking. Should be specific signatures.
53. **`tab-manage.tsx:138` `activityType: "vocabulary_flashcards"`** — literal string instead of `ActivityType.VOCABULARY_FLASHCARDS`. The string value happens to match but the codebase has both `ActivityType` enums in `lib/enums.ts` (line 21) and `components/models/user-activity-log-model.ts` (line 51) with slightly different naming (`VOCABULARY_FLASHCARDS` vs `VocabularyFlashcards`). Two parallel enum definitions for the same concept.
54. **`tab-manage.tsx:139` `activityStatus: "completed"`** — same as #53: should be `ActivityStatus.Completed`. `ActivityStatus` is not imported in `tab-manage.tsx` while it is imported in `tab-flash-card.tsx:23`. Inconsistent.
55. **`tab-manage.tsx:86` `(vocabulary: any) => {`** — entire mapper typed `any`. Loses all type safety on the response shape.
56. **`tab-manage.tsx:91` `createdAtString: formatDateFromTimestamp(vocabulary.createdAt),`** — `formatDateFromTimestamp` is declared at line 170 with parameter `timestamp: any`, which returns `""` or `"Invalid Date"` for unrecognized input. No way to distinguish "empty" from "invalid" downstream.
57. **`tab-manage.tsx:96–101` `definition: definition.th || definition.en || … || "No definition"`** — silent fallback to `"No definition"`. The user sees "No definition" for a vocabulary that may simply lack a translation; the toast should distinguish "missing translation" from "missing word entry".
58. **`tab-manage.tsx:108–115` `filter(data.vocabularies, ...)`** — if the API returns `{ message: "Unauthorized" }` and `data.vocabularies` is undefined, `filter` runs but `data.vocabularies` being undefined would crash on the call site. Wait, line 81–84 actually guards against that case (`Array.isArray(data.vocabularies)`) — good.
59. **`tab-manage.tsx:120` `if (!filterDataUpdateScore[i]?.update_score)`** — same redundant guard as #38 in `tab-flash-card.tsx`.
60. **`tab-manage.tsx:150` `if (updateScrore?.status === 201)`** — see #39: inconsistent with `tab-flash-card.tsx:144` which expects 200.
61. **`tab-manage.tsx:184` `console.error("Invalid date string:", timestamp);`** — good, this one properly uses the value. Compare with #40.
62. **`tab-manage.tsx:271–273` `handleNavigateToArticle(articleId)` uses `router.push(\`/student/read/${articleId}\`)`** — the same articleId routing pattern; verify the route exists. The `user-assignment-dashboard.tsx` batch 31 used `/student/lesson/${articleId}`. Two different URL patterns for the same conceptual action.
63. **`tab-manage.tsx:316–322` ternary `vocabularies?.length === 0 ? t("noSavedVocabulary") : t("savedVocabularyDescription", { total: … })`** — uses i18n correctly here.
64. **`tab-manage.tsx:327` `placeholder={"Search..."}`** — hardcoded English placeholder. Other search inputs in the batch use i18n keys.
65. **`tab-manage.tsx:375` `No results` text** — hardcoded English "Empty". Should be i18n.
66. **`tab-manage.tsx:389, 397` "Previous" / "Next" buttons** — hardcoded English. The batch 31 `user-role-management.tsx:483, 491` (same file pattern, this batch) also has hardcoded English "Previous"/"Next" — consistent at least.
67. **`select.tsx` is a verbatim shadcn/ui primitive** — no app-specific changes. As with `separator`, `skeleton`, `slider`, `table`, `tabs`, `textarea`, `toast`, `tooltip`, this file is upstream copy-paste. Any future upstream fix needs to be re-applied here. The codebase appears to ship its own copies of shadcn primitives rather than depend on the upstream package.
68. **`table.tsx:39–48` `TableFooter` uses `bg-primary text-primary-foreground` background** — high-contrast primary background, which is a custom choice not in the shadcn default (shadcn uses `bg-muted/50 font-medium`). This may be intentional but should be documented.
69. **`tabs.tsx:30` trailing space after `ref={ref}`** — cosmetic, no functional impact.
70. **`slider.tsx:8–25` Slider primitive only renders a single Thumb** — Radix Slider supports multi-thumb arrays via `<SliderPrimitive.Thumb />` children. If a caller wants a range slider with two thumbs they cannot use this primitive. This is a single-thumb only primitive.
71. **`skeleton.tsx:3` `function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>)`** — does not use `React.forwardRef`, so a ref cannot be forwarded. Most shadcn primitives accept a ref.
72. **`toast.tsx:25–39` `toastVariants` cva** — defines `default` and `destructive` variants but `Toaster` uses `imgSrc` as a boolean to switch layouts (see #4). `imgSrc` is not a `VariantProps` member.
73. **`toast.tsx:81` `toast-close=""` on `<ToastPrimitives.Close>`** — empty string attribute used as a data-attribute selector hook (CSS `[data-toast-close]` style selectors would not work; it relies on the literal string `"toast-close"`). This is the upstream shadcn pattern but undocumented.
74. **`toast.tsx:115` `type ToastActionElement = React.ReactElement<typeof ToastAction>`** — only `ToastAction` is exported as an action element type; if callers want to embed an arbitrary `<Button>` as the toast action they must wrap it in `ToastAction`. Brittle.
75. **`toaster.tsx:2` `import { useState, useEffect } from "react";`** — neither `useState` nor `useEffect` is used in the file. Dead imports.
76. **`toaster.tsx:13–19` seven `import` statements pulling SVG/WebP from `../../public/`** — relative path `../../public/` from `components/ui/toaster.tsx` resolves to `apps/reading-advantage/public/`. Verified these files exist. However, the random selection picks one image for **all** toasts on the page for that render, so if two `imgSrc: true` toasts are queued, both show the same image. `getRandomImage` is captured in closure once per render of the outer Toaster, so the image is stable across that render but re-randomized on next dispatch.
77. **`use-toast.ts:9–10` magic numbers `TOAST_LIMIT = 1` and `TOAST_REMOVE_DELAY = 1000000`** — `1` means only one toast can be visible at a time, which is also the upstream shadcn default. The `1000000` ms delay is the upstream default; in this codebase there is no reason to deviate but the value is so large it almost certainly is a bug-or-default placeholder.
78. **`use-toast.ts:60–74` `addToRemoveQueue` uses a `Map` but no `.delete(toastId)` cleanup if the toast is manually removed via `REMOVE_TOAST` action before the timeout** — the timeout still fires and dispatches `REMOVE_TOAST` for an already-removed toast. The reducer handles this gracefully (`filter` returns the same array) but the dispatch path is wasteful.
79. **`use-toast.ts:160–162` `onOpenChange: (open) => { if (!open) dismiss(); }`** — when the user clicks the close button on the toast, Radix fires `onOpenChange(false)`, which calls `dismiss()`, which dispatches `DISMISS_TOAST`, which calls `addToRemoveQueue`. Then the timeout schedules a `REMOVE_TOAST` 16 minutes later. The toast visually disappears in ~100 ms (the swipe animation) but the state entry lingers. With `TOAST_LIMIT=1`, this means a dismissed toast will block the next toast for up to 16 minutes if `state.toasts.length` is checked rather than the `open` flag.
80. **`user-account-nav.tsx:50–56` `roles` object declared inside the component** — recreated every render. The `label` field is unused (only `color` is consumed on line 82). Dead field.
81. **`user-account-nav.tsx:51–55` hardcoded color hex strings `bg-[#FFC107]` etc.** — inline arbitrary-value Tailwind classes for colors. These break the theme system; should use semantic tokens like `bg-amber-500` / `bg-red-500` / `bg-blue-500` / `bg-green-500`.
82. **`user-account-nav.tsx:62` `<div id="onborda-usermanu">`** — hardcoded id likely consumed by the Onborda product-tour library. The `id` should be a prop or at least documented as a tour hook; otherwise renaming or removing it silently breaks the tour.
83. **`user-account-nav.tsx:101` `user.cefrLevel !== "" ? … : …`** — checks the empty string but the type declares `cefrLevel?: string` (line 26). If `cefrLevel` is `undefined`, `undefined !== ""` is true, so the student is routed to `/student/read` even without a level. If `cefrLevel` is missing entirely the student should arguably be routed to `/level` first. The current logic routes any non-empty-string (including `undefined`) to the reading page.
84. **`user-account-nav.tsx:34` `const { logout } = useAuth();`** — only `logout` is consumed. `isLoading` is also destructured at line 35 (`useState`, separate from `isLoading` at line 156). Variable shadowing risk.
85. **`user-account-nav.tsx:147–160` `onClick={async (event) => { event.preventDefault(); setIsLoading(true); await logout(); setIsLoading(false); }}`** — `setIsLoading(false)` is called even if `logout` throws. The `await` rejects but there's no `catch`/`finally`. The state will not reflect "loading" if logout throws. Use `try/finally` or `await logout().finally(() => setIsLoading(false))`.
86. **`user-role-management.tsx:56` `import type { User } from "@/types";`** — dead import. `User` is never used as a type in the file (the local types `School`, `Payment` are declared inline).
87. **`user-role-management.tsx:67–73` `export type Payment = { id, name, email, role, licenseId }`** — the `Payment` type is a poor name; the rows are users with an associated license. `UserWithLicense` would be clearer. The export makes this type part of the public surface of the component.
88. **`user-role-management.tsx:122–159` `handleEditSubmit` reads `currentPayment?.id` four times** — a single local `const userId = currentPayment?.id;` would be clearer and would short-circuit the URL.
89. **`user-role-management.tsx:163–199` `handleAddSubmit` builds URL from `process.env.NEXT_PUBLIC_BASE_URL` (which may be undefined at build time)** — fallback missing. If `NEXT_PUBLIC_BASE_URL` is not set, the URL becomes `"undefined/api/v1/users"`. `user-account-nav.tsx` does not use this env var; `user-role-management.tsx` uses it in three places (lines 124, 164, 292). Inconsistent env-var usage across the same admin surface.
90. **`user-role-management.tsx:175` `const data = await response.json();`** — typed implicitly. Should be `const data = await response.json() as AddUserResponse;` where the type is in a contracts package.
91. **`user-role-management.tsx:177` `if (response.status === 404) { … }`** — narrow status check; `400`, `401`, `403`, `409`, `500` produce no toast. The catch-all at line 191 only fires on thrown errors (network failure); status `409 Conflict` (e.g., email already exists) silently does nothing.
92. **`user-role-management.tsx:185–190` `if (response.status === 200)`** — same narrow check. The success toast is shown but the dialog is **not closed** (the dialog is rendered at lines 433–494 and is not bound to a state, only to `<AlertDialog>` which is always open because the only trigger is the trigger button at line 437). The "Add User" dialog stays open after a successful add because there is no `open` prop or `onOpenChange`.
93. **`user-role-management.tsx:198` `router.refresh()` in `finally`** — refreshes the route on both success and error. Combined with #91, a 500 error refreshes the page after toasting the error, possibly clearing form state.
94. **`user-role-management.tsx:280–333` `handleSchoolChangeSubmit` sends `license_id: selectedSchool`** — but `selectedSchool` is the school id (from `schoolList`, which has `id, schoolName, maxUsers, usedLicenses`). The backend PATCH `/api/v1/users/${id}` with `license_id` is treated as a school id, which conflates two concepts: a license id and a school id. Compare with line 170 `handleAddSubmit` which sends `license_id: licenseId` — same field name, different semantics.
95. **`user-role-management.tsx:301` `throw new Error("Failed to update school.");`** — caught by the surrounding `try/catch` and toasts. The thrown error message is never user-visible.
96. **`user-role-management.tsx:335–343` `mergedUserData` is memoized on `[userData, schoolList]`** — if `userData` is a reference to the same array (e.g., a no-op `setUserData(prevData => prevData)`) the memo still re-runs. Acceptable, but the memo assumes `schoolList` is stable; callers passing a new array literal every render will force the memo to re-run.
97. **`user-role-management.tsx:362–367` `initialState: { pagination: { pageSize: 5 } }`** — magic 5. Should be a constant.
98. **`user-role-management.tsx:384` `<Table className="w-full table-fixed min-w-[800px] min-h-[320px]">`** — `min-h-[320px]` ensures the table is at least 320px tall even when empty. Cosmetic; the empty-state `<TableCell className="h-24 text-center">No results.</TableCell>` already provides height.
99. **`user-role-management.tsx:421–429` empty-state row says `"No results."`** — hardcoded English.
100. **`user-role-management.tsx:441` `<AlertDialogTitle>Add User</AlertDialogTitle>`** — hardcoded English. Same for `"Email"`, `"Role"`, `"Submit"`, `"Cancel"`, `"Change Role"`, `"Select a Role"`, `"Select a School"`, `"Change School"`, `"Please select a school for this user."`, `"User Name"`, `"Email"`, `"Current Role"`, `"School Name"`, `"Actions"`, `"Change Role"`, `"Change School"`, `"Actions"`, `"Search users..."` — all literal English.
101. **`user-role-management.tsx:444–449` `<p>Email</p>` + `<Input>`** — uses a `<p>` as a label, missing `<Label htmlFor>` association. Accessibility regression.
102. **`user-role-management.tsx:528–539` `<AlertDialogCancel className={isDisabled ? "pointer-events-none " : ""}>`** — the 300 ms `isDisabled` debounce exists to keep the cancel/submit buttons from being clicked during Radix's close animation. But the `AlertDialogCancel` is inside an `AlertDialog` whose trigger fires `onOpenChange`, so the dialog is closing. The pointer-events-none pattern works but the trailing space in the className is a typo (`"pointer-events-none "` vs `"pointer-events-none"`). Multiple instances (lines 529, 535, 574, 580).
103. **`user-role-management.tsx:1` `"use client";`** — fine; this is a client component. But the file is 589 lines of client-side logic: column defs, dialog state, fetch handlers, table state. All of this should live in a backend module if any of it maps to a server concern. Pure client display logic is acceptable.
104. **`update-user-license.tsx:1` `"use client";`** — needs to be a client component for `useForm` and `useState`. Correct.
105. **`update-user-license.tsx:33` `expired: string`** — should be `expired?: string` because `user-reset-pass-form.tsx:38` shows that fields may be missing. No null-handling here.
106. **`update-user-license.tsx:46` commented-out `//console.log(form.formState.isValid);`** — leftover debug. Same anti-pattern in `user-account-nav.tsx:42` `// const { update } = useSession();` (commented-out code). Codebase tolerates commented-out lines that should be deleted.
107. **`update-user-license.tsx:60–67` `if (!response.ok)` then toast with `${res.message}`** — `res` may be the parsed error envelope (`{ message: "..." }`) or may be `undefined` if the server returns no body. `res.message` would throw on `undefined.message`. Use `res?.message ?? "Unknown error"`.
108. **`update-user-license.tsx:60` `await response.json()`** — called even when `response.ok === false`. The backend might return HTML error pages on 500 (Next.js default), and `response.json()` would throw. The `try/catch` swallows it but the toast at line 64–67 is never shown because the catch fires instead.
109. **`update-user-license.tsx:75–76` `router.refresh()` on success** — fine, but combined with the toast timing the user sees the toast before the page actually refreshes.
110. **`user-signin-form.tsx:11` `import { useAuth } from "@reading-advantage/auth-client";`** — `@reading-advantage/auth-client` is a package not listed in `apps/reading-advantage/package.json` according to AGENTS.md (the auth-client is a separate package). Verify the dependency is declared.
111. **`user-signin-form.tsx:28–32` `catch (err: unknown) { const message = err instanceof Error ? err.message : "Login failed"; setError(message); }`** — `setError(message)` displays whatever string the auth client throws. If the auth client throws localized messages the user sees them; if it throws raw Error subclasses the user sees "Network request failed" or similar.
112. **`user-signin-form.tsx:45` `placeholder={t('pages.signInForm.emailPlaceholder')}` for a username field** — wrong semantic mapping. The placeholder for a username field should be `usernamePlaceholder`, not `emailPlaceholder`.
113. **`user-reset-pass-form.tsx:12` exports `UserResetPassForm`** — fine, but the component name does not match the file (`user-reset-pass-form.tsx` would conventionally be `UserResetPassForm` — match).
114. **`user-reset-pass-form.tsx:21–23` `(event.target as typeof event.target & { email: { value: string } })`** — TypeScript cast that may lie at runtime. If the user submits by pressing Enter on a non-input element the cast still works, but `target.email` may not exist.
115. **`user-reset-pass-form.tsx:34` `data?.message`** — assumes the API envelope is `{ message: string }`. If the API returns `{ error: { message: "..." } }` or `{ data: { message: "..." } }`, the user sees the generic `"Something went wrong"`.
116. **`user-avatar.tsx:2` `import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"`** — uses the shadcn `avatar` primitive which exists in `components/ui/`. The shadcn `avatar.tsx` was not in this batch (the 11 ui files were select through tooltip), so it was either reviewed in an earlier batch or is unchanged shadcn copy.
117. **`user-avatar.tsx:1` blank first line** — cosmetic; no BOM or other artifact.
118. **`user-avatar.tsx:5` `import { AvatarProps } from "@radix-ui/react-avatar"`** — uses Radix's `AvatarProps` rather than the shadcn re-export. The shadcn wrapper in `components/ui/avatar` may export a different type. Verify.
119. **`user-avatar.tsx:17` `<span className="sr-only">{user.name}</span>`** — if `user.name` is `null` (per `UserAvatarProps`), this renders nothing. Acceptable.
120. **`flash-card-vocabulary-practice-button.tsx:7` `import { Word } from "./tab-flash-card";`** — circular-ish import: this button imports the `Word` type from `tab-flash-card.tsx`. `tab-flash-card.tsx:19` imports this button. The two files share types via this circular import, which can break TypeScript builds with certain bundlers. The `Word` type should live in a shared types file.
121. **`flash-card-vocabulary-practice-button.tsx:34` `const [cards, setCards] = useState<Word[]>(words);`** — initialized from prop but never re-synced. If parent passes new `words`, `cards` stays stale. The local state is mutated at line 44–46 (`newCards[index] = scheduling_cards[rating].card; setCards(newCards);`) but only for the rating flow.
122. **`flash-card-vocabulary-practice-button.tsx:50` `newLogs[index] = scheduling_cards[rating].log;`** — sparse array mutation. `logs` is initialized as `[]` (line 35). After the first click, `logs[0] = …` creates an array of length 1 with index 0 set. If the user clicks "Again" on card 2 (index 1) without ever clicking on card 0, `logs` is `[<empty>, <log>]`. Subsequent `setLogs` calls may have non-contiguous indices.
123. **`flash-card-vocabulary-practice-button.tsx:53–62` fetch URL `\`/api/v1/assistant/ts-fsrs-test/flash-card/${newCards[index].id}\``** — direct API call with no error handling, no `await`, no `res.ok` check. The TS-FSRS test endpoint is named `ts-fsrs-test`; this is presumably a debug/test endpoint being used in production paths. Anti-pattern.
124. **`flash-card-vocabulary-practice-button.tsx:64–66` `if (index + 1 === words.length) { setShowButton(false); }`** — this hides the practice buttons when the last card is reached. The parent (`tab-flash-card.tsx`) then renders the alternative `nextButton` branch at line 131. Logic is correct but the state coupling is implicit: the button decides when to hide itself.
125. **`select.tsx`, `separator.tsx`, `slider.tsx`, `tabs.tsx`, `textarea.tsx`, `tooltip.tsx`** are verbatim shadcn/ui copies** — no app-specific changes. Same applies to `skeleton.tsx` (minimal) and `toast.tsx` (verbatim). The codebase forks shadcn rather than depending on it as a package, which is fine but means future upstream fixes must be back-ported.
126. **`table.tsx:1` no `"use client"` directive** — none of these primitives need it (no hooks). Consistent.
127. **`textarea.tsx:5–6` `export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}`** — empty interface. Could just `extends React.TextareaHTMLAttributes<HTMLTextAreaElement>` directly. The interface exists only to give the type a name for the `React.forwardRef<HTMLTextAreaElement, TextareaProps>` signature. Acceptable pattern.
128. **`toast.tsx:115–116` `type ToastActionElement = React.ReactElement<typeof ToastAction>`** — only one toast action type. If callers want a custom action element they must wrap it in `ToastAction`.
129. **`use-toast.ts:184` `React.useEffect(() => { … }, [state])`** — already called out as #1; the dep `state` causes the listener to be removed and re-added on every dispatch. Standard shadcn ships with `[]`.
130. **`use-toast.ts:135` `function dispatch(action: Action) { memoryState = reducer(memoryState, action); listeners.forEach((listener) => { listener(memoryState); }); }`** — `memoryState` is module-level state. Two React renderers in the same JS context (e.g., SSR hydration + client) share this state. Module-level state in a client component is generally acceptable for toasts but is fragile across concurrent renderers.
131. **`use-toast.ts:174` `const [state, setState] = React.useState<State>(memoryState)`** — the initial state is captured once. After `dispatch` runs and listeners fire, `setState` is called and `state` is updated. Then the component re-renders. The next render re-evaluates `useState<State>(memoryState)` with the initial argument, but `useState`'s initializer only runs once. So `memoryState` here is just the bootstrap value; subsequent state is managed by React. OK.
132. **`use-toast.ts:160–162` `onOpenChange: (open) => { if (!open) dismiss(); }`** — the closure captures `dismiss`, which itself captures `id` from `genId()`. The `dismiss` function is created fresh on every `toast()` call. When Radix calls `onOpenChange`, the latest `dismiss` is invoked. OK.
133. **`use-toast.ts:189` `dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId })`** — the public `dismiss` from `useToast()` does not return anything (no return type annotation). If a caller does `await dismiss(id)` they get `undefined`. Not a bug per se but the API does not signal this.
134. **`toaster.tsx:1` `"use client";`** — required because the `useToast()` hook is used. Correct.
135. **`toaster.tsx:22` `const { toasts } = useToast();`** — only `toasts` is destructured; `toast` and `dismiss` (returned by `useToast`) are not used. The `dismiss` callback would be useful for "swipe to dismiss" wiring. Acceptable omission.
136. **`toaster.tsx:38–45` destructuring `{ id, title, description, action, imgSrc, ...props }`** — pulls `imgSrc` out of the toast props and spreads the rest. The rest contains the `open` and `onOpenChange` props from `use-toast.ts:160–162`. These are forwarded to `<Toast …>` which forwards them to `ToastPrimitives.Root`. So Radix-toast open/close works. OK.
137. **`toaster.tsx:50–58` `imgSrc` ternary `className={\`${imgSrc ? "mb-1 flex justify-center items-center" : ""}\`}`** — `imgSrc` is `React.ReactNode` (from `use-toast.ts:17`). The ternary `imgSrc ? … : ""` is truthy iff `imgSrc` is a non-null/non-undefined node. Boolean `true` works; a JSX element would also be truthy but would also render. Convention is to pass `imgSrc: true` (callers do this at `tab-flash-card.tsx:147`).
138. **`toaster.tsx:65` `alt="XP Box"`** — generic alt text. Should be the localized "XP earned" text or the toast title.
139. **`user-account-nav.tsx:2` `import { useEffect } from "react";`** — used at line 40. OK.
140. **`user-account-nav.tsx:16` `import { useState } from "react";`** — used at line 35. OK.
141. **`user-account-nav.tsx:14` `import { Icons } from "./icons";`** — relative import `./icons` resolves to `apps/reading-advantage/components/icons.tsx`. Verify this exists.
142. **`user-account-nav.tsx:15` `import { Badge } from "./ui/badge";`** — used at lines 82, 86, 90. OK.
143. **`user-account-nav.tsx:17` `import { Role } from "@/lib/enums";`** — used at lines 113–129. OK.
144. **`user-account-nav.tsx:36` `const [daysLeft, setDaysLeft] = useState<number>(0);`** — initial value is 0, but if the user has not yet had the effect run, `daysLeft > 0` is false and the badge is the "expires" badge. Cosmetic but noticeable.
145. **`user-account-nav.tsx:37–38` `const currentDate = new Date(); const expirationDate = new Date(user.expired_date || 0);`** — `currentDate` is recreated every render (line 37), so the effect dep is unstable.
146. **`user-account-nav.tsx:42` `expirationDate.getTime() - currentDate.getTime()`** — integer milliseconds. `Math.ceil(timeDifference / (1000 * 60 * 60 * 24))` rounds toward positive infinity. For `timeDifference = 0` (exactly now) `Math.ceil(0 / 86400000) = 0`. For `-1` (1 ms in the past), `Math.ceil(-1 / 86400000) = 0` (because ceil rounds up toward 0 for negative fractions, actually no — `Math.ceil(-0.0001) = 0`, `Math.ceil(-0.5) = 0`, `Math.ceil(-1) = -1`, `Math.ceil(-86400001) = -2`). So the day count is correct but rounding is subtle.
147. **`user-account-nav.tsx:84–94` daysLeft badge** — uses i18n correctly. OK.
148. **`user-account-nav.tsx:155–159` `{isLoading && <Icons.spinner … />} {t("signOut")}`** — spinner shown during logout. OK.
149. **`user-role-management.tsx:60–65` `interface School { id: string; schoolName: string; maxUsers: number; usedLicenses: number; }`** — declared but the `maxUsers` and `usedLicenses` fields are never read in this file. Dead fields.
150. **`user-role-management.tsx:67–73` `export type Payment`** — exported but no caller in the batch imports it. Likely used in the parent admin page.
151. **`user-role-management.tsx:434–475` Add User button block** — gated on `licenseId !== "all"`. Inside the same `flex items-center justify-end space-x-2 py-4` row, the pagination buttons are right-aligned. With the gate, when `licenseId === "all"` only the pagination buttons render; the `flex-1 text-sm text-muted-foreground` wrapper div still renders but contains nothing (line 475 closes it). Empty div in DOM.
152. **`user-role-management.tsx:444` `<p>Email</p>`** — should be `<Label htmlFor="email-input">Email</Label>` for accessibility.
153. **`user-role-management.tsx:445` `<Input onChange={(e) => setEmail(e.target.value)} placeholder="Enter Email..." />`** — uncontrolled input without `value` and without `id`. Even though there's no explicit `<Label htmlFor>`, the lack of `id` means future accessibility improvements need an id.
154. **`user-role-management.tsx:502` `<AlertDialogContent>` for the edit dialog** — the title is "Change Role" but the body contains only a `<Select>`. The submit button at line 533 calls `handleEditSubmit`, which fires the PATCH.
155. **`user-role-management.tsx:528–539` `<AlertDialogCancel>` + `<AlertDialogAction>` use `pointer-events-none` debounce** — the dialog's `onOpenChange` is bound to `setIsEditDialogOpen(!isEditDialogOpen)` (line 499). When the user clicks Cancel, `onOpenChange(false)` fires, which sets the state to `!true === false`. The next render closes the dialog. The 300 ms `isDisabled` debounce prevents the user from re-opening during Radix's exit animation. Sensible.
156. **`user-role-management.tsx:529–535` debounced button classname `"pointer-events-none "`** — trailing space, repeated four times. Cosmetic.
157. **`update-user-license.tsx:43` `const router = useRouter();`** — used at line 76. OK.
158. **`update-user-license.tsx:42` `//   const { update } = useSession();`** — commented-out code. Should be deleted.
159. **`update-user-license.tsx:46` `//console.log(form.formState.isValid);`** — commented-out debug. Should be deleted.
160. **`update-user-license.tsx:70` `form.reset({ license: data.license });`** — calls `form.reset` after success, but `defaultValues` is `{ license: "" }` (line 39). After reset, the input shows the new license. OK.
161. **`update-user-license.tsx:122` `disabled={isLoading || !form.formState.isValid}`** — button is disabled when form is invalid (e.g., license is empty). The placeholder is "update license" so the field starts empty; the button is disabled until the user types a UUID. OK.
162. **`update-user-license.tsx:124` `<Icons.spinner className="mr-2 h-4 w-4 animate-spin" />`** — spinner shown during submit. OK.
163. **`user-signin-form.tsx:15` `interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement>`** — empty interface. Used at line 15 to type the component props.
164. **`user-signin-form.tsx:29–31` `err instanceof Error ? err.message : "Login failed"`** — good error narrowing, but the `"Login failed"` fallback is English.
165. **`user-signin-form.tsx:73–75` `{error && <div className="text-red-500 text-sm">{error}</div>}`** — error display without i18n.
166. **`user-reset-pass-form.tsx:2` `"use client";`** — needs to be client for fetch. Correct.
167. **`user-reset-pass-form.tsx:35` `data?.message || "Something went wrong"`** — generic English fallback.
168. **`user-reset-pass-form.tsx:38` `setError("Something went wrong")` in catch** — same.
169. **`user-reset-pass-form.tsx:48–50` `<h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>`** — hardcoded English.
170. **`user-reset-pass-form.tsx:52–53` `<p>Enter your email and we'll send you a link to reset your password.</p>`** — hardcoded English.
171. **`user-reset-pass-form.tsx:59` `<Label className="sr-only" htmlFor="email">Email</Label>`** — screen-reader-only label "Email". Accessibility-correct but hardcoded.
172. **`user-reset-pass-form.tsx:64` `placeholder="name@example.com"`** — hardcoded English.
173. **`user-reset-pass-form.tsx:78` `Send Forgot Password Email`** — hardcoded English button text.
174. **`user-reset-pass-form.tsx:102–103` "The email has been sent!. Please check your email to reset your password."** — typo "sent!." with both punctuation marks. Hardcoded English.
175. **`tab-flash-card.tsx:3` `import React, { useEffect, useState, useRef } from "react";`** — `useEffect`, `useState`, `useRef` all used. OK.
176. **`tab-flash-card.tsx:5–8` four dayjs plugin imports** — all extended at lines 28–30. OK.
177. **`tab-flash-card.tsx:9` `import { v4 as uuidv4 } from "uuid";`** — used at line 261 as `key={uuidv4()}`. See #44 for the misuse.
178. **`tab-flash-card.tsx:18` `import { AUDIO_WORDS_URL } from "@/server/constants";`** — imports from `@/server/constants`. Verify the path resolves. This is a constants file shared between client and server.
179. **`tab-flash-card.tsx:25` `import { levelCalculation } from "@/lib/utils";`** — used at line 137. OK.
180. **`tab-flash-card.tsx:31` `dayjs.extend(dayjs_plugin_isSameOrAfter);`** — but the code only uses `dayjs(a.due).isAfter(dayjs(b.due))` at line 99, which is `dayjs().isAfter()`, a built-in method. The plugin is not required. Dead plugin extend.
181. **`tab-flash-card.tsx:75–78` three `useScopedI18n` calls** — `t`, `tUpdateScore`, `tWordList`. All used.
182. **`tab-flash-card.tsx:86` `useCurrentLocale() as "en" | "th" | "cn" | "tw" | "vi"`** — cast loses the actual type. Same anti-pattern flagged in earlier batches.
183. **`tab-flash-card.tsx:88` `try { … } catch (error) { … }`** — the catch at line 160 toasts. The catch swallows non-network errors too. If `res.json()` throws (malformed JSON) the user sees the toast. OK.
184. **`tab-flash-card.tsx:99` `dayjs(a.due).isAfter(dayjs(b.due)) ? 1 : -1`** — sort by due ascending. The predicate is correct.
185. **`tab-flash-card.tsx:107–111` lodash filter callback returns `state === 2 || state === 3`** — magic numbers. Should be `State.Review` (2) and `State.Relearning` (3). The `State` enum is imported but not used.
186. **`tab-flash-card.tsx:109` `const state = param.state || 0;`** — default to 0 if state is falsy. But `param.state` is typed `State` (numeric enum) so it should never be undefined. The default is defensive.
187. **`tab-flash-card.tsx:113` `for (let i = 0; i < filterDataUpdateScore.length; i++)`** — sequential awaits inside a for loop. Should be `Promise.all` or `for await` of with concurrency control.
188. **`tab-flash-card.tsx:127–143` second `fetch` for activity log** — POST to `/api/v1/users/${userId}/activitylog`. The body contains `activityType: ActivityType.VocabularyFlashcards` (string). The backend presumably maps strings to enum values.
189. **`tab-flash-card.tsx:144–153` if `updateScrore.status === 200` toast + router.refresh()** — see #39.
190. **`tab-flash-card.tsx:155–157` `catch (error) { console.error(\`Failed to update data\`); }`** — see #40.
191. **`tab-flash-card.tsx:169–183` `cards` array maps `words` to FlashcardArray shape** — uses `id: index` (line 171) as the flashcard id. The `id` is then used by FlashcardArray internally for keying. Using `index` instead of the word's stable id is a bug: when the user clicks "Next", `setCurrentCardIndex(index)` updates, but FlashcardArray's internal `id` map still uses the index-based id, so card content for the same `index` may swap if the words array is re-ordered.
192. **`tab-flash-card.tsx:185` `handleDelete(id: string | undefined)`** — accepts undefined. Line 301 `onClick={() => handleDelete(data?.id)}` passes possibly undefined. Inside, line 190 fetches `/api/v1/users/wordlist/${id}` which becomes `/api/v1/users/wordlist/undefined`. Backend probably 400s.
193. **`tab-flash-card.tsx:185–224` handleDelete** — does not check `res.ok`. Reads `resData.status` and branches on `=== 200`. Same issue as #41.
194. **`tab-flash-card.tsx:241–250` `<FlashcardArray … controls={false} showCount={false} …/>`** — `controls` and `showCount` are props from `react-quizlet-flashcard`. Setting `controls={false}` disables the library's own navigation controls; the app provides its own. OK.
195. **`tab-flash-card.tsx:251–255` counter `{currentCardIndex + 1} / {cards.length}`** — fine.
196. **`tab-flash-card.tsx:256–312` words.map to render audio/flip/delete buttons** — only renders the card matching `currentCardIndex` (line 257). Other cards are not rendered. OK.
197. **`tab-flash-card.tsx:266` `<AudioButton key={index} …>`** — key uses index. See #45.
198. **`tab-flash-card.tsx:278` `currentCard={() => currentCardFlipRef.current()}`** — see #33.
199. **`tab-flash-card.tsx:281` `words.length != 0 &&`** — `!=` instead of `!==` is loose equality. Same at line 239.
200. **`tab-flash-card.tsx:285` `nextCard={() => controlRef.current.nextCard()}`** — see #34.
201. **`tab-flash-card.tsx:287–288` `showButton={showButton} setShowButton={setShowButton}`** — passed down. OK.
202. **`tab-flash-card.tsx:301` `onClick={() => handleDelete(data?.id)}`** — `data?.id` may be undefined. See #192.
203. **`tab-flash-card.tsx:303` `{tWordList("flashcard.neverPracticeButton")}`** — i18n key, but the button label `"flashcard.neverPracticeButton"` reads "Never Practice" — the button is actually a Delete button. Mismatch between i18n key name and visible behavior.
204. **`tab-manage.tsx:1` `"use client";`** — needs to be client for fetch. Correct.
205. **`tab-manage.tsx:3` `import dayjs from "dayjs";`** — used at line 79. OK.
206. **`tab-manage.tsx:6` `import { formatDate, levelCalculation } from "@/lib/utils";`** — both used (lines 232, 143). OK.
207. **`tab-manage.tsx:34` `import { date_scheduler } from "ts-fsrs";`** — `date_scheduler` is imported but never used. Dead import.
208. **`tab-manage.tsx:35` `import { filter } from "lodash";`** — used at line 108. OK.
209. **`tab-manage.tsx:38–53` `export type Vocabulary`** — exported, but is it imported anywhere outside this file? Same as #150 for `Payment` in `user-role-management.tsx`.
210. **`tab-manage.tsx:55–57` `type Props = { userId: string; }`** — typed. OK.
211. **`tab-manage.tsx:79` `const startOfDay = dayjs().startOf('day').toDate();`** — computed once per `getVocabularyData` call. OK.
212. **`tab-manage.tsx:81–84` guard `if (!data || !data.vocabularies || !Array.isArray(data.vocabularies))`** — good defensive guard.
213. **`tab-manage.tsx:87` `(vocabulary: any) =>`** — see #55.
214. **`tab-manage.tsx:93` `createdAtString: formatDateFromTimestamp(vocabulary.createdAt)`** — `createdAtString` is added as a derived field on the row, then the column uses `accessorKey: "createdAtString"` (line 209). OK.
215. **`tab-manage.tsx:108–115` lodash filter for due cards** — magic numbers `2` and `3`. Should be `State.Review`, `State.Relearning`.
216. **`tab-manage.tsx:117–164` loop with two fetches per item** — same pattern as `tab-flash-card.tsx`. Sequential awaits.
217. **`tab-manage.tsx:120` `if (!filterDataUpdateScore[i]?.update_score)`** — see #38, #59.
218. **`tab-manage.tsx:127` body `{ ...filterDataUpdateScore[i], update_score: true }`** — sends the entire card object with `update_score: true`. Backwards from the server's expected payload (which probably takes only the fields it needs).
219. **`tab-manage.tsx:136` `articleId: filterDataUpdateScore[i]?.articleId,`** — `articleId` may be undefined. The activity log then records an undefined articleId.
220. **`tab-manage.tsx:138–139` hardcoded string activityType / activityStatus** — see #53, #54.
221. **`tab-manage.tsx:150` `updateScrore?.status === 201`** — see #60.
222. **`tab-manage.tsx:170–189` `formatDateFromTimestamp`** — supports both Firestore-style `{ _seconds, _nanoseconds }` and ISO strings. Returns "Invalid Date" for other shapes.
223. **`tab-manage.tsx:191–193` `useEffect(() => { getVocabularyData(); }, [])`** — same exhaustive-deps suppression pattern. OK.
224. **`tab-manage.tsx:195–250` columns definition** — four columns: word (clickable), createdAtString (sortable), due (sortable), delete (button). OK.
225. **`tab-manage.tsx:202` `onClick={() => handleNavigateToArticle(row.original.articleId)}`** — navigates to article. The click target is a `<div>`, not an anchor. Accessibility regression: no keyboard activation, no semantic link.
226. **`tab-manage.tsx:232` `<div>{formatDate(row.getValue("due"))}</div>`** — `row.getValue("due")` returns a Date object. `formatDate` (lib/utils.ts:6) takes a string. Mismatch — `formatDate(new Date())` would format as "Invalid Date" or whatever `formatDate` does with a non-string.
227. **`tab-manage.tsx:243` `<Button … onClick={() => handleDelete(row.original.id)}>`** — passes id. OK.
228. **`tab-manage.tsx:271` `handleNavigateToArticle(articleId: string)`** — accepts string. The `<div onClick>` at line 202 passes `row.original.articleId` which is typed `string` (line 39). OK.
229. **`tab-manage.tsx:275–308` `handleDelete`** — same pattern as `tab-flash-card.tsx`: fetch, branch on `data.status === 200`, no `res.ok` check.
230. **`tab-manage.tsx:284` `if (data.status === 200)`** — same narrow check.
231. **`tab-manage.tsx:301` `console.log(error);`** — log instead of error. Inconsistent with #40 (`console.error`).
232. **`tab-manage.tsx:312–323` Header with conditional text** — i18n used.
233. **`tab-manage.tsx:327` `placeholder={"Search..."}`** — hardcoded English.
234. **`tab-manage.tsx:336–381` table render** — uses shadcn `Table` primitives. Renders empty state at line 370–378.
235. **`tab-manage.tsx:375` `Empty`** — hardcoded English.
236. **`tab-manage.tsx:389, 397` "Previous" / "Next"** — hardcoded English.
237. **`tab-flash-card.tsx:64` `setShowButton(false)`** — see #50.
238. **`flash-card-vocabulary-practice-button.tsx:131–143` `<button onClick={() => { if (index + 1 === words.length) { setShowButton(false); } else { nextCard(); } }}>`** — when `state` is not 0/1/2/3 (e.g., `undefined` or future state values), only a single "Next" button is rendered. This is the "already completed" branch.
239. **`flash-card-vocabulary-practice-button.tsx:145` `<></>`** — empty fragment for the `else` branch of `showButton ? … : (showButton ? … : <></>)`. Redundant nesting.

---

## Findings

### Critical / High

#### H-01 — `use-toast.ts` `useEffect(…, [state])` re-subscribes on every toast change
- **File:** `apps/reading-advantage/components/ui/use-toast.ts`
- **Lines:** 173–184
- **Severity:** High
- **Evidence:**
  - Line 184: `}, [state]);` — the dependency array contains `state`, so every `setState` (which is called by every `dispatch` via the listener) triggers cleanup + re-subscribe.
  - Upstream shadcn ships this hook with `[]` as the dependency array because the effect only needs to register the listener once per component mount.
- **Impact:** The listener is removed and re-added on every toast change. With `TOAST_LIMIT=1` the visible state is rarely affected, but the subscription churn is wasteful and can cause subtle bugs if the listener is concurrently called by dispatch.
- **Fix:** Change the dependency array to `[]`.

#### H-02 — `toaster.tsx` hardcodes `"Congratulations"` string detection for XP toast styling
- **File:** `apps/reading-advantage/components/ui/toaster.tsx`
- **Lines:** 69–82
- **Severity:** High
- **Evidence:**
  - Line 69: `(description as string)?.startsWith("Congratulations")` — branches on the literal English word "Congratulations".
  - Line 77: `Congratulations!` — hardcoded again in the JSX.
  - Line 80: `(description as string).slice((description as string).indexOf(",") + 2)` — splits the description by comma.
- **Impact:** When the locale translator changes "Congratulations" to a localized form (e.g., "ขอแสดงความยินดีด้วย!" for Thai) the bold/centered styling is lost. The styling decision should not depend on the localized copy.
- **Fix:** Add a dedicated prop on the toast (e.g., `variant: "xp-earned"`) or pass the formatted XP text as a structured payload.

#### H-03 — `tab-flash-card.tsx` `currentCardFlipRef.current()` and `controlRef.current.nextCard()` crash when ref is not populated
- **File:** `apps/reading-advantage/components/vocabulary/tab-flash-card.tsx`
- **Lines:** 80–81, 278, 285
- **Severity:** High
- **Evidence:**
  - Line 81: `const currentCardFlipRef = useRef<any>(null);` — initialized to `null`.
  - Line 278: `currentCard={() => currentCardFlipRef.current()}` — invokes `null()` if the ref is not yet populated.
  - Line 80: `const controlRef = useRef<any>({});` — initialized to `{}`, no `nextCard` method.
  - Line 285: `nextCard={() => controlRef.current.nextCard()}` — invokes undefined.
- **Impact:** If the user clicks the flip or next button before `FlashcardArray` has populated the refs (or if the library fails to set them for any reason), the click handler throws.
- **Fix:** Guard with `?.()` and `?.()`, or initialize the ref with a no-op function.

#### H-04 — `tab-flash-card.tsx` assumes `data.word` and `data.sentences` are arrays without validation
- **File:** `apps/reading-advantage/components/vocabulary/tab-flash-card.tsx`
- **Lines:** 93–107
- **Severity:** High
- **Evidence:**
  - Line 89: `const res = await fetch(\`/api/v1/users/wordlist/${userId}\`);`
  - Line 90: `const data = await res.json();` — no `res.ok` check, no shape validation.
  - Line 93: `data?.word.filter(...)` — assumes `data.word` is an array. If 401 returns `{ message: "..." }`, this throws `Cannot read properties of undefined`.
  - Line 107: `filter(data.sentences, ...)` — assumes `data.sentences` is an array. Lodash `filter` handles undefined gracefully (returns `[]`) but the predicate at line 110 dereferences `param.due` and `param.state` on each element.
- **Impact:** Server-side 401/403/500 returns the page to a thrown error path. The destructive toast at line 161–165 is shown but the user has lost their session context.
- **Fix:** Validate with Zod or hand-rolled shape checks; use `Array.isArray(data?.word) ? data.word : []`.

#### H-05 — `tab-flash-card.tsx` and `tab-manage.tsx` use sequential `await fetch` in for-loops
- **File:** `apps/reading-advantage/components/vocabulary/tab-flash-card.tsx` and `tab-manage.tsx`
- **Lines:** `tab-flash-card.tsx:113–158`, `tab-manage.tsx:117–164`
- **Severity:** High
- **Evidence:**
  - `tab-flash-card.tsx:113–158`: for each due card, `await fetch(...)` (FSRS update), then `await fetch(...)` (activity log).
  - `tab-manage.tsx:117–164`: same pattern.
- **Impact:** For N cards, the loop takes 2N sequential round trips. With slow networks this can take 10+ seconds. The user sees no progress indicator.
- **Fix:** Use `Promise.all` with concurrency limit, or batch the activity log writes.

#### H-06 — `tab-flash-card.tsx` `getUserSentenceSaved` not wrapped in `useCallback`, captured by empty-deps `useEffect`
- **File:** `apps/reading-advantage/components/vocabulary/tab-flash-card.tsx`
- **Lines:** 87–167, 226–228
- **Severity:** High
- **Evidence:**
  - Line 1: `/* eslint-disable react-hooks/exhaustive-deps */` — exhaustive-deps rule is disabled.
  - Line 226–228: `useEffect(() => { getUserSentenceSaved(); }, []);` — empty deps.
  - `getUserSentenceSaved` reads `userId`, `t`, `tUpdateScore`, `router`, `setShowButton`, `setWords` from closure. `userId` is a prop and is stable for the lifetime of the component unless the parent re-mounts.
- **Impact:** If the parent re-renders with a new `userId` (e.g., after profile update) the effect does not re-run, leaving stale data.
- **Fix:** Add `userId` to the deps (and remove the eslint-disable), or extract the function into a `useCallback` with explicit deps.

#### H-07 — `user-account-nav.tsx` role comparisons fail when DB stores lowercase role strings
- **File:** `apps/reading-advantage/components/user-account-nav.tsx`
- **Lines:** 23, 58, 113–129
- **Severity:** High
- **Evidence:**
  - Line 23: `role: string;` — typed as plain string.
  - Line 58: `const userRoleLowerCase = (user.role || "").toLowerCase() as keyof typeof roles;` — lowercases the role.
  - Line 113–129: `user.role === Role.TEACHER` — but `Role.TEACHER === "TEACHER"` (uppercase).
  - If the DB stores `"teacher"` (lowercase, per Prisma-style enum-to-string), all comparisons return `false` and the teacher/admin/system menu items are hidden.
- **Impact:** Teachers, admins, and system users do not see their navigation links. Effectively the role-based menu is dead.
- **Fix:** Compare `userRoleLowerCase.toUpperCase() === Role.TEACHER`, or normalize the DB to uppercase, or use `Role.TEACHER.toLowerCase()`.

#### H-08 — `user-account-nav.tsx` `currentDate` recreated every render, causing effect re-run loop
- **File:** `apps/reading-advantage/components/user-account-nav.tsx`
- **Lines:** 37–48
- **Severity:** High
- **Evidence:**
  - Line 37: `const currentDate = new Date();` — created in the render body.
  - Line 48: `}, [currentDate, expirationDate]);` — `currentDate` is a dep.
- **Impact:** Every render creates a new `currentDate` Date instance, which is a new object reference, triggering the effect to re-run on every render. The effect re-computes the same days-left value.
- **Fix:** Use `useState(() => new Date())` for `currentDate`, or move `currentDate` into a ref.

#### H-09 — `user-role-management.tsx` Add User dialog has no `open`/`onOpenChange` binding
- **File:** `apps/reading-advantage/components/user-role-management.tsx`
- **Lines:** 436–473
- **Severity:** High
- **Evidence:**
  - Line 436–473: `<AlertDialog>` is rendered with only a `<AlertDialogTrigger asChild><Button variant="default">Add User</Button></AlertDialogTrigger>`. There is no `open` prop, no `onOpenChange` handler, no controlled-state binding.
  - Line 198: `router.refresh()` in `finally` — refreshes regardless of success/failure.
- **Impact:** After a successful "Add User" the dialog does not close automatically. The user can submit the same email repeatedly until they manually close the dialog.
- **Fix:** Add `open={isAddDialogOpen}` and `onOpenChange={setIsAddDialogOpen}`; close on success.

#### H-10 — `user-role-management.tsx` `handleAddSubmit` swallows 400/401/403/409 with no toast
- **File:** `apps/reading-advantage/components/user-role-management.tsx`
- **Lines:** 161–200
- **Severity:** High
- **Evidence:**
  - Lines 177–183: `if (response.status === 404) { … }` — narrow check.
  - Lines 185–190: `if (response.status === 200) { … }` — narrow check.
  - Lines 191–196: `catch (error) { … }` — only catches thrown errors (network failure), not 4xx/5xx.
- **Impact:** A 409 Conflict (email already exists) silently produces no toast, no dialog close, no user feedback. The same applies to 400 (validation error), 401 (auth), 403 (permission), 500 (server).
- **Fix:** Default to a destructive toast for any `!response.ok`, branching on `response.status` only to customize the message.

#### H-11 — `update-user-license.tsx` UUID-only license validation rejects short license keys
- **File:** `apps/reading-advantage/components/update-user-license.tsx`
- **Lines:** 22–24, 60–82
- **Severity:** High
- **Evidence:**
  - Line 23: `license: z.string().uuid({ message: "Invalid UUID format" })` — only UUIDs accepted.
  - Line 80: `description: \`The user license has been updated to ${data.license}\`` — the visible "license" is whatever was entered.
  - Line 107: `<Input type="text" placeholder="update license" />` — placeholder is generic.
- **Impact:** If the license key format is a short alphanumeric code (e.g., "RA-ABCD-1234") the form will reject the input and the user cannot update.
- **Fix:** Use a more permissive regex (e.g., `/^[A-Z0-9-]{4,}$/`) and validate against the backend's expected format.

#### H-12 — `update-user-license.tsx` `res.message` throws when error response has no body
- **File:** `apps/reading-advantage/components/update-user-license.tsx`
- **Lines:** 60–67
- **Severity:** High
- **Evidence:**
  - Line 60: `const res = await response.json();` — `response.json()` throws on empty body or HTML error pages.
  - Line 65: `description: \`${res.message}\`` — interpolates `res.message`. If `res` is `undefined` (empty body), `${undefined.message}` throws `Cannot read properties of undefined`.
- **Impact:** The error toast is never shown; the user sees an unhandled exception.
- **Fix:** Guard with `res?.message ?? response.statusText ?? "Unknown error"`.

#### H-13 — `tab-flash-card.tsx` and `tab-manage.tsx` POST activity log endpoint, expect different status codes
- **File:** `apps/reading-advantage/components/vocabulary/tab-flash-card.tsx` and `tab-manage.tsx`
- **Lines:** `tab-flash-card.tsx:144`, `tab-manage.tsx:150`
- **Severity:** High
- **Evidence:**
  - `tab-flash-card.tsx:144`: `if (updateScrore?.status === 200)` — accepts 200.
  - `tab-manage.tsx:150`: `if (updateScrore?.status === 201)` — accepts 201.
  - Both POST to `/api/v1/users/${userId}/activitylog` (different `userId` derivations, same endpoint).
- **Impact:** Whichever status the backend returns, one of the two components will not toast on success. The user sees inconsistent feedback between the two screens.
- **Fix:** Check `res.ok` (status 200–299) instead of a specific status code; verify with the backend what the actual status code is and align both.

#### H-14 — `flash-card-vocabulary-practice-button.tsx` posts to `ts-fsrs-test` endpoint in production
- **File:** `apps/reading-advantage/components/vocabulary/flash-card-vocabulary-practice-button.tsx`
- **Lines:** 53–62
- **Severity:** High
- **Evidence:**
  - Line 54: `\`/api/v1/assistant/ts-fsrs-test/flash-card/${newCards[index].id}\`` — URL path contains `ts-fsrs-test`.
  - Line 53: `await fetch(...)` — but no `await` in the caller; the response is dropped.
- **Impact:** A test/debug endpoint named `ts-fsrs-test` is being used as the production FSRS update path. This is a deployment risk and a contract smell.
- **Fix:** Move to the production endpoint `/api/v1/assistant/flash-card/:id` (or whatever the actual production path is); await the response and check `res.ok`.

### Medium

#### M-01 — `tab-flash-card.tsx` hardcodes GCS URL for audio fallback
- **File:** `apps/reading-advantage/components/vocabulary/tab-flash-card.tsx`
- **Lines:** 270
- **Severity:** Medium
- **Evidence:** Line 270: `\`https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/${AUDIO_WORDS_URL}/${data.articleId}.mp3\`` — provider-specific Google Cloud Storage URL.
- **Impact:** Violates provider-neutrality rule in AGENTS.md. If the bucket changes (e.g., migration to R2 or S3) the fallback breaks.
- **Fix:** Route through the shared storage adapter; or build the URL from a single helper that the deployment rewrites.

#### M-02 — `use-toast.ts` `TOAST_REMOVE_DELAY = 1000000` ms (≈16.6 minutes)
- **File:** `apps/reading-advantage/components/ui/use-toast.ts`
- **Lines:** 10, 60–74
- **Severity:** Medium
- **Evidence:** Line 10: `const TOAST_REMOVE_DELAY = 1000000` — 1,000,000 ms.
- **Impact:** A dismissed toast remains in the reducer state for ~16 minutes before `REMOVE_TOAST` fires. With `TOAST_LIMIT=1` this means a dismissed toast blocks the next toast for the same duration.
- **Fix:** Reduce to a few seconds (e.g., 5000).

#### M-03 — `use-toast.ts` toast removal timer is not cancelled on manual `REMOVE_TOAST`
- **File:** `apps/reading-advantage/components/ui/use-toast.ts`
- **Lines:** 60–74, 117–127
- **Severity:** Medium
- **Evidence:** `addToRemoveQueue` registers a `setTimeout` keyed by `toastId`. The reducer's `REMOVE_TOAST` case does not delete the entry from `toastTimeouts`. The timeout still fires and dispatches a redundant `REMOVE_TOAST` for an already-removed toast.
- **Impact:** No visible bug (filter returns the same array) but wasteful dispatch path.
- **Fix:** Cancel the timeout in the `REMOVE_TOAST` reducer case.

#### M-04 — `toaster.tsx` `getRandomImage` recomputed every render
- **File:** `apps/reading-advantage/components/ui/toaster.tsx`
- **Lines:** 24–34
- **Severity:** Medium
- **Evidence:** Line 34: `const getRandomImage = imgArray[Math.floor(Math.random() * imgArray.length)];` — runs every render of the `Toaster` component.
- **Impact:** If the toaster re-renders (e.g., parent state change), the random image changes. Multiple toasts with `imgSrc: true` in the same render get the same image, but across renders the image may change mid-display.
- **Fix:** Compute once per toast id or use `useMemo` keyed on toast id.

#### M-05 — `toaster.tsx` `imgSrc == true` loose comparison
- **File:** `apps/reading-advantage/components/ui/toaster.tsx`
- **Lines:** 48
- **Severity:** Medium
- **Evidence:** Line 48: `{imgSrc == true ? ( … ) : ( … )}` — `== true` is loose comparison. Works for boolean `true` but is fragile for other truthy nodes.
- **Impact:** Convention is to pass `imgSrc: true` so it works today, but the typed `React.ReactNode` invites callers to pass a JSX element which would be truthy but rendered as text.
- **Fix:** Use a strict boolean check `imgSrc === true` or restrict the type to `boolean`.

#### M-06 — `toaster.tsx` unused `useState`/`useEffect` imports
- **File:** `apps/reading-advantage/components/ui/toaster.tsx`
- **Lines:** 2
- **Severity:** Medium
- **Evidence:** Line 2: `import { useState, useEffect } from "react";` — neither is used in the file.
- **Fix:** Remove the unused imports.

#### M-07 — `toaster.tsx` `alt="XP Box"` is generic and untranslated
- **File:** `apps/reading-advantage/components/ui/toaster.tsx`
- **Lines:** 65
- **Severity:** Medium
- **Evidence:** Line 65: `alt="XP Box"` — hardcoded English alt text on the random XP image.
- **Fix:** Pass an `alt` prop from the toast payload or use a localized alt string.

#### M-08 — `tab-flash-card.tsx` `key={uuidv4()}` causes unmount/remount on every render
- **File:** `apps/reading-advantage/components/vocabulary/tab-flash-card.tsx`
- **Lines:** 261
- **Severity:** Medium
- **Evidence:** Line 261: `key={uuidv4()}` — `uuidv4()` returns a new id on every render.
- **Impact:** React unmounts and remounts the inner element every render. Causes focus loss, audio re-load, animation re-trigger.
- **Fix:** Use `data.id` (which exists on `Word`) or a stable key.

#### M-09 — `tab-flash-card.tsx` `AudioButton key={index}`
- **File:** `apps/reading-advantage/components/vocabulary/tab-flash-card.tsx`
- **Lines:** 267
- **Severity:** Medium
- **Evidence:** Line 267: `<AudioButton key={index} …>` — uses the outer map index.
- **Fix:** Use `data.id` or another stable key.

#### M-10 — `user-role-management.tsx` `key={index}` on role list `SelectItem`s
- **File:** `apps/reading-advantage/components/user-role-management.tsx`
- **Lines:** 457, 519
- **Severity:** Medium
- **Evidence:** Lines 457 and 519: `<SelectItem key={index} value={role.value}>` — uses index.
- **Fix:** Use `role.value` as the key.

#### M-11 — `user-role-management.tsx` `Empty trigger` in edit dialog
- **File:** `apps/reading-advantage/components/user-role-management.tsx`
- **Lines:** 501
- **Severity:** Medium
- **Evidence:** Line 501: `<AlertDialogTrigger asChild></AlertDialogTrigger>` — empty `<AlertDialogTrigger>` with no child. The dialog is opened only by the dropdown row in the actions column.
- **Fix:** Remove the trigger or use it for the actual edit button.

#### M-12 — `user-role-management.tsx` `pointer-events-none ` trailing space
- **File:** `apps/reading-advantage/components/user-role-management.tsx`
- **Lines:** 529, 535, 574, 580
- **Severity:** Medium
- **Evidence:** Class name `className={isDisabled ? "pointer-events-none " : ""}` — trailing space inside the string literal.
- **Fix:** Trim the trailing space.

#### M-13 — `user-role-management.tsx` `process.env.NEXT_PUBLIC_BASE_URL` used in 3 places without fallback
- **File:** `apps/reading-advantage/components/user-role-management.tsx`
- **Lines:** 124, 164, 292
- **Severity:** Medium
- **Evidence:** Lines 124, 164, 292: URL built from `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/...`. If the env var is unset, the URL becomes `"undefined/api/v1/users"`.
- **Fix:** Use a `getApiBaseUrl()` helper with a sensible default; or use relative URLs (the same pattern as `tab-flash-card.tsx:89` and `tab-manage.tsx:77`).

#### M-14 — `user-role-management.tsx` `School.maxUsers` and `usedLicenses` declared but unused
- **File:** `apps/reading-advantage/components/user-role-management.tsx`
- **Lines:** 60–65
- **Severity:** Medium
- **Evidence:** Line 60–65: `interface School { id, schoolName, maxUsers, usedLicenses }`. `maxUsers` and `usedLicenses` are never read in this file.
- **Fix:** Either remove or surface them in the school dropdown.

#### M-15 — `user-role-management.tsx` `User` import is dead
- **File:** `apps/reading-advantage/components/user-role-management.tsx`
- **Lines:** 56
- **Severity:** Medium
- **Evidence:** Line 56: `import type { User } from "@/types";` — `User` is never referenced in the file.
- **Fix:** Remove the import.

#### M-16 — `update-user-license.tsx` `date.toUTCString()` for invalid date
- **File:** `apps/reading-advantage/components/update-user-license.tsx`
- **Lines:** 44, 115
- **Severity:** Medium
- **Evidence:** Line 44: `const date = new Date(expired);` — no try/catch. Line 115: `<strong>Current License:</strong> {date.toUTCString()}` — `"Invalid Date"` is shown if `expired` is malformed.
- **Fix:** Validate `expired` before display.

#### M-17 — `update-user-license.tsx` "Current License" label vs date value mismatch
- **File:** `apps/reading-advantage/components/update-user-license.tsx`
- **Lines:** 113–117
- **Severity:** Medium
- **Evidence:** Line 113–117: `<strong>Current License:</strong> {date.toUTCString()}` — label says "Current License" but value is a date.
- **Fix:** Either relabel to "Current Expiration" or render the actual license string.

#### M-18 — `user-signin-form.tsx` `window.location.href = "/"` causes full reload
- **File:** `apps/reading-advantage/components/user-signin-form.tsx`
- **Lines:** 27
- **Severity:** Medium
- **Evidence:** Line 27: `window.location.href = "/";` — full page reload after login.
- **Fix:** Use `router.push("/")` from `next/navigation`.

#### M-19 — `user-signin-form.tsx` `username` field with `emailPlaceholder` i18n key
- **File:** `apps/reading-advantage/components/user-signin-form.tsx`
- **Lines:** 45
- **Severity:** Medium
- **Evidence:** Line 45: `placeholder={t('pages.signInForm.emailPlaceholder')}` — uses email key for username field.
- **Fix:** Add `usernamePlaceholder` key and use it.

#### M-20 — `user-reset-pass-form.tsx` hardcoded English copy
- **File:** `apps/reading-advantage/components/user-reset-pass-form.tsx`
- **Lines:** 49, 52–53, 78, 102–103
- **Severity:** Medium
- **Evidence:**
  - Line 49: `Forgot your password?` (English).
  - Line 52–53: `Enter your email and we'll send you a link to reset your password.`
  - Line 78: `Send Forgot Password Email`
  - Line 102–103: `The email has been sent!. Please check your email to reset your password.` — also has typo `sent!.`
- **Fix:** Add i18n keys; fix the typo.

#### M-21 — `user-reset-pass-form.tsx` inline SVG for checkmark
- **File:** `apps/reading-advantage/components/user-reset-pass-form.tsx`
- **Lines:** 86–100
- **Severity:** Medium
- **Evidence:** 15-line inline `<svg>` for the success checkmark with hardcoded stroke color.
- **Fix:** Use `lucide-react` `ShieldCheck` (already a dependency).

#### M-22 — `user-reset-pass-form.tsx` `target.email.value` direct DOM access
- **File:** `apps/reading-advantage/components/user-reset-pass-form.tsx`
- **Lines:** 21–24
- **Severity:** Medium
- **Evidence:** Line 21–24: `const target = event.target as typeof event.target & { email: { value: string } };` — type cast that may lie at runtime.
- **Fix:** Use `FormData` API or controlled inputs.

#### M-23 — `tab-manage.tsx` hardcoded `activityType` / `activityStatus` strings
- **File:** `apps/reading-advantage/components/vocabulary/tab-manage.tsx`
- **Lines:** 138–139
- **Severity:** Medium
- **Evidence:** Line 138: `activityType: "vocabulary_flashcards"`. Line 139: `activityStatus: "completed"`. The codebase has `ActivityType` (in `lib/enums.ts` and `components/models/user-activity-log-model.ts`) and `ActivityStatus` enums.
- **Fix:** Use the enum values.

#### M-24 — `tab-manage.tsx` `formatDateFromTimestamp` returns `"Invalid Date"` without i18n
- **File:** `apps/reading-advantage/components/vocabulary/tab-manage.tsx`
- **Lines:** 170–189
- **Severity:** Medium
- **Evidence:** Line 186: `return "Invalid Date";`. Line 188: same.
- **Fix:** Use i18n key.

#### M-25 — `tab-manage.tsx` `definition` fallback `"No definition"`
- **File:** `apps/reading-advantage/components/vocabulary/tab-manage.tsx`
- **Lines:** 96–101
- **Severity:** Medium
- **Evidence:** Line 96–101: `definition.th || definition.en || … || "No definition"` — fallback to English literal.
- **Fix:** Use i18n key for the fallback.

#### M-26 — `tab-manage.tsx` `vocabulary: any` mapper loses type safety
- **File:** `apps/reading-advantage/components/vocabulary/tab-manage.tsx`
- **Lines:** 86–104
- **Severity:** Medium
- **Evidence:** Line 86: `data.vocabularies.map((vocabulary: any) => { … })` — entire mapper typed `any`.
- **Fix:** Replace with the `Vocabulary` type or a server response schema.

#### M-27 — `tab-manage.tsx` `<div onClick>` for navigation
- **File:** `apps/reading-advantage/components/vocabulary/tab-manage.tsx`
- **Lines:** 199–206
- **Severity:** Medium
- **Evidence:** Line 199–206: `<div className="capitalize cursor-pointer" onClick={…}>` — div as click target, not keyboard-accessible, not a link.
- **Fix:** Use a `<Link>` or `<button>`.

#### M-28 — `tab-manage.tsx` `formatDate(new Date())` mismatch
- **File:** `apps/reading-advantage/components/vocabulary/tab-manage.tsx`
- **Lines:** 232, 6
- **Severity:** Medium
- **Evidence:** Line 232: `<div>{formatDate(row.getValue("due"))}</div>` — `row.getValue("due")` is a `Date` object. `formatDate` (imported from `lib/utils.ts:6`) is declared `formatDate(updatedAt: string)` — expects a string.
- **Fix:** Either change `formatDate` to accept `Date | string` or convert at the call site.

#### M-29 — `tab-manage.tsx` hardcoded `"Search..."` placeholder
- **File:** `apps/reading-advantage/components/vocabulary/tab-manage.tsx`
- **Lines:** 327
- **Severity:** Medium
- **Evidence:** Line 327: `placeholder={"Search..."}` — literal English.
- **Fix:** Use i18n key.

#### M-30 — `tab-manage.tsx` hardcoded "Empty", "Previous", "Next"
- **File:** `apps/reading-advantage/components/vocabulary/tab-manage.tsx`
- **Lines:** 375, 389, 397
- **Severity:** Medium
- **Evidence:** Lines 375, 389, 397: literal English UI strings.
- **Fix:** Use i18n keys.

#### M-31 — `flash-card-vocabulary-practice-button.tsx` `nextCard: Function; setShowButton: Function;` `Function` types
- **File:** `apps/reading-advantage/components/vocabulary/flash-card-vocabulary-practice-button.tsx`
- **Lines:** 11, 14
- **Severity:** Medium
- **Evidence:** Lines 11, 14: `nextCard: Function;` `setShowButton: Function;` — bare `Function` type.
- **Fix:** Replace with specific signatures.

#### M-32 — `flash-card-vocabulary-practice-button.tsx` magic numbers `0/1/2/3` for `state`
- **File:** `apps/reading-advantage/components/vocabulary/flash-card-vocabulary-practice-button.tsx`
- **Lines:** 72–75
- **Severity:** Medium
- **Evidence:** Lines 72–75: `words[index].state === 0 || words[index].state === 1 || words[index].state === 2 || words[index].state === 3`.
- **Fix:** Use `State.New`, `State.Learning`, `State.Review`, `State.Relearning` from `ts-fsrs`.

#### M-33 — `flash-card-vocabulary-practice-button.tsx` `scheduling_cards: any`
- **File:** `apps/reading-advantage/components/vocabulary/flash-card-vocabulary-practice-button.tsx`
- **Lines:** 41
- **Severity:** Medium
- **Evidence:** Line 41: `const scheduling_cards: any = fnFsrs.repeat(preCard, preCard.due);`.
- **Fix:** Replace with the actual return type from `ts-fsrs` (`RecordLogItem`).

#### M-34 — `flash-card-vocabulary-practice-button.tsx` `cards` not re-synced when `words` prop changes
- **File:** `apps/reading-advantage/components/vocabulary/flash-card-vocabulary-practice-button.tsx`
- **Lines:** 34, 50–51
- **Severity:** Medium
- **Evidence:** Line 34: `const [cards, setCards] = useState<Word[]>(words);` — initialized from prop once.
- **Fix:** Add a `useEffect(() => setCards(words), [words])` or derive cards from props.

#### M-35 — `flash-card-vocabulary-practice-button.tsx` fetch result discarded
- **File:** `apps/reading-advantage/components/vocabulary/flash-card-vocabulary-practice-button.tsx`
- **Lines:** 53–62
- **Severity:** Medium
- **Evidence:** Line 53: `await fetch(...)` — the result is awaited but no `res.ok` check, no error toast, no state update on failure.
- **Fix:** Check `res.ok` and toast on failure; or use a `useMutation` hook.

#### M-36 — `flash-card-vocabulary-practice-button.tsx` `Word` type circular import
- **File:** `apps/reading-advantage/components/vocabulary/flash-card-vocabulary-practice-button.tsx`
- **Lines:** 7
- **Severity:** Medium
- **Evidence:** Line 7: `import { Word } from "./tab-flash-card";` — the file `tab-flash-card.tsx:19` imports this component. The two files share types via this circular dependency.
- **Fix:** Move `Word` to a shared `types/vocabulary.ts`.

#### M-37 — `user-account-nav.tsx` hardcoded role colors via arbitrary Tailwind
- **File:** `apps/reading-advantage/components/user-account-nav.tsx`
- **Lines:** 51–55
- **Severity:** Medium
- **Evidence:** Lines 51–55: `bg-[#FFC107]`, `bg-[#DC3545]`, `bg-[#007BFF]`, `bg-[#28A745]`, `bg-[#6C757D]`.
- **Fix:** Use semantic Tailwind colors (`bg-amber-500`, etc.) or theme tokens.

#### M-38 — `user-account-nav.tsx` `roles.label` unused
- **File:** `apps/reading-advantage/components/user-account-nav.tsx`
- **Lines:** 50–59
- **Severity:** Medium
- **Evidence:** Lines 50–59: `label` field is destructured but only `color` is used at line 82.
- **Fix:** Remove `label` from the `roles` object.

#### M-39 — `user-account-nav.tsx` `setIsLoading(false)` not in finally
- **File:** `apps/reading-advantage/components/user-account-nav.tsx`
- **Lines:** 147–160
- **Severity:** Medium
- **Evidence:** Lines 147–160: `onClick={async (event) => { event.preventDefault(); setIsLoading(true); await logout(); setIsLoading(false); }}` — if `logout` throws, `setIsLoading(false)` never runs.
- **Fix:** Wrap in try/finally.

#### M-40 — `user-account-nav.tsx` `id="onborda-usermanu"` undocumented coupling
- **File:** `apps/reading-advantage/components/user-account-nav.tsx`
- **Lines:** 62
- **Severity:** Medium
- **Evidence:** Line 62: `<div id="onborda-usermanu">` — hardcoded id, presumably for the Onborda tour library.
- **Fix:** Document or pass as a prop.

#### M-41 — `user-account-nav.tsx` `cefrLevel !== ""` check is too narrow
- **File:** `apps/reading-advantage/components/user-account-nav.tsx`
- **Lines:** 101
- **Severity:** Medium
- **Evidence:** Line 101: `user.cefrLevel !== "" ? … : …` — if `cefrLevel` is `undefined` (per type `cefrLevel?: string`), the condition is `true`, so the user is routed to `/student/read` even without a level.
- **Fix:** Check `user.cefrLevel` truthiness.

#### M-42 — `update-user-license.tsx` commented-out code
- **File:** `apps/reading-advantage/components/update-user-license.tsx`
- **Lines:** 42, 46, 72–73
- **Severity:** Medium
- **Evidence:** Lines 42, 46, 72–73: commented-out lines (`// const { update } = useSession();` etc.).
- **Fix:** Delete dead comments.

#### M-43 — `tab-flash-card.tsx` dead imports `date_scheduler`, `method`
- **File:** `apps/reading-advantage/components/vocabulary/tab-flash-card.tsx`
- **Lines:** 10–11
- **Severity:** Medium
- **Evidence:** Line 10: `import { date_scheduler, State } from "ts-fsrs";` — `date_scheduler` unused. Line 11: `import { filter, method } from "lodash";` — `method` unused.
- **Fix:** Remove the unused imports.

#### M-44 — `tab-flash-card.tsx` dead `dayjs_plugin_isSameOrAfter` extend
- **File:** `apps/reading-advantage/components/vocabulary/tab-flash-card.tsx`
- **Lines:** 8, 30
- **Severity:** Medium
- **Evidence:** Line 8: `import dayjs_plugin_isSameOrAfter from "dayjs/plugin/isSameOrAfter";` Line 30: `dayjs.extend(dayjs_plugin_isSameOrAfter);`. Code uses `dayjs().isAfter()` (built-in, line 99).
- **Fix:** Remove the import and extend.

#### M-45 — `tab-flash-card.tsx` `deleteScore` status check inconsistency
- **File:** `apps/reading-advantage/components/vocabulary/tab-flash-card.tsx`
- **Lines:** 144
- **Severity:** Medium
- **Evidence:** Line 144: `if (updateScrore?.status === 200)` — `updateScrore` is the response of an activity log POST. Compare with `tab-manage.tsx:150` which expects `=== 201`.
- **Fix:** Use `res.ok` or align both components.

#### M-46 — `tab-flash-card.tsx` `handleDelete` does not check `res.ok`
- **File:** `apps/reading-advantage/components/vocabulary/tab-flash-card.tsx`
- **Lines:** 185–224
- **Severity:** Medium
- **Evidence:** Line 197: `const resData = await res.json();` — no `res.ok` check; line 199 branches on `resData.status === 200`.
- **Fix:** Check `res.ok`.

#### M-47 — `tab-flash-card.tsx` `handleDelete(id: string | undefined)` may build URL with `undefined`
- **File:** `apps/reading-advantage/components/vocabulary/tab-flash-card.tsx`
- **Lines:** 185, 190
- **Severity:** Medium
- **Evidence:** Line 185: signature accepts `id: string | undefined`. Line 190: fetches `/api/v1/users/wordlist/${id}`.
- **Fix:** Validate `id` before fetch.

#### M-48 — `tab-flash-card.tsx` `cards = words.map((word, index) => ({ id: index, … }))` uses index as flashcard id
- **File:** `apps/reading-advantage/components/vocabulary/tab-flash-card.tsx`
- **Lines:** 169–183
- **Severity:** Medium
- **Evidence:** Line 171: `id: index`.
- **Fix:** Use `word.id` (which exists on the type).

#### M-49 — `tab-manage.tsx` `deleteScore` status check `=== 201`
- **File:** `apps/reading-advantage/components/vocabulary/tab-manage.tsx`
- **Lines:** 150
- **Severity:** Medium
- **Evidence:** See M-45; this component expects 201, the other expects 200. Inconsistent.
- **Fix:** Use `res.ok`.

#### M-50 — `tab-manage.tsx` `handleDelete` does not check `res.ok`
- **File:** `apps/reading-advantage/components/vocabulary/tab-manage.tsx`
- **Lines:** 275–308
- **Severity:** Medium
- **Evidence:** Line 283: `const data = await res.json();` — no `res.ok` check; line 284 branches on `data.status === 200`.
- **Fix:** Check `res.ok`.

#### M-51 — `tab-manage.tsx` `console.log(error)` instead of `console.error`
- **File:** `apps/reading-advantage/components/vocabulary/tab-manage.tsx`
- **Lines:** 301, 166
- **Severity:** Medium
- **Evidence:** Lines 166, 301: `console.log(error)`.
- **Fix:** Use `console.error`.

#### M-52 — `user-role-management.tsx` `currentItems` `id` field never validated
- **File:** `apps/reading-advantage/components/user-role-management.tsx`
- **Lines:** 337, 340
- **Severity:** Medium
- **Evidence:** Line 337: `schoolList.find((s) => s.id === user.licenseId)`. Line 340: `school_name: school ? school.schoolName : "-"`. If `user.licenseId` is undefined or null the comparison silently returns `"-"`.
- **Fix:** Validate `user.licenseId` before lookup; surface a real warning.

#### M-53 — `user-role-management.tsx` `mergedUserData` `school_name` derived only for rendering, not persisted
- **File:** `apps/reading-advantage/components/user-role-management.tsx`
- **Lines:** 335–343
- **Severity:** Medium
- **Evidence:** `mergedUserData` adds `school_name` for display only. The underlying `userData` still has `licenseId`. After a school change, the local update at line 313 sets both `licenseId` and `school_name` on the row, but if `schoolList` is refetched independently the memo re-derives.
- **Fix:** Persist `school_name` in the data source or document the drift.

### Low

#### L-01 — `select.tsx`, `separator.tsx`, `slider.tsx`, `tabs.tsx`, `textarea.tsx`, `tooltip.tsx`, `skeleton.tsx`, `toast.tsx` are verbatim shadcn/ui forks
- **Files:** all 8 shadcn primitive files
- **Severity:** Low
- **Evidence:** These files match the upstream shadcn registry output verbatim. No app-specific changes.
- **Fix:** None needed; consider depending on the upstream package instead of forking.

#### L-02 — `tabs.tsx:30` trailing space after `ref={ref}`
- **File:** `apps/reading-advantage/components/ui/tabs.tsx`
- **Lines:** 30
- **Severity:** Low
- **Fix:** Remove trailing space.

#### L-03 — `table.tsx:39–48` `TableFooter` uses `bg-primary text-primary-foreground` instead of shadcn default
- **File:** `apps/reading-advantage/components/ui/table.tsx`
- **Lines:** 39–48
- **Severity:** Low
- **Evidence:** Shadcn upstream uses `bg-muted/50 font-medium`.
- **Fix:** Document the deviation or align.

#### L-04 — `slider.tsx:8–25` single-thumb only
- **File:** `apps/reading-advantage/components/ui/slider.tsx`
- **Lines:** 8–25
- **Severity:** Low
- **Evidence:** Renders only one `<SliderPrimitive.Thumb />`. Range sliders require multiple thumbs.
- **Fix:** Accept `thumbCount` prop or document single-thumb only.

#### L-05 — `skeleton.tsx:3` no `forwardRef`
- **File:** `apps/reading-advantage/components/ui/skeleton.tsx`
- **Lines:** 3–13
- **Severity:** Low
- **Fix:** Wrap in `React.forwardRef`.

#### L-06 — `toast.tsx:115–116` only `ToastAction` is a valid action element
- **File:** `apps/reading-advantage/components/ui/toast.tsx`
- **Lines:** 115
- **Severity:** Low
- **Fix:** Document or accept `React.ReactElement`.

#### L-07 — `use-toast.ts:184` `useEffect(…, [state])` should be `[]`
- **File:** `apps/reading-advantage/components/ui/use-toast.ts`
- **Lines:** 184
- **Severity:** Low
- **Fix:** Change to `[]`.

#### L-08 — `use-toast.ts:189` `dismiss` return type not annotated
- **File:** `apps/reading-advantage/components/ui/use-toast.ts`
- **Lines:** 189
- **Severity:** Low
- **Fix:** Add `: void`.

#### L-09 — `toaster.tsx:1` `"use client";` with trailing semicolon inconsistent
- **File:** `apps/reading-advantage/components/ui/toaster.tsx`
- **Lines:** 1
- **Severity:** Low
- **Evidence:** Line 1: `"use client";` with semicolon. Other files in the batch use no semicolon.
- **Fix:** Standardize.

#### L-10 — `user-account-nav.tsx:50–56` `roles` object recreated every render
- **File:** `apps/reading-advantage/components/user-account-nav.tsx`
- **Lines:** 50–56
- **Severity:** Low
- **Fix:** Move outside the component.

#### L-11 — `user-account-nav.tsx:62` `id="onborda-usermanu"` magic string
- **File:** `apps/reading-advantage/components/user-account-nav.tsx`
- **Lines:** 62
- **Severity:** Low
- **Fix:** Document or move to a constant.

#### L-12 — `update-user-license.tsx:113` `mb-3` inline margin
- **File:** `apps/reading-advantage/components/update-user-license.tsx`
- **Lines:** 113
- **Severity:** Low
- **Fix:** Move to parent layout.

#### L-13 — `user-signin-form.tsx:13` empty `UserAuthFormProps`
- **File:** `apps/reading-advantage/components/user-signin-form.tsx`
- **Lines:** 13
- **Severity:** Low
- **Fix:** Inline the type.

#### L-14 — `user-reset-pass-form.tsx:10` empty `UserAuthFormProps`
- **File:** `apps/reading-advantage/components/user-reset-pass-form.tsx`
- **Lines:** 10
- **Severity:** Low
- **Fix:** Inline the type.

#### L-15 — `user-avatar.tsx:17` generic alt text
- **File:** `apps/reading-advantage/components/user-avatar.tsx`
- **Lines:** 14, 17
- **Severity:** Low
- **Evidence:** `alt="Picture"` on `AvatarImage`; `sr-only` `user.name` on fallback.
- **Fix:** Use `user.name` for the alt.

#### L-16 — `user-avatar.tsx:5` imports `AvatarProps` from Radix, not from shadcn wrapper
- **File:** `apps/reading-advantage/components/user-avatar.tsx`
- **Lines:** 5
- **Severity:** Low
- **Fix:** Import from `@/components/ui/avatar` if exported.

#### L-17 — `user-avatar.tsx:1` blank first line
- **File:** `apps/reading-advantage/components/user-avatar.tsx`
- **Lines:** 1
- **Severity:** Low
- **Fix:** Remove.

#### L-18 — `tab-flash-card.tsx:239, 281` `!=` loose equality
- **File:** `apps/reading-advantage/components/vocabulary/tab-flash-card.tsx`
- **Lines:** 239, 281
- **Severity:** Low
- **Fix:** Use `!==`.

#### L-19 — `tab-flash-card.tsx:147` `tUpdateScore("yourXp", { xp: UserXpEarned.Vocabulary_Flashcards })` — passes enum value (15) instead of translated XP string
- **File:** `apps/reading-advantage/components/vocabulary/tab-flash-card.tsx`
- **Lines:** 147–151
- **Severity:** Low
- **Evidence:** `xp: UserXpEarned.Vocabulary_Flashcards` is `15`. The i18n function receives a numeric interpolation.
- **Fix:** Either pass a formatted string or update the i18n template.

#### L-20 — `tab-flash-card.tsx:303` i18n key `flashcard.neverPracticeButton` used for delete button
- **File:** `apps/reading-advantage/components/vocabulary/tab-flash-card.tsx`
- **Lines:** 303
- **Severity:** Low
- **Evidence:** Key name says "neverPracticeButton" but the button is a delete button.
- **Fix:** Rename the i18n key.

#### L-21 — `tab-flash-card.tsx:271` route `/student/read/${articleId}` differs from `user-assignment-dashboard.tsx:386` `/student/lesson/${articleId}`
- **File:** `apps/reading-advantage/components/vocabulary/tab-flash-card.tsx` and `student-assignment-dashboard.tsx` (not in batch)
- **Lines:** 271
- **Severity:** Low
- **Fix:** Unify the route.

#### L-22 — `tab-manage.tsx:127` body spreads entire card with `update_score: true`
- **File:** `apps/reading-advantage/components/vocabulary/tab-manage.tsx`
- **Lines:** 121–130
- **Severity:** Low
- **Fix:** Send only required fields.

#### L-23 — `tab-manage.tsx:170` `formatDateFromTimestamp(timestamp: any)`
- **File:** `apps/reading-advantage/components/vocabulary/tab-manage.tsx`
- **Lines:** 170
- **Severity:** Low
- **Fix:** Tighten the type.

#### L-24 — `tab-manage.tsx:88` `word: any` access path
- **File:** `apps/reading-advantage/components/vocabulary/tab-manage.tsx`
- **Lines:** 88–94
- **Severity:** Low
- **Fix:** Use `Word` type.

#### L-25 — `flash-card-vocabulary-practice-button.tsx:64` `if (index + 1 === words.length)` race with prop change
- **File:** `apps/reading-advantage/components/vocabulary/flash-card-vocabulary-practice-button.tsx`
- **Lines:** 64
- **Severity:** Low
- **Fix:** Derive from `cards.length`.

#### L-26 — `flash-card-vocabulary-practice-button.tsx:145` empty fragment `<></>`
- **File:** `apps/reading-advantage/components/vocabulary/flash-card-vocabulary-practice-button.tsx`
- **Lines:** 145
- **Severity:** Low
- **Fix:** Return `null` directly.

#### L-27 — `user-role-management.tsx:104–113` `useEffect` 300ms magic delay
- **File:** `apps/reading-advantage/components/user-role-management.tsx`
- **Lines:** 104–113
- **Severity:** Low
- **Fix:** Extract constant.

#### L-28 — `user-role-management.tsx:362–367` `pageSize: 5` magic number
- **File:** `apps/reading-advantage/components/user-role-management.tsx`
- **Lines:** 365
- **Severity:** Low
- **Fix:** Extract constant.

#### L-29 — `user-role-management.tsx:443–449` `<p>Email</p>` without `<Label htmlFor>`
- **File:** `apps/reading-advantage/components/user-role-management.tsx`
- **Lines:** 444
- **Severity:** Low
- **Fix:** Use `<Label htmlFor>`.

#### L-30 — `user-role-management.tsx:445` `<Input>` without `id`
- **File:** `apps/reading-advantage/components/user-role-management.tsx`
- **Lines:** 445
- **Severity:** Low
- **Fix:** Add `id`.

#### L-31 — `user-role-management.tsx:434–475` empty wrapper div when `licenseId === "all"`
- **File:** `apps/reading-advantage/components/user-role-management.tsx`
- **Lines:** 434–475
- **Severity:** Low
- **Fix:** Conditional render.

#### L-32 — `user-role-management.tsx:282` `setIsDisabled(true)` runs even when `dropdownOpen === false` on mount
- **File:** `apps/reading-advantage/components/user-role-management.tsx`
- **Lines:** 104–113
- **Severity:** Low
- **Fix:** Initialize `isDisabled` to `true`.

#### L-33 — `tab-flash-card.tsx:267` `key={index}` and `key={data?.id}` mix on inner elements
- **File:** `apps/reading-advantage/components/vocabulary/tab-flash-card.tsx`
- **Lines:** 261, 266, 267
- **Severity:** Low
- **Fix:** Use `data.id` everywhere.

#### L-34 — `user-signin-form.tsx:88` `target="_blank"` is not used (good) but `Link` from `next/link` does not need `target`
- **File:** `apps/reading-advantage/components/user-signin-form.tsx`
- **Lines:** 87–92
- **Severity:** Low
- **Evidence:** Line 87–92 uses `<Link href="/auth/forgot-password">` without target.
- **Fix:** None needed.

#### L-35 — `select.tsx` exports `SelectSeparator` which the codebase does not appear to use
- **File:** `apps/reading-advantage/components/ui/select.tsx`
- **Lines:** 141–151, 161
- **Severity:** Low
- **Fix:** Verify usage.

#### L-36 — `slider.tsx` exports `Slider` but the codebase uses `Slider` and `SliderPrimitive`
- **File:** `apps/reading-advantage/components/ui/slider.tsx`
- **Lines:** 28
- **Severity:** Low
- **Fix:** None.

#### L-37 — `use-toast.ts:78–82` reducer uses `slice(0, TOAST_LIMIT)` to cap toast list
- **File:** `apps/reading-advantage/components/ui/use-toast.ts`
- **Lines:** 78–82
- **Severity:** Low
- **Evidence:** Standard implementation. With `TOAST_LIMIT=1` only one toast visible at a time.
- **Fix:** None.

#### L-38 — `tab-flash-card.tsx:147` `imgSrc: true` literal
- **File:** `apps/reading-advantage/components/vocabulary/tab-flash-card.tsx`
- **Lines:** 147
- **Severity:** Low
- **Fix:** Use a named constant.

---

## Anti-Pattern Audit

| ID | Anti-pattern | Present in batch? | Evidence |
|----|--------------|-------------------|----------|
| A1 | Silent catch + happy UI | Yes | `tab-flash-card.tsx:155–157` logs `Failed to update data` but no toast; `tab-flash-card.tsx:215–223` catch toasts but `words` state is not rolled back; `tab-manage.tsx:160–162` similar; `user-role-management.tsx:191–196` swallows non-200/404 status with no user feedback. |
| A2 | Direct fetch from component | Yes | `tab-flash-card.tsx:89, 116, 127, 190`; `tab-manage.tsx:77, 121, 132, 277`; `flash-card-vocabulary-practice-button.tsx:53`; `update-user-license.tsx:52`; `user-role-management.tsx:123, 163, 291`; `user-reset-pass-form.tsx:26` — all bypass the domain layer. |
| A3 | Digit-only as a "labeled count" | Yes | `flash-card-vocabulary-practice-button.tsx:72–75` checks `state === 0/1/2/3`; `tab-flash-card.tsx:110` `state === 2 || state === 3`; `tab-manage.tsx:111` `state === 2 || state === 3`. |
| A4 | Vacuous-pass on nothing-done | Yes | `tab-flash-card.tsx:115` redundant `if (!update_score)` after filter at line 110; `tab-manage.tsx:120` same. `tab-flash-card.tsx:144` accepts only `=== 200` instead of `res.ok`. |
| A5 | False-claim text vs test reality | No | No false claims found in this batch. |
| A6 | Provider-specific hardcoded URLs | Yes | `tab-flash-card.tsx:270` `storage.googleapis.com` direct URL. |
| A7 | Magic numbers without enum | Yes | `flash-card-vocabulary-practice-button.tsx:72–75` (state 0/1/2/3); `user-role-management.tsx:365` (pageSize 5); `user-role-management.tsx:107` (300 ms debounce); `tab-flash-card.tsx:110, tab-manage.tsx:111` (state 2/3). |
| A8 | i18n bypass via literal strings | Yes | All English strings in `user-role-management.tsx`, `user-signin-form.tsx`, `user-reset-pass-form.tsx`, `update-user-license.tsx`, `tab-flash-card.tsx:162, 165`, `tab-manage.tsx:327, 375, 389, 397`. |

---

## Test / Coverage Observations

1. **No tests cover any of the 20 files in this batch.** Grep of `apps/reading-advantage/components/ui/__tests__/`:
   - Only `calendar.test.tsx` exists (not in this batch).
2. **No tests exist for any user/* form, the vocabulary tabs, the role-management table, the toast system, or the toaster.**
3. **Behavior worth testing (representative, not exhaustive):**
   - `use-toast.ts`: toast id generation is unique; `dismiss` removes from queue; `onOpenChange(false)` triggers dismiss; the `state` dependency array re-subscription.
   - `toaster.tsx`: XP toast branch when `description.startsWith("Congratulations")`; random image stability within a render.
   - `user-signin-form.tsx`: `login` throw surfaces message; `window.location.href` redirect (but `useRouter`/`useEffect` would be needed for proper testing).
   - `user-reset-pass-form.tsx`: success toggle on `res.ok`; failure toast; success SVG renders.
   - `user-role-management.tsx`: `mergedUserData` memoization with school changes; `handleAddSubmit` narrow status handling; `handleSchoolChangeSubmit` empty selection guard.
   - `tab-flash-card.tsx`: `getUserSentenceSaved` with empty `data.word`; due-date sort; loop fetch sequence.
   - `tab-manage.tsx`: `formatDateFromTimestamp` for Firestore timestamp, ISO string, and invalid input; `formatDate(new Date())` mismatch (potential bug).
   - `flash-card-vocabulary-practice-button.tsx`: `handleClickFsrs` updates `cards` and `logs`; `setShowButton(false)` at end.
4. **No test execution was attempted.** No tests exist for these files; node modules were not installed.

---

## Files Not Fully Reviewed

**None.** All 20 files in the batch were read in their entirety.

---

## Recommendations (focused, no broad refactor)

1. Fix `use-toast.ts:184` dependency array to `[]` (H-01).
2. Replace `toaster.tsx` "Congratulations" string detection with a typed `variant: "xp-earned"` prop (H-02).
3. Guard `currentCardFlipRef.current()` and `controlRef.current.nextCard()` against null/undefined initial values (H-03).
4. Validate `data.word` and `data.sentences` shape in `tab-flash-card.tsx` (H-04).
5. Parallelize the due-card fetch loop in both vocabulary tabs (H-05).
6. Add `userId` to the `getUserSentenceSaved` deps or extract to `useCallback` (H-06).
7. Normalize `user.role` casing before comparing to `Role.*` in `user-account-nav.tsx` (H-07).
8. Move `currentDate` out of render scope in `user-account-nav.tsx` (H-08).
9. Bind `open`/`onOpenChange` to the Add User dialog in `user-role-management.tsx` (H-09).
10. Default to a destructive toast for any `!response.ok` in `user-role-management.tsx:handleAddSubmit` (H-10).
11. Replace the UUID-only Zod validation in `update-user-license.tsx` with a permissive regex (H-11).
12. Guard `res?.message ?? response.statusText` in `update-user-license.tsx:65` (H-12).
13. Align status-code checks (200 vs 201) between the two vocabulary tabs (H-13).
14. Move `flash-card-vocabulary-practice-button.tsx` off the `ts-fsrs-test` endpoint (H-14).
15. Route audio URLs through the shared storage adapter (M-01).
16. Reduce `TOAST_REMOVE_DELAY` to a few seconds (M-02).
17. Memoize `getRandomImage` per toast id (M-04).
18. Use `useState(true)` for `isDisabled` initial value (L-32).
19. Standardize `key={data.id}` over `key={index}` and `key={uuidv4()}` (M-08, M-09, M-10, L-33).
20. Replace `magic status numbers` (0/1/2/3, 2/3) with `State.*` enum values (M-32, etc.).
21. Use `ActivityType` and `ActivityStatus` enum values instead of literal strings in `tab-manage.tsx` (M-23).
22. Internationalize all hardcoded English strings across the user/account and vocabulary screens (M-20, M-25, M-29, M-30, etc.).
23. Remove dead imports (`date_scheduler`, `method`, `User`, `useState`, `useEffect`) (M-06, M-15, M-43).
24. Add `forwardRef` to `Skeleton` (L-05).
25. Extract the `mergedUserData` school lookup with explicit validation (M-52).

---

*End of line-review report for batch 35.*

MEASURE_AGENT_RESULT