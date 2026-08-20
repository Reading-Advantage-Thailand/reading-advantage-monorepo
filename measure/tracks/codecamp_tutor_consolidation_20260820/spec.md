# Specification: Codecamp Tutor Consolidation

## Overview

**Sprint goal:** Every Codecamp lesson uses one tutor that remembers the
conversation, reads the lesson content, offers graded help, and records the
support it gave.

Codecamp runs two tutors. `/api/chat` serves 85 of 88 lessons and is stateless:
it sends one message with no history and grounds only on the lesson title and
description. `/api/tutor/intervention` serves 3 lessons and is far stronger: it
has five graded support levels, curated resources, provenance, and durable
evidence.

The product split is correct. A learner asks a question, and a learner who is
stuck needs remediation. The split does not need two systems. It needs one
system with two entry modes.

This track retires `/api/chat` and extends the intervention tutor with an `ask`
mode, so all 88 lessons gain history, grounding, curated resources, and support
telemetry.

## Evidence

| Defect | Location |
|---|---|
| The chat call sends one message and no history | `apps/codecamp-advantage/app/api/chat/route.ts:141` |
| The chat context is title and description only | `packages/domain/src/codecamp/chat.ts:95` |
| History is saved and displayed but never sent | `codecamp_chat_messages` and `chatHistory` |
| The intervention tutor is imported in one component | `apps/codecamp-advantage/app/[locale]/apk-unit/[stage]/apk-unit-lesson.tsx:5` |
| Two system prompts describe the same tutor | `app/api/chat/route.ts:24` and `packages/domain/src/codecamp/tutor.ts:482` |
| The rate limit is process-local, so it is ineffective across Cloud Run instances | `apps/codecamp-advantage/lib/rate-limit.ts:10` |

## Stories

### Story S1: One tutor contract with two modes
**As a** Codecamp engineer
**I want** a single tutor contract that carries an `ask` mode beside the existing hint ladder
**So that** one implementation serves both questions and remediation

**Acceptance Criteria:**
- Given the support ladder, When I read `tutorInterventionLevelSchema`, Then `answer` sits above `diagnostic` and the other four levels keep their order.
- Given a request with `mode: "ask"`, When the server builds the prompt, Then it answers the question directly and does not open with a diagnostic question.
- Given a request with `mode: "remediate"`, When the server builds the prompt, Then the existing escalation policy is unchanged.
- Given any request, When the response is returned, Then it validates against one response schema for both modes.

**Estimate:** M
**Priority:** Must

### Story S2: The tutor remembers the conversation
**As an** intern
**I want** the tutor to remember what I already asked
**So that** I can ask "why?" and get a useful answer

**Acceptance Criteria:**
- Given a conversation with earlier turns, When I send a new message, Then the server includes the most recent turns in the model request.
- Given a conversation longer than the window, When I send a new message, Then the server includes the most recent turns only and stays within the token budget.
- Given a new conversation, When I send the first message, Then the request carries no history and still succeeds.
- Given any conversation, When the model replies, Then both the question and the reply are persisted to the existing chat tables.

**Estimate:** M
**Priority:** Must

### Story S3: The tutor reads the lesson
**As an** intern
**I want** the tutor to see the lesson I am reading
**So that** "explain this code" works

**Acceptance Criteria:**
- Given a theory lesson with sections, When I ask about it, Then the server includes the section headings, bodies, and code in the grounding context.
- Given a lesson longer than the grounding budget, When I ask about it, Then the server includes the sections nearest the budget and marks the context as truncated.
- Given a lesson in a draft module, When I ask about it, Then the server includes no lesson content, matching the current published-only rule.
- Given a Thai learner, When the lesson content is English, Then the tutor may translate it on request and says which language the source is in.

**Estimate:** M
**Priority:** Must

### Story S4: Every lesson uses the one tutor
**As an** intern on any lesson
**I want** the same tutor surface everywhere
**So that** help does not change shape between units

**Acceptance Criteria:**
- Given any lesson page, When I open the tutor, Then it calls `/api/tutor/intervention`.
- Given the APK unit, When I use the coach, Then its behavior is unchanged from today.
- Given the repository after this story, When I search for `/api/chat`, Then the route, `lib/use-chat-stream.ts`, and the duplicate system prompt are gone.
- Given a streaming reply, When the model is slow, Then the learner sees incremental text, matching today's chat behavior.

**Estimate:** L
**Priority:** Must

### Story S5: Support use is recorded for every lesson
**As a** curriculum owner
**I want** the support level recorded on every lesson, not only the APK unit
**So that** I can see where learners get stuck

**Acceptance Criteria:**
- Given any tutor request, When the server responds, Then it writes one `codecamp_tutor_interventions` row with the mode, the level, and the misconception tags.
- Given a curated resource in the reply, When the learner opens it, Then the server records a `codecamp_tutor_resource_uses` row.
- Given a lesson with no activity session, When the learner asks a question, Then the intervention row is still written and references the lesson.
- Given the administrator report, When I open it, Then I can see intervention counts per module.

**Estimate:** M
**Priority:** Should

### Story S6: The rate limit works across instances
**As an** operator
**I want** the tutor rate limit to hold across Cloud Run instances
**So that** the limit is real

**Acceptance Criteria:**
- Given a service with several instances, When one learner exceeds the limit, Then every instance rejects the next request.
- Given the limit is exceeded, When the learner retries, Then the response carries a retry delay in seconds.
- Given the durable store is unavailable, When a request arrives, Then the server fails open and logs one structured line.

**Estimate:** S
**Priority:** Should

## Non-Functional Requirements

- The APK unit behavior stays identical. Its tests must pass unchanged.
- The response contract keeps the `codecamp-tutor-response.v1` schema version, or
  it moves to `v2` with the version recorded in the same file.
- The grounding context is bounded, so the token cost per request stays known.
- Thai and English keys stay at parity, as `i18n-key-parity.test.ts` enforces.
- The tutor model setting stays separate from the pull-request review model
  setting, as `codecamp_pr_mastery_evaluation_20260710` established.

## Acceptance Criteria

- Asking a follow-up question on any lesson produces an answer that uses the
  earlier turns.
- Asking "explain the code in this section" on a theory lesson produces an
  answer grounded in that code.
- `/api/chat` and `lib/use-chat-stream.ts` no longer exist.
- `codecamp_tutor_interventions` gains rows from lessons outside the APK unit.
- Browser acceptance: hold a four-turn conversation on a Phase A lesson and a
  Phase C lesson, in Thai and in English, and capture the transcript.

## Out of Scope

- Projecting tutor evidence into the knowledge-space graph. That is
  `codecamp_mastery_evidence_projection_20260820`.
- Changing the tutor model or provider.
- Adding a tutor to the administrator surfaces.
