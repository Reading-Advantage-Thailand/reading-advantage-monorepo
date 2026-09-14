# Grep-Test Inventory: Primary Test Hygiene Track

## Summary

The repair-wave docs claim 97 static source-grep cases. The true total is 149 cases. The docs undercount by 52 cases (+54%).

Counting rule: one case equals one `it` block. Each `it.each` entry counts as one case. Each `for`-loop `it` counts once per file. Loop-internal `expect` calls do not inflate the count.

Split: 144 cases grep application source or the repo tree. 5 cases pin data or config files. Batch counts: `authorization-hardening-static` 9, `broken-ux-fixes` 11, `loading-state-invariants` 25, `structural-alignment` 32, `component-deduplication` 42, `audio-highlight` 7, `aria-labels-i18n` 0, stragglers 23. Sum: 9 + 11 + 25 + 32 + 42 + 7 + 0 + 23 = 149.

Deviation note: the orchestrator records a spec deviation. FR-1 says "the 97 tests". The track converts 149 cases instead. Batches over ~25 cases (structural-alignment 32, component-deduplication 42) need a split per plan Task 10-15 guidance.

## Batch: authorization-hardening-static (9)

File: `apps/primary-advantage/lib/__tests__/authorization-hardening-static.test.ts`.

| Test case | Source pattern | Behavioral replacement |
|---|---|---|
| gates PATCH /api/users/[id] behind ADMIN or SYSTEM | `app/api/users/[id]/route.ts` matches `currentUser`, `isAdminOrSystem`, `schoolId`; `lib/authorization.ts` matches `"ADMIN"`, `"SYSTEM"` | Invoke PATCH handler with non-admin session, assert 403; repeat with admin session, assert write path |
| authenticates the article generation route | `app/api/articles/generate/route.ts` matches `currentUser` | Invoke generate handler unauthenticated, assert 401 |
| authenticates the CSV cleanup route and guards fileName | `app/api/upload/csv/cleanup/route.ts` matches `currentUser`, `isPlainBasename` | Invoke cleanup unauthenticated, assert 401; send traversal fileName, assert 400 |
| derives XP on the server without a client xpEarned input | `actions/user.ts` matches `resolveXpAward`; `updateUserActivity` signature lacks `xpEarned` | Call `updateUserActivity` with spoofed xpEarned payload, assert award ignores payload |
| derives proxy routes from the role enum module | `proxy.ts` matches `route-policies`, lacks hardcoded student route | Import live `route-policies`, assert student route roles (dup of route-policies tests; delete after check) |
| provides the unauthorized page | `app/[locale]/unauthorized/page.tsx` exists, matches `nauthorized` | Render unauthorized route, assert heading text |
| shows a 404 page without a sign-in redirect | `app/[locale]/[...not-found]/layout.tsx` lacks `redirect("/auth/signin")` | Render not-found layout, assert no redirect call fires |
| asserts a role in each of the five layouts (5 files, 1 case each) | Each layout matches `unauthorized`, `requireRole`, or `assertLayoutRole` | Render each layout with denied role, assert unauthorized redirect |
| checks ownership on the student-progress page | `student-progress/[id]/page.tsx` matches `schoolId` or `canReadUserResource` | Load page data cross-school, assert denial |

## Batch: broken-ux-fixes (11)

File: `apps/primary-advantage/components/__tests__/broken-ux-fixes.test.ts`.

| Test case | Source pattern | Behavioral replacement |
|---|---|---|
| FR-1: cn/tw nest VocabularyMatching and Introduction inside Lesson (data pin) | `messages/cn.json`, `messages/tw.json` key nesting | Render Lesson with cn/tw messages, assert section titles resolve |
| FR-1: Lesson.VocabularyMatching resolves keys in cn/tw (data pin) | `messages/cn.json`, `messages/tw.json` leaf keys | Render matching/intro phases in cn/tw, assert visible strings |
| FR-2: /admin landing page renders content | `app/[locale]/admin/page.tsx` lacks empty-div return | Render admin page, assert content text appears |
| FR-3: app-layout has no flexl-1 typo | `components/shared/app-layout.tsx` lacks `flexl-1`, holds `flex-1` | Render layout, assert main pane renders with flex class |
| FR-4: no live links to missing admin routes or /pricing | `admin-quick-actions.tsx`, `admin-dashboard-header.tsx`, `footer.tsx` lack dead hrefs | Render each component, assert every link href matches an existing route |
| FR-5: footer content is corrected | `footer.tsx` holds fixed copy, lacks typos and placeholder contact | Render footer with real messages, assert tagline and contact text |
| FR-6: student-assignment-table restores the commented t() calls | `components/student-assignment-table.tsx` holds six `t("…")` keys, lacks commented code | Render table with real messages, assert status labels appear |
| FR-7: signup legal links point at real routes and use isPending | `user-signup-form.tsx` holds `/terms`, `/privacy-policy`, `isPending` | Render signup form, assert link hrefs and pending-state toggle |
| FR-7: internal Get Started link has no target=_blank | `app/[locale]/(index)/page.tsx` lacks signin `target="_blank"` | Render index page, assert signin link has no target attribute |
| FR-8: no captoliza in live components (3 files) | Three components lack `captoliza` | Render each component, assert header text spelling |
| FR-9: no act import and no console module imports | `student-assignment-table.tsx`, `audio-generator.ts`, `userController.ts` lack `act`/`"console"` | Enforce `no-console` lint rule in CI; render table, assert no React act warning |

## Batch: loading-state-invariants (25)

File: `apps/primary-advantage/components/__tests__/loading-state-invariants.test.ts`.

| Test case | Source pattern | Behavioral replacement |
|---|---|---|
| FR-3 reads no window.location.search during render | `StudentCartridgeHost.tsx` lacks `window.location.search` | Render host with mode prop, assert launch phase text |
| FR-3 derives the launch phase from a mode prop | `StudentCartridgeHost.tsx` holds `mode === "demo"` | Render demo vs live mode, assert each launch label |
| FR-8 builds no Tailwind class by interpolation | `change-role.tsx` lacks `dark:bg-${` | Render role badge per role, assert resolved color class |
| FR-8 uses a static colour lookup map | `change-role.tsx` holds `ROLE_COLOR_CLASSES` | Render all roles, assert each badge class comes from map |
| FR-7 looks up sentence translations by locale | `sentence.tsx` lacks `translation.th` | Render sentence with th locale, assert Thai text |
| FR-7 looks up vocabulary definitions by locale | `task-vocabulary-collection.tsx` lacks `definition?.th` | Render vocab item with vi locale, assert definition text |
| FR-7 looks up deep-reading translations by locale | `task-reading.tsx` lacks `translatedPassage?.th` | Render reading with th locale, assert passage text |
| FR-12 navigates student assignments with the router | `student-assignment-table.tsx` lacks `window.location.href` | Click assignment row, assert router.push args |
| FR-12 refreshes the deck view with the router | `deck-view.tsx` lacks `window.location.reload()` | Trigger deck refresh, assert refetch without reload call |
| FR-12 retries the flashcard dashboard without a full reload | `flashcard-dashboard.tsx` lacks `window.location.reload()` | Click retry after failure, assert refetch without reload call |
| FR-10 checks response.ok before parsing the assignment | `assignment-dashboard.tsx` fetch followed by `response.ok` | Mock failed assignment fetch, assert error state renders |
| FR-9 calls init() on mount | `teacher/assignments.tsx` holds newline `init();` | Mount assignments table, assert init fetch fires once |
| FR-9 renders the table body from the row model | `assignments.tsx` holds `<DataTable`; `data-table.tsx` holds row-model map | Render assignments with rows, assert row count and cell text |
| FR-5 debounces the admin search query | `admin/students/page.tsx` holds `debouncedSearchQuery` | Type in admin search, assert one debounced fetch |
| FR-5 skips the duplicate mount fetch in the records table | `history-table.tsx` holds `isFirstSearchEffect` | Mount history table, assert single fetch call |
| FR-5 shares one module-scope debounce hook | `hooks/use-debounce.ts` holds `export function useDebounce` | Drive hook in test harness, assert trailing-edge timing |
| FR-11 renders an error state instead of fallback KPIs | `admin-stats-cards.tsx` holds `loadError`, lacks fabricated numbers | Mock failed stats fetch, assert error text (dup of admin-stats-cards-fields test; delete after check) |
| FR-11 renders an error state instead of mock activity | `admin-recent-activity.tsx` holds `loadError`, lacks mock name | Mock failed activity fetch, assert error text |
| FR-4 keys grid cards by stable article id | `article-select.tsx` holds `key={article.id}` | Render grid with reorder, assert card state follows id |
| FR-4 advances an offset ref on every page | `article-select.tsx` holds `offsetRef` | Page twice, assert fetch offset args increment |
| FR-4 guards against overlapping fetches | `article-select.tsx` holds `inFlightRef` | Fire overlapping page fetches, assert one in flight |
| FR-6 declares AssignmentDetailDialog at module scope | `student-assignment-table.tsx` holds top-level function, lacks nested const | Render table twice, assert dialog keeps state across renders |
| FR-6 hoists the assignment table debounce hook out of the body | `student-assignment-table.tsx` lacks nested `useDebounce` | Re-render table rapidly, assert debounce timer survives |
| FR-6 declares StudentRow at module scope | `enhanced-class-roster.tsx` holds top-level `StudentRow` | Expand roster rows, assert row state persists |
| FR-6 declares LessonTimer at module scope in the merged progress bar | `lesson-progress-bar.tsx` holds top-level `LessonTimer` | Tick timer across re-renders, assert countdown continues |

## Batch: structural-alignment (32)

File: `apps/primary-advantage/components/__tests__/structural-alignment.test.ts`. Two render tests in this file already behave correctly (showcase toggle, back-to-top link); the table lists only the 32 static cases. Split this batch across two conversion commits.

| Test case | Source pattern | Behavioral replacement |
|---|---|---|
| FR-4 renders a button with an accessible name | `audio-button.tsx` holds `<button`, `aria-label`, `aria-pressed` | Render AudioButton, assert button role and pressed state |
| FR-4 puts no click handler on the icon | `audio-button.tsx` lacks icon onClick, holds `handlePlay`, `aria-hidden` | Click icon, assert play spy fires once |
| FR-4 marks FormError as an alert | `form-error.tsx` holds `role="alert"` | Render form error, assert alert role |
| FR-4 marks FormMessage as an alert | `ui/form.tsx` holds `role="alert"` | Render invalid form field, assert alert role |
| FR-4 orders by keyboard (1 file) | `lesson-sentence-order.tsx` holds move handlers, arrow keys, button role, tabIndex | Focus item, press ArrowDown, assert order change |
| FR-4 announces results (6 files, 1 case each) | Each game holds `aria-live="polite"` | Complete each game, assert live region announces result |
| FR-4 opens classroom cards by keyboard | `classroom-selector.tsx` holds link role, tabIndex, onKeyDown | Press Enter on card, assert navigation call |
| FR-4 opens article showcase cards by keyboard | `article-showcase-card.tsx` holds link role, tabIndex, onKeyDown | Press Enter on card, assert navigation call |
| FR-4 selects collection words by keyboard (loop inside 1 case) | Two collection tasks hold button role, tabIndex, onKeyDown, aria-label | Press Enter on word chip, assert selection state |
| FR-4 flips the flashcard face by keyboard | `flashcard-game.tsx` holds button role, tabIndex, flip label | Press Enter on card, assert face flips |
| FR-4 opens history rows by keyboard | `history-table.tsx` holds row-click handler; `data-table.tsx` holds tabIndex, onKeyDown | Press Enter on row, assert navigation call |
| FR-4 selects report students and role cards by keyboard (loop inside 1 case) | Two components hold button role, tabIndex, onKeyDown | Press Enter on each, assert selection state |
| FR-5 reads both labels from messages | `StudentCartridgeHost.tsx` holds ApkHost keys, lacks hardcoded English | Render host in th, assert translated mode labels |
| FR-5 keeps the locale prefix on sign-in links and catalog navigation | `StudentCartridgeHost.tsx` holds locale signin href, router push, lacks assign | Click play signed-out, assert locale-prefixed signin redirect |
| FR-5 defines ApkHost keys in every locale (data pin, loop inside 1 case) | `messages/*.json` ApkHost keys truthy in 5 locales | Render host per locale, assert both labels visible |
| FR-5 logs out through the i18n router | `user-account-nav.tsx` holds useRouter, root push, lacks location.href | Click logout, assert i18n router push to root |
| FR-5 redirects student sign-in through the i18n router | `student-signin-form.tsx` holds i18n import, router.push, lacks location.href | Submit student signin, assert i18n router redirect |
| FR-5 routes teacher sign-in through the i18n router | `teacher-signin-form.tsx` holds i18n useRouter import | Submit teacher signin, assert i18n router redirect |
| FR-5 redirects anonymous users with the locale-aware redirect (loop inside 1 case) | Three pages hold i18n redirect with locale | Visit each page signed-out, assert locale signin redirect |
| FR-5 links through the i18n Link (loop inside 1 case) | Four pages hold i18n Link import, lack next/link | Render each page, assert link href keeps locale prefix |
| FR-5 teacher dashboard placeholder redirects to the classroom list | `teacher/dashboard/page.tsx` holds my-classes redirect, lacks TeacherDashboard | Visit dashboard, assert redirect to my-classes |
| FR-5 exports metadata from marketing and auth pages (loop inside 1 case) | Nine pages hold metadata export | Assert each route exposes metadata via route config import |
| FR-5 translates the footer through messages | `footer.tsx` holds Footer namespace and keys | Render footer in th, assert translated tagline |
| FR-5 translates the games catalogue heading | `student/games/page.tsx` holds StudentGames namespace, lacks hardcoded title | Render games page in th, assert translated heading |
| FR-5 translates licence form labels | `edit-license-form.tsx` holds LicenseForm keys, lacks hardcoded labels | Render licence form in th, assert translated labels |
| FR-5 translates school form labels | `create-school-form.tsx` holds SchoolForm keys, lacks hardcoded label | Render school form in th, assert translated labels |
| FR-5 keeps the new namespaces in key parity across locales (data pin) | Five namespaces share key sets across 5 locales | Render one component per namespace per locale, assert labels resolve |

## Batch: component-deduplication (42)

File: `apps/primary-advantage/components/__tests__/component-deduplication.test.ts`. Split this batch across two conversion commits.

| Test case | Source pattern | Behavioral replacement |
|---|---|---|
| deletes dead file (9 `it.each` entries) | Nine paths absent via `existsSync` | Delete rows after canonical coverage lands; assert no import of dead path via graph query |
| merges away fork (20 `it.each` entries) | Twenty fork paths absent via `existsSync` | Render canonical component per fork variant prop, assert variant output |
| keeps one cloze game behind a source prop | `lesson-sentence-cloze-test.tsx` holds `SentenceClozeGameSource`, lesson/deck union | Render cloze game with lesson and deck sources, assert both flows |
| keeps one flashcard game behind a cardKind prop | `lesson-flashcard-game.tsx` holds `cardKind`, `FlashcardType` | Render flashcard game per card kind, assert card content |
| keeps one matching game behind a cardKind prop | `lesson-matching-game.tsx` holds `cardKind`, `FlashcardType` | Render matching game per card kind, assert pairs |
| keeps one reading task behind an enableTranslation prop | `task-reading.tsx` holds `enableTranslation` | Render reading with flag on and off, assert translation visibility |
| keeps one progress bar behind a source prop | `lesson-progress-bar.tsx` holds `LessonProgressSource` | Render progress bar per source, assert progress text |
| keeps one history table behind a variant prop | `history-table.tsx` holds `HistoryTableVariant` | Render history table per variant, assert columns |
| keeps one school form behind a mode prop | `school-form.tsx` holds `SchoolFormMode` | Render school form per mode, assert fields |
| keeps one collection task behind a kind prop | `task-collection.tsx` holds `CollectionTaskKind` | Render collection task per kind, assert items |
| shares shuffle, formatTime, CEFR colours, and the staff role check | Six helper exports present in lib files | Unit-test each helper import directly, assert outputs |
| imports the shared helpers instead of redeclaring them | Two consumers hold helper import paths | Spy on helper module, render consumer, assert helper call |
| spreads one sharedMainNav in every page config (loop inside 1 case) | Five configs hold `...sharedMainNav` | Render each shell nav, assert shared entries appear |
| serves the live tables through one DataTable shell (loop inside 1 case) | Seven tables hold `<DataTable`, shell holds export | Render each table with rows, assert shell pagination and rows |
| uses practice, generators, and signinAction paths | Canonical paths exist, typo paths absent | Import each canonical path in test, assert module resolves |

## Batch: audio-highlight (7)

File: `apps/primary-advantage/lib/__tests__/audio-highlight.test.ts`. The pure-function describes in this file already test runtime behavior; the table lists only the 7 static cases.

| Test case | Source pattern | Behavioral replacement |
|---|---|---|
| has no setInterval in audio-button.tsx | `audio-button.tsx` lacks `setInterval` | Run AudioButton under fake timers, assert zero interval handles |
| audio-button is a thin button over useAudioSegment | `audio-button.tsx` holds `useAudioSegment` | Render button, assert hook-driven play/pause state |
| the shared hook calls load() when the URL changes | `useAudioSegment.ts` holds `.load()` | Change hook URL, assert media load spy fires |
| the shared hook pauses on unmount | `useAudioSegment.ts` holds `.pause()` | Unmount hook host, assert media pause spy fires |
| holds the highlight timer in a ref in all three readers (loop inside 1 case) | Two readers hold `highlightTimerRef`, `clearTimeout` | Unmount each reader mid-highlight, assert timer cleared |
| shares audio field names between flashcard actions and games | `actions/flashcard.ts` holds spread mapper, lacks raw fields | Call flashcard action with ordering audio, assert mapped field shape |
| pauses audio inside sentence-order cleanup | `lesson-sentence-order.tsx` holds `audio.pause()` | Unmount sentence-order game mid-play, assert pause spy fires |

## Batch: aria-labels-i18n (0)

File: `apps/primary-advantage/components/__tests__/aria-labels-i18n.test.tsx`. This file holds zero static cases. It renders components inside real message trees and asserts translated names. It already meets the behavioral bar. No conversion work exists for this batch.

## Batch: stragglers (23)

| File | Test case | Source pattern | Behavioral replacement |
|---|---|---|---|
| `components/__tests__/authoritative-session-refresh.test.ts` | uses the authoritative refresh (11 `it.each` entries) | Eleven components hold `useAuth` refresh destructure, `await refresh()`, lack `session?.user` | Complete each flow with mocked auth, assert refresh spy fires and XP updates |
| `components/lesson/games/__tests__/lesson-sentence-order-word.completion.test.tsx` | refreshes the authoritative session after completion | Source holds refresh destructure, await, lacks update | Complete order-word game, assert auth refresh spy fires |
| `components/host-proof/__tests__/HostProofGameClient.test.tsx` | only imports the QC loader through a dynamic import | Source lacks static QC import, holds dynamic import | Assert test bundle split via build-graph deps query on the client module |
| `lib/__tests__/host-proof-bundle-isolation.test.ts` | server file does not statically import the QC loader (4 `it.each` entries) | Four server files lack static and dynamic QC imports | Assert server bundle excludes cartridge via build-graph deps query |
| `lib/__tests__/host-proof-bundle-isolation.test.ts` | client component only dynamically imports the QC loader | Client lacks static QC import, holds dynamic import | Same build-graph deps assertion as above (merge rows on conversion) |
| `server/__tests__/writer-contracts.test.ts` | uses the internal AI adapter and current token option | Image/story generators hold adapter path, lack vertex imports, hold token limit | Invoke generators with mocked adapter, assert adapter receives token limit |
| `app/api/flashcard/__tests__/flashcard-schema-contract.test.ts` | does not rely on as-any casts for fields absent from shared schema | `actions/flashcard.ts` lacks unmapped field assignments and `as any` | Call flashcard action against mock db, assert stored row validates against live schema |
| `lib/__tests__/host-proof-playwright-config.test.ts` | allows the local Kimi browser origin during development | `next.config.ts` holds `allowedDevOrigins` entry | Start dev server harness, assert origin passes CORS check (or keep as config pin) |
| `lib/__tests__/storage-config.test.ts` | documents a non-empty bucket entry in .env.example (config pin) | `.env.example` holds bucket entry | Assert startup throws a clear error when bucket env is missing |
| `lib/__tests__/api-no-direct-db.test.ts` | fails a NEW direct db import in a route.ts | Route sources lack `@reading-advantage/db` barrel import | Replace with ESLint import-restriction rule; assert rule flags a fixture route |
| `lib/__tests__/api-no-direct-db.test.ts` | keeps the baseline honest: entries exist and still carry the import | Baseline entries still hold the import | Delete with the lint rule above; no runtime test needed |

## Legitimate readFileSync uses (excluded from conversion)

These readers load data or fixtures, not source under test. They stay.

- `components/__tests__/aria-labels-i18n.test.tsx` `messages()` helper: feeds real locale trees into `NextIntlClientProvider`. The asserts check rendered names.
- `components/admin/__tests__/admin-stats-cards-fields.test.tsx` `messages()` helper: feeds the real English tree into the stats-cards render. The asserts check rendered counts.
- `components/__tests__/structural-alignment.test.ts` `messages()` helper: feeds real trees into the two behavioral render tests only. The static cases above still convert.
- `components/lesson/games/__tests__/merge-characterization.*.test.tsx` (4 files) plus `components/articles/questions/__tests__/merge-characterization.written-question.test.tsx`: characterization tests pin rendered behavior with mocked actions. They use no `readFileSync`.
- `server/utils/generators/__tests__/new-generator.caller.test.ts`: mocks `fs.readFileSync` to feed prompt fixtures into the real `generateArticleNew` caller. The assert checks caller rejection behavior.
- `app/api/upload/csv/__tests__/route.test.ts`, `app/api/upload/classes/__tests__/route.test.ts`, `app/api/upload/csv/cleanup/__tests__/route.test.ts`: mock `fs`/`fs/promises` to isolate handler behavior. The asserts check status codes and payloads.
- `lib/__tests__/audio-highlight.test.ts` pure-function describes: call exported helpers with values and assert outputs. No file reads involved.
- `lib/__tests__/route-policies*.test.ts`, `lib/__tests__/authorization.test.ts`: import live policy modules and assert their runtime values. No file reads involved.
- `lib/__tests__/host-proof-playwright-config.test.ts` first two cases: assert the imported Playwright config object. No file reads involved.
- `lib/__tests__/storage-config.test.ts` bucket and URL describes: re-import the live module per env and assert resolved values. No file reads involved.
- `app/api/flashcard/__tests__/flashcard-schema-contract.test.ts` first case: asserts live Drizzle columns. No source grep involved.
- `components/host-proof/__tests__/HostProofGameClient.test.tsx` four render cases: drive the live component with mocked cartridges. No file reads involved.
