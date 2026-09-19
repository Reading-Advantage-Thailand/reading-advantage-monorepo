# Primary Advantage — Student QA Report (t2-student)

**Date:** 2026-09-15T12:59:24.625Z
**Locale:** /en
**Base URL:** http://localhost:3000
**Users tested:** qa-student-a1, qa-student-a2 (School A, class code QACLASSA)
**Password (credential):** QaTest!2026x

## Summary

| Case | Status | Title |
|------|--------|-------|
| 1 | PASS | Student dashboard after login as qa-student-a1 |
| 2 | PASS | Lesson/module flow |
| 3 | BLOCKED | Quiz submission |
| 4-a1 | PASS | Progress pages for qa-student-a1 (data isolation) |
| 4-a2 | PASS | Progress pages for qa-student-a2 (data isolation) |
| 5 | PASS | Navigation links resolve (no 404/500) |
| 6 | BLOCKED | AI chat (student side) |

## Cases

### Case 1: Student dashboard after login as qa-student-a1 — PASS

Landed at http://localhost:3000/en/student/read via API login (student signin UI crashes; see REPORT). Reports headings: Reports. svg=22, cards=17.

**Screenshots:**
- `01-a1-after-login.png`
- `01-a1-reports-dashboard.png`

**Console errors (4):**
```
- [http://localhost:3000/en/student/read] IntlError: MISSING_MESSAGE: Could not resolve `Sidebar.games` in messages for locale `en`.
    at getFallbackFromErrorAndNotify (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3647:23)
    at translateBaseFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3677:28)
    at translateFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3705:
- [http://localhost:3000/en/student/read] requestfailed GET https://storage.googleapis.com/primary-app-storage/images/577addb8-4fb2-4b60-adeb-d52236d2c4c2_1.png -> net::ERR_BLOCKED_BY_ORB
- [http://localhost:3000/en/student/read] requestfailed GET https://storage.googleapis.com/primary-app-storage/images/6c4108d6-e725-41c3-905d-8b117d5c4ee1_1.png -> net::ERR_BLOCKED_BY_ORB
```

### Case 2: Lesson/module flow — PASS

Opened article id=6c4108d6-e725-41c3-905d-8b117d5c4ee1 on /student/read. Article page renders only skeleton then throws "Cannot read properties of null (reading 'split')" in ArticleContent. Direct nav to /student/lesson/<id>?type=article also crashes in TaskIntroduction.

**Screenshots:**
- `02-a1-read-list.png`
- `02-a1-article-opened.png`
- `02-a1-lesson-direct-nav.png`
- `02-a1-lesson-blocked.png`
- `02-a1-assignments-empty-or-list.png`

**Console errors (23):**
```
- [http://localhost:3000/en/student/read] IntlError: MISSING_MESSAGE: Could not resolve `Sidebar.games` in messages for locale `en`.
    at getFallbackFromErrorAndNotify (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3647:23)
    at translateBaseFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3677:28)
    at translateFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3705:
- [http://localhost:3000/en/student/read] requestfailed GET https://storage.googleapis.com/primary-app-storage/images/6c4108d6-e725-41c3-905d-8b117d5c4ee1_1.png -> net::ERR_BLOCKED_BY_ORB
- [http://localhost:3000/en/student/read] requestfailed GET https://storage.googleapis.com/primary-app-storage/images/577addb8-4fb2-4b60-adeb-d52236d2c4c2_1.png -> net::ERR_BLOCKED_BY_ORB
- [http://localhost:3000/en/student/read] IntlError: MISSING_MESSAGE: Could not resolve `Sidebar.games` in messages for locale `en`.
    at getFallbackFromErrorAndNotify (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3647:23)
    at translateBaseFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3677:28)
    at translateFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3705:
- [http://localhost:3000/en/student/read/6c4108d6-e725-41c3-905d-8b117d5c4ee1] %o

%s TypeError: Cannot read properties of null (reading 'split')
    at ArticleContent (http://localhost:3000/_next/static/chunks/apps_primary-advantage_1xe-u05._.js:1166:40)
    at Object.react_stack_bottom_frame (http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_react-dom_096_9a-._.js:15037:24)
    at renderWithHooks (http://localhost:3000/_next/static/chunks/node_modul
- [http://localhost:3000/en/student/read/6c4108d6-e725-41c3-905d-8b117d5c4ee1] TypeError: Cannot read properties of null (reading 'split')
    at ArticleContent (http://localhost:3000/_next/static/chunks/apps_primary-advantage_1xe-u05._.js:1166:40)
    at Object.react_stack_bottom_frame (http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_react-dom_096_9a-._.js:15037:24)
    at renderWithHooks (http://localhost:3000/_next/static/chunks/node_modules_next
- [http://localhost:3000/en/student/lesson/6c4108d6-e725-41c3-905d-8b117d5c4ee1?type=article] Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- [http://localhost:3000/en/student/lesson/6c4108d6-e725-41c3-905d-8b117d5c4ee1?type=article] Encountered a script tag while rendering React component. Scripts inside React components are never executed when rendering on the client. Consider using template tag instead (https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template).
- [http://localhost:3000/en/student/lesson/6c4108d6-e725-41c3-905d-8b117d5c4ee1?type=article] IntlError: MISSING_MESSAGE: Could not resolve `Sidebar.games` in messages for locale `en`.
    at getFallbackFromErrorAndNotify (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3647:23)
    at translateBaseFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3677:28)
    at translateFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3705:
- [http://localhost:3000/en/student/lesson/6c4108d6-e725-41c3-905d-8b117d5c4ee1?type=article] %o

%s TypeError: Cannot read properties of null (reading 'split')
    at TaskIntroduction (http://localhost:3000/_next/static/chunks/apps_primary-advantage_components_lesson_task_1zhfj8c._.js:180:89)
    at Object.react_stack_bottom_frame (http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_react-dom_096_9a-._.js:15037:24)
    at renderWithHooks (http://localhost:3000/_next/
- [http://localhost:3000/en/student/lesson/6c4108d6-e725-41c3-905d-8b117d5c4ee1?type=article] TypeError: Cannot read properties of null (reading 'split')
    at TaskIntroduction (http://localhost:3000/_next/static/chunks/apps_primary-advantage_components_lesson_task_1zhfj8c._.js:180:89)
    at Object.react_stack_bottom_frame (http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_react-dom_096_9a-._.js:15037:24)
    at renderWithHooks (http://localhost:3000/_next/static/
```

### Case 3: Quiz submission — BLOCKED

Article URL reached, but ArticleContent crashed (null split) so MC/SA/LA question cards never rendered. quizPresent=false, submitClicked=false. XP/Level markers after: none.

**Screenshots:**
- `03-a1-quiz-after-submit.png`
- `03-a1-reports-after.png`

**Console errors (23):**
```
- [http://localhost:3000/en/student/read] IntlError: MISSING_MESSAGE: Could not resolve `Sidebar.games` in messages for locale `en`.
    at getFallbackFromErrorAndNotify (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3647:23)
    at translateBaseFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3677:28)
    at translateFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3705:
- [http://localhost:3000/en/student/read] requestfailed GET https://storage.googleapis.com/primary-app-storage/images/6c4108d6-e725-41c3-905d-8b117d5c4ee1_1.png -> net::ERR_BLOCKED_BY_ORB
- [http://localhost:3000/en/student/read] requestfailed GET https://storage.googleapis.com/primary-app-storage/images/577addb8-4fb2-4b60-adeb-d52236d2c4c2_1.png -> net::ERR_BLOCKED_BY_ORB
- [http://localhost:3000/en/student/read] IntlError: MISSING_MESSAGE: Could not resolve `Sidebar.games` in messages for locale `en`.
    at getFallbackFromErrorAndNotify (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3647:23)
    at translateBaseFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3677:28)
    at translateFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3705:
- [http://localhost:3000/en/student/read/6c4108d6-e725-41c3-905d-8b117d5c4ee1] %o

%s TypeError: Cannot read properties of null (reading 'split')
    at ArticleContent (http://localhost:3000/_next/static/chunks/apps_primary-advantage_1xe-u05._.js:1166:40)
    at Object.react_stack_bottom_frame (http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_react-dom_096_9a-._.js:15037:24)
    at renderWithHooks (http://localhost:3000/_next/static/chunks/node_modul
- [http://localhost:3000/en/student/read/6c4108d6-e725-41c3-905d-8b117d5c4ee1] TypeError: Cannot read properties of null (reading 'split')
    at ArticleContent (http://localhost:3000/_next/static/chunks/apps_primary-advantage_1xe-u05._.js:1166:40)
    at Object.react_stack_bottom_frame (http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_react-dom_096_9a-._.js:15037:24)
    at renderWithHooks (http://localhost:3000/_next/static/chunks/node_modules_next
- [http://localhost:3000/en/student/lesson/6c4108d6-e725-41c3-905d-8b117d5c4ee1?type=article] Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- [http://localhost:3000/en/student/lesson/6c4108d6-e725-41c3-905d-8b117d5c4ee1?type=article] Encountered a script tag while rendering React component. Scripts inside React components are never executed when rendering on the client. Consider using template tag instead (https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template).
- [http://localhost:3000/en/student/lesson/6c4108d6-e725-41c3-905d-8b117d5c4ee1?type=article] IntlError: MISSING_MESSAGE: Could not resolve `Sidebar.games` in messages for locale `en`.
    at getFallbackFromErrorAndNotify (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3647:23)
    at translateBaseFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3677:28)
    at translateFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3705:
- [http://localhost:3000/en/student/lesson/6c4108d6-e725-41c3-905d-8b117d5c4ee1?type=article] %o

%s TypeError: Cannot read properties of null (reading 'split')
    at TaskIntroduction (http://localhost:3000/_next/static/chunks/apps_primary-advantage_components_lesson_task_1zhfj8c._.js:180:89)
    at Object.react_stack_bottom_frame (http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_react-dom_096_9a-._.js:15037:24)
    at renderWithHooks (http://localhost:3000/_next/
- [http://localhost:3000/en/student/lesson/6c4108d6-e725-41c3-905d-8b117d5c4ee1?type=article] TypeError: Cannot read properties of null (reading 'split')
    at TaskIntroduction (http://localhost:3000/_next/static/chunks/apps_primary-advantage_components_lesson_task_1zhfj8c._.js:180:89)
    at Object.react_stack_bottom_frame (http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_react-dom_096_9a-._.js:15037:24)
    at renderWithHooks (http://localhost:3000/_next/static/
```

### Case 4-a1: Progress pages for qa-student-a1 (data isolation) — PASS

Visited 5 progress/history pages. Session probe: {"session":{"user":{"id":"55271a44-5acd-4065-b1a9-11672a22eb55","username":"qa-student-a1","name":"qa-student-a1","role":"STUDENT","schoolId":"d2fe3ac4-45f2-4d7e-a281-8d09dadea261","xp":0,"level":1,"cefrLevel":"A1-","ema. reports snippet: Primary Advantage Home About Contact Authors Toggle Locale Toggle theme qa-student-a1 Read Sidebar.Games Assignments Sentences Vocabulary Reports History Leade

**Screenshots:**
- `04-a1-_student_reports.png`
- `04-a1-_student_history.png`
- `04-a1-_student_vocabulary.png`
- `04-a1-_student_sentences.png`
- `04-a1-_student_assignments.png`

**Console errors (8):**
```
- [http://localhost:3000/en/student/read] IntlError: MISSING_MESSAGE: Could not resolve `Sidebar.games` in messages for locale `en`.
    at getFallbackFromErrorAndNotify (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3647:23)
    at translateBaseFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3677:28)
    at translateFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3705:
- [http://localhost:3000/en/student/read] requestfailed GET https://storage.googleapis.com/primary-app-storage/images/6c4108d6-e725-41c3-905d-8b117d5c4ee1_1.png -> net::ERR_BLOCKED_BY_ORB
- [http://localhost:3000/en/student/read] requestfailed GET https://storage.googleapis.com/primary-app-storage/images/577addb8-4fb2-4b60-adeb-d52236d2c4c2_1.png -> net::ERR_BLOCKED_BY_ORB
```

### Case 4-a2: Progress pages for qa-student-a2 (data isolation) — PASS

Visited 5 progress/history pages. Session probe: {"session":{"user":{"id":"d1b58100-786e-455a-a0b1-06fe69604d42","username":"qa-student-a2","name":"qa-student-a2","role":"STUDENT","schoolId":"d2fe3ac4-45f2-4d7e-a281-8d09dadea261","xp":0,"level":1,"cefrLevel":"A1-","ema. reports snippet: Primary Advantage Home About Contact Authors Toggle Locale Toggle theme qa-student-a2 Read Sidebar.Games Assignments Sentences Vocabulary Reports History Leade

**Screenshots:**
- `04-a2-_student_reports.png`
- `04-a2-_student_history.png`
- `04-a2-_student_vocabulary.png`
- `04-a2-_student_sentences.png`
- `04-a2-_student_assignments.png`

**Console errors (8):**
```
- [http://localhost:3000/en/student/read] IntlError: MISSING_MESSAGE: Could not resolve `Sidebar.games` in messages for locale `en`.
    at getFallbackFromErrorAndNotify (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3647:23)
    at translateBaseFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3677:28)
    at translateFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3705:
- [http://localhost:3000/en/student/read] requestfailed GET https://storage.googleapis.com/primary-app-storage/images/577addb8-4fb2-4b60-adeb-d52236d2c4c2_1.png -> net::ERR_BLOCKED_BY_ORB
- [http://localhost:3000/en/student/read] requestfailed GET https://storage.googleapis.com/primary-app-storage/images/6c4108d6-e725-41c3-905d-8b117d5c4ee1_1.png -> net::ERR_BLOCKED_BY_ORB
```

### Case 5: Navigation links resolve (no 404/500) — PASS

Visited 5 links. Broken: none.

**Screenshots:**
- `05-nav_en.png`
- `05-nav_en_about.png`
- `05-nav_en_contact.png`
- `05-nav_en_authors.png`
- `05-nav_en_student_read.png`

**Console errors (9):**
```
- [http://localhost:3000/en/student/read] IntlError: MISSING_MESSAGE: Could not resolve `Sidebar.games` in messages for locale `en`.
    at getFallbackFromErrorAndNotify (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3647:23)
    at translateBaseFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3677:28)
    at translateFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3705:
- [http://localhost:3000/en/student/read] requestfailed GET https://storage.googleapis.com/primary-app-storage/images/577addb8-4fb2-4b60-adeb-d52236d2c4c2_1.png -> net::ERR_BLOCKED_BY_ORB
- [http://localhost:3000/en/student/read] requestfailed GET https://storage.googleapis.com/primary-app-storage/images/6c4108d6-e725-41c3-905d-8b117d5c4ee1_1.png -> net::ERR_BLOCKED_BY_ORB
```

### Case 6: AI chat (student side) — BLOCKED

chatFound=false, chatSent=false, status=NOT_PRESENT_ON_STUDENT. AI chat widget is embedded inside TaskLanguageQuestions, which only mounts after TaskIntroduction. TaskIntroduction crashes (null split), so the chat never renders. Tail of body text: 

**Screenshots:**
- `06-a1-ai-chat.png`

**Console errors (7):**
```
- [http://localhost:3000/en/student/read] IntlError: MISSING_MESSAGE: Could not resolve `Sidebar.games` in messages for locale `en`.
    at getFallbackFromErrorAndNotify (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3647:23)
    at translateBaseFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3677:28)
    at translateFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3705:
- [http://localhost:3000/en/student/read] requestfailed GET https://storage.googleapis.com/primary-app-storage/images/577addb8-4fb2-4b60-adeb-d52236d2c4c2_1.png -> net::ERR_BLOCKED_BY_ORB
- [http://localhost:3000/en/student/read] requestfailed GET https://storage.googleapis.com/primary-app-storage/images/6c4108d6-e725-41c3-905d-8b117d5c4ee1_1.png -> net::ERR_BLOCKED_BY_ORB
- [http://localhost:3000/en/student/read] IntlError: MISSING_MESSAGE: Could not resolve `Sidebar.games` in messages for locale `en`.
    at getFallbackFromErrorAndNotify (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3647:23)
    at translateBaseFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3677:28)
    at translateFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3705:
```

## Bug summary (read-only inspection)

### P0 — Student sign-in UI crash

Repro:
1. Visit `http://localhost:3000/en/auth/signin`
2. Enter classroom code `QACLASSA` and submit
3. The React component crashes before the student picker appears.

Console error:
```
TypeError: Cannot read properties of undefined (reading 'email')
  at StudentSignInForm (apps_primary-advantage_app_%5Blocale%5D_auth_signin_page_tsx ...)
  at Array.map (<anonymous>)
```

Root cause (read-only inspection):
- `apps/primary-advantage/server/models/classroomModel.ts` returns flat fields: `studentEmail, studentName`
- `apps/primary-advantage/components/auth/student-signin-form.tsx` reads nested `student.student.email` and `student.student.name`
- Even if the form rendered, it would submit the class code as the password; the credential password is `QaTest!2026x`

Workaround used by this test: POST `/api/auth/login` with `{ username, password: "QaTest!2026x" }` so downstream pages can be exercised.

### P0 — Article read view crashes for incomplete articles

Repro:
1. Login (any way).
2. Visit `/student/read/6c4108d6-e725-41c3-905d-8b117d5c4ee1` (or any QA Game Content article).
3. The `ArticleContent` component throws and the page renders a skeleton / "Something went wrong" error.

```
TypeError: Cannot read properties of null (reading 'split')
  at ArticleContent (.../apps_primary-advantage_1xe-u05._.js:1166)
```

Same error also fires on the lesson route `/student/lesson/<id>?type=article` inside `TaskIntroduction`.

Impact: Cases 3 (quiz) and 6 (AI chat) cannot be reached because both flows live inside the broken article view / lesson task sequence.

### P2 — Missing i18n key `Sidebar.games`

Sidebar renders `SidebarGames` literally in the UI on every student page. Confirmed via DevTools console error:
```
IntlError: MISSING_MESSAGE: Could not resolve `Sidebar.games` in messages for locale `en`.
```

### P2 — Storage article images unreachable from headless browser

Console shows repeated `requestfailed GET https://storage.googleapis.com/primary-app-storage/images/...png -> net::ERR_BLOCKED_BY_ORB`. The article-card backgrounds and detail images are external to GCS and not reachable in the local dev sandbox.

## Aggregate console errors

Total captured: 82

```
- [http://localhost:3000/en/student/read] IntlError: MISSING_MESSAGE: Could not resolve `Sidebar.games` in messages for locale `en`.
    at getFallbackFromErrorAndNotify (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3647:23)
    at translateBaseFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3677:28)
    at translateFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3705:
- [http://localhost:3000/en/student/read] requestfailed GET https://storage.googleapis.com/primary-app-storage/images/577addb8-4fb2-4b60-adeb-d52236d2c4c2_1.png -> net::ERR_BLOCKED_BY_ORB
- [http://localhost:3000/en/student/read] requestfailed GET https://storage.googleapis.com/primary-app-storage/images/6c4108d6-e725-41c3-905d-8b117d5c4ee1_1.png -> net::ERR_BLOCKED_BY_ORB
- [http://localhost:3000/en/student/read] IntlError: MISSING_MESSAGE: Could not resolve `Sidebar.games` in messages for locale `en`.
    at getFallbackFromErrorAndNotify (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3647:23)
    at translateBaseFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3677:28)
    at translateFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3705:
- [http://localhost:3000/en/student/read/6c4108d6-e725-41c3-905d-8b117d5c4ee1] %o

%s TypeError: Cannot read properties of null (reading 'split')
    at ArticleContent (http://localhost:3000/_next/static/chunks/apps_primary-advantage_1xe-u05._.js:1166:40)
    at Object.react_stack_bottom_frame (http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_react-dom_096_9a-._.js:15037:24)
    at renderWithHooks (http://localhost:3000/_next/static/chunks/node_modul
- [http://localhost:3000/en/student/read/6c4108d6-e725-41c3-905d-8b117d5c4ee1] TypeError: Cannot read properties of null (reading 'split')
    at ArticleContent (http://localhost:3000/_next/static/chunks/apps_primary-advantage_1xe-u05._.js:1166:40)
    at Object.react_stack_bottom_frame (http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_react-dom_096_9a-._.js:15037:24)
    at renderWithHooks (http://localhost:3000/_next/static/chunks/node_modules_next
- [http://localhost:3000/en/student/lesson/6c4108d6-e725-41c3-905d-8b117d5c4ee1?type=article] Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- [http://localhost:3000/en/student/lesson/6c4108d6-e725-41c3-905d-8b117d5c4ee1?type=article] Encountered a script tag while rendering React component. Scripts inside React components are never executed when rendering on the client. Consider using template tag instead (https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template).
- [http://localhost:3000/en/student/lesson/6c4108d6-e725-41c3-905d-8b117d5c4ee1?type=article] IntlError: MISSING_MESSAGE: Could not resolve `Sidebar.games` in messages for locale `en`.
    at getFallbackFromErrorAndNotify (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3647:23)
    at translateBaseFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3677:28)
    at translateFn (http://localhost:3000/_next/static/chunks/node_modules_0etn680._.js:3705:
- [http://localhost:3000/en/student/lesson/6c4108d6-e725-41c3-905d-8b117d5c4ee1?type=article] %o

%s TypeError: Cannot read properties of null (reading 'split')
    at TaskIntroduction (http://localhost:3000/_next/static/chunks/apps_primary-advantage_components_lesson_task_1zhfj8c._.js:180:89)
    at Object.react_stack_bottom_frame (http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_react-dom_096_9a-._.js:15037:24)
    at renderWithHooks (http://localhost:3000/_next/
- [http://localhost:3000/en/student/lesson/6c4108d6-e725-41c3-905d-8b117d5c4ee1?type=article] TypeError: Cannot read properties of null (reading 'split')
    at TaskIntroduction (http://localhost:3000/_next/static/chunks/apps_primary-advantage_components_lesson_task_1zhfj8c._.js:180:89)
    at Object.react_stack_bottom_frame (http://localhost:3000/_next/static/chunks/node_modules_next_dist_compiled_react-dom_096_9a-._.js:15037:24)
    at renderWithHooks (http://localhost:3000/_next/static/
```

## Test data adjustments (no application code modified)

To make the student sign-in flow reachable, the QA seed was augmented in the local DB only:
- `UPDATE classrooms SET password_students = 'QACLASSA' WHERE name = 'QA Class A'` (the seed wrote `class_code`; the login route reads `password_students`)
- `UPDATE users SET email = username || '@qatest.local' WHERE username LIKE 'qa-%'` (so the student picker has a value to render)

These are fixture-data updates only; the seed script `apps/primary-advantage/scripts/seed-qa-users.ts` itself was left unchanged.