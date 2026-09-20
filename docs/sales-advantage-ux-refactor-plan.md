# Sales Advantage UX Refactor Plan

Date: 2026-09-19. Scope: `apps/sales-advantage`. Method: read-only audit of every user-facing page.

This plan follows the Ponytail Rules. Each fix reuses existing code, installed dependencies, or the platform. No new dependencies.

## 0. Application shape

The application is small. It holds 108 TypeScript files and about 7,800 non-test lines. It has 6 pages,
4 layouts, and 12 route handlers. Nine of the ten user-facing files are client components. The data
layer is tRPC through `app/api/trpc/[trpc]/route.ts`. Three routes bypass tRPC: `/api/chat`,
`/api/roleplay-attempts`, and `/api/lesson-complete`.

The route tree uses `app/[locale]` with `next-intl`. `i18n/routing.ts:3-7` declares two locales, `th`
and `en`, and `localePrefix: "always"`. `proxy.ts` redirects every unprefixed path.

The audit found 54 defects. The first one blocks the sign-in path for every anonymous visitor.

## 1. Summary of Findings

The audit found five systemic problems.

1. **The session route denies anonymous visitors, and the shared auth client reads that denial as a
   successful sign-in.** `app/api/auth/session/route.ts:8-15` answers an anonymous request with HTTP
   403. `packages/auth-client/src/provider.tsx:29-37` maps 403 to `isAuthenticated: true`. The landing
   page therefore skips `LoginForm` and shows "Dashboard unavailable". The sign-in form is unreachable
   in the default company mode.
2. **The audio recorder fails on Safari and reports the wrong cause.**
   `components/roleplay-recorder.tsx:56` hardcodes `mimeType: "audio/webm"`. Safari rejects that type.
   Line 73 then tells the user to allow microphone access. The recorder also leaks blob URLs and leaves
   the microphone open after an unmount.
3. **The message dictionary and the components disagree.** `messages/en.json` holds 129 keys. Fifteen
   keys have no caller. Three of them exist because the component beside them hardcodes the same English
   text. The chat route orders Thai output for every locale.
4. **Loading and error states are absent on three screens.** The admin curriculum page, the quiz card,
   and the theory lesson button show nothing when a request fails.
5. **The package declares twelve dependencies that no file imports, and imports one that it does not
   declare.** `next-themes` is one of the twelve, so the complete dark palette in `app/globals.css`
   never applies.

## 2. Session Contract and Sign-In (fix first)

This section blocks every other section. A visitor who has no session cannot sign in.

Issues:

- `app/api/auth/session/route.ts:8-15` returns HTTP 403 and `{ session: null, denied: true }` when
  `authenticateSalesRequest` returns `null`.
- `lib/company-oidc.ts:184-193` returns `null` for two different cases: the request carries no cookie,
  and the identity holds no Sales role. The route cannot separate the two cases.
- `packages/auth-client/src/provider.tsx:29-37` sets `isAuthenticated: true` and `isForbidden: true`
  for any 403. The anonymous visitor therefore looks signed in to every component.
- `app/[locale]/page.tsx:53` renders `LoginForm` only when `isAuthenticated` is false. That branch is
  dead in company mode.
- `app/[locale]/page.tsx:24-26` enables the dashboard query for the same visitor. The query fails, and
  line 57 renders "Dashboard unavailable".
- `app/[locale]/page.tsx` never reads `isForbidden`. The flag appears only in
  `app/[locale]/page.red.test.tsx`.
- `components/header.tsx:22-44` shows the Dashboard link and the logout button to the same anonymous
  visitor.
- `app/api/auth/session/route.test.ts:17,28` and `route.red.test.ts:65,75` pin the 403 with one mock
  that covers both cases. The tests cannot detect the defect.
- `apps/marketing/app/api/auth/session/route.ts:18` holds the correct contract. It returns 200 with
  `session: null` for an anonymous request, and 403 only when a session exists without a product role.

Plan:

1. Return 200 with `{ session: null }` when the request carries no session cookie. Reuse the marketing
   contract at `apps/marketing/app/api/auth/session/route.ts:18`. This is a three-line change.
2. Split `authenticateSalesRequest` into two results: "no session" and "no Sales role". Return a
   discriminated result, not `null`. This is about ten lines in `lib/company-oidc.ts`.
3. Render the `login.errorForbidden` message on the landing page when `isForbidden` is true. The key
   exists at `messages/en.json:21`. This is four lines.
4. Update the two session route tests to cover both cases separately.

## 3. Roleplay Recording and Evaluation

This cluster is the core product. It holds the most severe user-facing defects after section 2.

Issues:

- `components/roleplay-recorder.tsx:56` passes `{ mimeType: "audio/webm" }` to `MediaRecorder`. Safari
  and iOS reject that type and throw `NotSupportedError`. The code never calls
  `MediaRecorder.isTypeSupported`.
- `components/roleplay-recorder.tsx:72-75` maps every failure of `startRecording` to `t("micDenied")`.
  A Safari user reads "Please allow microphone access" after granting access.
- `components/roleplay-recorder.tsx:63` calls `URL.createObjectURL`. Lines 113-120 clear `audioUrl`
  without a matching `URL.revokeObjectURL`. Each retry leaks one blob.
- `components/roleplay-recorder.tsx` declares no cleanup effect. An unmount during recording leaves the
  `MediaRecorder` and the microphone track live. The browser keeps the recording indicator on.
- `components/roleplay-recorder.tsx:99-100` throws the raw response body as the error message. Line 214
  prints that body to the user. The text is untranslated and it exposes server wording.
- `components/roleplay-recorder.tsx:211-220` renders the error panel without `role="alert"`.
- `components/roleplay-recorder.tsx:145-162` shows no elapsed time and no maximum length during
  recording. `ROLEPLAY_MAX_AUDIO_DURATION_MS` already exists in `@reading-advantage/types`.
- `components/roleplay-recorder.tsx:92` sends `retentionDays: "30"` from the browser.
  `app/api/roleplay-attempts/route.ts:144-162` accepts any integer from 1 to 365 from the browser. The
  consent text at `messages/en.json:63` states 30 days. The retention period is client-authoritative.
- `app/api/roleplay-attempts/route.ts:194-205` logs a storage failure and continues. Line 251 stores
  `audioStorageKey: null`. The user reads a normal evaluation and never learns that the audio is gone.
- `app/api/roleplay-attempts/route.ts:184` hardcodes the `.webm` suffix in the object key. The key
  contradicts `mimeType` for every other accepted type.
- `components/roleplay-result.tsx:23-26` sets light-theme colors only: `bg-green-50`, `text-green-600`,
  `bg-amber-50`, `bg-red-50`.
- `components/roleplay-result.tsx:60,79,92` use the array index as the React key.
- `components/roleplay-result.tsx` declares no `aria-live` region. The score appears without an
  announcement.

Plan:

1. Select the recording type with `MediaRecorder.isTypeSupported`. Fall back to the browser default
   when `audio/webm` is absent. This is four lines.
2. Separate the two failure causes in `startRecording`. Report a device error apart from a permission
   error. This is six lines and one new message key per locale.
3. Call `URL.revokeObjectURL` in `reset()` and in an unmount effect. This is three lines.
4. Add one cleanup effect that stops the recorder and every track on unmount. This is six lines.
5. Delete the raw response body from the thrown error. Keep `t("errors.uploadFailed")`. This is one
   line.
6. Add `role="alert"` to the error panel. This is one line.
7. Move `retentionDays` to the server. Read it from a server constant. Delete the form field. This
   removes about eight lines.
8. Report a failed audio upload to the user. Return a flag from the route and render it.
9. Give the score panel a dark-theme color for each of the three bands.
10. Add `aria-live="polite"` to the result heading region.

## 4. Lesson, Quiz, and Chat

Issues:

- `components/quiz-component.tsx:93` labels the retry button with `t("submit")`, which reads "Submit".
  The message `roleplay.retry` already reads "Try Again".
- `components/quiz-component.tsx:38-40` declares `submitQuiz` with `onSuccess` only. A failed submit
  shows nothing. The button re-enables and the page does not change.
- `messages/en.json:86` sets `quiz.failed` to "Not passed. Try again." Line 53 of
  `components/quiz-component.tsx` renders that sentence inside a `Badge`.
- `components/quiz-component.tsx:46-99` replaces the question list with the result panel without an
  `aria-live` region and without a focus move.
- `app/[locale]/lesson/[id]/page.tsx:36-45` invalidates the lesson query and then calls `refetch()`.
  The lesson request runs twice for one click.
- `app/[locale]/lesson/[id]/page.tsx:36-45` declares no `onError`. A failed completion leaves the
  button enabled and shows nothing.
- `components/chat-tutor.tsx:44-66` streams the reply without an `AbortController`. A navigation away
  leaves the request open, and the reader still calls `setMessages`.
- `components/chat-tutor.tsx:86-101` renders the message list without `aria-live`. A screen reader
  never hears the coach reply.
- `components/chat-tutor.tsx:90` uses the array index as the React key.
- `components/chat-tutor.tsx:67` binds `err` and never reads it.
- `app/api/lesson-complete/route.ts` has zero references in the repository. The lesson page uses the
  tRPC mutation instead. Lines 17-21 read `lessonId` from the body with no Zod schema, unlike every
  other write route in the application.

Plan:

1. Add a `quiz.tryAgain` key to both locales and use it on the retry button. This is three lines.
2. Add `onError` to `submitQuiz` and render the message with `role="alert"`. This is six lines.
3. Shorten `quiz.failed` to "Not passed" in both locales. Keep the sentence out of the badge.
4. Add `aria-live="polite"` to the quiz result panel.
5. Delete the `refetch()` call in the lesson page. The invalidation already refetches. This is one
   line.
6. Add `onError` to `markComplete` and render the message with `role="alert"`.
7. Add an `AbortController` to the chat request. Abort it in the effect cleanup. This is six lines.
8. Add `aria-live="polite"` to the chat message list.
9. Delete `app/api/lesson-complete/route.ts`. It has no caller.

## 5. Administrator Pages

Issues:

- `app/[locale]/admin/curriculum/page.tsx:20` destructures `data` only. It ignores `isLoading` and
  `error`. A failed load renders an empty page with a heading and no message.
- `app/[locale]/admin/curriculum/page.tsx:21-25` declares the approve mutation with `onSuccess` only.
  A failed approval shows nothing.
- `app/[locale]/admin/curriculum/page.tsx:109` renders the Approve button without a pending state. Two
  clicks send two requests.
- `app/[locale]/admin/curriculum/page.tsx:60-77` always renders the Rubrics card, even when the list is
  empty.
- `app/[locale]/admin/page.tsx:17` and `app/[locale]/admin/rep-detail-content.tsx:23` build a new
  `Intl.DateTimeFormat` on every render.
- `app/[locale]/admin/create-rep/page.tsx:51-54` renders an `ExternalLink` icon beside a link that
  opens in the same tab. The link also carries no `rel` attribute.
- `app/[locale]/admin/layout.tsx:19-21` builds a synthetic `Request` object to reuse
  `authenticateSalesRequest`. The tRPC handler then introspects the same token again during the same
  navigation. Each administrator page navigation costs two Accounts introspections.

Plan:

1. Add `isLoading` and `error` branches to the curriculum page. Copy the pattern from
   `app/[locale]/admin/page.tsx:45-56`. This is about twelve lines.
2. Add `onError` and `isPending` to the approve mutation. Disable the button while it is pending.
3. Hide the Rubrics card when the list is empty.
4. Wrap both `Intl.DateTimeFormat` calls in `useMemo` on `locale`. This is two lines each.
5. Delete the `ExternalLink` icon, or add `target="_blank"` with `rel="noopener noreferrer"`.
6. Pass the resolved principal from the admin layout into the page through a prop, or accept the second
   introspection and record it in `measure/tech-debt.md`.

## 6. Internationalization

The route structure uses `app/[locale]` correctly. `proxy.ts:48-66` redirects every unprefixed path and
keeps the query string. `lib/i18n-messages.ts:39-46` merges the English file under every locale, so a
missing Thai key falls back to English rather than showing a raw key path. Key parity is exact: both
files hold the same 129 keys.

The coverage gaps are in the components, not in the route structure.

Issues:

- `components/login-form.tsx:83` hardcodes "Username" and line 94 hardcodes "Password". The keys
  `login.username` and `login.password` exist in both locales at `messages/en.json:16-17`.
- `components/login-form.tsx:59` hardcodes the fallback "Login failed". The key `login.error` exists at
  `messages/en.json:19`.
- `components/login-form.tsx:78` hardcodes "Checking sign-in mode". No key exists.
- `components/login-form.tsx:117` hardcodes "Use your Reading Advantage company account to continue."
  No key exists.
- `components/chat-tutor.tsx:88` hardcodes "Ask anything about sales technique."
- `components/chat-tutor.tsx:70` hardcodes "[Error: chat unavailable]" and writes it into the assistant
  message. The failure therefore looks like a coach reply.
- `components/roleplay-recorder.tsx:135` hardcodes "Your objective:".
- `app/api/chat/route.ts:94` writes "Always respond in Thai (ภาษาไทย)." into every system prompt. The
  route never receives the locale. An English-locale learner reads Thai coaching.
- `messages/en.json:93` holds `chat.systemPrompt`, which duplicates the prompt in the route and has no
  caller.
- Fifteen keys have no caller in either locale: `navigation.modules`, `navigation.logout`,
  `navigation.login`, `navigation.chat`, `login.username`, `login.password`, `login.error`,
  `dashboard.resume`, `dashboard.moduleProgress`, `dashboard.bestScore`, `dashboard.quizScore`,
  `roleplay.uploading`, `quiz.passThreshold`, `result.attempts`, and `chat.systemPrompt`.
- `components/roleplay-recorder.tsx:198` renders `t("evaluating")` during the `uploading` state. The key
  `roleplay.uploading` therefore stays unused, and the label is wrong while the upload runs.
- `lib/__tests__/i18n-key-parity.test.ts:7-10` checks two keys. The guard does not cover the file.
- `components/login-form.test.tsx` asserts the English literals "Username" and "Password" through
  `getByLabelText`. A fix must update that test.

Plan:

1. Replace the four hardcoded strings in `login-form.tsx` with `t()` calls. Add two new keys for lines
   78 and 117. Update `components/login-form.test.tsx` to read the message file.
2. Replace the three hardcoded strings in `chat-tutor.tsx` and `roleplay-recorder.tsx` with `t()` calls.
   Add three keys per locale.
3. Pass the active locale from `chat-tutor.tsx` to `/api/chat`. Select the output language from that
   locale in `app/api/chat/route.ts:94`. This is five lines.
4. Delete the fifteen unused keys from both locale files, or connect each one to its component. Decide
   one case at a time.
5. Use `t("uploading")` during the `uploading` state.
6. Replace `lib/__tests__/i18n-key-parity.test.ts` with a full key-set comparison. The whole test is
   about fifteen lines.

## 7. Shell, Theme, and Dependencies

Issues:

- `components/header.tsx:23` sets `className="hidden gap-4 text-sm md:flex"` on the only navigation.
  Below the `md` breakpoint the Dashboard link and the Admin link disappear with no replacement. A
  phone user cannot reach `/admin` except by typing the address.
- `components/header.tsx:41-43` renders the logout button with an icon and no accessible name. The key
  `navigation.logout` exists and has no caller.
- `components/header.tsx:41` writes `onClick={() => logout()}`. `logout` rejects on a server failure at
  `packages/auth-client/src/provider.tsx:156`. Nothing catches that rejection. The user sees a signed-out
  shell even when the server session survives.
- `app/layout.tsx:8-14` returns bare `children`. Only `app/[locale]/layout.tsx:26-35` renders `<html>`
  and `<body>`. The application declares no `not-found.tsx`, so an unmatched path has no root document.
- The application declares no `error.tsx`, no `loading.tsx`, no `not-found.tsx`, and no
  `global-error.tsx`. A throw on any page replaces the whole shell with the framework default.
- `app/[locale]/page.tsx:165-177` and `app/[locale]/module/[slug]/page.tsx:119-126` wrap a locked card
  in a `div` with `aria-disabled="true"` and a `title`. The element has no role and no `tabIndex`, so it
  never takes focus and the reason never reaches a keyboard user.
- No file imports `next-themes`. No component mounts a theme provider, and no element ever carries the
  `.dark` class. `app/globals.css:4` declares the dark variant and lines 55-84 define a complete dark
  palette. That palette never applies.
- Twelve declared dependencies have no import anywhere in the application: `@ai-sdk/google`,
  `@ai-sdk/openai`, `@ai-sdk/react`, `@hookform/resolvers`, `ai`, `class-variance-authority`, `clsx`,
  `next-themes`, `react-hook-form`, `sonner`, `tailwind-merge`, and `zustand`. `@reading-advantage/ai`
  owns the two `@ai-sdk` packages and `@reading-advantage/ui` owns `class-variance-authority` and
  `tailwind-merge`.
- `scripts/sales-curriculum-seed.ts:24` and `scripts/static-seed.ts:15` import `drizzle-orm`.
  `package.json` does not declare it. The `seed:curriculum` script depends on a package the manifest
  omits.

Plan:

1. Show the navigation at every width. Delete the `hidden` and `md:flex` classes, or add a compact menu
   for small screens. Start with the one-line class change.
2. Add `aria-label={t("logout")}` to the logout button. This is one line and it revives an existing key.
3. Catch the rejection from `logout()` and show a message. This is four lines.
4. Add one `app/[locale]/error.tsx` and one `app/not-found.tsx`. Each file is about twenty lines.
5. Give the locked cards a keyboard path. Render a `button` with `aria-disabled` and a visible reason,
   or move the reason into the card body.
6. Decide the theme policy. Either mount the `next-themes` provider and keep the dark palette, or delete
   `next-themes` from `package.json` and delete lines 55-84 of `app/globals.css`. Prefer the deletion.
7. Delete the eleven remaining unused dependencies from `package.json`. Keep `@node-rs/argon2`, because
   `next.config.ts:25` names it in `serverExternalPackages`.
8. Add `drizzle-orm` to the dependencies, or move the two seed scripts into a package that declares it.

## 8. Dead Code and Duplication

Issues:

- `app/api/lesson-complete/route.ts` has no caller. See section 4.
- `lib/rate-limit.ts:71-74` exports `checkChatRateLimit`. `app/api/chat/route.ts:56` calls
  `checkRateLimit` directly with the same limits and a different key prefix. The helper is dead and the
  two key shapes disagree.
- The application uses three error-logging styles: `console.error("Chat error:", error)` at
  `app/api/chat/route.ts:126`, `console.error(JSON.stringify({...}))` at
  `app/api/roleplay-attempts/route.ts:282`, and `logStructuredError` at
  `app/api/auth/callback/route.ts:88`. `@reading-advantage/utils/structured-error` already provides the
  third form.
- `lib/proxy.test.ts` and `lib/__tests__/proxy.test.ts` both test `proxy.ts` with overlapping cases. The
  test layout splits between `lib/*.test.ts` and `lib/__tests__/*.test.ts`.
- `app/api/auth/session/route.test.ts` and `app/api/auth/session/route.red.test.ts` assert the same
  contract with the same mock.
- `lib/public-url.ts` is a near-copy of `apps/marketing/app/lib/public-url.ts`. The two files differ only
  in the product name and one extra exported helper. This is about 150 duplicated lines.
- `lib/sign-in-href.ts:6-25` duplicates `apps/marketing/app/lib/login-redirect.ts:6-25` byte for byte.
  `packages/auth` already exports `parseCompanyOidcReturnTo` and is the correct home.

Plan:

1. Delete `checkChatRateLimit`, or call it from the chat route. Prefer the call, because it names the
   limit once.
2. Replace the two `console.error` forms with `logStructuredError`. This removes two styles.
3. Merge `lib/proxy.test.ts` into `lib/__tests__/proxy.test.ts`. Delete the first file.
4. Merge the two session route tests. Delete `route.red.test.ts`.
5. Move `public-url.ts`, `hasControlCharacter`, and `hasMalformedPercentEncoding` into `packages/auth`.
   Import them in both applications. This needs a dedicated track, because it changes two applications.

## 9. Prioritized Roadmap

Each phase maps to one Measure track. Write tests for backend changes per project policy.

### Phase 0: Broken UX (one to two line fixes each)

1. Return 200 with `session: null` for an anonymous request in `app/api/auth/session/route.ts`.
2. Delete the `refetch()` call in `app/[locale]/lesson/[id]/page.tsx:43`.
3. Add `aria-label={t("logout")}` to the header logout button.
4. Add `role="alert"` to the roleplay error panel.
5. Show the header navigation at every width.
6. Use `t("uploading")` during the roleplay upload state.
7. Delete the `ExternalLink` icon on the create-rep link, or open that link in a new tab.
8. Delete `app/api/lesson-complete/route.ts`.
9. Delete the raw response body from the roleplay upload error.

### Phase 1: Session contract correctness

1. Split `authenticateSalesRequest` into "no session" and "no Sales role".
2. Render `login.errorForbidden` when `isForbidden` is true.
3. Catch the rejection from `logout()` and show a message.
4. Update the two session route tests to cover both cases separately.

### Phase 2: Recording and loading correctness

1. Select the recording type with `MediaRecorder.isTypeSupported`.
2. Separate the device error from the permission error in `startRecording`.
3. Revoke every blob URL in `reset()` and on unmount.
4. Stop the recorder and every microphone track on unmount.
5. Move `retentionDays` to the server.
6. Report a failed audio upload to the user.
7. Add `isLoading` and `error` branches to the admin curriculum page.
8. Add `onError` and a pending state to the approve mutation, the quiz mutation, and the lesson
   completion mutation.
9. Add an `AbortController` to the chat request.
10. Add one `error.tsx` and one `not-found.tsx`.

### Phase 3: Duplication removal

1. Delete or call `checkChatRateLimit`.
2. Replace the two `console.error` forms with `logStructuredError`.
3. Merge the two proxy test files and the two session route test files.
4. Delete the eleven unused dependencies. Add `drizzle-orm`.
5. Decide the theme policy and delete the unused half.
6. Delete the fifteen unused message keys, or connect each one.

### Phase 4: Structural alignment (needs dedicated tracks)

1. Move `public-url.ts` and the return-path helpers into `packages/auth`. This changes two applications.
2. Replace `lib/__tests__/i18n-key-parity.test.ts` with a full key-set comparison.
3. Pass the active locale into `/api/chat` and select the output language from it.
4. Give the locked module and lesson cards a keyboard path.
5. Add `aria-live` to the quiz result, the roleplay result, and the chat message list.
6. Remove the second Accounts introspection on administrator page navigation.

## 10. Out of Scope

- Framework upgrades. The version policy forbids them in feature work.
- New dependencies. Every fix uses an installed package or the platform.
- The release, seeding, and verification scripts under `scripts/`. They are operator tooling, not user
  pages. The missing `drizzle-orm` declaration is the one exception, because it breaks a declared
  `package.json` script.
- The curriculum JSON files under `curriculum/`. They hold content, not code.
- The shared `@reading-advantage/auth-client` package. Section 2 names one defect in it. The fix in this
  application is to correct the session route contract, which the marketing application already
  satisfies. A change to the shared package needs its own track.
