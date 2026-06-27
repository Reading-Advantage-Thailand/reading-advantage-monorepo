# Sales Advantage — Workflow Map

> Track: `sales_advantage_review_20260626`
> Synthesized from batch reports B00–B05. No source code edited. No acceptance/closeout claim.

This map traces the principal user/data workflows and annotates each step with
the source batch finding IDs that touch it. It is a navigational aid for the
findings catalogue, not an independent verification.

---

## 1. Authentication / session

```
login-form.tsx ──POST──▶ /api/auth/login ──▶ handleLogin (shared auth adapter)
                                              │
session probe: useAuth ──▶ /api/auth/session ─┘ (fail-open → {user:null} 200)
logout: header.tsx ──▶ /api/auth/logout ──▶ handleLogout
```

- Login route delegates to shared `handleLogin`; logs `error.stack` server-side only — `F-SALES-B00-016`.
- No route-layer rate limiting (relies on adapter internals) — `F-SALES-B00-016`.
- Session route fail-open masks infra failures as "logged out" — `F-SALES-B00-017`.
- Client error swallowing / no telemetry on login failure — `F-SALES-B01-008`, `-009`.

## 2. Curriculum delivery + progression gating

```
dashboard /[locale]/page.tsx ──trpc.sales.getDashboardData──▶ getDashboardData
   │  (module cards; locked = idx>0 && !previousModuleCompleted, CSS-only)
   ▼
module /[locale]/module/[slug] ──trpc.sales.moduleBySlug──▶ getModuleBySlug
   ▼
lesson /[locale]/lesson/[id] ──trpc.sales.lesson──▶ getLesson
   │  renderMarkdown(content) → dangerouslySetInnerHTML
   ▼
quiz-component.tsx ──trpc.sales.submitQuiz──▶ submitQuiz
theory complete ──POST /api/lesson-complete──▶ markTheoryLessonComplete
```

- Progression lock is **client-side cosmetic** (`pointer-events-none`), bypassable by deep link / keyboard — `F-SALES-B00-014`, `-015`.
- Lesson content rendered through unsanitized markdown → XSS — `F-SALES-B00-011`.
- `lesson-complete` route: no Zod, no role gate, ignores fetch failure but flips UI to "Completed" — `F-SALES-B00-012`, `-022`, `-023`, `-024`.
- `getModuleBySlug` / `getDashboardData` leak & count **draft** lessons — `F-SALES-B05-003`.
- `submitQuiz` does not check lesson approval; empty-question lesson silently marks complete — `F-SALES-B05-009`.
- `getModules` docstring claims approval filtering that cannot exist (no column) — `F-SALES-B05-010`.
- Quiz `correctAnswer` present in client lesson type/payload (answer-key leak risk) — `F-SALES-B01-011`.
- Quiz `correctAnswer` stored as duplicated option text (drift) — `F-SALES-B02-018`.

## 3. Chat tutor (streaming AI)

```
chat-tutor.tsx ──POST /api/chat──▶ validateSession ──▶ checkRateLimit
   │                                  ──▶ sales.authorizeSalesChat (role gate)
   │                                  ──▶ getAIClient().streamText
   ▼ raw TextDecoder reads stream.toDataStreamResponse() (text passthrough today)
```

- Chat is the **only** AI route with a proper role gate (`authorizeSalesChat`) — `F-SALES-B00-019` (positive).
- Client reads stream as raw text; works only because adapter `toDataStreamResponse` is a text passthrough — `F-SALES-B01-001`.
- No abort/unmount cleanup of the reader — `F-SALES-B01-002`.
- Prompt assembled by string concatenation with denylist sanitizer (`REP:`/`COACH:`) — injection-fragile — `F-SALES-B00-020`.
- No timeout/abort on `streamText`; mid-stream failures escape the catch — `F-SALES-B00-021`.
- System prompt duplicated: live route prompt vs dead `chat.systemPrompt` in i18n bundles — `F-SALES-B01-027`, `-028`.

## 4. Audio roleplay — primary differentiating workflow

```
roleplay-recorder.tsx
  navigator.mediaDevices.getUserMedia → MediaRecorder("audio/webm")
  ▼ Blob → multipart POST /api/roleplay-attempts
      validateSession → checkRoleplayRateLimit (10/hr)
      getRoleplayEvaluationContext (scenario, rubric, canonical excerpts)  [FR-4]
      getStorageClient().put(audio, {public:false}, key=userId/...)
      evaluator closure → roleplay-evaluator.ts
         primary:  AIClient.generateObjectFromMedia(audio, schema, prompt)
         fallback: AIClient.transcribeAudio → generateObject(transcript)
      saveAttemptEvaluation → (if passed) markTheoryLessonComplete
  ▼ res.json().evaluation → roleplay-result.tsx
```

See `ai-audio-boundary-map.md` for the privacy/storage/AI detail. Workflow-level findings:

- **No route-level role gate** on `/api/roleplay-attempts` — any authenticated user triggers paid AI — `F-SALES-B00-027`.
- No audio size/MIME/duration validation before buffering into memory — `F-SALES-B00-028`, `F-SALES-B01-015`, `F-SALES-B04-007`.
- Recorder hardcodes `audio/webm` (Safari/iOS breaks) — `F-SALES-B01-014`.
- Object URL never revoked (leak per record cycle) — `F-SALES-B01-016`.
- Upload response `data.evaluation` consumed without validation — `F-SALES-B01-017`, `-019`.
- `audioStorageKey` persisted only on upload success (no-orphan invariant) — `F-SALES-B00-026` (positive).
- `submitRoleplayAttempt` callback bypasses FR-4 excerpt sourcing — `F-SALES-B05-004`.
- `submitRoleplayAttempt` not transactional → orphan attempt rows on eval failure — `F-SALES-B05-007`.
- `saveAttemptEvaluation` updates attempt by id with **no ownership/tenant scoping (IDOR)** — `F-SALES-B05-001`.
- `attemptNumber` derivation race (no unique constraint) — `F-SALES-B05-013`.
- No privacy consent/notice before audio leaves device — `F-SALES-B01-018`, `F-SALES-B04-003`, `F-SALES-B04-006`.

## 5. Admin: cohort reporting + account/content management

```
header (SALES_ADMIN link, client-gated)
proxy.ts middleware: requireRole(db, token, "SALES_ADMIN") on /xx/admin
admin/page.tsx ──trpc.sales.cohortOverview──▶ getCohortOverview
admin/[repId]/page.tsx (reuses cohortOverview, client-filters one rep)
admin/create-rep/page.tsx ──trpc.sales.admin.createRep──▶ createRepAccount
admin/curriculum/page.tsx ──trpc.sales.moduleBySlug per card──▶ approveContent
```

- `getCohortOverview` returns progress across **all tenants** (no school boundary) — `F-SALES-B05-002`.
- Admin middleware role regex hardcodes `(th|en)` locales (drift) — `F-SALES-B02-008`.
- Per-navigation DB role lookup in middleware — `F-SALES-B02-017`.
- Rep-detail over-fetches whole cohort; dumps raw row via `JSON.stringify` — `F-SALES-B00-003`, `-004`.
- Curriculum admin: N+1 `moduleBySlug` per card — `F-SALES-B00-007`.
- `createRep` credential messaging misleading; force-reset not visible — `F-SALES-B00-005`, `-006`.
- `createRepAccount` returns plaintext password through domain return value — `F-SALES-B05-014`.
- No audit logging / rate limiting on `admin.createRep` / `approveContent` — `F-SALES-B04-015`.
- Pervasive `as unknown as` casts on tRPC results — `F-SALES-B00-008`/`-009`/`-013`, `F-SALES-B01-012`.

## 6. tRPC transport context

```
/api/trpc/[trpc]/route.ts ──createContext({authorization})──▶ appRouter
  context.ts: roleSchema.parse(session.user.role)
```

- `createContext` passes header `authorization` while cookie is primary source (redundant/fragile) — `F-SALES-B00-029`.
- **`roleSchema` enum lacks `SALES_REP`/`SALES_ADMIN`** → parse throws → `auth=null` → entire sales tRPC surface may be unauthenticated at runtime — `F-SALES-B00-030` (highest-impact runtime risk; depends on out-of-batch `context.ts`).
- Router error mapping by substring (`includes("not found")`) instead of `instanceof` — `F-SALES-B04-005`.

## 7. Curriculum seeding (dev/ops workflow)

```
sales-curriculum-seed.ts (AI, getAIClient().generateObject, lands draft)
static-seed.ts (hand-authored, lands approved, --force wipes all tables)
```

- AI seed orphans lessons under `"fallback-id"` on module conflict — `F-SALES-B02-002`.
- `static-seed --force` destructive wipe with no env guard — `F-SALES-B02-003`.
- Static seed writes `approved` content, bypassing governance — `F-SALES-B02-004`.
- No transaction boundary in either seed — `F-SALES-B02-005`.
- Hardcoded local home path for enablement docs; silent low-fidelity fallback — `F-SALES-B02-006`.
