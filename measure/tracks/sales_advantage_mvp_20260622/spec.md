# Specification: sales-advantage — Sales Coaching with Audio Roleplay

## Overview

Create an internal Next.js application (`apps/sales-advantage`) that helps the Reading Advantage sales team and distributor reps communicate and persuade better. The app delivers a linear curriculum of lessons covering the existing sales-enablement canon (battle cards, demo scripts, objection handling, ROI framing, distributor rep onboarding), then requires the learner to **record themselves** in a sales roleplay scenario. The audio is uploaded, stored, and evaluated by an **OpenRouter-hosted multimodal model** against a rubric grounded in the canonical sales-enablement documents. The Learner receives a score, structured feedback, and can retry.

Audio evaluation is **single-pass multimodal**: the audio is sent directly to the model alongside the rubric prompt, and the model both perceives the speech (transcribe excerpt) and reasons against the rubric (delivery, tone, pacing, hesitation, content fidelity) in one call — no separate transcription step. A sales-coaching rubric scores paralinguistic cues that a transcribe-then-evaluate approach would lose, so the single-pass multimodal path is the chosen architecture.

This mirrors the codecamp-advantage learn → practice → LLM-evaluates loop, replacing the git commit with an audio roleplay and the GitHub webhook with a direct upload route. The AI provider is **OpenRouter** (same as codecamp's PR-review pipeline), routed through the existing `OpenRouterProvider` in `packages/ai`.

## Audio Evaluation Models (via OpenRouter)

| Role | Model ID | Why |
|------|----------|-----|
| Primary | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | Free, multimodal (text+audio+image+video→text), NVIDIA "perception and context sub-agent" — ingests audio directly and reasons against the rubric in a single pass. |
| Fallback — STT | `nvidia/parakeet-tdt-0.6b-v3` | Free-tier ASR ($0.0015/min), NVIDIA 600M-parameter FastConformer-TDT model. Pure speech-to-text. Used when the primary multimodal model fails or is rate-limited. |
| Fallback — Eval | `nvidia/nemotron-3-nano-30b-a3b:free` | Free text-only reasoning model (same family as the primary). Evaluates the parakeet-transcribed text against the rubric. |

Both models are accessed through OpenRouter with a single `OPENROUTER_API_KEY`. When the primary multimodal call fails (rate limit, 5xx, or model offline), the fallback pipeline runs: **parakeet** (STT) → **nemotron-3-nano** (text evaluation). This two-pass fallback loses paralinguistic cues (tone/pacing/hesitation) compared to the primary single-pass path but is more reliable and cost-effective for fallback scenarios.

## Target Users

- **Primary:** Reading Advantage sales reps and distributor sales reps preparing for school-director conversations
- **Secondary:** Sales managers / leads tracking team readiness and identifying coaching opportunities
- **Tertiary:** New distributor-rep onboarding (replaces the existing 5-day self-study pack's "record yourself and review" step with an LLM-graded version)

## Time Commitment

- Initial curriculum pass: ~5–10 hours total (mirrors the existing 5-day distributor rep onboarding)
- Ongoing roleplay practice: 15–30 minutes per session, on-demand
- Each roleplay scenario sized for a single 1–5 minute recording + review

## Curriculum Source & Design Principle

**Design principle (added 2026-06-22):** The curriculum's **primary** purpose is to teach the rep **how to sell effectively** as a general skill — discovery, listening, framing value in the buyer's language, asking for the order, handling resistance. Reading Advantage product knowledge is the **secondary** layer, applied once the rep can already hold a buyer-centric conversation. A rep who finishes the curriculum should be a measurably better salesperson at *any* product, not a Reading Advantage spec-reciter.

Curriculum content is drawn from two sources:

1. **General sales-effectiveness canon** (Module 1, 2, 3 — the "how to sell" foundation):
   - SPIN Selling (Situation, Problem, Implication, Need-payoff questions — Rackham, 1988, distilled)
   - Sandler 7-step (Bonding → Up-front contract → Pain → Budget → Decision → Fulfillment → Post-sell)
   - Challenger Sale (Teach, Tailor, Take Control — Dixon & Adamson, 2011, distilled)
   - Active listening, mirroring, labeling (Voss, "Never Split the Difference")
   - Buyer psychology: cognitive biases at play in B2B purchase decisions, anchoring, loss-aversion
   - Question hierarchy: open vs. closed, problem vs. solution, when to silence

2. **Reading Advantage product applicaton** (Module 4, 5, 6 — applying the general skills to RA-specific scenarios), drawn from `~/Desktop/advantage-pr/09-sales-enablement/`:

| Source | Maps to |
|---|---|
| `distributor-rep-onboarding/README.md` (5-day path) | Module 4: Product Knowledge (applied) |
| `06-research-and-evidence/outcome-claims-policy.md` | Module 4: Honest Claims |
| `distributor-rep-onboarding/objection-handling-guide.md` | Module 5: Objection Handling (applied) |
| `battle-cards/`, `demo-scripts.md`, `role-play-scenarios.md` | Module 5: Discovery & Demo (applied) |
| `roi-calculator.md` | Module 6: Pricing & Closing (applied) |

Curriculum is generated by a seed script that walks these documents AND a curated set of general-sales-canon excerpts (inlined in the seed script's system prompt), calls `getAIClient().generateObject()` to draft modules/lessons/scenarios/rubrics, and lands every row with `reviewStatus: 'draft'`. A human (the user) reviews and flips to `approved` before content is served to reps.

## Curriculum Modules

| # | Module | Lessons | Roleplay Scenarios | Key Topics |
|---|--------|---------|--------------------|------------|
| 1 | **Sales Foundations: Discovery & Listening** | 5 | 3 | SPIN question framework (Situation/Problem/Implication/Need-payoff), active listening, mirroring & labeling (Voss), open vs. closed questions, the "silence after the question" technique, identifying the real buyer's true pain |
| 2 | **Framing Value in the Buyer's Language** | 4 | 3 | Translating features → benefits → outcomes the buyer measures, anchoring & loss-aversion psychology, the Challenger "Teach-Tailor-Take Control" model, building tension before resolution, story-based selling |
| 3 | **Handling Resistance & Objections (Universal)** | 4 | 3 | Sandler reverse, "feel-felt-found" reframing, isolating the real objection vs. the stated one, negotiating without discounting, the trial close, when to walk away |
| 4 | **Reading Advantage: Product Knowledge** | 4 | 1 | The 9-product suite, 3 service tiers, which tier fits which school profile, Big 4 Protocol, Messaging House pillars, honest claims discipline (outcome-claims policy, banned terms, approved citations) |
| 5 | **Applied Practice: Discovery → Demo for RA** | 5 | 4 | Running SPIN on a school director, the 15/45/90-minute demo flows, RAZ-Kids/Achieve3000/foreign-teacher competitive positioning, the canonical 5 school-director objections, scenario coaching |
| 6 | **Applied Practice: Pricing, Negotiation & Close** | 4 | 3 | Total-cost-of-English framing, pricing anchors (App-Only / Blended / Managed Service), handling the discount push WITHOUT discounting, scoped-pilot close, asking for the order, implementation handoff |

Total: **6 modules, ~26 lessons, ~17 roleplay scenarios**. Modules 1–3 teach generic sales skill (~50% of curriculum time). Modules 4–6 apply those skills to RA. Each lesson is 10–20 minutes of content + optional 1–5 minute roleplay.

## Functional Requirements

### 1. Audio Roleplay Practice (the practice artifact — replaces codecamp's git commit)
- Each roleplay scenario = (prospect persona, situation, objective, prospect context, rubric)
- Learner sees the scenario prompt and a "Record" button
- Browser `MediaRecorder` captures audio (webm/opus default)
- Learner can listen to their recording before submitting
- On submit, audio is uploaded to the app, stored via `@reading-advantage/storage`, and evaluated by the LLM
- Optional "try again" loop — multiple attempts per scenario are tracked; best attempt counts toward progress
- The LLM evaluates the audio directly (multimodal) — content, delivery, tone, pacing, hesitation, and canonical-source fidelity in one pass
- No transcription step in v1

### 2. LLM Evaluation
- Rubric is a structured JSON object: array of `{ criterion, weight, passingScore, sourceRef }`
- LLM returns structured output matching a Zod schema: `{ overallScore, passed, criteria: [{ criterion, score, feedback }], summary, strengths, weaknesses, suggestedNextAction }`
- Evaluation model: `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` by default (via OpenRouter, single-pass multimodal). When primary fails, the fallback pipeline runs: `nvidia/parakeet-tdt-0.6b-v3` (ASR/STT) → `nvidia/nemotron-3-nano-30b-a3b:free` (text evaluation). Overridable via `SALES_AUDIO_EVAL_MODEL`, `SALES_AUDIO_EVAL_FALLBACK_STT_MODEL`, and `SALES_AUDIO_EVAL_FALLBACK_EVAL_MODEL` env vars
- The model receives the audio directly (multimodal) plus the rubric prompt and returns a transcript excerpt AND the structured evaluation in one call — preserving delivery/tone/pacing/hesitation cues that a transcribe-then-evaluate approach would lose
- Evaluation prompt is grounded in the rubric + the scenario's prospect context + the relevant canonical sales-enablement document excerpts (inlined at evaluation time, not stored on the scenario row)
- Evaluation result is persisted on the attempt row; the rubric itself is versioned (`reviewStatus: draft|reviewed|approved`)

### 3. Curriculum Delivery
- Linear modules → lessons → (theory content | roleplay scenario | quiz)
- Module prerequisites enforced (must complete earlier modules before advancing)
- Lesson types: `theory` (rich markdown content), `roleplay` (one or more scenarios), `quiz` (multiple-choice)
- Theory lessons have a "Mark Complete" button
- All content ships with `reviewStatus: 'approved'` — draft content is invisible to reps

### 4. AI Chat Tutor (reuse codecamp pattern)
- Conversational interface where reps ask about any curriculum topic
- LLM responses are grounded in the canonical sales-enablement documents (inlined as system prompt context)
- Chat defaults to Thai (reps will use Thai with school directors); curriculum content remains English
- Conversation history persisted per user per module
- Streaming responses

### 5. Quizzes (reuse codecamp pattern)
- Static multiple-choice quizzes stored per lesson
- Immediate scoring with explanations
- Score tracking and progress persistence
- 70% pass threshold (matches codecamp)

### 6. User Progress Tracking
- Per-user progress across all 6 modules, lessons, roleplays, and quizzes
- Dashboard showing completion status, best roleplay scores per scenario, quiz scores
- Resume capability: return to last active lesson
- Module prerequisites enforced

### 7. Admin Dashboard
- Admins (sales managers) can view all reps' progress at a glance
- Account creation: admins create rep accounts (no self-registration)
- Per-rep view: module completion, roleplay attempt history + scores, quiz scores, last active timestamp
- Cohort overview: aggregate progress across all reps, identify who is falling behind on which modules
- Role-based access: `SALES_ADMIN` role sees dashboard; `SALES_REP` role sees only their own progress

## Non-Functional Requirements

- **Integration:** Must consume `@reading-advantage/auth`, `@reading-advantage/db`, `@reading-advantage/api`, `@reading-advantage/ui`, `@reading-advantage/ai`, `@reading-advantage/storage`, `@reading-advantage/types`
- **Tenancy:** Sales-advantage is intentionally **single-tenant / global** — all authenticated users access the same curriculum and their own progress. `schoolId` is omitted from sales_* tables by design. Domain functions use `TenantDB` for consistency but sales queries are user-scoped by `userId`, not school-scoped. All sales_* tables classified **REFERENTIAL** in `tenant-registry.ts` (matching codecamp's classification — no `schoolId` column; domain functions access them via `tenantDb.unscoped("sales-advantage tables have no schoolId")`).
- **Styling:** Tailwind CSS v4 with shared config; Radix/shadcn components from `@reading-advantage/ui`
- **Testing:** Vitest unit tests for all new backend/domain code; target >80% coverage
- **i18n:** next-intl ready (English curriculum content, Thai chat by default)
- **Performance:** Streaming LLM responses for chat; roleplay evaluation returns within 30 seconds for a 5-minute recording
- **Auth:** Cookie-based DB sessions via shared auth package
- **Roles:** New `SALES_REP` and `SALES_ADMIN` roles added to `packages/auth/src/roles.ts`
- **Audio storage:** Private (signed URLs only) — reps' recordings are not publicly accessible. Stored under `sales-advantage/attempts/{userId}/{attemptId}.webm` in the configured storage bucket
- **Audio retention:** v1 keeps all attempts (no auto-purge). A future tech-debt row tracks retention policy.
- **Rate limiting:** Roleplay submission endpoint rate-limited via `lib/rate-limit.ts` (max 10 submissions per rep per hour — prevents runaway Gemini cost)
- **AI provider:** OpenRouter (`AI_PROVIDER=openrouter`, `OPENROUTER_API_KEY`) — same provider as codecamp's PR-review pipeline. The `generateObjectFromMedia` method is added to the shared `AIClient` interface and implemented on `OpenRouterProvider` (primary) and `GoogleProvider` (also multimodal-capable); `MockProvider` returns a canned rubric result for tests; `OpenAIProvider` throws `UnsupportedError` for v1

## Database Schema Extensions

New schema file: `packages/db/src/schema/sales.ts` (mirrors `codecamp.ts` shape). New migration: `0023_sales_advantage.sql`.

- **`sales_modules`** (id, slug, title, description, phase, order, createdAt) — Phase is informational grouping (Foundations / Conversations / Close). 6 rows seeded.
- **`sales_lessons`** (id, moduleId FK, title, type [theory|roleplay|quiz], content, order, reviewStatus) — ~26 rows seeded.
- **`sales_roleplay_scenarios`** (id, lessonId FK, personaName, personaRole, situation, objective, prospectContextJson, rubricId FK, order) — ~17 rows seeded.
- **`sales_rubrics`** (id, name, criteriaJson, reviewStatus, createdAt) — one per scenario + shared rubrics for discovery/demo/close. ~17 rows seeded.
- **`sales_roleplay_attempts`** (id, scenarioId FK, userId FK, audioStorageKey, durationMs, transcriptExcerpt, llmScoreJson, overallScore, passed, llmFeedback, attemptNumber, createdAt) — grows with use.
- **`sales_quiz_questions`** (id, lessonId FK, question, optionsJson, correctAnswer, explanation) — ~30 rows seeded across quiz lessons.
- **`sales_progress`** (id, userId, lessonId, status, completedAt, score) — one row per (user, lesson) when started/completed.
- **`sales_conversations`** (id, userId, lessonId, moduleId, createdAt) — chat tutor history.
- **`sales_chat_messages`** (id, conversationId FK, role, content, createdAt) — chat messages.

All 8 tables classified **REFERENTIAL** in `packages/domain/src/tenant-registry.ts` (matching codecamp's classification — no `schoolId` column; accessed via `tenantDb.unscoped()`).

## AI Adapter Extension (Phase 0)

`packages/ai/src/types.ts` gains a new method on `AIClient`:

```ts
interface GenerateObjectFromMediaInput<T> {
  schema: z.ZodSchema<T>;
  prompt: string;
  media: { buffer: Buffer; mimeType: string };
  model?: string;
  temperature?: number;
}

// added to AIClient
generateObjectFromMedia<T>(input: GenerateObjectFromMediaInput<T>): Promise<T>;
```

`OpenRouterProvider` (primary) implements it via the OpenAI-compatible chat completions API that OpenRouter exposes — the audio is sent as a `file` content part alongside a `text` part, through the existing `@ai-sdk/openai` client already pointed at OpenRouter's baseURL:
```ts
messages: [{
  role: 'user',
  content: [
    { type: 'file', data: audioBase64, mimeType: input.media.mimeType },
    { type: 'text', text: input.prompt },
  ],
}]
```
Default model on `OpenRouterProvider`: `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`; respect `input.model` override (the fallback `google/gemini-2.5-flash-lite` is passed as `input.model` by the domain layer when the primary call fails).

`GoogleProvider` also implements `generateObjectFromMedia` (Gemini natively supports audio file parts via `@ai-sdk/google`), so the same method works if `AI_PROVIDER=google` is configured. `OpenAIProvider` throws `UnsupportedError("generateObjectFromMedia requires the openrouter or google provider — set AI_PROVIDER=openrouter or AI_PROVIDER=google")`. `MockProvider` returns a canned rubric-evaluation result for tests.

This is the **only** shared-package change in this track. It's a strict, additive extension of the existing adapter pattern — no existing call sites change.

## Acceptance Criteria

- [ ] `packages/ai` `AIClient.generateObjectFromMedia` method exists with full type contract; `OpenRouterProvider` implements it (primary, default model `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`); `GoogleProvider` implements it; `MockProvider` returns a canned result; `OpenAIProvider` throws `UnsupportedError`; all unit tests pass
- [ ] `packages/db/src/schema/sales.ts` exists with 8 tables; migration `0022_sales_advantage.sql` applies cleanly; all 8 tables registered REFERENTIAL in `tenant-registry.ts`; `tenant-coverage.test.ts` passes
- [ ] `packages/domain/src/sales/` module exists with the 7-file structure (schema/contracts/queries/mutations/permissions/errors/index) plus `roleplay-evaluator.ts`; every exported function has JSDoc; every function has unit tests with `mock-db.ts`; >80% coverage on new code
- [ ] `packages/api/src/routers/sales.ts` router exists; all procedures wired to domain functions; integration tests pass; router registered in `packages/api/src/root.ts`
- [ ] `apps/sales-advantage/app/api/roleplay-attempts/route.ts` validates input (Zod), uploads audio via `@reading-advantage/storage`, calls `submitRoleplayAttempt` domain function, returns evaluation result; rate-limited via `lib/rate-limit.ts`
- [ ] `apps/sales-advantage/` builds successfully from monorepo root (`pnpm turbo run build --filter=sales-advantage`)
- [ ] Rep can register/login via shared auth system (or admin creates account)
- [ ] Rep can browse 6 modules / ~26 lessons with module prerequisites enforced
- [ ] Rep can record themselves in a roleplay scenario via `MediaRecorder`, listen back, and submit
- [ ] Submitted audio is evaluated by the OpenRouter multimodal model (`nemotron-omni:free` primary, `gemini-2.5-flash-lite` fallback) against the rubric; rep sees score, criterion-by-criterion feedback, summary, suggested next action, and a transcript excerpt
- [ ] Rep can retry a scenario; best attempt counts toward progress
- [ ] Rep can take quizzes per lesson with 70% pass threshold
- [ ] Rep can chat with LLM tutor about any curriculum topic (Thai by default, streaming)
- [ ] Progress dashboard shows module completion, best roleplay scores, quiz scores
- [ ] Admin can create rep accounts
- [ ] Admin dashboard shows cohort overview with per-rep progress (module completion, roleplay scores, quiz scores, last active)
- [ ] Curriculum seed script `scripts/sales-curriculum-seed.ts` generates draft modules/lessons/scenarios/rubrics from `advantage-pr/09-sales-enablement/`; user can review and flip `reviewStatus` to `approved`
- [ ] All new domain functions have unit tests with >80% coverage
- [ ] Lint passes with shared ESLint config
- [ ] Type check passes (`pnpm turbo run check-types --filter=sales-advantage`)
- [ ] App is listed in root `package.json` workspaces / `turbo.json` pipeline
- [ ] Docker + cloudbuild.yaml configured; production build smoke-tested locally

## Out of Scope (deferred to follow-up tracks)

- **Mastery Advantage KST+SRS engine integration** — v1 is a linear curriculum like codecamp today. A separate future track will port the 4 MA packages from `~/Desktop/ra-math-advantage/` into the monorepo (gated by the unresolved shared-package governance question in `measure/mastery-advantage-integration-plan.md` §8.4) and retrofit KST+FSRS onto sales-advantage.
- **Live chat roleplay** (LLM plays the prospect turn-by-turn) — v1 is single-shot monologue. Live multi-turn roleplay is a follow-up track once the single-shot loop is validated.
- **Video roleplay** (camera on) — audio only for v1.
- **Peer review of attempts between reps** — v1 is LLM-evaluated only.
- **CRM integration** (HubSpot/Salesforce) to pull real prospect context into scenarios — v1 uses canned prospect personas.
- **Public marketing page** on www-reading-advantage — sales-advantage is an internal tool, not listed in `advantage-pr/03-products/`.
- **Multilingual curriculum content** — English content + Thai chat is the v1 contract. Localized curriculum content is a future track.
- **Automated roleplay scenario generation from live sales calls** — v1 scenarios are generated once from the canon, then human-reviewed.
- **Retention policy for audio recordings** — v1 keeps all attempts. A future tech-debt row tracks this.
