# Implementation Plan: Codecamp Thai Localization

## Phase 1: Contract & Schema

Update next-intl config and create the Thai translation file.

- [x] Task: Update `i18n/routing.ts` to add Thai locale and set `th` as default (302d142)
  - [x] Set `locales: ['th', 'en']` and `defaultLocale: 'th'`
  - [x] Configure locale prefix strategy (always show prefix)
  - [x] Ensure root `/` redirects to `/th/`
- [x] Task: Update `i18n/request.ts` to load Thai messages (b7beb5b)
  - [x] Add `th` locale loader mapping to `messages/th.json`
  - [x] Verify fallback chain works (missing key in `th` falls back to `en`)
- [x] Task: Create `apps/codecamp-advantage/messages/th.json` with Thai translations (b7beb5b)
  - [x] `metadata.title`: "CodeCamp Advantage"
  - [x] `metadata.description`: "เรียนรู้ Next.js และรูปแบบการทำงานของ Reading Advantage ด้วย AI"
  - [x] `navigation.dashboard`: "แดชบอร์ด"
  - [x] `navigation.modules`: "โมดูล"
  - [x] `navigation.chat`: "แชท"
  - [x] `dashboard.title`: "เรียนรู้การพัฒนาเว็บ"
  - [x] `dashboard.subtitle`: "โมดูล 18 โมดูล ตั้งแต่พื้นฐานจนถึงระดับมืออาชีพ พร้อมการตรวจโค้ดด้วย AI"
  - [x] `dashboard.progress`: "ความคืบหน้า"
  - [x] `dashboard.continue`: "ดำเนินการต่อ"
  - [x] `module.lessons`: "บทเรียน"
  - [x] `module.start`: "เริ่มเรียน"
  - [x] `module.completed`: "เสร็จสิ้น"
  - [x] `module.inProgress`: "กำลังเรียน"
  - [x] `chat.placeholder`: "ถามคำถามเกี่ยวกับโมดูลนี้ได้เลย..."
  - [x] `chat.newConversation`: "สนทนาใหม่"
  - [x] `chat.send`: "ส่ง"
  - [x] `exercise.submit`: "ส่งงาน"
  - [x] `exercise.feedback`: "ผลตอบรับ"
  - [x] `exercise.hint`: "คำใบ้"
  - [x] `exercise.tryAgain`: "ลองอีกครั้ง"
  - [x] `quiz.submit`: "ส่งคำตอบ"
  - [x] `quiz.score`: "คะแนน"
  - [x] `quiz.correct`: "ถูกต้อง"
  - [x] `quiz.incorrect`: "ไม่ถูกต้อง"
- [x] Task: Add Thai-friendly font loading via `next/font` (1fd9d8f)
  - [x] Import `Noto_Sans_Thai` (or `IBM_Plex_Sans_Thai`) alongside the existing Latin font in `app/layout.tsx`
  - [x] Apply the Thai font family in the root layout so glyphs render correctly on all platforms
  - [x] Verify no FOUT/CLS regressions
- [x] Task: Add localized formatting helpers in `lib/i18n-format.ts` (4d93844)
  - [x] `formatRelativeTime(date, locale)` for "Last Active" timestamps on the admin table
  - [x] `formatNumber(n, locale)` for quiz scores/percentages
  - [x] `formatDate(date, locale)` for review history
  - [x] Use `Intl.RelativeTimeFormat`, `Intl.NumberFormat`, `Intl.DateTimeFormat` with the active locale
- [x] Task: Add translation keys for admin dashboard to both `en.json` and `th.json` (2215e2f)
  - [x] `admin.title`: "Intern Management" / "จัดการผู้ฝึกงาน"
  - [x] `admin.interns`: "Interns" / "ผู้ฝึกงาน"
  - [x] `admin.addIntern`: "Add Intern" / "เพิ่มผู้ฝึกงาน"
  - [x] `admin.overview`: "Overview" / "ภาพรวม"
  - [x] `admin.progress`: "Progress" / "ความคืบหน้า"
  - [x] `admin.prReviews`: "PR Reviews" / "รีวิว PR"
  - [x] `admin.username`: "Username" / "ชื่อผู้ใช้"
  - [x] `admin.name`: "Name" / "ชื่อ"
  - [x] `admin.lastActive`: "Last Active" / "ใช้งานล่าสุด"
  - [x] `admin.noInterns`: "No interns yet" / "ยังไม่มีผู้ฝึกงาน"
  - [x] `admin.createIntern`: "Create Intern Account" / "สร้างบัญชีผู้ฝึกงาน"
  - [x] `admin.backToOverview`: "Back to Overview" / "กลับไปหน้าภาพรวม"
- [x] Task: Enumerate and add additional translation surfaces commonly missed (7740abb)
  - [x] Form validation messages (admin/new-intern): required, password complexity, username conflict
  - [x] Toast / inline success+error messages across admin + chat
  - [x] Per-page `<title>` metadata for every route (currently only `metadata.title` exists)
  - [x] Empty-state strings (e.g. "No PR reviews yet", "No completed modules")
  - [x] Locked-module tooltip text from the dashboard prerequisite UI
- [x] Task: Write tests for Thai locale loading (be8cbb5)
  - [ ] Test: `routing.ts` exports `th` as the default locale
  - [ ] Test: `messages/th.json` parses and loads via `getRequestConfig`
  - [ ] Note: key-parity and "Thai is not English copy" tests are added in Phase 4 once Phase 3 finishes extracting keys from components — running them now would fail prematurely
- [x] Task: Write tests for Thai locale loading (be8cbb5)
  - [x] Test: `routing.ts` exports `th` as the default locale
  - [x] Test: `messages/th.json` parses and loads via `getRequestConfig`
  - [x] Note: key-parity and "Thai is not English copy" tests are added in Phase 4 once Phase 3 finishes extracting keys from components — running them now would fail prematurely
- [x] Task: Measure — User Manual Verification 'Contract & Schema'

## Phase 2: Implement Language Switcher & Routing

Build the locale toggle and update app routing.

- [x] Task: Create `components/language-switcher.tsx` (9990e70)
  - [x] Render a toggle between "EN" and "ไทย" with the current locale highlighted
  - [x] On click, set the locale cookie and navigate to the locale-prefixed URL
  - [x] Use `useRouter()` and `useLocale()` from `next-intl`
  - [x] Ensure keyboard accessibility (tab to focus, Enter/Space to activate)
  - [x] Add `aria-label` for screen readers
- [x] Task: Update `components/header.tsx` to include the language switcher (9990e70)
  - [x] Place the switcher in the header bar, visually balanced with navigation links
  - [x] Ensure no layout shift when switching between locales (Thai text is wider)
- [x] Task: Update `app/layout.tsx` to use locale-aware routing (16d82cb)
  - [x] Wrap root layout with `NextIntlClientProvider` using the resolved locale
  - [x] Ensure `getLocale()` returns the correct locale based on URL prefix
- [x] Task: Update all page routes to support locale prefix (16d82cb)
  - [x] `app/[locale]/page.tsx` — dashboard
  - [x] `app/[locale]/module/[slug]/page.tsx` — module detail
  - [x] `app/[locale]/lesson/[id]/page.tsx` — lesson detail
  - [x] `app/[locale]/chat/page.tsx` — chat
  - [x] `app/[locale]/admin/page.tsx` — admin overview
  - [x] `app/[locale]/admin/[userId]/page.tsx` — intern detail
  - [x] `app/[locale]/admin/new-intern/page.tsx` — create intern
  - [x] Move existing pages under `[locale]/` directory structure
  - [x] Verify API routes (`/api/*`) remain locale-free (they should not have locale prefix)
- [x] Task: Migrate from `middleware.ts` to Next 16 `proxy.ts` and compose with next-intl (7b108cf)
  - [x] **Context:** Next.js 16 replaces the Edge `middleware.ts` convention with `proxy.ts`. The current `apps/codecamp-advantage/middleware.ts` (admin route guard from the remediation track) must move.
  - [x] Create `apps/codecamp-advantage/proxy.ts` that:
    - Builds the next-intl proxy via `createNavigation`/`createMiddleware`-equivalent for Next 16 proxy (use the next-intl version that supports proxy; upgrade `next-intl` if needed)
    - Runs the intl locale handler first (URL prefix → cookie → `Accept-Language`)
    - Then applies the admin route guard for `/admin/*` paths (auth check + role check)
    - Skips both intl and auth handling for `/api/*` and static assets via the `matcher` config
  - [x] Delete the old `middleware.ts` after `proxy.ts` is verified
  - [x] Update existing admin-route protection tests to target the proxy file path / export shape
  - [x] If `next-intl` version in use does not support Next 16 proxy, add a sub-task to bump it and adjust imports
- [x] Task: Write tests for language switcher (14154c5)
  - [x] Test: switcher renders both locale labels
  - [x] Test: clicking Thai navigates to `/th/` path
  - [x] Test: clicking English navigates to `/en/` path
  - [x] Test: locale preference persists in cookie (handled by next-intl middleware)
- [ ] Task: Measure — User Manual Verification 'Language Switcher & Routing'

## Phase 3: Localize Admin Dashboard & Chat

Translate all remaining user-facing strings and add locale-aware chat.

- [x] Task: Replace all硬编码 (hardcoded) strings in admin pages with translation keys (9d7ebf8)
  - [x] `app/[locale]/admin/page.tsx` — table headers, buttons, empty state
  - [x] `app/[locale]/admin/[userId]/page.tsx` — progress labels, quiz scores, PR review labels
  - [x] `app/[locale]/admin/new-intern/page.tsx` — form labels, submit button, success/error messages
- [x] Task: Replace hardcoded strings in components with translation keys (9d7ebf8)
  - [x] `components/fork-instruction.tsx` — step labels, PR URL input placeholder
  - [x] `components/review-history.tsx` — status labels (pending, approved, needs_changes)
  - [x] `components/workflow-tracker.tsx` — step labels (claimed, branched, PR opened, reviewed, merged)
  - [x] `components/lesson-content.tsx` — exercise/quiz instruction labels, empty content
  - [x] `app/[locale]/module/[slug]/page.tsx` — back button, module metadata labels
- [x] Task: Add Thai and English keys for all newly extracted strings to both locale files (9d7ebf8)
  - [x] Add to `messages/en.json` and `messages/th.json`
  - [x] Keys grouped by component: `admin.*`, `fork.*`, `review.*`, `workflow.*`, `lesson.*`, `chat.*`, `module.*`
- [x] Task: Pipe locale to the chat API route (9d7ebf8)
  - [x] **Mechanism:** client sends locale in the request body alongside `messages`. Added `locale: "th" | "en"` to the chat request schema.
  - [x] Update the `useChatStream` hook to accept locale option and include it in request body
  - [x] Validate locale on the server with Zod; fall back to `th` (default) if missing or invalid
- [x] Task: Update chat system prompt to be locale-aware (9d7ebf8)
  - [x] In `apps/codecamp-advantage/app/api/chat/route.ts`, branch on the validated locale
  - [x] When locale is `th`: "Respond in Thai (ภาษาไทย) by default. Mirror the user..."
  - [x] When locale is `en`: "Respond in English by default. Mirror the user's language if they switch."
  - [x] Test: chat responses match the expected locale (mock buildSystemPrompt, assert content)
- [x] Task: Write tests for admin localization (9d7ebf8)
  - [x] Test: all admin keys exist in both en and th locales with correct values
  - [x] Test: keys for fork, review, workflow, lesson, module, chat namespaces in both locales
  - [x] Test: chat system prompt includes Thai instruction when locale is `th`
- [ ] Task: Measure — User Manual Verification 'Admin & Chat Localization'

## Phase 4: Validation & Cleanup

Run all quality gates and verify no regressions.

- [x] Task: Pre-empt Thai text-width regressions (don't just verify after the fact) (642d2c6)
  - [x] Audit fixed-width containers in `app/page.tsx`, `app/admin/page.tsx`, and `components/*.tsx`
  - [x] Apply `min-w-0` + `truncate` (or `line-clamp-N`) on flex/grid children where text could wrap unpredictably
  - [x] Loosen any `max-w-*` constraints on cards/buttons that were sized for English
  - [x] Then verify with Thai locale: dashboard cards, admin table columns, chat input placeholder, progress bar labels, locked-module tooltips
- [x] Task: Add lesson-language badge to clarify that lessons are English (d4e5ec7)
  - [x] **Why:** Default locale is Thai but the 85 lesson `contentJson` rows are intentionally English (out of scope to translate per spec). Thai-default users will be confused without a hint.
  - [x] Add an inline badge or notice on the dashboard and module pages: "บทเรียนเป็นภาษาอังกฤษ" (Lessons in English)
  - [x] Add to the chat: when locale is `th`, the system prompt should mention the lesson content is English so the AI can translate on request
- [ ] Task: Run full quality gate
  - [ ] `pnpm turbo run build --filter=codecamp-advantage`
  - [ ] `pnpm turbo run lint --filter=codecamp-advantage`
  - [ ] `pnpm turbo run check-types --filter=codecamp-advantage`
  - [ ] `pnpm turbo run test --filter=@reading-advantage/domain`
  - [ ] `pnpm turbo run test --filter=@reading-advantage/api`
  - [ ] `pnpm turbo run test --filter=codecamp-advantage`
- [ ] Task: Add key-parity and quality tests now that all extraction is done
  - [ ] Test: `messages/th.json` has exactly the same key set as `messages/en.json` (no extras, none missing)
  - [ ] Test: every Thai value is non-empty and not byte-identical to the English value (excluding intentional proper nouns like "CodeCamp Advantage")
- [ ] Task: Update `measure/tracks.md` to reference this track

> **Note:** The unrelated tech-debt item "`contentJson` schema validation missing in LessonContent" has been moved out of this track. It is not coupled to i18n and belongs in the next codecamp review-remediation track.
- [ ] Task: Measure — User Manual Verification 'Validation & Cleanup'