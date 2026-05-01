---
title: AI Recommendations Specification
type: spec
status: draft
created_at: 2025-11-29
tags: [spec, ai, recommendations, personalization, next-lesson]
description: Technical specification for the AI-powered recommendation engine that suggests the next best lesson based on student mastery gaps and curriculum dependencies.
---

# AI Recommendations for Next Lessons

## Overview

Provide personalized lesson recommendations immediately after quiz completion using large language models (LLMs) to interpret mastery gaps, curriculum dependencies, and recent performance. The service must be safe by default, cost-aware, explainable to students, and resilient to vendor failures through deterministic fallbacks.

## Objective

- Deliver actionable "next best lesson" guidance within 10 seconds of quiz submission.
- Support experimentation between `gemini-2.5-flash` and `gpt-5-mini` models with the ability to AB test via configuration.
- Maintain privacy by minimizing payloads sent to LLM vendors and documenting audit trails.

## Architecture Summary

1. **Context Builder** aggregates mastery data, recent attempt summary, curriculum metadata, and completed lessons.
2. **Recommendation Engine** selects the active model (Gemini or GPT) to generate a structured recommendation.
3. **Fallback Rules Engine** provides deterministic guidance when AI responses are unavailable or fail validation.
4. **Delivery Layer** caches results per `(studentId, attemptId)` and exposes them through `POST /api/ai/recommendations`.

Detailed interaction and data flow diagram lives in `design.md`.

## Model Selection & Configuration

| Model              | Provider | Default Use Case                 | Latency Target | Notes                                         |
|--------------------|----------|----------------------------------|----------------|----------------------------------------------|
| `gemini-2.5-flash` | Google   | Fast, lower-cost recommendations | < 6 seconds    | Supports JSON schema mode; primary default.  |
| `gpt-5-mini`       | OpenAI   | High-quality reasoning fallback  | < 8 seconds    | Use when cohort testing indicates higher uptake. |

- Model selection controlled by `AI_RECOMMENDER_MODEL_PRIMARY` and `AI_RECOMMENDER_MODEL_SECONDARY`.
- Each request records model choice and success/failure metrics.
- AB testing driven via feature flag service; spec expects ability to roll out gradually.

## Input Payload to LLM

| Section            | Contents                                                                                 |
|--------------------|------------------------------------------------------------------------------------------|
| Student Context    | Hash alias (no PII), grade level, curriculum alignment (THAI/NGSS).                      |
| Mastery Snapshot   | Top 5 weakest standards with mastery percentage, evidence count, last assessed.          |
| Attempt Summary    | Lesson/quiz just completed, score, question-level summary (aggregated).                  |
| Curriculum Graph   | Candidate lessons (title, slug, standards addressed, prerequisite lessons, completion state). |
| Guardrails         | Explicit instructions: must return JSON, recommend only uncompleted lessons, avoid unsafe content, include rationale for student. |

Prohibited data: student name, email, free-form responses, teacher notes, class roster info.

## Expected Output Schema

```json
{
  "recommendedLessonId": "lesson_cuid",
  "recommendedLessonSlug": "g3-earth-systems",
  "lessonTitle": "Understanding Earth Systems",
  "focusStandards": ["Sc1.1-G3", "Sc1.2-G3"],
  "reasoning": "You recently struggled with scientific inquiry skills...",
  "confidence": "high",
  "nextBestAlternatives": [
    {
      "lessonId": "lesson_alt",
      "lessonTitle": "Review Scientific Investigation Basics"
    }
  ]
}
```

- Responses must satisfy Zod schema validation.
- Reject outputs missing `recommendedLessonId` or containing lessons already completed.

## Fallback Rules Engine

When AI fails (timeout, validation error, model unavailable), deterministic rules apply:

1. Select lesson covering weakest mastery standard with mastery < 0.60.
2. If multiple lessons qualify, choose the earliest in the curriculum order not yet completed.
3. If all weak standards already completed, recommend review lesson or extension (if available) else default to next chronological lesson.
4. Provide reasoning template: `"Based on your mastery levels, focusing on {standardCodes} will strengthen {strandName}."`

## API Contract (`POST /api/ai/recommendations`)

- **Request Body**: `{ "attemptId": "att_123" }`
- **Auth**: student session; teacher/admin allowed when impersonation flag active. Attempt ownership validated server-side.
- **Response**:
  - Success: `{ "success": true, "recommendation": { ...schema }, "model": "gemini-2.5-flash", "fallbackUsed": false, "traceId": "rec_abc", "generatedAt": "ISO" }`
  - Failure/Async: `{ "success": false, "reason": "QUEUED", "traceId": "rec_def" }`
- **Rate Limiting**: default 3 requests/min per student; returns 429 beyond threshold.
- **Caching**: recommendations cached for 15 minutes and invalidated when new mastery updates arrive.

## Non-Functional Requirements

| Category      | Requirement                                                                                     |
|---------------|-------------------------------------------------------------------------------------------------|
| Latency       | 95th percentile end-to-end < 10s (including fallback).                                          |
| Cost          | Track tokens cost per model; budget ceiling $0.08 per student per week (configurable).         |
| Reliability   | Endpoint availability >= 99%; fallback success rate > 99.9%.                                    |
| Privacy       | Payloads exclude PII; logs store hashed student IDs; trace IDs rotated daily.                   |
| Observability | Metrics: `ai_recommendation_success_total`, `ai_recommendation_fallback_total`, latency histograms, token usage. |

## Security & Compliance

- All outbound payloads stored in encrypted audit log with 30-day retention.
- Support future DPIA by documenting data minimization decisions.
- Admin tooling surfaces sample prompts/responses with redactions for QA.

## Student UX Requirements (shared with FE spec)

- Reasoning must be student-friendly (max 3 sentences, < 320 characters).
- Provide indicator when deterministic fallback used (e.g., "Based on curriculum rules").
- CTA must link to lesson slug; open activity in same window.
- Include optional `Translate` action when user locale `th` and reasoning is English (future enhancement).
- Copy strings live in `i18n/ai-recommendation.en.json` and `i18n/ai-recommendation.th.json`; UI chooses locale from `<html lang>` and shows English reasoning notice when translation is unavailable.
- Widget hierarchy: score summary → AI Recommendation card → retake actions → breakdown. Card uses shadcn `Card`, sparkles icon, reasoning clamp with "Show more" toggle, focus-standard chips, primary CTA `Start Lesson`, secondary link `See all lessons`.
- Loading state uses pulsating gradient shimmer, timeout (>10s) fires toast "Still working" while continuing background polling every 5s for up to 30s before error fallback.

## Telemetry & Experimentation

- Capture events: `ai_recommendation_generated`, `ai_recommendation_fallback`, `ai_recommendation_clicked`.
- Attributes: `studentIdHash`, `model`, `fallbackUsed`, `latencyMs`, `attemptId`, `lessonId`.
- Support AB testing toggles stored in config service; include variant ID in telemetry.
- FE instrumentation mirrors these events via `lib/analytics/track`: impressions (`ai_recommendation_view`), CTA clicks (`ai_recommendation_start_lesson`), fallback impressions (`ai_recommendation_fallback`). Each payload includes hashed student ID, attemptId, lessonSlug, fallbackUsed, latencyMs to keep epic #118 observability goals intact.

## Failure Modes

| Failure Case                  | Mitigation                                                                    |
|-------------------------------|-------------------------------------------------------------------------------|
| Model timeout                 | Trigger fallback rules; respond `fallbackUsed: true`.                         |
| Vendor outage                 | Circuit breaker opens for 2 minutes; all requests use fallback.               |
| Invalid response (schema)     | Log error with trace ID; fallback result delivered; mark `model_response_invalid`. |
| Rate limiting exceeded        | Return 429 with retry-after header; UI displays non-blocking message.         |
| Cache poisoning (stale data)  | Cache keys include `StandardMastery` updated timestamp; bust on new updates.  |

## Open Questions

1. Should we expose alternative recommendations in the UI or keep them internal for future features?
2. Do we need teacher-facing controls to tune aggressiveness of recommendations?
3. How do we handle bilingual reasoning (auto-translation) without introducing hallucinations?

## Implementation Checklist

- [ ] Implement context builder (mastery, curriculum, attempt) with unit tests.
- [ ] Add prompt templates referencing current curriculum taxonomy.
- [ ] Integrate Vercel AI SDK with Gemini/GPT model abstraction.
- [ ] Implement fallback rules engine with deterministic tests.
- [ ] Expose API endpoint with caching, rate limiting, and telemetry.
- [ ] Update FE (#123) with schema and reasoning display contract.
- [ ] Document cost/latency metrics dashboard.
