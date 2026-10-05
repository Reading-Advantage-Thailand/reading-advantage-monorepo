# Plan — Reedy Preview in Primary

Owner lane: F. Starts with Phase 0 and the avatar in parallel. Server work waits for the
login track's `authStrength` contract (a contract stub is enough to start).

## Phase 0: Discovery (2 h)
- [ ] Read Tutor `AiVoiceService.ts`, `voiceEntitlement.ts`, `voiceSafety.ts`, `voiceUsage.ts`, `voiceSessionTime.ts`, the controller, and `docs/runbooks/reedy-operations.md`
- [ ] Read `advantage-forge/docs/avatar-system.md` and the avatar assets; choose how to render the eight states (2D sprite poses from the sprite pass is the default)
- [ ] Decide package placement (domain use-cases + ai voice module + thin routes)

## Phase 1: Avatar (decided 2026-10-05; not in the cut list, Reedy needs it)
- [x] Model decided: the student's own avatar as a Forge starter set with a color scheme (skin 5, hair 6, eyes 5, cloth 5); the avatar plays the coach; portrait plus CSS (owner decisions 2026-10-04 and 2026-10-05)
- [ ] Delivery (FR-10c): copy the starter-set portrait layers and `portraits.json` into Primary `public/packs/avatar/1.0.0/`; port `portraitPlan`, `recolorLayer`, `stackLayers`, and `STARTER_SETS` into a monorepo package with the Forge tests; record the Forge commit
- [ ] Contract and schema: `avatar.ts` in `packages/game-contracts` (class id, tints, catalog version, strict zod); additive migration `primary_avatar_profile`; `--required-migration` in the Primary `cloudbuild.yaml`
- [ ] Domain (tests first): `getAvatarProfile`, `setAvatarProfile` in `@reading-advantage/domain` (own row only; a class id must be a starter set; each tint must be an option of the base); thin route handlers
- [ ] Picker (FR-10a): `/student/avatar`, 15 class cards with portraits, then the color step with a live preview; offered once after the first sign-in (skippable); a link on the Me tab; en and th; 48 px; 375 and 768
- [ ] Gate (FR-10b): home toast for a student with no avatar (a request to Lane C if C still owns the home file at that time); the Reedy entry opens the picker first and blocks the session until the avatar is saved; never for staff
- [ ] `Reedy` component: the portrait still with the eight CSS states, en and th bubbles, a voice-level halo, reduced motion; a development preview of the poses as Tutor has (`REEDY_POSES`)

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
