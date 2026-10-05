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

### Avatar review (2026-10-05, review session; facts for FR-10)

- Forge Phase 1 is complete: track `avatar_system_20261001` (20 of 20 tasks, 2026-10-04). It
  gives the avatar base (`assets/avatar-base.ts`, clips idle, walk, run, attack, hit, rest,
  cheer, cast; no mouth or blink animation), 4 hair styles, 15 starter sets
  (`src/apk3d/avatar/starters.ts`), the 3D composer (`src/apk3d/avatar/compose.ts`), the 2D
  portrait composer that needs no WebGL (`src/apk3d/avatar/portrait.ts`: `portraitPlan`,
  `recolorLayer`, `stackLayers`, `portraitPixels`), and the built pack
  `out/packs/avatar/1.0.0/` (18 MB, 598 files; one loadout is about 1 MB of portrait layers).
  Its 5 avatar test files (30 tests) pass on 2026-10-05.
- Phase 2 of the avatar plan does not exist anywhere: no `gp_ledger`, `avatar_inventory`,
  `avatar_loadout`, or `avatar_profile` table, no domain function, no
  `packages/game-contracts/src/avatar.ts`, no API, no avatar page, and no monorepo track. So no
  student has an avatar to show. FR-10 depends on work that nobody owns.
- No delivery path exists from Forge to Primary. The APK port copies packs into
  `apps/advantage-games/public/packs/` only, and `packages/advantage-play-kit-3d` is not in the
  monorepo. Reedy needs the portrait layers and `portraits.json` under
  `apps/primary-advantage/public/packs/avatar/1.0.0/` and a port of `portrait.ts` (pure
  functions) into a monorepo package.
- Tutor's Reedy (`voice-practice/Reedy.tsx`, 90 lines) is a hand-drawn SVG fox with eight poses,
  a mouth, a volume halo, and hard-coded Thai bubbles. The Forge portrait is one still at one
  camera. Eight body poses per loadout cannot be pre-rendered for 171 pieces. The realistic
  options are: (a) one portrait still plus CSS state treatment (halo, bubble, dots, bob or
  tilt; trivial reduced motion) or (b) the 3D composer in the browser with the base clips
  (cheer for celebrating, rest for muted and thinking, idle for the rest; no speaking mouth).
- Open design question: in Tutor the fox is the coach, and its states follow `coachSpeaking`.
  If the student's own avatar replaces it, the avatar either plays the coach (the student's
  character voices the AI) or stands for the student (listening when the coach speaks, speaking
  when `learnerSpeaking`). The state mapping differs. Owner decision needed before Phase 1.
- Bubbles must exist in en and th (next-intl), not Thai only.

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
