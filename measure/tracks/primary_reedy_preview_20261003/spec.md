# Spec — Reedy Preview in Primary Advantage

Track ID: `primary_reedy_preview_20261003`
Type: feature
Program: [primary-tutor-parity-program](../../primary-tutor-parity-program.md)

## Context

Reedy is a voice speaking coach, live in Tutor Advantage only. It runs on the OpenAI
Realtime API over WebRTC, with server-side moderation, a one-active-session lock,
and a per-session time cap. In Tutor the entitlement is a class package. Primary has
no packages, so it needs a per-student monthly budget. The yearly budget is 80 THB
per student. Daniel set the limit at 8 minutes per month.

## Functional Requirements

### Entitlement and budget
- FR-1: Budget is 480 seconds per student per calendar month (Asia/Bangkok). Unused
  time does not carry over (default; Daniel may change this).
- FR-2: The server ends a session when the month budget runs out. The client display
  is never the only control.
- FR-3: Per-session cap of 180 seconds (default; adjust after the cost check).
  One active session per student.
- FR-4: Reedy is a standard activity at the end of each lesson (owner decision
  2026-10-04). The student reaches it through the lesson flow, and Reedy uses that
  lesson as context. The monthly budget and session cap still apply.
- FR-5: Requires `authStrength = full` (see the student login track).
- FR-6: Kill switch env flag `AI_VOICE_ENABLED` and a per-school disable. Live by default at cutover.
- FR-7: Cost metering per session (tokens, USD, THB at a configurable rate).
  Store `providerUsage` like Tutor does.

### Student experience
- FR-8: Reedy page labeled **Preview** with a short line that explains it in Thai and English.
- FR-9: Minutes-left meter before and during a session and on the student home.
  Shows the reset date. Shows a friendly stop message at the limit.
- FR-10: Reedy shows the student's own avatar from the avatar customization plans
  (owner decision 2026-10-04), replacing the fox. Do not pick a separate Forge model.
  Eight states as in Tutor (idle, connecting, listening, thinking, speaking, muted,
  celebrating, reassuring), with Thai speech bubbles. Reduced-motion variant.
- FR-11: Mic permission flow with clear child-friendly wording, and a fallback when
  there is no microphone.
- FR-12: Summary after a session: 0-5 scores (fluency, grammar, vocabulary,
  pronunciation) shown kindly. No audio or transcript is stored.

### Teacher and admin
- FR-13: Teacher view: minutes used this month per student and per class, session
  count, last use, average scores, students with no use.
- FR-14: Admin/system view: cost by school and by month, failures, disconnects.
- FR-15: Safety: port the Tutor moderation path (`omni-moderation-latest` and local
  rules). Teachers can see moderation counts without the content.

### Operations
- FR-16: Port the Reedy runbook and add a Primary section.
- FR-17: Calibration. Run at least 20 real sessions on Primary lesson context before
  cutover. Record cost per minute. If it is above 1.0 THB per minute, report to Daniel
  before launch with a lower-cap option.

## Architecture rules

- Business logic goes in `@reading-advantage/domain` and a voice module in
  `@reading-advantage/ai`, with thin app routes. No new code in `server/models`.
- Do not change or import from the tutor-advantage repo. Port, do not link.

## Schema (additive only)

New tables with a `primary_` prefix: voice session (student, lesson, started, ended,
consumed seconds, provider usage, summary scores) and monthly usage (student, month,
seconds used, cost). Do not store audio or transcripts.

## Non-goals

- Read Along with Reedy (in development; never described as live).
- Reedy in Reading Advantage.
- Parent consent UI. Schools handle the paper form.

## Acceptance Criteria

- Tests: budget end at limit, month rollover, one-active-session lock, unlock rule,
  `authStrength` gate, kill switch, per-school disable.
- Browser test: a seeded student runs a session to the limit and sees the stop screen.
- Teacher usage view matches the stored sessions.
- Calibration report is written to `measure/qa/` before cutover.
- Documents updated when it ships: `advantage-pr/AGENTS.md` (Reedy is live in Primary
  as Preview), product docs, and the Reedy claim wording in the outcome-claims policy.
