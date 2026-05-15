# Implementation Plan: Codecamp Thai Localization

## Phase 1: Contract & Schema

Update next-intl config and create the Thai translation file.

- [x] Task: Update `i18n/routing.ts` to add Thai locale and set `th` as default (302d142)
  - [ ] Set `locales: ['th', 'en']` and `defaultLocale: 'th'`
  - [ ] Configure locale prefix strategy (always show prefix)
  - [ ] Ensure root `/` redirects to `/th/`
- [x] Task: Update `i18n/request.ts` to load Thai messages (b7beb5b)
  - [x] Add `th` locale loader mapping to `messages/th.json`
  - [x] Verify fallback chain works (missing key in `th` falls back to `en`)
- [x] Task: Create `apps/codecamp-advantage/messages/th.json` with Thai translations (b7beb5b)
  - [ ] `metadata.title`: "CodeCamp Advantage"
  - [ ] `metadata.description`: "เรียนรู้ Next.js และรูปแบบการทำงานของ Reading Advantage ด้วย AI"
  - [ ] `navigation.dashboard`: "แดชบอร์ด"
  - [ ] `navigation.modules`: "โมดูล"
  - [ ] `navigation.chat`: "แชท"
  - [ ] `dashboard.title`: "เรียนรู้การพัฒนาเว็บ"
  - [ ] `dashboard.subtitle`: "โมดูล 18 โมดูล ตั้งแต่พื้นฐานจนถึงระดับมืออาชีพ พร้อมการตรวจโค้ดด้วย AI"
  - [ ] `dashboard.progress`: "ความคืบหน้า"
  - [ ] `dashboard.continue`: "ดำเนินการต่อ"
  - [ ] `module.lessons`: "บทเรียน"
  - [ ] `module.start`: "เริ่มเรียน"
  - [ ] `module.completed`: "เสร็จสิ้น"
  - [ ] `module.inProgress`: "กำลังเรียน"
  - [ ] `chat.placeholder`: "ถามคำถามเกี่ยวกับโมดูลนี้ได้เลย..."
  - [ ] `chat.newConversation`: "สนทนาใหม่"
  - [ ] `chat.send`: "ส่ง"
  - [ ] `exercise.submit`: "ส่งงาน"
  - [ ] `exercise.feedback`: "ผลตอบรับ"
  - [ ] `exercise.hint`: "คำใบ้"
  - [ ] `exercise.tryAgain`: "ลองอีกครั้ง"
  - [ ] `quiz.submit`: "ส่งคำตอบ"
  - [ ] `quiz.score`: "คะแนน"
  - [ ] `quiz.correct`: "ถูกต้อง"
  - [ ] `quiz.incorrect`: "ไม่ถูกต้อง"
- [ ] Task: Add Thai-friendly font loading via `next/font`
  - [ ] Import `Noto_Sans_Thai` (or `IBM_Plex_Sans_Thai`) alongside the existing Latin font in `app/layout.tsx`
  - [ ] Apply the Thai font family in the root layout so glyphs render correctly on all platforms
  - [ ] Verify no FOUT/CLS regressions
- [ ] Task: Add localized formatting helpers in `lib/i18n-format.ts`
  - [ ] `formatRelativeTime(date, locale)` for "Last Active" timestamps on the admin table
  - [ ] `formatNumber(n, locale)` for quiz scores/percentages
  - [ ] `formatDate(date, locale)` for review history
  - [ ] Use `Intl.RelativeTimeFormat`, `Intl.NumberFormat`, `Intl.DateTimeFormat` with the active locale
- [ ] Task: Add translation keys for admin dashboard to both `en.json` and `th.json`
  - [ ] `admin.title`: "Intern Management" / "จัดการผู้ฝึกงาน"
  - [ ] `admin.interns`: "Interns" / "ผู้ฝึกงาน"
  - [ ] `admin.addIntern`: "Add Intern" / "เพิ่มผู้ฝึกงาน"
  - [ ] `admin.overview`: "Overview" / "ภาพรวม"
  - [ ] `admin.progress`: "Progress" / "ความคืบหน้า"
  - [ ] `admin.prReviews`: "PR Reviews" / "รีวิว PR"
  - [ ] `admin.username`: "Username" / "ชื่อผู้ใช้"
  - [ ] `admin.name`: "Name" / "ชื่อ"
  - [ ] `admin.lastActive`: "Last Active" / "ใช้งานล่าสุด"
  - [ ] `admin.noInterns`: "No interns yet" / "ยังไม่มีผู้ฝึกงาน"
  - [ ] `admin.createIntern`: "Create Intern Account" / "สร้างบัญชีผู้ฝึกงาน"
  - [ ] `admin.backToOverview`: "Back to Overview" / "กลับไปหน้าภาพรวม"
- [ ] Task: Enumerate and add additional translation surfaces commonly missed
  - [ ] Form validation messages (admin/new-intern): required, password complexity, username conflict
  - [ ] Toast / inline success+error messages across admin + chat
  - [ ] Per-page `<title>` metadata for every route (currently only `metadata.title` exists)
  - [ ] Empty-state strings (e.g. "No PR reviews yet", "No completed modules")
  - [ ] Locked-module tooltip text from the dashboard prerequisite UI
- [ ] Task: Write tests for Thai locale loading
  - [ ] Test: `routing.ts` exports `th` as the default locale
  - [ ] Test: `messages/th.json` parses and loads via `getRequestConfig`
  - [ ] Note: key-parity and "Thai is not English copy" tests are added in Phase 4 once Phase 3 finishes extracting keys from components — running them now would fail prematurely
- [ ] Task: Measure — User Manual Verification 'Contract & Schema'

## Phase 2: Implement Language Switcher & Routing

Build the locale toggle and update app routing.

- [ ] Task: Create `components/language-switcher.tsx`
  - [ ] Render a toggle between "EN" and "ไทย" with the current locale highlighted
  - [ ] On click, set the locale cookie and navigate to the locale-prefixed URL
  - [ ] Use `useRouter()` and `useLocale()` from `next-intl`
  - [ ] Ensure keyboard accessibility (tab to focus, Enter/Space to activate)
  - [ ] Add `aria-label` for screen readers
- [ ] Task: Update `components/header.tsx` to include the language switcher
  - [ ] Place the switcher in the header bar, visually balanced with navigation links
  - [ ] Ensure no layout shift when switching between locales (Thai text is wider)
- [ ] Task: Update `app/layout.tsx` to use locale-aware routing
  - [ ] Wrap root layout with `NextIntlClientProvider` using the resolved locale
  - [ ] Ensure `getLocale()` returns the correct locale based on URL prefix
- [ ] Task: Update all page routes to support locale prefix
  - [ ] `app/[locale]/page.tsx` — dashboard
  - [ ] `app/[locale]/module/[slug]/page.tsx` — module detail
  - [ ] `app/[locale]/lesson/[id]/page.tsx` — lesson detail
  - [ ] `app/[locale]/chat/page.tsx` — chat
  - [ ] `app/[locale]/admin/page.tsx` — admin overview
  - [ ] `app/[locale]/admin/[userId]/page.tsx` — intern detail
  - [ ] `app/[locale]/admin/new-intern/page.tsx` — create intern
  - [ ] Move existing pages under `[locale]/` directory structure
  - [ ] Verify API routes (`/api/*`) remain locale-free (they should not have locale prefix)
- [ ] Task: Migrate from `middleware.ts` to Next 16 `proxy.ts` and compose with next-intl
  - [ ] **Context:** Next.js 16 replaces the Edge `middleware.ts` convention with `proxy.ts`. The current `apps/codecamp-advantage/middleware.ts` (admin route guard from the remediation track) must move.
  - [ ] Create `apps/codecamp-advantage/proxy.ts` that:
    - Builds the next-intl proxy via `createNavigation`/`createMiddleware`-equivalent for Next 16 proxy (use the next-intl version that supports proxy; upgrade `next-intl` if needed)
    - Runs the intl locale handler first (URL prefix → cookie → `Accept-Language`)
    - Then applies the admin route guard for `/admin/*` paths (auth check + role check)
    - Skips both intl and auth handling for `/api/*` and static assets via the `matcher` config
  - [ ] Delete the old `middleware.ts` after `proxy.ts` is verified
  - [ ] Update existing admin-route protection tests to target the proxy file path / export shape
  - [ ] If `next-intl` version in use does not support Next 16 proxy, add a sub-task to bump it and adjust imports
- [ ] Task: Write tests for language switcher
  - [ ] Test: switcher renders both locale labels
  - [ ] Test: clicking Thai navigates to `/th/` path
  - [ ] Test: clicking English navigates to `/en/` path
  - [ ] Test: locale preference persists in cookie
- [ ] Task: Measure — User Manual Verification 'Language Switcher & Routing'

## Phase 3: Localize Admin Dashboard & Chat

Translate all remaining user-facing strings and add locale-aware chat.

- [ ] Task: Replace all硬编码 (hardcoded) strings in admin pages with translation keys
  - [ ] `app/[locale]/admin/page.tsx` — table headers, buttons, empty state
  - [ ] `app/[locale]/admin/[userId]/page.tsx` — progress labels, quiz scores, PR review labels
  - [ ] `app/[locale]/admin/new-intern/page.tsx` — form labels, submit button, success/error messages
- [ ] Task: Replace hardcoded strings in components with translation keys
  - [ ] `components/fork-instruction.tsx` — step labels, PR URL input placeholder
  - [ ] `components/review-history.tsx` — status labels (pending, approved, needs_changes)
  - [ ] `components/workflow-tracker.tsx` — step labels (claimed, branched, PR opened, reviewed, merged)
  - [ ] `components/lesson-content.tsx` — quiz submit button, score display
  - [ ] `app/[locale]/module/[slug]/page.tsx` — back button, module metadata labels
- [ ] Task: Add Thai and English keys for all newly extracted strings to both locale files
  - [ ] Add to `messages/en.json` and `messages/th.json`
  - [ ] Keys grouped by component: `admin.*`, `module.*`, `lesson.*`, `exercise.*`, `review.*`
- [ ] Task: Pipe locale to the chat API route
  - [ ] **Mechanism:** client sends locale in the request body alongside `messages` (most reliable — API routes are not under `[locale]/`, and the next-intl cookie is best-effort). Add `locale: "th" | "en"` to the chat request schema.
  - [ ] Update the `useChatStream` (or current chat client hook) to read `useLocale()` and include it in each request body
  - [ ] Validate locale on the server with Zod; fall back to `th` (default) if missing or invalid
- [ ] Task: Update chat system prompt to be locale-aware
  - [ ] In `apps/codecamp-advantage/app/api/chat/route.ts`, branch on the validated locale
  - [ ] When locale is `th`: "Respond in Thai (ภาษาไทย) by default. **Mirror the user: if the user writes entirely in English, answer in English; otherwise answer in Thai.**"
  - [ ] When locale is `en`: "Respond in English by default. Mirror the user's language if they switch."
  - [ ] Use the `getChatContext` domain function to include module context
  - [ ] Test that chat responses match the expected locale (mock the LLM, assert system prompt content)
- [ ] Task: Write tests for admin localization
  - [ ] Test: admin page renders Thai labels when locale is `th`
  - [ ] Test: admin page renders English labels when locale is `en`
  - [ ] Test: chat system prompt includes Thai instruction when locale is `th`
- [ ] Task: Measure — User Manual Verification 'Admin & Chat Localization'

## Phase 4: Validation & Cleanup

Run all quality gates and verify no regressions.

- [ ] Task: Pre-empt Thai text-width regressions (don't just verify after the fact)
  - [ ] Audit fixed-width containers in `app/page.tsx`, `app/admin/page.tsx`, and `components/*.tsx`
  - [ ] Apply `min-w-0` + `truncate` (or `line-clamp-N`) on flex/grid children where text could wrap unpredictably
  - [ ] Loosen any `max-w-*` constraints on cards/buttons that were sized for English
  - [ ] Then verify with Thai locale: dashboard cards, admin table columns, chat input placeholder, progress bar labels, locked-module tooltips
- [ ] Task: Add lesson-language badge to clarify that lessons are English
  - [ ] **Why:** Default locale is Thai but the 85 lesson `contentJson` rows are intentionally English (out of scope to translate per spec). Thai-default users will be confused without a hint.
  - [ ] Add an inline badge or notice on the dashboard and module pages: "บทเรียนเป็นภาษาอังกฤษ" (Lessons in English)
  - [ ] Add to the chat: when locale is `th`, the system prompt should mention the lesson content is English so the AI can translate on request
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