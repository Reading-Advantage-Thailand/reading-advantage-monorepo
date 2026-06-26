# 00-Inventory: Reading Advantage Security + Correctness Surface

> **Audit:** reading-advantage-full_20260626
> **Review roles:** B — Security / Tenancy / Auth; C — UX / API / Contracts; A — Correctness / Product Behavior
> **Date:** 2026-06-27
> **Baseline SHA:** 6921fda0ee45012232bdd71c444d4e9523a10ab6

---

## 1. Architecture Summary

Reading Advantage is a ~3-year-old Next.js app organized in a **thin-route / thick-controller** pattern:

```
app/api/v1/**/route.ts   →   server/controllers/*-controller.ts   →   @reading-advantage/db
                            server/services/*-service.ts
                            server/utils/generators/*-generator.ts
```

209 route.ts files delegate to 54 controllers in `server/controllers/`. Controllers access the database via Drizzle's `db` object imported directly from `@reading-advantage/db`. No `TenantDB` wrapper, no `assertCan`, no `@reading-advantage/domain` layer exists between controllers and the database.

---

## 2. File Counts

| Category | Count |
|----------|-------|
| Total `app/**/route.ts` files | 209 |
| Route files with auth checks (restrictTo/protect/getCurrentUser) | 180 |
| Route files without auth checks | 29 |
| Route files importing `@reading-advantage/db` directly | 12 |
| Route files delegating to controllers/services | 195 |
| `server/controllers/*.ts` files | 54 |
| Controller files importing `@reading-advantage/db` directly | 49 |
| All `server/` files importing `@reading-advantage/db` directly | 64 |
| `server/` TypeScript files total | 100 |
| Files referencing `schoolId` / `school_id` in server/ | 34 |

---

## 3. Auth Surface

### 3.1 Session Flow
- `lib/session.ts` — `getCurrentUser()` reads `session_token` cookie, validates via shared `@reading-advantage/auth` (`validateSession`), enriches with user data from DB.
- `server/controllers/auth-controller.ts` — `protect()` / `restrictTo(...roles)` middleware wrappers.
- `middleware.ts` — Edge-level redirect logic (role-based dashboard routing, level-test gate). Calls `/api/auth/session` internally.

### 3.2 Auth API Routes (delegated to shared packages)
| Route | Delegates to |
|-------|-------------|
| `/api/auth/login` | `@reading-advantage/api/routes/auth` `handleLogin` |
| `/api/auth/register` | `@reading-advantage/api/routes/auth` `handleRegister` |
| `/api/auth/logout` | `@reading-advantage/api/routes/auth` `handleLogout` |
| `/api/auth/session` | `@reading-advantage/api/routes/auth` |
| `/api/auth/signup` | `@reading-advantage/api/routes/auth` |
| `/api/auth/reset-password` | `@reading-advantage/api/routes/auth` |
| `/api/auth/impersonate` | `@reading-advantage/api/routes/auth` `handleImpersonate` |
| `/api/auth/check-password-set` | Own handler |

### 3.3 tRPC
- `/api/trpc/[trpc]` — Uses shared `@reading-advantage/api` `appRouter` + `createContext`.
- Authorization header forwarded to context creation.

---

## 4. Permission / Authorization Model

**Legacy role-check pattern** (used everywhere, 0 `assertCan` calls):
```ts
// auth-controller.ts
const restrictTo = (...allowedRoles: string[]) => { ... }
// Usage in routes:
export const GET = restrictTo("ADMIN", "TEACHER")(handler);
```

Roles: `USER`, `STUDENT`, `TEACHER`, `ADMIN`, `SYSTEM`.

**No resource-level or tenant-level permission checks exist in reading-advantage.** Permission is purely role-based. A TEACHER in school A can operate on classrooms/students in school B if they guess the ID — there is no `schoolId` verification gate.

---

## 5. Tenant Scoping (schoolId)

| Aspect | Status |
|--------|--------|
| TenantDB wrapper | **Not used** — 0 references to `createTenantDB`, `withTenantScope`, `tenantDb` |
| assertCan | **Not used** — 0 references |
| Manual schoolId filtering | Present in 34 `server/` files, but **inconsistent** |
| classroom ↔ schoolId join | Used in `getClassroomOverview` for display, **not for auth enforcement** |
| Cross-school data isolation | **Not enforced** — any authenticated user can query data by ID, regardless of school |

**Key risk:** The `classroom-controller.ts` functions (`getStudentInClassroom`, `deleteClassroom`, `updateClassroom`, etc.) check if the classroom exists but do **not** verify that the requesting user's `schoolId` matches the classroom's `schoolId`. A TEACHER in school A can delete a classroom in school B.

---

## 6. Database Access Pattern

All 54 controllers access the database via:
```ts
import { db, eq, and, ... } from "@reading-advantage/db";
import { users, articles, ... } from "@reading-advantage/db/schema";
```

**No domain layer.** Business logic, validation, authorization, and data access are co-located in controller functions. Example: `article-controller.ts` (926 lines) contains query building, business rules, translation logic, and response formatting in a single file.

**No Zod input validation on query parameters** (URL search params are cast directly, e.g. `Number(searchParams.get("page"))`). Body validation is sparse.

---

## 7. Firebase Legacy

| Area | Status |
|------|--------|
| Firebase Auth | **Removed** — 0 Firebase references in app code |
| `firebase-admin/storage` | **1 remaining usage** — `generator-controller.ts:1499` for audio file cleanup |
| Firebase deps in package.json | Must verify |

The `cleanupAudioFiles` function (line 1494–1533) and `cleanupStorageFiles` function (line 1535–1599) in `generator-controller.ts` dynamically `require("firebase-admin/storage")` and interact with GCP Storage bucket `artifacts.reading-advantage.appspot.com`.

---

## 8. AI / Third-Party Data Flows

### 8.1 AI Provider Usage

| Provider | Access Method | Files |
|----------|-------------|-------|
| OpenAI (GPT-4o-mini, GPT-4o, Dall-E) | Via `@reading-advantage/ai` adapter | `utils/openai.ts`, article/story/question generators |
| Google Cloud Translate | **Direct SDK** (`@google-cloud/translate`) | `article-controller.ts` (line 755–774) |
| Google Cloud TTS (audio) | Direct usage in audio generators | `server/utils/generators/audio-generator.ts` |

### 8.2 Student Data Sent to AI Providers

- **Article generation** (`generateUserArticle`): Student-triggered AI calls send topic, genre, subgenre to OpenAI. The generated content is attributed to the student (authorId).
- **Translation** (`translateArticleSummary`): Article summaries/passages are sent to Google Cloud Translate and OpenAI GPT.
- **Question answering** (LAQ feedback): Student answers are sent to OpenAI for evaluation.
- **Level test**: Student responses sent to AI for level assessment.

**No PII filtering** occurs before sending data to AI providers. Student-written content (e.g., user-generated articles) may contain personal information that gets sent to OpenAI.

---

## 9. Destructive Actions

| Action | Route | Auth Gate | School Scoping | Audit Log |
|--------|-------|-----------|----------------|-----------|
| Delete article | `DELETE /api/v1/articles/[article_id]` | restrictTo check | **None** | **No** |
| Delete story | `DELETE /api/v1/stories/[storyId]` | protect/restrictTo | **None** | **No** |
| Delete classroom | `DELETE /api/v1/classroom/[classroomId]` | protect + OWNER check | **None** | **No** |
| Delete user | `DELETE /api/v1/users/[id]` | protect + self-or-staff | **None** | **No** |
| Archive classroom | Classroom controller | protect | **None** | **No** |

---

## 10. Audit Logging

**0 references to `recordAuditEvent`** from `@reading-advantage/auth` anywhere in `apps/reading-advantage/`.

Security-sensitive events (login, logout, password changes, user creation, destructive actions) are **not audited** in the reading-advantage app. The shared `@reading-advantage/auth` package may log events at its layer, but app-specific actions (article deletion, classroom deletion, student enrollment changes) have no audit trail.

---

## 11. Rate Limiting

**0 auth/login rate limiting in the reading-advantage app.** The shared `@reading-advantage/auth` package has a rate limiter (`packages/auth/src/rate-limit.ts`) but it is an in-memory `Map` and reading-advantage does not appear to wire it into login/register routes (those delegate to `@reading-advantage/api/routes/auth` which may or may not use it — needs verification).

---

## 12. Environment / Secrets

| File | Raw `process.env` Usage |
|------|------------------------|
| `auth-controller.ts` | `process.env.ACCESS_KEY` |
| `article-controller.ts` | `process.env.GOOGLE_CLOUD_PROJECT_ID`, `process.env.GOOGLE_APPLICATION_CREDENTIALS` |
| `translation-controller.ts` | `process.env.*` |
| `send-discord-webhook.ts` | `process.env.DISCORD_WEBHOOK_URL` |
| `audio-generator.ts` | `process.env.*` |
| `audio-words-generator.ts` | `process.env.*` |

**No Zod env validation** — raw `process.env` reads without runtime validation or defaults.

---

## 13. Unauthenticated Routes (29 total)

These 29 route files have no `restrictTo`, `protect`, `getCurrentUser`, or session validation:

- Auth endpoints (login, register, signup, logout, session, impersonate, reset-password, check-password-set) — **expected to be unauthenticated**
- Demo endpoints (accounts, refresh, status) — **expected to be unauthenticated for testing**
- System endpoints (health/database, metrics/health, metrics/cache, metrics/stream) — **sensitive but unauthenticated**
- Article generation trigger (`/api/v1/articles/generate`) — **unauthenticated queue trigger**
- Story generation trigger (`/api/v1/stories/generate`) — **unauthenticated**
- AI insight refresh (`/api/v1/ai/insights/refresh`) — **unauthenticated**
- OAuth2 callbacks — **expected**
- Telemetry dashboard — **unauthenticated**
- Activity update-all — **unauthenticated**

---

## 14. Product-Behavior Surface

| Area | Files / Notes |
|------|---------------|
| XP / level progression | `server/controllers/user-controller.ts` |
| Article completion logic | `server/controllers/question-controller.ts:65-166` |
| Level test chat | `server/controllers/level-test-controller.ts` |
| Assignment status mapping | `server/controllers/assignment-controller.ts:84-88` |
| Class accuracy reports | `server/controllers/class-accuracy-controller.ts` |
| Assignment funnel / predictions | `server/controllers/assignment-funnel-controller.ts`, `server/services/metrics/assignment-prediction-service.ts` |
| AI content generators | `server/utils/generators/article-generator.ts`, `stories-chapters-generator.ts`, `question-generator.ts`, `audio-generator.ts`, `translation-generator.ts` |
| FSRS flashcard scheduling | `server/controllers/flashcard-controller.ts`, `actions/flashcard.ts` |
| Product-level tests | 0 files |

## 15. Key Metrics Summary

| Metric | Count |
|--------|-------|
| Controller files with direct DB access | 49/54 (91%) |
| Server files with direct DB access | 64/100 (64%) |
| assertCan usage | 0 |
| TenantDB usage | 0 |
| recordAuditEvent usage | 0 |
| Firebase remnants in app code | 1 (firebase-admin/storage) |
| Rate limiting in reading-advantage | 0 (relies on shared pkg) |
| Unauthenticated routes | 29 (partially expected) |
| Existing schoolId references | 34 files (inconsistent, not enforced) |
| Controllers with `(req as any)` session/params casts | 3+ (`class-accuracy-controller.ts`, `system-dashboard-controller.ts`, `system-controller.ts`) |
| Generators using `temperature: 1` | 3+ (article, story chapter, level test) |
| Product-behavior / learning-outcome test files | 0 |
