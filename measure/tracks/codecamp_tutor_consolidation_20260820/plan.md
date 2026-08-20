# Implementation Plan: Codecamp Tutor Consolidation

> **Browser acceptance:** Hold a four-turn conversation on a Phase A lesson and
> a Phase C lesson, in Thai and in English. Confirm that turn 2 uses turn 1, and
> that a question about a code block in the lesson is answered from that block.
> Confirm the APK unit coach is unchanged. Capture transcripts and screenshots.

> **Order matters.** S1 through S3 change the server only and can ship without a
> visible change. S4 removes the old surface and is the only story that can
> regress the learner experience. Do not start S4 until S1 through S3 are green.

## Phase S1: One tutor contract with two modes
_Story ref: spec.md#story-s1_
_Blast radius: `packages/domain/src/codecamp/tutor.ts` exports 20 symbols. Static callers resolved by grep: `apps/codecamp-advantage/app/api/tutor/intervention/route.ts`, `packages/api/src/routers/codecamp.ts`, and the domain test suite. `build-graph callers` resolves no edges for the schema exports because they are consumed through Zod inference._

- [ ] Task: Contract and schema definition
    - [ ] Add `answer` to `tutorInterventionLevelSchema` as the highest-support level
    - [ ] Add `tutorModeSchema = z.enum(["ask", "remediate"])`
    - [ ] Add `mode` to `tutorContextSchema` and to the request input schema
    - [ ] Decide and record the response schema version: keep `codecamp-tutor-response.v1` if additive, or move to `v2`
    - [ ] Extend `selectTutorInterventionPolicy` so `ask` starts at `answer` and `remediate` keeps today's policy
- [ ] Task: Write Red tests
    - [ ] `packages/domain/src/__tests__/tutor-mode-policy.test.ts`
    - [ ] `ask` selects the `answer` level on the first request
    - [ ] `remediate` selects `diagnostic` on the first request, unchanged from today
    - [ ] The escalation ladder for `remediate` is unchanged across repeated requests
    - [ ] `buildTutorPrompt` emits the direct-answer instruction for `ask` and the diagnostic instruction for `remediate`
    - [ ] Both modes validate against the single response schema
    - [ ] `createSafeTutorFallback` returns a valid response for both modes
- [ ] Task: Implement
    - [ ] Extend the level enum, the mode schema, and the policy selector
    - [ ] Branch `buildTutorPrompt` on the mode
    - [ ] Keep the existing APK call path on `remediate` by default
- [ ] Task: Generate docs and doctor
    - [ ] Run `measure/generate.sh` and `measure/doctor.sh`
    - [ ] Run `build-graph update ./graph.db` for the changed files
- [ ] Task: Measure - User Manual Verification 'Phase S1: One tutor contract with two modes' (Protocol in workflow.md)

## Phase S2: The tutor remembers the conversation
_Story ref: spec.md#story-s2_
_Blast radius: `saveChatMessage`, `getChatHistory`, and `getChatContext` in `packages/domain/src/codecamp/chat.ts`. Callers: `packages/api/src/routers/codecamp.ts` and `apps/codecamp-advantage/app/api/chat/route.ts`. The second caller is deleted in S4._

- [ ] Task: Contract and schema definition
    - [ ] Add `buildTutorConversationWindow(messages, budget): TutorTurn[]` to `packages/domain/src/codecamp/tutor.ts`
    - [ ] Define the window: the most recent 10 turns, capped by a character budget
    - [ ] Add `conversationId` and `history` to the tutor request contract
    - [ ] State the ordering rule: oldest first, alternating roles preserved
- [ ] Task: Write Red tests
    - [ ] `packages/domain/src/__tests__/tutor-conversation-window.test.ts`
    - [ ] An empty history yields an empty window
    - [ ] A 3-turn history yields all 3 turns in order
    - [ ] A 40-turn history yields the most recent 10 turns
    - [ ] A history that exceeds the character budget is trimmed from the oldest end
    - [ ] A trailing assistant turn without a following question is retained
    - [ ] The persisted question and reply both reach `codecamp_chat_messages`
- [ ] Task: Implement
    - [ ] Load the conversation through `getChatHistory` inside the intervention path
    - [ ] Pass the window into the model request
    - [ ] Persist the question and the reply through `saveChatMessage`
    - [ ] Keep the conversation identifier stable across turns
- [ ] Task: Generate docs and doctor
    - [ ] Run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S2: The tutor remembers the conversation' (Protocol in workflow.md)

## Phase S3: The tutor reads the lesson
_Story ref: spec.md#story-s3_
_Blast radius: `getChatContext` returns a string today. Widening it to a structured context changes one caller inside the app and one inside the router._

- [ ] Task: Contract and schema definition
    - [ ] Add `buildLessonGroundingContext({ module, lesson, budget })` returning headings, bodies, and code
    - [ ] Keep the published-module rule from `getChatContext`
    - [ ] Define the truncation marker and the budget constant
    - [ ] State the language rule: name the source language of the content in the context
- [ ] Task: Write Red tests
    - [ ] `packages/domain/src/__tests__/tutor-lesson-grounding.test.ts`
    - [ ] A theory lesson contributes headings, bodies, and code
    - [ ] A draft module contributes nothing
    - [ ] A lesson over the budget is truncated and marked
    - [ ] A quiz lesson contributes its instructions but no answers
    - [ ] The context never contains a quiz `correctAnswer`
    - [ ] A Thai request records that the source content is English
- [ ] Task: Implement
    - [ ] Read `contentJson` sections in the grounding builder
    - [ ] Guard against a malformed `contentJson`, matching the existing defensive pattern recorded in `tech-debt.md`
    - [ ] Feed the grounding context into the tutor prompt
- [ ] Task: Generate docs and doctor
    - [ ] Run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S3: The tutor reads the lesson' (Protocol in workflow.md)

## Phase S4: Every lesson uses the one tutor
_Story ref: spec.md#story-s4_
_Blast radius: `useChatStream` is used by `apps/codecamp-advantage/app/[locale]/lesson/[id]/page.tsx` and `app/[locale]/chat/page.tsx`. `ChatTutor` lives inside the lesson page. Deleting `/api/chat` removes the last caller of the duplicate system prompt._

- [ ] Task: Contract and schema definition
    - [ ] Define the streaming response contract for the intervention route so the learner sees incremental text
    - [ ] Define the client hook `useTutor` that replaces `useChatStream`
    - [ ] Decide whether the standalone `/chat` page remains; if it does, it uses the same hook
- [ ] Task: Write Red tests
    - [ ] `apps/codecamp-advantage/lib/__tests__/use-tutor.test.ts` covers send, stream, error, and locale
    - [ ] `apps/codecamp-advantage/components/__tests__/tutor-coach.test.tsx` covers the `ask` mode on a plain lesson
    - [ ] A repository guard test asserts that `app/api/chat` and `lib/use-chat-stream.ts` do not exist
    - [ ] The existing APK coach tests pass unchanged
    - [ ] `chat-locale.test.ts` and `use-chat-stream-locale.test.ts` are migrated, not deleted; the locale behavior must survive
- [ ] Task: Implement
    - [ ] Add streaming to the intervention route
    - [ ] Add `useTutor` and switch the lesson page to `TutorCoach` in `ask` mode
    - [ ] Switch the standalone chat page to the same hook
    - [ ] Delete `app/api/chat/route.ts`, its tests, `lib/use-chat-stream.ts`, and the duplicate system prompt
    - [ ] Remove the now-unused imports and translation keys, and confirm key parity
- [ ] Task: Generate docs and doctor
    - [ ] Run `measure/generate.sh` and `measure/doctor.sh`
    - [ ] Run `build-graph update ./graph.db`
    - [ ] Run the top-level build, because it is the supervisor gate
- [ ] Task: Measure - User Manual Verification 'Phase S4: Every lesson uses the one tutor' (Protocol in workflow.md)

## Phase S5: Support use is recorded for every lesson
_Story ref: spec.md#story-s5_
_Blast radius: `persistTutorIntervention` and `recordTutorResourceUse` in `packages/domain/src/codecamp/tutor.ts`. The tables already exist; no migration is expected._

- [ ] Task: Contract and schema definition
    - [ ] Allow `codecamp_tutor_interventions` rows that reference a lesson without an activity session
    - [ ] Confirm the existing columns support this; add a migration only if a not-null constraint blocks it
    - [ ] Define the administrator report shape: intervention counts per module and per level
- [ ] Task: Write Red tests
    - [ ] `packages/domain/src/__tests__/tutor-intervention-persistence.test.ts`
    - [ ] A lesson request with no activity session writes one intervention row
    - [ ] The row carries the mode, the level, and the misconception tags
    - [ ] A curated resource open writes one resource-use row
    - [ ] The administrator report returns counts per module
    - [ ] A real-database smoke test covers the insert, because mock-database tests have passed while constraints failed (lessons-learned 2026-05-14)
- [ ] Task: Implement
    - [ ] Persist the intervention on every tutor response
    - [ ] Wire the resource-use callback on the lesson page
    - [ ] Add the administrator report procedure and surface
- [ ] Task: Generate docs and doctor
    - [ ] Run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S5: Support use is recorded for every lesson' (Protocol in workflow.md)

## Phase S6: The rate limit works across instances
_Story ref: spec.md#story-s6_
_Blast radius: `checkChatRateLimit` in `apps/codecamp-advantage/lib/rate-limit.ts`. One caller today; two after S4 unless the chat route is already deleted._

- [ ] Task: Contract and schema definition
    - [ ] Define a durable limiter keyed by user and window, following the existing Postgres limiter pattern used by `rate_limiter_v2`
    - [ ] Define the fail-open rule and its structured log line
    - [ ] Reuse `lib/tutorial-capture-limiter.ts` if its shape fits; record the decision either way
- [ ] Task: Write Red tests
    - [ ] `apps/codecamp-advantage/lib/__tests__/tutor-rate-limit.test.ts`
    - [ ] Two simulated instances share one budget
    - [ ] The rejection carries a retry delay in seconds
    - [ ] A store failure fails open and logs once
    - [ ] The window rolls correctly at the boundary
- [ ] Task: Implement
    - [ ] Replace the in-process map with the durable limiter
    - [ ] Apply it to the intervention route
- [ ] Task: Generate docs and doctor
    - [ ] Run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Retrospective
    - [ ] Record the consolidation lesson: two surfaces for one job diverge in capability, and the weaker one usually serves the larger audience
- [ ] Task: Measure - User Manual Verification 'Phase S6: The rate limit works across instances' (Protocol in workflow.md)

## Checkpoints

Record a commit SHA only after the commit is an ancestor of HEAD.

- S1 contract:
- S2 memory:
- S3 grounding:
- S4 single surface:
- S5 telemetry:
- S6 rate limit:
