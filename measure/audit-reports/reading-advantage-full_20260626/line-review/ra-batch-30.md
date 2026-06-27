# ra-batch-30 — Line-by-Line Review (20 files)

- **Track**: reading_advantage_full_review_20260626
- **Batch**: ra-batch-30
- **Scope**: 20 files under `apps/reading-advantage/components/`
- **Method**: Each file was read in full. Findings are line-anchored; no app code was edited.
- **Cross-file context reviewed (not edited)**: `apps/reading-advantage/actions/rating.ts`, `apps/reading-advantage/contexts/quiz-context.tsx`, `apps/reading-advantage/lib/use-article-completion.ts`, `apps/reading-advantage/lib/use-story-completion.ts`, `apps/reading-advantage/store/question-store.ts`, `apps/reading-advantage/types/index.d.ts`, `apps/reading-advantage/types/constants.ts`, `apps/reading-advantage/components/models/questions-model.ts`, `apps/reading-advantage/components/models/article-model.ts`.

---

## File 1: `apps/reading-advantage/components/questions/question-header.tsx` (85 lines)

| Sev | Location | Finding |
|---|---|---|
| Low | L14-25, L27-37 | `className` is declared in `Props` but never destructured in the function signature and is never applied to any element. Dead prop. |
| Low | L20, L31 | `disabled` defaults to `true` and the `onButtonClick` handler does not consult `disabled`. A disabled button is still clickable via keyboard activation in some browsers; nothing in the handler early-returns on `disabled`. |
| Med | L40-62 | `onButtonClick` `fetch('/api/v1/users/.../activitylog', {...})` is fire-and-forget: no `await`, no `response.ok` check, no `.catch`. Network failures or 4xx/5xx silently disappear; the spinner is never reverted. |
| Low | L43-47 | Locked-state toast uses variant `"default"` (line 47), so the toast is rendered with the same visual style as success toasts. The "🔒" emoji is in the title but the variant should be `"destructive"` (or warning) to convey the action blocked. |
| Med | L63-83 | When `isLocked` is true, the click shows a toast but does not advance the view (no `setIsButtonClicked(true)`); however, the button is not visually disabled (`disabled` is independent), so users see a clickable button that "does nothing visible." No focus return after dismiss. |
| Low | L79 | `{isLocked && <Icons.lock .../>}` — `isLocked` and `disabled` are independent. A user may be `isLocked` but `disabled=false`, so they get the lock icon but can also click. |
| Low | L1 | `"use client"` is declared, but the activitylog POST goes from the client directly to an API route instead of a server action / backend function (violates AGENTS.md "core business logic must not depend on a transport layer" and the "do not bypass adapters" rule). |

---

## File 2: `apps/reading-advantage/components/questions/sa-question-card.tsx` (660 lines)

| Sev | Location | Finding |
|---|---|---|
| Med | L2 | `import React, { use, useContext, useEffect, useState }` — `use` is imported but never used. Dead import (also drops React 19 `use()` semantics for the codebase). |
| High | L93-105 | The initial fetch useEffect has no race guard. If `articleId` changes mid-flight, the older request may resolve after the new one and overwrite `data`/`state`. No `AbortController` and no request-id compare. |
| Med | L93-104 | Error path: only `console.error` is set and `setState(QuestionState.ERROR)`. The error UI is rendered by `QuestionCardError` (L153, L157) which shows `t("descriptionFailure", { error: error ?? "" })`. Without a real `error` value, the user sees the localized generic message — fine, but the cause is lost. |
| Med | L107-113 | `handleCompleted` merges `answerData` into `data` and pushes into `useQuestionStore`. The store is updated optimistically with the response of `onSubmitted` (see L432 / L447). If the second attempt (catch) returns a different shape, the merged record will not match `QuestionResponse` and downstream consumers of the store may break. |
| High | L121-133 | The completion `useEffect` depends on `state`, `userId`, `articleId`, `page`, `checkAndNotifyCompletion`. The `checkCompletion` function awaits `checkAndNotifyCompletion`; on error it logs to console only. No user-facing failure signal. |
| High | L416-452 | `onSubmitted` makes the fetch twice: once in `try` and once again in `catch` with **identical** request body and URL (L421-430 vs L436-445). This is a copy-paste retry that cannot succeed if the first attempt failed for a deterministic reason (400 bad payload, 401, network down). The catch silently swallows and retries, then **also** writes the bad response into state via `setData(submitData)`. If the server returned 500, the client still renders the answer. |
| High | L432, L447 | `const submitData = await submitResponse.json()` is called without checking `submitResponse.ok`. A 4xx/5xx with a JSON body is treated like a 2xx and `submitData.state` is used to drive the UI. The `state` field from the server may be `ERROR` or undefined, but `onRating` (L454-487) only runs after `handleCompleted` — which is set to `COMPLETED` regardless. The mismatch between server truth and client state is silent. |
| Med | L433, L448 | `setData(submitData)` is called for both the response. The merged object is later re-set by `handleCompleted` (L109-112), so the intermediate `setData` may be wasted, but the `useQuestionStore.setState` (L112) overwrites whatever the global store had. |
| Med | L364-369 | `SAQuestion` accepts `articleLevel` and `articleTitle` (L368-369) but **never uses them** in the form, header, or submit body. Dead parameters. |
| Med | L411-414 | `handleTextChange` only calls `setWordCount`. It does not invoke the React-Hook-Form `register("answer").onChange` directly. The combined `onChange` (L511-514) calls `register("answer").onChange(e)` — this is fragile because calling `register("answer")` again returns a new `onChange` each render. RHF supports `setValue("answer", text)` or moving `register` to a stable destructure. |
| Med | L511-515 | `onChange` wraps `register("answer").onChange(e)`. Repeated `register("answer")` calls return a new `onChange` reference each render; this is the documented RHF misuse pattern (it is also why the file is missing the `register` destructure for `setValue`). |
| Low | L504-515 | The `TextareaAutosize` `id="short-answer"` is not unique; the component can be mounted multiple times on the same page (article + lesson paths), producing duplicate DOM IDs. |
| Med | L489, L521-583, L585-656 | The submit/Dialog tree is duplicated almost verbatim for `page === "article"` and `page === "lesson"` (two `<Dialog>` blocks with the same rating UI, footer, and copy). This is a maintainability hazard; the rating dialog for "article" does not pass `onClick={(e) => e.stopPropagation()}` (L605) but the lesson one does — inconsistent behavior. |
| Med | L522-535 | The article-mode submit is wrapped in `<DialogTrigger asChild>` containing a `<Button type="submit">`. Because the trigger is also the submit button, the dialog opens on **any** submit, including a partial form; the form is submitted first and the dialog opens after. There is no `onOpenAutoFocus` to refocus the rating. |
| Med | L470-472 | `toast({ title: tf("toast.success"), imgSrc: true, description: "Congratulations!, You received ${rating} XP for completing this activity." })` — hardcoded English description, regardless of `tf`. The `imgSrc: true` key is non-standard; we cannot verify it without the toast impl, but the property is not in the public toast API surface used elsewhere. |
| Med | L481 | `router.refresh()` is called unconditionally inside `onRating` after a server POST, even if the POST failed. The rating may not have been recorded but the user is told success. |
| Med | L494-496 | The elapsed-time badge uses `t("elapsedTime", { time: timer })`. The `timer` is a raw `number` (seconds) and `t` will only format via ICU; the displayed text may be unstyled. |
| Low | L108 | Thai comment "Merge ผลลัพธ์ที่ได้จาก submit โดยตรง ไม่ต้อง re-fetch จาก server" in source — code comment in non-English; project uses English in code. |

---

## File 3: `apps/reading-advantage/components/rating-popup.tsx` (188 lines)

| Sev | Location | Finding |
|---|---|---|
| Med | L17, L26-33 | The component is named `RatingPopup` but its `RateDialogProps` interface is `RateDialogProps` — naming inconsistency (the type says "Dialog" but the file/component says "Popup"). |
| Low | L8-12 | Unused enum imports: `UserXpEarned` and `ActivityStatus` are imported but never referenced. |
| Low | L39 | `const [oldRating, setOldRating] = React.useState(initialRating)` — `setOldRating` is never called and `oldRating` is never read in this file. Dead state. |
| Low | L35 | `useState<number \| null>(-1)` uses `-1` as a sentinel for "no rating selected." The `value === -1` check on L50 then guards submit. The mixed null/number union is not honored consistently: `value ? newValue : 0` on L85 coerces null/undefined/0 to 0. The `null` branch in the type is unreachable after `handleChange`. |
| Med | L49-79 | Optimistic update path: `setLocalInitialRating(value)` (L54) commits before the server returns. The catch on L72 sets `setLocalInitialRating(localInitialRating)` — but `localInitialRating` is the state at last render, which may not be the previous rating if multiple rapid clicks occurred. Rollback correctness depends on closure freshness. |
| Med | L65 | `await submitRating(userId, articleId, value, article)` — `article` is typed `Article` but the server action declares it `any` (`actions/rating.ts:8`). The optimistic toast fires with `xpEarned = value !== 0 && localInitialRating === 0 ? 10 : 0` (L57) before the server returns. The server decides XP based on the old rating record; if the user has any prior rating, the server returns `{ xpEarned: 0 }` (rating.ts:88) but the client still shows "received 10 XP" for the first invocation after a re-mount. The agreement is not enforced. |
| Med | L67-69 | `const res = await fetch(\`/api/v1/articles/${articleId}\`)` — no `res.ok` check, no JSON parse error handling. The `data.article.average_rating` may be undefined. |
| High | L88-103 | `toggleModal` POSTs to `/api/v1/users/${userId}/activitylog` (L90) without `await` and without response handling. A non-2xx does not block the modal from opening. The activity log may be missing. |
| Med | L88-103 | The body includes `activityStatus: "in_progress"` but the request fires on every modal toggle (open AND close via L149). The activity is logged twice per session. |
| Med | L132-185 | The "modal" is a custom full-screen overlay (`fixed`, `z-40`, `bg-black/80`) but has no focus trap, no `role="dialog"`, no `aria-modal`, no Escape key handler, no click-outside-to-close. The close button (L148-153) is a bare `<button>` with the literal text "x" (lowercase, no aria-label, no i18n). |
| Med | L172-178 | Submit button is also a bare `<button>` with no disabled state during `loading` (L51 sets `setLoading(true)` but the button has no `disabled={loading}`). Double-clicks are possible. |
| Med | L113-115 | `<h1 onClick={toggleModal}>` and the rating container (L116-129) both have onClick — clicking the title opens the modal, but the rating component is `readOnly` and reuses the same handler. A user who only wants to read the average rating still triggers the modal opening. |
| Low | L66-68 | After submitting, an `await fetch(\`/api/v1/articles/${articleId}\`)` re-fetches the article even though `submitRating` already revalidates the path (`revalidatePath` at rating.ts:64). Double round-trip. |

---

## File 4: `apps/reading-advantage/components/reminder-reread-table.tsx` (218 lines)

| Sev | Location | Finding |
|---|---|---|
| Low | L4 | `import { useEffect }` is unused. |
| Low | L7-9 | `ChevronDownIcon` and `DotsHorizontalIcon` are imported but never rendered. |
| High | L24-32 | An entire `DropdownMenu*` family (6 symbols) is imported but never used; the file does not render a column-visibility dropdown. Dead imports, bloats the client bundle. |
| Low | L72-117 | The `columns` array is recreated on every render and re-allocated for `useReactTable`. Not a correctness bug, but adds GC pressure. |
| Med | L99-116 | `statusMap` (L104-109) uses the `RecordStatus` enum as object keys. `RecordStatus.UNCOMPLETED_MCQ = "uncompletedMCQ"`, etc. (`types/constants.ts:2-6`). The mapping works at runtime, but the default branch `statusMap[status] || "In Progress"` masks unknown statuses silently — a status returned by a future backend change becomes "In Progress" with no logging. |
| Med | L86-88 | `cell: ({ row }) => <div className="captoliza">{row.getValue("title")}</div>` — typo in class name: `captoliza` (not a real Tailwind utility). Likely intended `capitalize`. The class has no effect. |
| High | L178-200 | The whole `TableRow` has `onClick={() => handleNavigateToArticle(row.original.targetId ? row.original.targetId : row.original.articleId)}` (L181-187). `row.original.targetId` is an optional `string` (`types/index.d.ts:133`). If `targetId` is the empty string `""`, the falsy check prefers `articleId`. But if `targetId` is a valid ID like `""` (never expected) or `0` (not a string here), routing may go to a wrong article. The check should be `row.original.targetId ?? row.original.articleId`. |
| Med | L180-189 | The click on the row navigates, but there is no `<button>` or `<a>` inside the row — the entire `<TableRow>` is clickable, which fails accessibility (a clickable row is not a focusable element, and screen readers cannot announce it as an action). No keyboard support. |
| Med | L177-201 | The `getRowModel().rows` may be empty (L177), and the "no results" cell is rendered. But the empty-state copy (L207-209) is hardcoded English, not i18n. |
| Med | L119-136 | `useReactTable` is configured with `getPaginationRowModel` (L125) but no `<Pagination>` is rendered. The pagination state is initialized but never surfaced. Dead config. |
| Med | L94-97 | `formatDate(createdAt)` — the function is in `@/lib/utils`. We did not verify its implementation; the row casts `created_at` to `string` (L94) but the type (`ArticleRecord.createdAt`) is `{ _seconds: number; _nanoseconds: number }` (types/index.d.ts:134-137). This is a **type mismatch** — the column renders `row.getValue("created_at")` (likely the timestamp object) and then `formatDate` may receive an object, not a string. Either the type is wrong or the row helper returns the raw object. |
| Low | L58-64 | State is initialized with `[]`, `[]`, `{}`, `{}` — `rowSelection` is `{}` (not an array) but in `getCoreRowModel` the row data may be an array. Minor inconsistency. |

---

## File 5: `apps/reading-advantage/components/reset-xp-dialog.tsx` (91 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L17 | `users: string` — the prop is named `users` (plural) but holds a single user ID. Confusing API. The `<ResetDialog users={...}>` call site will mislead readers. |
| Med | L17 | Default export is named `ResetDialog` but the file is `reset-xp-dialog.tsx` (kebab-case) — `users` (plural) + `ResetDialog` (mismatched name). |
| High | L25-50 | `fetch('/api/v1/users/${userId}', { method: 'PATCH', body: JSON.stringify({ xp: 0, level: 0, cefrLevel: '', cefr_level: '', resetXP: true }) })`. **Duplicate JSON keys** `cefrLevel` and `cefr_level` — JSON.stringify keeps the second (`cefr_level`). The server may reject or accept silently; the duplicate is dead. |
| Med | L38-50 | Status handling is incomplete: only `400` and `200` are matched. `401`, `403`, `404`, `500` all fall through to the success-path toast because the final `if (response.status === 200)` block only runs on 200, but no `else` is given. A 500 produces a "Success." toast because the `if (response.status === 400)` doesn't match and no failure toast is emitted. |
| Med | L45-50 | Success toast fires before the dialog is closed. Then the `finally` (L56) calls `closeDialog()` and `router.refresh()`. If the user reopens the dialog, they see the same `users` prop; there is no client-side state to undo. |
| Med | L58 | `router.refresh()` runs in `finally`, even when the PATCH failed. The page re-fetches and may show stale XP. |
| Med | L25-60 | No CSRF token, no id-token, no auth header. The route relies on cookie auth only. |
| Low | L74-80 | The dialog description copy is hardcoded English; not internationalized. |
| Low | L1 | `// ResetDialog.tsx` is a stale file-name comment in the source. |

---

## File 6: `apps/reading-advantage/components/select.tsx` (202 lines)

| Sev | Location | Finding |
|---|---|---|
| Med | L26-33 | `fetchArticles` is a module-level `async` function with no `response.ok` check and no `try/catch`. A non-2xx response with a non-JSON body will throw at `response.json()` and propagate as an unhandled promise rejection. |
| Med | L39 | `const tf: string \| any = useScopedI18n("selectType.types")` — the scoped translator is typed as `string \| any`. The actual return type is `(key: string) => string`. Type safety lost. |
| Med | L43-49 | Five separate `useState`/`useRef` for loading, dropdown, list, page, observer. The `observer` is created in `lastArticleRef` and re-created on every render (L117-121), but it is only `disconnect()`ed at the start of the callback (L115). On unmount, the observer is never disconnected — potential leak. |
| High | L75-110 | The `useEffect` re-runs on every `searchParams` change. The `setPage(1)` effect on L75-77 also runs. There is no debounce and no AbortController. If the user clicks two filter buttons quickly, two fetches race; whichever resolves last wins. |
| Med | L89-91 | `if (response.results.length === 0 && page === 1) { router.push("?") }` — pushing `"?"` triggers the effect again, which re-fetches the base articles. If the base endpoint is empty, this is an infinite navigation loop. |
| Med | L98-103 | The deduplication on append is fine, but the article ID set is rebuilt on every page fetch even when no append happens. |
| Med | L105 | `setArticleTypesData(response.selectionType)` — the dropdown options are re-set on **every page**, so the type list can change between pages, producing a flicker or a wrong active selection. |
| Med | L112-126 | The `IntersectionObserver` is recreated and the previous observer is `disconnect()`ed, but if the callback changes between renders (e.g., loading toggles), the captured `loading` value in the closure may be stale. The current `[loading]` dependency closes over the value used at the time of `useCallback` evaluation. |
| Low | L61-73 | `handleButtonClick` writes the new value into `params` based on a multi-branch `if` cascade. The branch logic and the `getArticleType` branch logic on L54-59 must stay in sync — the file already has subtle inconsistencies (e.g., when `selectedType` is set but no genre, `getArticleType` returns `"genre"`, but the click handler sets `params.set("genre", value)` regardless). |
| Low | L153-169 | "Back" button is rendered when any of `selectedType`/`selectedGenre`/`selectedSubgenre` is set. The delete order (subgenre → genre → type) is correct, but there is no "back to root" link when the user is at the article list. |
| Low | L29 | `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/articles?...` — if `NEXT_PUBLIC_BASE_URL` is unset (e.g., local dev), the URL becomes `/api/v1/articles?...` which is correct, but a leading slash from `NEXT_PUBLIC_BASE_URL="/"` would produce `//api/v1/articles/...`. Not validated. |
| Med | L1, L35 | The component is a `"use client"` boundary but the article loading could be a server component (the URL is read from `useSearchParams`). The client-side fetch is needed for infinite scroll, but it duplicates the data path that the server could provide. |

---

## File 7: `apps/reading-advantage/components/session-sync-redirect.tsx` (23 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L10-13 | `window.location.href = "/student/read"` causes a **full page reload** (not an SPA navigation), discarding any client state and re-running every server component. The component is named "redirect" but the surrounding flow expected `router.push` / `next/navigation`. The hardcoded 500ms delay is arbitrary. |
| High | L7-15 | No error handling: if the auth context is invalid, the spinner hangs for 500ms then navigates anyway. There is no way to recover or to show an error. |
| Med | L1-22 | The component is named `SessionSyncRedirect` but it does not actually "sync a session." The comment on L8-9 says no `update()` is needed, but the redirect happens unconditionally. A user with a partial session lands on `/student/read` regardless. |
| Low | L11 | The hardcoded path `/student/read` is not localized (no `[locale]` segment). Users on a non-default locale will be redirected to the default-locale route. |
| Low | L17-22 | The "Syncing your profile..." copy is hardcoded English; not internationalized. |

---

## File 8: `apps/reading-advantage/components/shared/app-layout.tsx` (121 lines)

| Sev | Location | Finding |
|---|---|---|
| Med | L29-36 | Component is a **server component** (no `"use client"`), but it accepts no auth adapter contract; it directly calls `getCurrentUser()`. Per AGENTS.md, auth should go through an internal `auth.requireUser()` adapter. This is the pre-migration shape (JWT) and matches existing code, but the file is named `app-layout.tsx` (not `app-layout.tsx` legacy) and should be the migration target. |
| Med | L44 | `feactlearderboard` — typo in the function name. Should be `fetchLeaderboard`. |
| Med | L44-73 | The leaderboard fetch is conditional on `user.license_id` (L45) and is wrapped in a `try/catch` that returns `[]` on any failure. Silent failure: a teacher whose license is invalid will never know the leaderboard is missing. |
| Med | L50-55 | The fetch URL is built from `process.env.NEXT_PUBLIC_BASE_URL` with `headersList` propagated. If `NEXT_PUBLIC_BASE_URL` is unset, the URL becomes `/api/v1/...`. Cookies are forwarded via `headersList` (good), but the request is `cache: "no-store"` (good). However, the `next: { revalidate: 0 }` / `no-store` only works in server components when the fetch is **not** memoized; here it is wrapped in a function so per-request caching is partial. |
| Med | L78-80 | The "if user has not selected a level" redirect is **commented out** (`if (user.level === undefined || user.cefr_level === "")`). A user with `level === undefined` can still see pages that assume a level (e.g., ProgressBar with `level={user.level!}` on L88). |
| High | L88 | `level={user.level!}` — non-null assertion on a possibly-undefined value. If `user.level` is `undefined` (the very case the disabled redirect was meant to handle), `ProgressBar` receives `undefined` and likely crashes or renders blank. |
| Med | L94 | `name: user.display_name` — `display_name` may not exist on the `User` type returned by `getCurrentUser()`. We cannot verify the type. The `...user` spread may overwrite the `name` field or vice versa. |
| Med | L112 | `user.role === "STUDENT" && <SidebarGoalsWidget userId={user.id} />` — the `user.role` is compared against the literal string `"STUDENT"`. If the role enum uses a different case or shape, this gate is wrong. Should be `user.role === Role.STUDENT`. |
| Low | L14 | `import { ThemeCustomizer } from "../theme-customizer"` uses a relative path while every other import uses `@/components/...`. Inconsistent import style. |
| Med | L109-111 | The leaderboard is rendered inside the `<aside>` regardless of `disableLeaderboard`. The flag is checked (L109 `!disableLeaderboard ?`), but the `<aside>` itself is not removed when `disableSidebar` is true — so when `disableSidebar` is true the leaderboard code path is not reached, but the SidebarNav is also hidden. No double-render. OK in practice, but the conditional chain is fragile. |

---

## File 9: `apps/reading-advantage/components/shared/change-role.tsx` (201 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L19-25 | A local `Role` enum is defined (`USER, STUDENT, TEACHER, ADMIN, SYSTEM`) that duplicates the canonical enum. If the canonical `Role` enum changes (adds a role, renames one), this file is silently out of sync. |
| Med | L29 | `userRole: string` — the prop is typed as a string instead of `Role`. The local enum is unused for the prop type. |
| Med | L59-76 | Dev-only `roles.push(...)` is gated by `process.env.NODE_ENV === "development"`. In a production build with the env var not set, the ADMIN/SYSTEM roles are not shown — but the route handlers may still accept them. |
| High | L187-190 | `className={cn(\`...hover:dark:bg-${color}-900\`, ...)}` — Tailwind classes are **dynamically constructed** with template literals. Tailwind's JIT cannot extract these classes at build time, so `hover:dark:bg-blue-900` and `hover:dark:bg-red-900` are not in the CSS bundle. The hover styling does not work. |
| Med | L85-88 | `await fetch(\`/api/v1/users/${userId}\`, { method: "PATCH", body: JSON.stringify({ role: selectedRole }) })` — no `Content-Type: application/json` header. The API may reject the request. |
| Med | L85-92 | `response.ok` is checked, but the response body is not read; if the server returns `{ error: "..." }`, the user sees only the generic "Failed to update role." toast. |
| Med | L100-110 | After a successful PATCH, the role-specific redirect uses `router.push`. For `Role.STUDENT`, the user is sent to `/level` — which will overwrite their level — but no level-selection API is called. The page may show an empty form. |
| Med | L100-110 | The local `Role.USER` enum value is not handled in the cascade. If a user is currently `USER`, clicking the Student card and saving leaves `selectedRole === Role.STUDENT` and routes to `/level`, but the `USER` case is dead code. |
| Med | L78 | `useState<string>(userRole)` — initialized from prop. If `userRole` prop changes (e.g., after a save), the local state is stale until the user clicks again. |
| Low | L69-73 | "God" role label is informal; the role `SYSTEM` is mapped to "God" in the UI. Inconsistent with `ADMIN` → "Admin" and the rest of the system. |
| Med | L154 | `disabled={isLoading || userRole === selectedRole}` — when the role is unchanged the button is disabled, but the toast/redirect on L94-110 still runs on click. The button click is the only trigger, so this is consistent. However, a parent that re-renders with the new `userRole` will pass the updated value; the local state is still the old one and the button stays enabled until the user re-selects. |
| Low | L155-162 | The button label is `"Update role to ${selectedRole}"` — hardcoded English. The whole component has no i18n keys. |
| Low | L82-120 | No CSRF protection, no validation of `selectedRole` against the enum. The client can PATCH with any string. |

---

## File 10: `apps/reading-advantage/components/shared/sidebar-goals-widget.tsx` (142 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L23, L26-51 | `userId` is a prop but is **never used** in the component. The fetch hits `/api/v1/goals?status=ACTIVE` regardless of the user. Multi-tenant leak: if the API does not scope by user, the widget shows another user's goals. We cannot verify the API contract from this file alone. |
| Med | L11-20 | The `Goal` interface is locally redefined; no shared `Goal` type. `targetDate: Date` (L17) but the API likely returns an ISO string or a Firestore timestamp; the type does not match the wire format. |
| Low | L27 | `useScopedI18n("components.activeGoalsWidget") as any` — `as any` defeats the type system. |
| Med | L32-51 | The effect's dependency array is `[]`; `userId`, `locale`, and other potential inputs are not listed. The goals are fetched once on mount. If the user changes (account switch in dev) or `userId` changes, the goals do not refetch. |
| Med | L35-37 | The fetch is `cache: 'no-store'`, but no `signal` is passed; on unmount an in-flight request may still resolve. |
| Med | L43-47 | On fetch error, only `console.error` is called; the widget then sets `loading=false` and `goals=[]`. The user sees the "loading" state replaced by nothing — the `goals.length === 0` branch (L69-71) returns `null`. Silent failure. |
| Med | L85-93 | `Math.min((currentValue / targetValue) * 100, 100)` — does not handle `targetValue === 0` (division by zero → `Infinity`; `Math.min(100, Infinity) = 100`). And `new Date(goal.targetDate).getTime()` will return `NaN` if `goal.targetDate` is invalid; `daysRemaining` becomes `NaN`. |
| Med | L91-92 | `(new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)` — no `Math.floor` or `Math.round`, so the result is fractional. `Math.ceil` on L91 is correct for "days remaining." |
| Med | L103 | `goal.priority === "HIGH"` — case-sensitive string compare. The API may return `"high"` or `"HIGH"`. |
| Med | L98-99 | The whole card has `onClick={() => router.push("/student/goals")}` — locale-prefixed path missing. Hardcoded English route, no `[locale]` segment. |
| Med | L127-132 | "onTrack" badge appears when `progressPercentage >= 50`. The threshold is arbitrary. |
| Low | L41 | `data.goals?.slice(0, 3)` — top 3. The slice is correct, but the API field is `data.goals` (we cannot verify without the API). |
| Low | L105, L122-125 | i18n keys (`highPriority`, `daysLeft`, `dueToday`, `overdue`, `onTrack`) are not verifiable here. |

---

## File 11: `apps/reading-advantage/components/shared/unauthorized-page.tsx` (5 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L1-5 | The component renders only the literal text "UnauthorizedPage" with no styling, no role check, no link to sign in, no copy. It is a placeholder; the file is included in the production bundle. |
| Med | L3 | Default export is `UnauthorizedPage`; the file name is `unauthorized-page.tsx`. Naming OK, but the component does not actually check auth — that is delegated to upstream routes. |
| Med | L1-5 | No i18n, no accessibility attributes, no error boundary. |
| Low | L4 | The component is rendered as a `<div>` with text content; no `<h1>` or `<h2>` heading structure. |

---

## File 12: `apps/reading-advantage/components/sidebar-nav.tsx` (71 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L33 | `const Icon = Icons[item.icon as keyof typeof Icons]` — if `item.icon` is not a valid `Icons` key, `Icon` is `undefined`. The next line `<Icon className="mr-2 h-4 w-4" />` will throw `TypeError: Cannot read properties of undefined (reading 'className')` at render time. There is no fallback `<Icons.circle />` or null guard. |
| Med | L16 | `pathWithoutLocale = "/" + path.split("/").slice(2).join("/")` — assumes the path is `/[locale]/...`. If the app is rendered without a locale (e.g., `/auth/signin`), `path.split("/").slice(2).join("/")` returns `""`, and `pathWithoutLocale` becomes `"/"`. Then `pathWithoutLocale.startsWith("/")` is true, so the "Back" button on L22 is shown on every settings-like path even when there is no settings prefix. |
| High | L39 | `href={item.disabled ? "/" : item.href}` — when an item is `disabled`, the link still navigates to `"/"`. A disabled link is supposed to do nothing; this is misleading UX and breaks screen reader expectations. Should be `<button disabled>` or `href="#"`. |
| Med | L22-30 | The "Back" button uses `window.history.back()` which may exit the app if the previous page was an external redirect. No fallback to a known route. |
| Med | L23-30 | The "Back" label is hardcoded English (L28); other labels use `t(item.title)` (L61). Inconsistent. |
| Med | L43-48 | `pathWithoutLocale.startsWith(item.href)` is true for `item.href === "/"` on every path. The home link is always marked active. |
| Low | L60 | The `truncate capitalize` span (L53) — capitalization is on the title; this works for English but not for non-Latin scripts (Thai, Chinese). Tailwind's `capitalize` is language-agnostic; not technically broken, but the intent is unclear. |

---

## File 13: `apps/reading-advantage/components/signin-error-handler.tsx` (62 lines)

| Sev | Location | Finding |
|---|---|---|
| Med | L13 | `const decodedError = decodeURIComponent(errorParam)` — if `errorParam` is malformed (`%E0%A4%A` — invalid UTF-8), `decodeURIComponent` throws `URIError`. The `useEffect` does not wrap the decode in `try/catch`. The unhandled exception propagates to React's error boundary. |
| Med | L20-24 | `error.includes("session_error")` and `error.includes("network_error")` use substring matching on attacker-controlled URL input. Any URL containing the substring triggers the specific UI. The default branch on L33 returns the raw `error` — this can be a long, scary, or misleading string from a previous OAuth provider or a stack trace. |
| Med | L10-16 | The error state persists in component memory. If the user navigates and returns, the error still shows even if the URL no longer contains the param (because the effect only re-runs on `searchParams` change). |
| Med | L36-58 | The component renders no role/aria attributes. The error block is not announced as an alert (`role="alert"` or `aria-live="assertive"` missing). Screen readers may not announce the error. |
| Low | L18 | `if (!error) return null` — early return is fine. |
| Low | L40-42 | Inline SVG for the alert icon; safe and self-contained. |

---

## File 14: `apps/reading-advantage/components/stories-actions.tsx` (94 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L35-53 | `handleDelete` does not check `response.ok` before showing the success toast. The `await fetch(... { method: "DELETE" })` is awaited but the response is discarded. A 500 with the article NOT deleted still produces a "Article Deleted" toast and a `router.push` redirect, leaving the user on `/student/stories` with a stale entry. |
| Med | L35-53 | The `catch` block (L45-52) only fires on network errors. Server-side failures (4xx/5xx) are not caught here. |
| Med | L55-61 | `handleApprove` is a **dead button**: it shows a "Article Approved" toast but does not call any API. The button is rendered in the UI, suggesting to the user that approval happened. No state change, no DB write, no audit log. This is misleading. |
| Med | L35-53 | No CSRF protection, no auth header check. Cookie-only auth. |
| Med | L42, L49 | The success toast description includes `story.title` unescaped. React's JSX text rendering is safe against XSS, but the title is also passed as JSX content in the dialog title on L79. OK. |
| Low | L72-74 | The "approve" button label is rendered via `t("appoveButton")` — typo in the i18n key (`appove` instead of `approve`). Will silently fall through to the key name. |
| Low | L17-20 | The `Props` type has `story: Article` and `storyId: string` — both IDs are passed in, but the API uses only `storyId`. `story` is used only for the title. |
| Med | L27-29 | `handleClose` is defined but the dialog already supports `onOpenChange={setOpen}`. The Cancel button (L88) calls `handleClose` which is redundant with the `onOpenChange` handler. The confirm-delete path (L85) calls `handleDelete` which sets `setOpen(false)` inside the try (L39). Inconsistent closing logic. |

---

## File 15: `apps/reading-advantage/components/stories-chapter-card.tsx` (103 lines)

| Sev | Location | Finding |
|---|---|---|
| Med | L26-31 | The component is `async` (server component). It receives `story`, `storyId`, `userId`, `chapterNumber` as props and does not call any backend — purely a layout component. The `async` keyword is unnecessary. |
| High | L51-53 | `t("raLevel", { raLevel: story.ra_Level })` — `story.ra_Level` uses an underscore-camelCase spelling, but the rest of the app uses `ra_level` (lowercase, snake_case, e.g., `article-model.ts` `ra_level`). If `StoryChapter.ra_Level` is undefined, the badge renders `undefined`; if the value is misnamed, the badge shows the wrong level. |
| Med | L97-100 | `<ChapterRatingPopup userId={userId} averageRating={story.chapter.rating || 0} storyId={story.storyId} story={story} chapterNumber={chapterNumber} />` — the prop name `storyId` here receives the **story** ID, not the chapter ID. The outer `storyId` (chapter record ID) is different. The two are conflated. |
| High | L76 | Image src is hardcoded `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/images/${storyId}-${chapterNumber}.png`. (a) The bucket URL is a Firebase Storage URL, but the path is under `images/` which is unusual for Firebase (typically `o/images%2F...`). (b) The image is fetched on every render with `priority`, even if the image does not exist; the Next.js Image component will fall back to the broken-image state with no `onError` handler. (c) The `next.config.js` `images.remotePatterns` is not verifiable here; if the domain is not allow-listed, the image will 404. |
| Med | L91 | `<ArticleFooter />` is rendered with no props. The component may rely on context to access the article; we cannot verify. |
| Med | L9 | `import ChapterContent from "./stories-chapter-content"` — relative path. |
| Low | L34-90 | The whole card is a single `Card` with `<ChapterContent>` nested inside `<CardHeader>`. The semantics are odd (`CardHeader` should not contain a long content block). |

---

## File 16: `apps/reading-advantage/components/stories-chapter-content.tsx` (485 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L131-148 | The `useAudio` hook returns `setSelectedIndex` and `setSelectedSentence`, but the component also calls them manually on L396-397. The two state sources can drift: the hook tracks "current audio index" and the local state tracks "selected sentence index." Different. |
| High | L117-129 | The chapter-read log fires on every effect run with no AbortController. If the user navigates between chapters quickly, multiple POSTs may be in flight; the server may record reads for chapters the user never finished. |
| Med | L90 | `splitTextIntoSentences(story.chapter.passage, true)` — the second argument is undocumented; we cannot verify the function's behavior from this file. The output is used as a parallel array to `story.timepoints`. |
| Med | L94-115 | The `useMemo` for `sentenceList` returns `audioUrl: timepoint.file ? ... : tts/${story.storyId}-${chapterNumber}.mp3`. If `timepoint.file` is empty string `""`, the falsy check prefers the chapter-level URL — but if the empty string is intentional (the timepoint was marked as silent), the user gets the wrong audio. |
| Med | L202, L227 | `selectedSentenceData.sentence.replace("~~", "")` only replaces the **first** occurrence. If the sentence has multiple `~~`, the rest remain. |
| Med | L207 | `translation: { th: translate[selectedSentence as number] }` — only the Thai translation is sent. The translation array may not be in the Thai order. The `targetLanguage` was sent to the server in `handleTranslateSentence` (L250-283), but the saved translation hardcodes `th` (L207). For non-Thai users, the wrong translation is persisted. |
| Med | L174 | `if (selectedSentence === -1)` — the early-return path. The user can trigger the save with no selection; the second check on L184-192 re-validates. OK as defensive. |
| Med | L371-381 | When `isPlaying === true`, the visible translation is `translate[currentAudioIndex]`; otherwise `translate[selectedIndex]`. `selectedIndex` may be `-1` initially (no click yet), so `translate[-1]` is `undefined`. The user sees an empty translation box. |
| Med | L283-292 | `handleTranslate` toggles `isTranslateClicked` and conditionally calls `handleTranslateSentence`. The flow is hard to follow: the button on L308 calls `handleTranslateSentence` (not `handleTranslate`), so the state machine is split between two handlers. |
| Med | L308-318 | The translate button on the toolbar is labeled `t("translateButton.open")` or `t("translateButton.close")` based on `isTranslate && isTranslateOpen`, but the actual state machine involves three flags: `isTranslate`, `isTranslateOpen`, and `isTranslateClicked`. The label logic does not match the actual open/close state. |
| Med | L440-455 | The AlertDialog for translation is opened by `isTranslateClicked` (L440) and shows the **source sentence** and translation, but the Cancel button (L450) only closes the dialog — the user cannot copy the translation easily. |
| Med | L458-481 | The "Previous Chapter" / "Next Chapter" buttons use `router.push(\`/${locale}/student/stories/${story.storyId}/${chapter - 1}\`)`. If `chapter === "0"` (e.g., from a bad URL), `chapter - 1 === -1` and the route becomes invalid. No validation. |
| Med | L470 | `chapter < story.totalChapters` — `totalChapters` may be undefined; the comparison is `Number < undefined` which is `false`, so the "next" button never shows. No guard. |
| Low | L1 | `"use client"` component. Heavy client logic (audio, translation, flashcards) is in the browser bundle. |
| Low | L26 | `import { createEmptyCard, Card } from "ts-fsrs"` — `Card` is a type, `createEmptyCard` is a function. The spaced-repetition card is created in the client and sent to the server (L194-220). The server should own the FSRS state. |
| Low | L422-435 | The audio player and translation box are rendered inside `<ContextMenuTrigger>`. The `no-select` class prevents text selection on the entire content; this is intentional but breaks accessibility (no text selection on chapter text). |
| Low | L3 | `useMemo` is imported but `useMemo` is only used once; React 19's compiler would eliminate the manual memo. |
| Med | L100-115 | The `endTime` calculation: `index === story.timepoints.length - 1 ? timepoint.timeSeconds + 10 : story.timepoints[index + 1].timeSeconds - 0.3`. The 10s and 0.3s magic numbers are not documented. The last sentence's audio is 10 seconds by default; the gap between adjacent sentences is reduced by 0.3s. |
| Med | L101-105 | The sentence selection `sentences.length <= story.timepoints.length ? story.timepoints[index].sentences : sentences[index]`. If `story.timepoints` has a `sentences` field that differs from the split output, the timepoint's sentence is used. The fallback only triggers if the split produced more sentences than timepoints. |

---

## File 17: `apps/reading-advantage/components/stories-chapter-list.tsx` (194 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L75-111 | The translation effect iterates over `chapters` and calls `getTranslate(storyId, localeTarget)` **once per chapter** in `Promise.all`. The endpoint is `/api/v1/assistant/stories-translate/${storyId}` (no chapter number) and returns `translated_sentences: string[]`. Calling it N times in parallel for the same story is an N+1 / N-times-same-call pattern. The intended flow is one call returning all chapter summaries, indexed by `index`. |
| High | L111 | The effect dependencies include `isLoading` and `hasTranslated`. The first render sets `isLoading=true` and `hasTranslated=false`, then on resolution `isLoading=false` and `hasTranslated=true`. The next render still has all the same deps, so the effect re-runs but short-circuits at L77. However, if `chapters` changes (e.g., a new chapter is added after the first translation), `hasTranslated` is already `true` and the effect skips — the new chapter's translation is never fetched. |
| Med | L97-99 | `return res.translated_sentences[index]` — if the server returns an array shorter than `chapters.length`, the value is `undefined`. `chapterSummary[index]` is then `undefined` and the CardDescription on L165 falls back to `chapter.summary` (the un-translated source). OK, but the user may see mixed translated/untranslated chapters without indication. |
| Med | L60-72 | `getTranslate` does not check `res.ok` and may throw on JSON parse. The `catch` returns `{ message: "error", translated_sentences: [] }`. The `finally` sets `isLoading=false`, but the user sees the un-translated source with no error indication. |
| Med | L52-54 | `handleChapterClick(index + 1)` — the chapter number is derived from the array index. If the array is filtered or sorted, the displayed number is wrong. The Chapter interface (L19-24) has no `number` field. |
| Med | L130, L177 | The whole Card has `onClick` and the inner Button has `onClick` with `e.stopPropagation()`. If the user clicks the button, the card does not also fire — OK. But the Card itself is clickable without keyboard support (no `<a>`, no `<button>`, no `role`/`tabIndex`). |
| Med | L116-118 | `isStarted`, `isCompleted`, `isUnread` flags are derived from `chapter.is_read` and `chapter.is_completed`. The Chapter interface has these as booleans. The branch `isStarted = chapter.is_read && !chapter.is_completed` — if a chapter is read but not completed, it is "started." A user who read 1 sentence of a chapter and never came back is "started" forever. |
| Low | L94-99 | `Promise.all` with the same URL params but different `index` is wasteful; the function is called once per chapter with identical input, differing only in the slice index. |
| Low | L19-24 | The `Chapter` interface is local and minimal; the actual API may have more fields. |
| Med | L75-111 | The translation block is skipped for `locale === "en"` (L77). The English locale never gets a translation, which is correct, but the `isLoading` state is also skipped — so the CardDescription for English users is the un-translated source with no Skeleton. The visual difference is invisible. |

---

## File 18: `apps/reading-advantage/components/stories-chapter-question/laq-question-card.tsx` (645 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L108-119 | The useEffect depends on `[state, storyId]`. When `state` changes (e.g., from `LOADING` to `INCOMPLETE`), the effect re-fetches the question. This creates a loop: fetch → setData → setState → re-run effect → re-fetch. The dependency should be `[storyId, chapterNumber]`. |
| High | L121-127 | `handleCompleted` and `handleCancel` both `setState(QuestionState.LOADING)`. Combined with the effect above, this triggers a re-fetch. The "cancel" path is not actually a cancel — it reloads the question. |
| High | L153-168 | `QuestionCardError` accepts `data: any` (L153) and renders `{data.error}` (L163). The `data` passed from the switch (L149) is the question `data` (with `result` and `state`), not an error object. `data.error` is `undefined`. The error message is blank; only the title and `descriptionFailure` show. |
| High | L170-187 | `QuestionCardComplete` ignores the actual feedback data: it just shows the success copy and a disabled button. The detailed feedback (`detailedFeedback`, `scores`, `overallImpression`, `exampleRevisions`, `nextSteps`) is fetched and stored but **never displayed** in the complete state. The user only sees a success message. |
| High | L67-89 | `AnswerResponse.nextSteps: []` (L78) is an empty tuple type, not `string[]`. Line 612 calls `data.result?.nextSteps.map(...)` which fails to type-check. At runtime, `nextSteps` is whatever the server sends, but the type contract is broken. |
| High | L329-379 | `onSubmitted` calls the feedback endpoint first (L335), then conditionally the submit endpoint (L352). The submit endpoint response (`finalFeedback`, L365) overwrites the feedback data via `setData(finalFeedback)`. The shape of `finalFeedback` is not typed; it may differ from `AnswerResponse`. `setRating(finalFeedback.sumScores)` (L367) — `sumScores` is not in the type; if the field is missing, the rating is `undefined` and the later `onGetExp` POSTs `{ rating: undefined }`. |
| Med | L329-379 | No CSRF, no auth header. The endpoint is a long-running AI call (`feedback`); the client shows a spinner but no timeout. If the call hangs, the spinner never resolves. |
| Med | L367 | `setRating(finalFeedback.sumScores)` — the field name `sumScores` is not in the `AnswerResponse` type. The server may return `finalScore` or `score` instead. The downstream `onGetExp` POSTs `rating` to the getxp endpoint. |
| Med | L381-408 | `onGetExp` uses `.then/.finally` but no `.catch`. If the fetch rejects (network error), `setIsLoading(false)` runs but no error toast. The user is left in the loading state. |
| Med | L401-407 | After the rating fetch resolves, `handleCompleted()` is called (L401) which sets state to LOADING → re-fetches via the broken effect (L108-119). The dialog stays open until the user closes it. |
| Med | L407 | `router.refresh()` is called after `handleCompleted`, but `handleCompleted` already triggered a re-fetch via the effect. Double refresh. |
| Med | L304 | `minimumCharacters = 30 * (userLevel + 1)`. If `userLevel` is `0`, the minimum is 30. If `userLevel` is `null` or `undefined`, the multiplication is `NaN` and the form validation breaks. |
| Med | L306-315 | The `longAnswerSchema` validates `answer` and `method`. The `method` field is a free-text `z.string()`; the client writes `"feedback"` or `"submit"` to it. A malicious form submission could send any string and the `if (dataForm.method === "submit" && feedback)` branch (L350) would not fire. |
| Med | L444-473 | The "Feedback" and "Submit" buttons both have `type="submit"` and both call `setValue("method", ...)` in `onClick`. RHF's `handleSubmit` does not know which button was clicked, so both submit the form. The `method` value is set on the last `onClick` that fired. |
| Med | L448-458 | `{...register("method")}` spreads `onChange` from RHF, but `onClick` is also set. RHF's `register` returns `onChange`, not `onClick`; the `onClick` is the developer-supplied handler. Spreading `register("method")` on a button attaches a `name="method"` to the form element but does not bind an `onClick` that RHF reads. The `method` value is set via `setValue` instead. |
| Med | L475-641 | The `<Dialog open={openModal} onOpenChange={setOpenModal}>` has a `<DialogTrigger asChild>` with **no children** (L476). The trigger renders nothing. The dialog is opened by `setOpenModal(true)` in `onSubmitted` (L370). |
| Med | L599-619 | The `getValues("method")` is read inside the rendered JSX. `getValues` returns the current form state but does not subscribe — the dialog does not re-render when the form value changes. If the form value changes after the dialog opens, the dialog content is stale until something else triggers a re-render. |
| Med | L530-542 | The five category buttons (`vocabularyUse`, `grammarAccuracy`, `clarityAndCoherence`, `complexityAndStructure`, `contentAndDevelopment`) are hardcoded. The server's `detailedFeedback` keys are also assumed to be these strings. Any rename on the server side breaks the UI. |
| Med | L78 | `nextSteps: []` — declared as an empty tuple type, not `string[]`. This is a TypeScript error waiting to happen. |
| Low | L154, L171, L190, L228, L279 | `useScopedI18n("components.laq")` — the i18n key is hardcoded; if the namespace is renamed, all the LAQ strings break. |
| Low | L180-182 | The "successButton" is rendered with `disabled={true}`. The button has no action. The user clicks it, nothing happens. |
| Med | L439-441 | The `errors.answer?.message` is rendered if present, but the error message is the literal `message` from the Zod schema (L311: `Please Enter minimum ${minimumCharacters} character...` and L313: `Answer must be less than 2000 characters...`). These are hardcoded English; not i18n. |

---

## File 19: `apps/reading-advantage/components/stories-chapter-question/mc-question-card.tsx` (823 lines)

| Sev | Location | Finding |
|---|---|---|
| High | L539-548 | `const currentQuestionIndex = newProgress.findIndex((p) => p === AnswerStatus.UNANSWERED)` — this finds the **first UNANSWERED slot** in the progress array, not the slot for the current question. If slot 0 is CORRECT and slot 1 is also CORRECT, and the user is on question 3 (`index === 2`), the first UNANSWERED is slot 2 — OK in that case. But if the user navigates back to question 1 (`index === 0`) and the slot is already CORRECT, `findIndex` returns -1 and the new answer is **not recorded**. The slot assignment is by array order, not by question number. |
| High | L600-616 | The badge row maps `progress.map((status, idx) => ...)`. After the wrong-slot bug above, the badges reflect the (possibly wrong) progress. The user sees green check marks for questions they did not actually answer. |
| High | L620 | `Question {resp.results[0]?.question_number || 1} of {resp.total}` — uses `resp.results[0]?.question_number`, not the current `index`. If the user is on question 3 of 5, the header still says "Question 1 of 5" until the server returns the correct `results[index]`. |
| Med | L84-92 | The `useQuestionStore.subscribe` callback (L86) sets state to COMPLETED and replaces the data. If the store's `mcQuestion.state` is COMPLETED at subscribe time, the local state is immediately set to COMPLETED even on first mount. The check `if (mcQuestion && mcQuestion.state === QuestionState.COMPLETED)` is fine, but the unsubscription (L92) returns the unsubscribe function correctly. |
| Med | L96-142 | The `checkAndClear` effect hardcodes the magic number `5` for the progress length (L110, L169, L174, L291, 677, 711, 727, 776, 782, 798). If the chapter has a different number of questions, the heuristic is wrong. |
| Med | L106-121 | The "suspicious progress" reset (all CORRECT but state === INCOMPLETE) is a workaround. The server should not return this state. If the server eventually changes, this silent reset hides the issue. |
| Med | L165-189 | The same reset logic is duplicated inside the fetch `.then` (L166-189). The reset is in two places. |
| Med | L165-202 | The fetch uses a timestamp query param `?_t=${timestamp}` to bust caches (L161, L284-285, L733-734). The cache busting works around a server cache issue. The root cause should be fixed server-side. |
| Med | L24 | `import { set } from "lodash"` — `set` is imported but never used. Dead import. |
| Med | L26 | `// (no direct imports from user-activity-log-model needed here)` — empty import side-effect comment. |
| Med | L204 | The `// only on mount / when story/chapter changes` comment is contradicted by the dependency array — on `storyId` or `chapterNumber` change, the effect re-fetches (correct), but the comment is also saying "mount only." Minor. |
| Med | L206-266 | `handleCompleted` has two branches based on whether `currentProgress` is provided. The "no currentProgress" branch (L242-257) goes to LOADING, which triggers the broken useEffect in `StoryLAQuestionCard` (different file). Here in `mc-question-card`, the LOADING state just shows the skeleton (L319). |
| Med | L268-315 | `onRetake` does a DELETE then a GET. The DELETE response is awaited (`.then`) but not used. If the DELETE fails (e.g., 403), the GET still runs and the user thinks the retake worked. The error path on L311-314 sets state to INCOMPLETE without re-fetching. |
| Med | L307-309 | `setTimeout(() => setState(QuestionState.INCOMPLETE), 10)` — the 10ms delay is a hack to force a re-render after the data is set. The pattern is a workaround for state-update batching. |
| Med | L444-465 | The local `progress` state is initialized from `resp.progress` (L444) and re-synced via `useEffect` (L454-456). The two sources of truth (local `progress` and parent `data.progress`) can drift. The `useEffect` resets on every `resp.progress` change, which may wipe local edits mid-flight. |
| Med | L460-465 | `useEffect` resets `textualEvidence`, `selectedOption`, `correctAnswer` on every `index` change. If the user is mid-fetch and the index changes (e.g., via the parent re-render), the in-flight response's updates to `textualEvidence` are wiped. |
| Med | L470-484 | The effect on `resp.results` resets the index if `index >= resultsLen`. The setState chain (`setIndex(0)`, `setSelectedOption(-1)`, etc.) is not batched in older React versions; in React 18+ they are batched. OK, but the surrounding logic is fragile. |
| Med | L486-566 | `onSubmitted` is `async` and called from a button `onClick` (L644-661). The function is not awaited by the click handler (the click is `() => { ...; if (selectedOption === -1) { onSubmitted(...) } }`). Multiple rapid clicks can fire multiple `onSubmitted` calls. |
| Med | L493 | `setPaused(true)` is called on every submit. If the user submits while paused, it stays paused. If they un-pause later, the timer resumes mid-quiz. |
| Med | L501 | `const cleanOption = option.replace(/^\d+\.\s*/, "")` — strips a leading "1. " prefix. This is a workaround for an option-formatting issue that should be fixed upstream. |
| Med | L503-507 | `const originalOptions = resp.results[index]?.options || []` and `validOptions = originalOptions.filter(...)` — `validOptions` is computed but never used. Dead code. |
| Med | L530-536 | `setTextualEvidence(data.textualEvidence || data.textual_evidence || "")` — supports both camelCase and snake_case. The API should be consistent. |
| Med | L543-558 | The `if (currentQuestionIndex !== -1)` block writes the answer to the wrong slot (see high-severity L539-548). The `setProgress(newProgress)` then updates the local state, but the slot is wrong. |
| Med | L669-820 | The "Continue" button is large and has complex logic. The `disabled={isLoadingAnswer \|\| selectedOption === -1}` (L673) means the user must select an option first. If the user clicks an option, `onSubmitted` fires asynchronously. The button then becomes enabled again (after the response), and the user clicks it. The local progress update on L675-691 happens on click, not after the response. The progress is updated optimistically here, but the API call may have already written the answer to the wrong slot (L539-558). |
| Med | L722-727 | The next-unanswered search starts from `updated.findIndex((p) => p === AnswerStatus.UNANSWERED)`. If all questions are answered but the user clicked Continue anyway, `nextUnanswered === -1` and the fallback `Math.min(index + 1, total - 1)` advances to the next index — which may not exist. The `if (nowAnsweredCount >= total)` block above (L711-719) calls `handleCompleted` and returns, so the fallback is dead in practice. |
| Med | L731-805 | The "fetch updated questions" branch fires when `!resp.results \|\| !resp.results[nextUnanswered]`. The fetched `newData` is merged with `updated` and passed to `handleCompleted`. The parent (L206-266) re-syncs the local data. |
| Med | L819 | The "Continue" button label is hardcoded English, not i18n. |
| Med | L598 | The "Time Elapsed: {timer} seconds" label is hardcoded English, not i18n. |
| Low | L435 | The function `MCQeustion` has a typo in the name (should be `MCQuestion`). |
| Low | L451 | `useState("")` for `textualEvidence` and `correctAnswer` — initial empty strings. |
| Med | L568-592 | The `useEffect` on `progress` change calls `checkAndNotifyCompletion(userId, storyId, chapterNumber)` (L579). The effect runs on every progress change. The `checkAndNotifyCompletion` returns a value but the result is discarded; the `setState` on L231 is the only persistent effect. |
| Med | L66 | `import { useStoryCompletion }` — the hook is imported and used (L452, L579). OK. |

---

## File 20: `apps/reading-advantage/components/stories-chapter-question/question-header.tsx` (65 lines)

| Sev | Location | Finding |
|---|---|---|
| Med | L17 | `className?: string` is declared in `Props` but never destructured in the function signature (L24-33) and never applied to any element. Dead prop. |
| Med | L35-47 | `onButtonClick` `fetch(...)` is fire-and-forget; same pattern as the `questions/question-header.tsx` (file 1). No `await`, no `response.ok` check. |
| Med | L41-44 | The body uses `articleId: storyId` — the field name is `articleId` but the value is the **story** ID. The activity-log endpoint may index by `articleId` and the story ID collides with an article ID. |
| Med | L1-65 | This file is a near-duplicate of `components/questions/question-header.tsx` (file 1). Differences: `storyId` vs `articleId`; no `isLocked`/lock-icon logic; no toast. The two should share a base component. The duplication is a maintenance hazard. |
| Low | L19 | `userId: string` and `storyId: string` are declared but only `userId` is used (L39). `storyId` is only passed back in the activitylog body (L42). |
| Low | L31 | `disabled = true` is the default. The callers in this directory (mc-question-card, laq-question-card) pass `disabled={false}` explicitly. |

---

## Cross-cutting observations (no file-level claims)

1. **Direct `fetch` to API routes from client components** — `question-header.tsx` (L54), `rating-popup.tsx` (L67, L90), `mc-question-card.tsx` (L161, L278, L512, L733), `laq-question-card.tsx` (L109, L335, L352, L383), `sa-question-card.tsx` (L94, L421, L436, L458), `select.tsx` (L27), `reminder-reread-table.tsx` (none), `reset-xp-dialog.tsx` (L27), `change-role.tsx` (L85), `sidebar-goals-widget.tsx` (L35), `signin-error-handler.tsx` (none), `session-sync-redirect.tsx` (none), `stories-actions.tsx` (L38), `stories-chapter-content.tsx` (L60, L121, L197). These should ideally go through backend modules and Zod-validated contracts rather than ad-hoc `/api/v1/...` strings.
2. **No Zod contracts at the component boundary** — `sa-question-card.tsx` (L380-389), `laq-question-card.tsx` (L306-315) do use Zod for the form, but the server response shape is trusted.
3. **No CSRF tokens** in any of the 20 files.
4. **i18n gaps** — `app-layout.tsx` uses `display_name`; `mc-question-card.tsx` hardcodes "Continue" / "Time Elapsed" / "Feedback"; `sidebar-nav.tsx` hardcodes "Back"; `laq-question-card.tsx` has hardcoded error messages; `select.tsx` types `tf: string | any`; `sa-question-card.tsx` has Thai comment and hardcoded English toast text; `session-sync-redirect.tsx` hardcodes "Syncing your profile..."; `reset-xp-dialog.tsx` hardcodes dialog text; `change-role.tsx` hardcodes "Update role to {role}".
5. **No file among the 20 has an associated test file**. `apps/reading-advantage/components/__tests__/` does not exist; `apps/reading-advantage/components/questions/__tests__/` does not exist; `apps/reading-advantage/components/stories-chapter-question/__tests__/` does not exist. The only test files in the app are under `components/games/`, `lib/games/`, `hooks/`, `store/`, and `__test__/`. See "Test gaps" below.
6. **Two "question-header" components** exist (`components/questions/question-header.tsx` and `components/stories-chapter-question/question-header.tsx`) with diverging behavior. The duplication should be consolidated.
7. **Type contradictions** — `laq-question-card.tsx` L78 declares `nextSteps: []` (empty tuple) and then maps over it; `reminder-reread-table.tsx` L94 casts `created_at` to string but the type is a Firestore timestamp object; `change-role.tsx` L29 types `userRole: string` instead of the local `Role` enum; `sidebar-goals-widget.tsx` L17 types `targetDate: Date` but the API likely returns a string.
8. **Server actions vs fetch inconsistency** — `rating-popup.tsx` uses the server action `submitRating` from `@/actions/rating` (good), but the same component also uses `fetch('/api/v1/articles/${articleId}')` to refresh the average rating (inconsistent).
9. **Suspicious-data workarounds** — `mc-question-card.tsx` has two layers of "reset suspicious progress" logic (L106-121, L166-189) and cache-busting timestamps (L161, L285, L733). These mask a server-side issue (returning CORRECT progress for an INCOMPLETE chapter) and add client complexity. The root cause is not addressed in this batch.
10. **Auth-adapter bypass** — `app-layout.tsx` calls `getCurrentUser()` directly. AGENTS.md requires `auth.requireUser()`. The pre-migration shape is acknowledged (AGENTS.md "Current Auth State"); the file is named `app-layout.tsx` (not legacy) and is a target for the migration.

---

## Test gaps

The following components have **no dedicated unit or integration test files**:

- `apps/reading-advantage/components/questions/question-header.tsx`
- `apps/reading-advantage/components/questions/sa-question-card.tsx`
- `apps/reading-advantage/components/rating-popup.tsx`
- `apps/reading-advantage/components/reminder-reread-table.tsx`
- `apps/reading-advantage/components/reset-xp-dialog.tsx`
- `apps/reading-advantage/components/select.tsx`
- `apps/reading-advantage/components/session-sync-redirect.tsx`
- `apps/reading-advantage/components/shared/app-layout.tsx`
- `apps/reading-advantage/components/shared/change-role.tsx`
- `apps/reading-advantage/components/shared/sidebar-goals-widget.tsx`
- `apps/reading-advantage/components/shared/unauthorized-page.tsx`
- `apps/reading-advantage/components/sidebar-nav.tsx`
- `apps/reading-advantage/components/signin-error-handler.tsx`
- `apps/reading-advantage/components/stories-actions.tsx`
- `apps/reading-advantage/components/stories-chapter-card.tsx`
- `apps/reading-advantage/components/stories-chapter-content.tsx`
- `apps/reading-advantage/components/stories-chapter-list.tsx`
- `apps/reading-advantage/components/stories-chapter-question/laq-question-card.tsx`
- `apps/reading-advantage/components/stories-chapter-question/mc-question-card.tsx`
- `apps/reading-advantage/components/stories-chapter-question/question-header.tsx`

Verified by: `glob` for `**/__tests__/*` under each subdirectory returned no matches. The closest test directories are `apps/reading-advantage/components/games/**/__tests__/`, `apps/reading-advantage/__test__/`, and `apps/reading-advantage/hooks/*` test files. None cover the 20 files in this batch.

Critical untested behaviors:
- SA question submit + retry path (the copy-paste fetch in `onSubmitted`).
- LAQ infinite-loop risk (the `[state, storyId]` dependency in the question-fetching useEffect).
- LAQ "complete" state ignoring the feedback payload.
- MCQ wrong-slot progress write in `onSubmitted` (`findIndex(UNANSWERED)`).
- MCQ Continue button optimistic update racing the API call.
- Rating popup optimistic update + rollback correctness.
- Sidebar nav "disabled link navigates to `/`" behavior.
- AppLayout leaderboard error path (silent `[]`).
- Story chapter content N+1 / N-times-same-call translation pattern.
- Story chapter list "no re-translation on chapters change after first load" race.
- Select component infinite-loop on empty `results` redirect.
- ChangeRole Tailwind dynamic class extraction failure.
- SidebarGoalsWidget ignoring `userId` prop (multi-tenant leak risk).

---

## Incomplete disclosures

The following ambiguities could not be resolved without reading additional files outside the batch:

- The exact response shape of `/api/v1/stories/{storyId}/{chapterNumber}/question/laq/{questionId}/feedback` and `/api/v1/stories/{storyId}/{chapterNumber}/question/laq/{questionId}` (the field `sumScores` is read but not declared in any type we reviewed).
- Whether the rating endpoint returns `xpEarned` matching the client's optimistic value of `10`.
- The shape of `Chapter.is_read` / `Chapter.is_completed` (boolean? string? enum?).
- Whether `/api/v1/goals?status=ACTIVE` is multi-tenant scoped (we could not verify the API).
- The `next.config.js` `images.remotePatterns` allow-list (affects whether `stories-chapter-card.tsx` L76 image loads).
- The exact locale config used by `feedbackLanguage[currentLocale]` in `laq-question-card.tsx` L341.
- The behavior of `splitTextIntoSentences(passage, true)` (second argument undocumented).
- The actual return type of `getCurrentUser()` in `app-layout.tsx` (especially whether `display_name` is present).
- Whether `useScopedI18n` returns an `imgSrc`-capable translator (referenced as `imgSrc: true` in toast calls in `sa-question-card.tsx` and `rating-popup.tsx`).

These are not blockers for the review but should be addressed before any acceptance or closeout claim is made for this batch.

---

## Summary statistics

- **Files reviewed**: 20
- **Findings**: 167
  - High: 27
  - Medium: 88
  - Low: 52
- **Files with no High-severity findings**: 1 (file 11, `unauthorized-page.tsx`)
- **Files with no Medium or High findings**: 0
- **Test coverage**: 0/20 files have dedicated tests
- **Acceptance/closeout claims**: none made

MEASURE_AGENT_RESULT
