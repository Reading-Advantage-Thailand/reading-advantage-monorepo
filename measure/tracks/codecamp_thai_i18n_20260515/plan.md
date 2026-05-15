# Implementation Plan: Codecamp Thai Localization

## Phase 1: Contract & Schema

Update next-intl config and create the Thai translation file.

- [ ] Task: Update `i18n/routing.ts` to add Thai locale and set `th` as default
  - [ ] Set `locales: ['th', 'en']` and `defaultLocale: 'th'`
  - [ ] Configure locale prefix strategy (always show prefix)
  - [ ] Ensure root `/` redirects to `/th/`
- [ ] Task: Update `i18n/request.ts` to load Thai messages
  - [ ] Add `th` locale loader mapping to `messages/th.json`
  - [ ] Verify fallback chain works (missing key in `th` falls back to `en`)
- [ ] Task: Create `apps/codecamp-advantage/messages/th.json` with Thai translations
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
- [ ] Task: Write tests for Thai locale loading
  - [ ] Test: `messages/th.json` has the same keys as `messages/en.json`
  - [ ] Test: `routing.ts` exports `th` as the default locale
  - [ ] Test: Thai translations are non-empty strings (not just English copies)
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
- [ ] Task: Update `middleware.ts` to handle locale routing
  - [ ] Use `createMiddleware` from `next-intl/middleware`
  - [ ] Configure locale detection from URL prefix, then cookie, then browser preference
  - [ ] Continue protecting `/admin/*` routes for authenticated users
  - [ ] Ensure API routes bypass locale handling
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
- [ ] Task: Update chat system prompt to be locale-aware
  - [ ] In `apps/codecamp-advantage/app/api/chat/route.ts`, pass the user's locale to the system prompt
  - [ ] When locale is `th`: add "Respond in Thai (ภาษาไทย) by default. Switch to English only if the user explicitly asks."
  - [ ] When locale is `en`: add "Respond in English."
  - [ ] Use the `getChatContext` domain function to include module context
  - [ ] Test that chat responses match the expected locale
- [ ] Task: Write tests for admin localization
  - [ ] Test: admin page renders Thai labels when locale is `th`
  - [ ] Test: admin page renders English labels when locale is `en`
  - [ ] Test: chat system prompt includes Thai instruction when locale is `th`
- [ ] Task: Measure — User Manual Verification 'Admin & Chat Localization'

## Phase 4: Validation & Cleanup

Run all quality gates and verify no regressions.

- [ ] Task: Verify layout stability when switching locales
  - [ ] Check dashboard cards don't clip with Thai text
  - [ ] Check admin table columns don't overflow with Thai labels
  - [ ] Check chat input placeholder doesn't clip
  - [ ] Check module progress bars render correctly with Thai labels
- [ ] Task: Run full quality gate
  - [ ] `pnpm turbo run build --filter=codecamp-advantage`
  - [ ] `pnpm turbo run lint --filter=codecamp-advantage`
  - [ ] `pnpm turbo run check-types --filter=codecamp-advantage`
  - [ ] `pnpm turbo run test --filter=@reading-advantage/domain`
  - [ ] `pnpm turbo run test --filter=@reading-advantage/api`
  - [ ] `pnpm turbo run test --filter=codecamp-advantage`
- [ ] Task: Resolve tech-debt item: "`contentJson` schema validation missing in LessonContent"
  - [ ] Add Zod validation for `contentJson` in `LessonContent` component
  - [ ] Provide safe fallback for invalid shapes
  - [ ] Write test for invalid content rendering gracefully
- [ ] Task: Update `measure/tracks.md` to reference this track
- [ ] Task: Measure — User Manual Verification 'Validation & Cleanup'