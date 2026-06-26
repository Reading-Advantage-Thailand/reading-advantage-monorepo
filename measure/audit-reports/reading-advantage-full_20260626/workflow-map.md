# Workflow Map: Reading Advantage

> **Audit:** reading-advantage-full_20260626
> **Review roles:** B — Security / Tenancy / Auth; C — UX / API / Contracts; A — Correctness / Product Behavior
> **Date:** 2026-06-27
> **Baseline SHA:** 6921fda0ee45012232bdd71c444d4e9523a10ab6

---

## 1. User Roles and Page Layouts

### Role Route Groups
| Role | Page Group | Path |
|------|-----------|------|
| Student | `(student)` | `/[locale]/(student)/` |
| Teacher | `(teacher)` | `/[locale]/(teacher)/` |
| Admin | `(admin)` | `/[locale]/(admin)/` |
| System | `(system)` | `/[locale]/(system)/` |
| Auth | `(auth)` | `/[locale]/(auth)/` |

### Student Pages
| Page | Route |
|------|-------|
| Level Dashboard | `(student)/level/page.tsx` |
| Student Dashboard | `(student)/student/dashboard/` |
| Reading / Lessons | `(student)/student/lesson/`, `student/read/` |
| Stories | `(student)/student/stories/` |
| Assignments | `(student)/student/assignments/` |
| Flashcards / Vocabulary | `(student)/student/vocabulary/`, `student/sentences/` |
| Goals | `(student)/student/goals/` |
| Games | `(student)/student/games/` |
| History | `(student)/student/history/` |
| Reports | `(student)/student/reports/` |
| Settings | `(student)/settings/` |

### Teacher Pages
| Page | Route |
|------|-------|
| Teacher Dashboard | `(teacher)/teacher/dashboard/` |
| My Classes | `(teacher)/teacher/my-classes/` |
| Class Roster | `(teacher)/teacher/class-roster/` |
| Student Progress | `(teacher)/teacher/student-progress/` |
| Assignments | `(teacher)/teacher/assignments/` |
| Passages | `(teacher)/teacher/passages/` |
| Reports | `(teacher)/teacher/reports/` |
| Workbook Generator | `(teacher)/teacher/workbook-generator/` |
| Enroll/Unenroll Classes | `(teacher)/teacher/enroll-classes/`, `teacher/unenroll-classes/` |

### Admin Pages
| Page | Route |
|------|-------|
| Admin Dashboard | `(admin)/admin/dashboard/` |
| School Dashboard | `(admin)/admin/schooldashboard/` |
| Reports | `(admin)/admin/reports/` |
| Teacher Assignments | `(admin)/admin/teacher-assignments/` |
| Article Creation | `(admin)/admin/article-creation/` |
| Management | `(admin)/admin/management/` |
| Handle Passages | `(admin)/admin/handle-passages/` |
| License | `(admin)/admin/license/` |

---

## 2. API Route Families

### 2.0 Complete Route-Family Coverage (209 route files)

This table is the acceptance map for **every** `apps/reading-advantage/app/api/**/route.ts` family. Counts were verified against the filesystem during acceptance with a labeled route-family parse. "Auth signal" means the route file imports or invokes one of the legacy guard/context seams (`protect`, `restrictTo`, `getCurrentUser`, shared auth handlers, or tRPC context); it is not proof of tenant/resource authorization.

| Route family | Route files | Auth / permission pattern | Data access pattern | Primary controller / seam |
|---|---:|---|---|---|
| `auth` | 8 | Mixed public auth endpoints plus shared auth handlers | 3 direct `@reading-advantage/db` routes (`signup`, `reset-password`, `check-password-set`); others delegate to shared auth API | `@reading-advantage/api/routes/auth`, inline handlers |
| `trpc` | 1 | Shared tRPC context | Shared `@reading-advantage/api` router | `appRouter` / `createContext` |
| `v1/activity` | 5 | 4 guarded, 1 unauthenticated bulk update | Controller → direct DB | `activity-controller`, `auth-controller` |
| `v1/admin` | 6 | Guarded role/context checks | Controller → direct DB | `admin-controller`, `teacher-assignment-controller` |
| `v1/ai` | 5 | 4 guarded, 1 unauthenticated refresh | Controller/inline → direct DB + AI adapter/provider seams | `ai-controller`, `ai-insight-*` |
| `v1/articles` | 19 | 16 guarded, 3 unauthenticated/unguarded utility/generation routes | Controller → direct DB; 1 direct DB route (`export-workbook`) | `article-controller`, `question-controller`, `generator-controller`, `validator-controller` |
| `v1/assignment-notifications` | 1 | Guarded | Controller → direct DB | `assignment-notification-controller` |
| `v1/assignments` | 1 | `restrictTo(TEACHER, ADMIN, SYSTEM)` | Controller → direct DB | `assignment-controller` |
| `v1/assistant` | 10 | Guarded | Controller → direct DB + AI provider seams | `assistant-controller`, `stories-assistant-controller`, `translation-controller` |
| `v1/classroom` | 29 | 24 guarded, 5 OAuth routes without legacy guard signal | Controller → direct DB; Firestore stub in one OAuth course route | `classroom-controller`, `assignment-classroom-controller`, `student-notification-controller` |
| `v1/demo` | 3 | Public demo/test endpoints | 1 direct DB route; others controller/inline | `auth-controller`, inline |
| `v1/flashcard` | 14 | Guarded | Controller → direct DB; 2 direct DB routes (`deck-id`, `progress/update`) | `flashcard-controller`, inline FSRS update |
| `v1/games` | 27 | Guarded | Controller → direct DB/activity/XP writes | game controllers (`dragon-flight`, `rpg-battle`, etc.) |
| `v1/goals` | 5 | Guarded | Controller → direct DB | `goals-controller` |
| `v1/health` | 1 | No legacy auth guard signal | Direct DB health query | inline `/health/database` |
| `v1/lesson` | 6 | Guarded | Controller → direct DB | `lesson-controller` |
| `v1/level-test` | 2 | Guarded | Controller → AI adapter + session context | `level-test-controller` |
| `v1/licenses` | 2 | Guarded | Controller → direct DB | `license-controller` |
| `v1/metrics` | 15 | 12 guarded, 3 unauthenticated metrics/cache/stream routes | Controller → direct DB; 1 direct DB route (`metrics/system`) | metrics, dashboard, assignment, SRS controllers |
| `v1/passage` | 2 | Guarded | Controller → direct DB | `article-controller` |
| `v1/stories` | 13 | 12 guarded, 1 unauthenticated generation route | Controller → direct DB + AI generator seams | `stories-controller`, `stories-question-controller` |
| `v1/student` | 1 | Guarded | Controller → direct DB | `student-dashboard-controller` |
| `v1/system` | 9 | 8 SYSTEM/guarded, 1 unauthenticated refresh route | Controller → direct DB; 2 direct DB routes | `system-controller`, `system-dashboard-controller`, article/classroom helpers |
| `v1/teacher` | 7 | Guarded | Controller → direct DB | teacher/class/report controllers |
| `v1/telemetry` | 1 | No legacy auth guard signal | Inline telemetry/dashboard response | inline |
| `v1/users` | 14 | Guarded | Controller → direct DB | `user-controller`, `leaderboard-controller`, assignment/flashcard helpers |
| `v1/xp` | 2 | Guarded | Controller → direct DB/license checks | `license-controller` |

### Auth Routes (`/api/auth/`)
| Route | Method | Auth | Delegates to |
|-------|--------|------|-------------|
| `/api/auth/login` | POST | None | `@reading-advantage/api/routes/auth` |
| `/api/auth/register` | POST | None | `@reading-advantage/api/routes/auth` |
| `/api/auth/signup` | POST | None | **Direct handler** (db import) |
| `/api/auth/logout` | POST | Session | `@reading-advantage/api/routes/auth` |
| `/api/auth/session` | GET | Cookie | `@reading-advantage/api/routes/auth` |
| `/api/auth/reset-password` | POST | None | **Direct handler** (db import) |
| `/api/auth/impersonate` | POST | Admin | `@reading-advantage/api/routes/auth` |
| `/api/auth/check-password-set` | POST | None | **Direct handler** (db import) |

### Student Routes (`/api/v1/student/`)
| Route | Method | Auth | Controller |
|-------|--------|------|-----------|
| `/api/v1/student/me` | GET | protect | `student-dashboard-controller` |

### Stories Routes (`/api/v1/stories/`)
| Route | Method | Auth | Controller |
|-------|--------|------|-----------|
| `/api/v1/stories` | GET | protect | `stories-controller` |
| `/api/v1/stories/generate` | POST | **None** | `stories-controller` |
| `/api/v1/stories/[storyId]` | GET | protect | `stories-controller` |
| `/api/v1/stories/[storyId]/[chapterNumber]` | GET | protect | `stories-controller` |
| `/api/v1/stories/.../question/mcq/[n]` | POST | protect | `question-controller` |
| `/api/v1/stories/.../question/sa/[n]` | POST | protect | `question-controller` |
| `/api/v1/stories/.../question/laq/[n]` | POST | protect | `question-controller` |

### Articles Routes (`/api/v1/articles/`)
| Route | Method | Auth | Controller |
|-------|--------|------|-----------|
| `/api/v1/articles` | GET | protect | `article-controller` |
| `/api/v1/articles/[article_id]` | GET/DELETE | protect | `article-controller` |
| `/api/v1/articles/[article_id]/questions/...` | POST | protect | `question-controller` |
| `/api/v1/articles/[article_id]/export-workbook` | POST | protect | `article-controller` |

### Flashcard Routes (`/api/v1/flashcard/`)
| Route | Method | Auth | Controller |
|-------|--------|------|-----------|
| `/api/v1/flashcard/progress/update` | POST | **Direct db** | **Inline handler** |
| `/api/v1/flashcard/progress/[id]` | GET/PUT | protect | `flashcard-controller` |
| `/api/v1/flashcard/decks/[deckId]/sentences-for-cloze` | GET | protect | `flashcard-controller` |
| `/api/v1/flashcard/decks/[deckId]/words-for-ordering` | GET | protect | `flashcard-controller` |
| `/api/v1/flashcard/stats/[id]` | GET | protect | `flashcard-controller` |

### Classroom Routes (`/api/v1/classroom/`)
| Route | Method | Auth | Controller |
|-------|--------|------|-----------|
| `/api/v1/classroom` | GET/POST | protect | `classroom-controller` |
| `/api/v1/classroom/[classroomId]` | GET/PUT/DELETE | protect | `classroom-controller` |
| `/api/v1/classroom/[classroomId]/enroll` | PATCH | protect | `classroom-controller` |
| `/api/v1/classroom/[classroomId]/unenroll` | PATCH | protect | `classroom-controller` |

### Assignment Routes (`/api/v1/assignments/`)
| Route | Method | Auth | Controller |
|-------|--------|------|-----------|
| `/api/v1/assignments` | GET/POST/PUT/DELETE | restrictTo(TEACHER,ADMIN,SYSTEM) | `assignment-controller` |

### Metrics Routes (`/api/v1/metrics/`)
| Route | Method | Auth | Controller |
|-------|--------|------|-----------|
| `/api/v1/metrics/dashboard-summary` | GET | protect | `dashboard-summary-controller` |
| `/api/v1/metrics/velocity` | GET | protect | `velocity-controller` |
| `/api/v1/metrics/assignments` | GET | protect | `metrics-extended-controller` |
| `/api/v1/metrics/srs` | GET | protect | `srs-health-controller` |
| `/api/v1/metrics/health` | GET | **None** | inline |

### AI Routes (`/api/v1/ai/`)
| Route | Method | Auth | Controller |
|-------|--------|------|-----------|
| `/api/v1/ai/summary` | GET | protect | `ai-controller` |
| `/api/v1/ai/insights/refresh` | POST | **None** | inline |
| `/api/v1/ai/insights/action` | POST | protect | `ai-controller` |
| `/api/v1/ai/insights/dismiss` | POST | protect | `ai-controller` |
| `/api/v1/ai/insights/cache` | GET | protect | `ai-controller` |

### Teacher Routes (`/api/v1/teacher/`)
| Route | Method | Auth | Controller |
|-------|--------|------|-----------|
| `/api/v1/teacher/classes` | GET | protect | `teacher-dashboard-controller` |
| `/api/v1/teacher/overview` | GET | protect | `teacher-dashboard-controller` |
| `/api/v1/teacher/class/[classroomId]/overview` | GET | protect | `class-dashboard-controller` |
| `/api/v1/teacher/class/[classroomId]/accuracy` | GET | protect | `class-accuracy-controller` |
| `/api/v1/teacher/class/[classroomId]/export` | GET | protect | `class-export-controller` |
| `/api/v1/teacher/classroom/[classroomId]/goals` | GET/POST | protect | `classroom-goals-controller` |

### Admin Routes (`/api/v1/admin/`)
| Route | Method | Auth | Controller |
|-------|--------|------|-----------|
| `/api/v1/admin/dashboard` | GET | protect | `admin-controller` |
| `/api/v1/admin/overview` | GET | protect | `admin-controller` |
| `/api/v1/admin/segments` | GET | protect | `admin-controller` |
| `/api/v1/admin/teacher-effectiveness` | GET | protect | `admin-controller` |
| `/api/v1/admin/teacher-assignments` | GET | protect | `admin-controller` |
| `/api/v1/admin/alerts` | GET | protect | `admin-controller` |

### System Routes (`/api/v1/system/`)
| Route | Method | Auth | Controller |
|-------|--------|------|-----------|
| `/api/v1/system/dashboard` | GET | restrictTo(SYSTEM) | `system-dashboard-controller` |

### Game Routes (`/api/v1/games/`)
| Route | Method | Auth | Controller |
|-------|--------|------|-----------|
| `/api/v1/games/*/score` | POST | protect | Various game controllers |
| `/api/v1/games/*/xp` | POST | protect | Various game controllers |

---

## 3. User-Facing Workflow Flows

### 3.1 Student Reading Flow
```
Login → Dashboard → Browse Articles → Select Article → Read Article
  → Answer MCQ → Answer SAQ → Answer LAQ → Get AI Feedback
  → Earn XP → Update Progress
```

### 3.2 Student Story Flow
```
Login → Dashboard → Browse Stories → Select Story → Select Chapter
  → Read Chapter → Answer MCQ → Answer SAQ → Answer LAQ
  → Get AI Feedback → Check Chapter Completion → Next Chapter
```

### 3.3 Student Flashcard Flow
```
Login → Dashboard → Vocabulary/Sentences → Select Deck
  → Cloze Test / Word Ordering / Sentence Ordering
  → Rate Card (Again/Hard/Good/Easy) → FSRS Update → Next Review
```

### 3.4 Teacher Classroom Flow
```
Login → Dashboard → My Classes → Create/View Class
  → Manage Roster (Enroll/Unenroll) → View Student Progress
  → Create Assignment → View Reports → Export Data
```

### 3.5 Teacher Assignment Flow
```
Login → Dashboard → Assignments → Create Assignment
  → Select Classroom → Select Article → Set Due Date → Assign Students
  → Monitor Progress → View Reports
```

### 3.6 Admin Dashboard Flow
```
Login → Admin Dashboard → View School Overview
  → Teacher Effectiveness → Student Segments → Alerts
  → Teacher Assignments → Reports
```

### 3.7 AI Insights Flow
```
Login → Dashboard → AI Summary/Insights → View Recommendations
  → Take Action (assign, recommend) → Dismiss/Refresh
```

---

## 4. Contract Patterns

### Pattern A: Shared API Delegation (5 routes)
Route file → `@reading-advantage/api/routes/auth` → shared package
- Login, Register, Logout, Session, Impersonate
- **Clean:** No direct db import in route file

### Pattern B: Edge Router + Controller (180+ routes)
Route file → `next-connect` edge router → `server/controllers/*.ts` → `@reading-advantage/db`
- Most v1 API routes follow this pattern
- Uses `protect` / `restrictTo` middleware

### Pattern C: Direct Handler in Route (4 routes)
Route file directly imports `@reading-advantage/db`:
- `signup/route.ts` — User registration with direct db
- `reset-password/route.ts` — Password reset with direct db
- `check-password-set/route.ts` — Password check with direct db
- `flashcard/progress/update/route.ts` — FSRS update with direct db

### Pattern D: No Auth (14+ routes)
Routes with no authentication:
- Auth endpoints (expected)
- Demo endpoints (expected for testing)
- Health/metrics endpoints (sensitive but unauthenticated)
- Article/story generation triggers (unauthenticated)
- AI insight refresh (unauthenticated)

---

## 5. Error Response Patterns

### Inconsistent Error Response Shape

| Pattern | Shape | Routes Using |
|---------|-------|-------------|
| `{ message, status }` | Status in body, not HTTP | Flashcard progress update |
| `{ code, message }` | HTTP status + code | AI controller, student dashboard |
| `{ error }` | Just error object | Classroom controller |
| `{ message, error }` | Both fields | Classroom enroll/unenroll |
| `{ success, data, message }` | Success wrapper | Demo accounts |
| `{ message }` | Simple message | Most controllers |

**No standardized error contract exists across the API surface.**

---

## 6. Validation Patterns

### Body Validation
- **Zod used sparingly:** Only `classroom-controller.ts` `patchClassroomEnroll` uses Zod for body parsing
- **No body validation:** Most routes parse body with `await req.json()` and no schema validation
- **No query param validation:** URL search params are cast directly (`Number(searchParams.get("page"))`)

### Input Validation Gaps
| Area | Validation Status |
|------|------------------|
| Article search params | None — cast to number |
| Story chapter params | None — used as string |
| Flashcard rating | None — switch statement, falls through to default |
| Assignment body | None — parsed from JSON directly |
| Classroom body | Partial Zod in one function |
| AI summary params | None — searchParams.get directly |
| Level-test assessment output | None — JSON parsed but not schema-validated |
| AI-generated article level | None — no post-hoc CEFR/readability check |

## 7. Product-Behavior / Data-Persistence Edge Cases

### 7.1 Student Reading → Quiz → Completion
- `question-controller.ts` checks MCQ count (`>= 5`), SAQ completion, and LAQ completion (Enterprise only) to mark `ARTICLE_READ` completed.
- **Edge-case risk:** LAQ license gating uses an inverted fallback that returns `ENTERPRISE` when license data is missing (PB-008).
- **Edge-case risk:** `checkAndUpdateArticleCompletion` queries all MCQ activities then filters in JS by `details.articleId`; could be slow or miss data if `details` shape changes.

### 7.2 XP Awarding → Level Progression
- `user-controller.ts:postActivityLog` awards XP once per `(userId, activityId, targetId)` but uses non-atomic read-check-insert-update (PB-001).
- `users.xp` and `users.level` are updated independently of `xpLogs`.
- **Edge-case risk:** Concurrent requests can double-award XP; client retries can double-award XP.

### 7.3 Level Test
- `level-test-controller.ts` streams chat to OpenAI `gpt-5` with `temperature: 1`.
- Final assessment is parsed from markdown JSON block but not validated before the frontend uses it (PB-002).
- **Edge-case risk:** AI output format drift or partial stream leaves user level in an invalid state.

### 7.4 Flashcard / FSRS
- `flashcard-controller.ts` reads the card, runs `ts-fsrs`, then updates the row in separate statements.
- **Edge-case risk:** Concurrent reviews of the same card produce a last-write-wins corruption (related to C-011).

### 7.5 Assignments
- Status is mapped locally with `statusToInt`; no shared enum (PB-004).
- Overdue detection is computed in services; no test coverage for timezone/due-date edge cases.

### 7.6 Reports
- `class-accuracy-controller.ts` averages per-student rounded accuracies, compounding rounding error.
- Open-ended "correctness" is decided by hard-coded `score >= 3 || rating >= 3` (PB-006).
- **Edge-case risk:** Teacher sees inaccurate class accuracy due to mixed scales and rounding.
