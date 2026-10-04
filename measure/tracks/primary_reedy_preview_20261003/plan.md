# Plan — Reedy Preview in Primary

Owner lane: F. Starts with Phase 0 and the avatar in parallel. Server work waits for the
login track's `authStrength` contract (a contract stub is enough to start).

## Phase 0: Discovery (2 h)
- [ ] Read Tutor `AiVoiceService.ts`, `voiceEntitlement.ts`, `voiceSafety.ts`, `voiceUsage.ts`, `voiceSessionTime.ts`, the controller, and `docs/runbooks/reedy-operations.md`
- [ ] Read `advantage-forge/docs/avatar-system.md` and the avatar assets; choose how to render the eight states (2D sprite poses from the sprite pass is the default)
- [ ] Decide package placement (domain use-cases + ai voice module + thin routes)

## Phase 1: Avatar
- [x] Model decided: the student's own customized avatar (owner decision 2026-10-04)
- [ ] Render eight state images or short clips in the Chibi Quest style (race-unmarked)
- [ ] `Reedy` React component with the states, Thai bubbles, reduced motion

## Phase 2: Server (tests first)
- [ ] Migration for the voice tables
- [ ] Entitlement: monthly budget, session cap, lock, unlock rule
- [ ] Realtime session create/connect/end with moderation and metering
- [ ] Kill switch and per-school disable

## Phase 3: Student UI
- [ ] Reedy page with Preview label, mic flow, meter, stop screen, summary
- [ ] Meter on the student home (slot from the UX track)

## Phase 4: Teacher and admin
- [ ] Teacher usage view
- [ ] Admin cost view

## Phase 5: Calibrate and ship
- [ ] 20-session calibration; write the report; decide the cap with Daniel
- [ ] Runbook and docs updates
- [ ] Rehearsal run on Oct 8-9 with the flag on in the rehearsal environment
