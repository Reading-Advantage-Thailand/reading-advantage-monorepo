---
title: AI Personalization Data Flow & Architecture
type: design
status: draft
created_at: 2025-11-29
tags: [design, architecture, ai, personalization, data-flow]
description: Architectural design document detailing the data flow for AI-powered personalization, including the mastery pipeline, recommendation engine, and intervention alerts.
---

# AI Personalization Data Flow & Architecture

## High-Level Architecture

```
Quiz Attempt -> Mastery Pipeline -> StandardMastery Store -> AI Recommendation Engine -> Student UI
                                                       -> Intervention Alert Service -> Teacher UI
```

Core components:

1. **Mastery Pipeline** (`POST /api/ai/update-mastery` + background jobs) upserts `standardMastery`.
2. **Recommendation Engine** builds LLM prompt context, invokes `gemini-2.5-flash` / `gpt-5-mini`, validates output, and applies deterministic fallback.
3. **Intervention Service** aggregates mastery rows by class to calculate alert severity for teachers.
4. **UI Surfaces** display mastery profile, next-best lesson, and intervention alerts, all referencing the same persistence layer.

## Data Flow Diagram

```mermaid
flowchart LR
    QA[Quiz Attempt\n(Attempt + QuestionResponse)] -->|Event| MP[Mastery Pipeline\n(update-mastery service)]
    MP -->|Upsert| SM[(standardMastery Table)]
    MP -->|Emit| EVT[Mastery Update Event]

    SM -->|Fetch Weak Standards| AI[AI Recommendation Engine]
    EVT -->|Invalidate Cache| AI
    SM -->|Fetch Mastery Snapshot| SP[Student Profile API]
    SM -->|Class Aggregation| TI[Teacher Intervention Service]

    AI -->|Recommendation JSON| STUDENT_UI[Student Quiz Results UI]
    SP -->|Mastery Payload| STUDENT_PROFILE[Student Profile Page]
    TI -->|Alert Payload| TEACHER_UI[Teacher Dashboard Widget]
```

## Sequence: Quiz Completion to Student Recommendation

1. Student submits quiz (`Attempt` + `QuestionResponse` saved).
2. Frontend calls `POST /api/ai/update-mastery` (issue #120).
3. Mastery pipeline calculates per-standard mastery, upserts `standardMastery`, and emits cache-bust event.
4. Student results page calls `POST /api/ai/recommendations` (issue #122).
5. Recommendation engine builds context (mastery gaps, curriculum) and chooses active model (`gemini-2.5-flash` default, `gpt-5-mini` secondary).
6. Validated response (or fallback) cached 15 minutes and sent to UI (issue #123).

## Sequence: Teacher Dashboard Refresh

1. Teacher opens dashboard; widget requests `GET /api/teachers/classes/{classId}/intervention-alerts` (issue #124).
2. Service pulls relevant `standardMastery` rows, scores severity, and caches alerts per class.
3. Widget displays alerts (issue #125); manual refresh busts cache and re-fetches data.

## Observability Touchpoints

- Mastery pipeline logs latency, success/failure, and emits `mastery_updates_total`.
- Recommendation engine logs trace IDs, model choice, token usage, fallback triggers.
- Intervention service logs `alert_generation_latency_ms` and severity distributions.

## Deployment Considerations

- Rollout behind feature flags (`FEATURE_AI_RECOMMENDATION`, `FEATURE_INTERVENTION_ALERTS`).
- Redis (or equivalent) required for recommendation caching and intervention cache.
- Ensure env vars for model API keys are scoped per environment and not shared between services.
