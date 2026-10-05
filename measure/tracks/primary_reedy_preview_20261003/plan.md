# Plan — Reedy Preview in Primary

Owner lane: F. Starts with Phase 0 and the avatar in parallel. Server work waits for the
login track's `authStrength` contract (a contract stub is enough to start).

## Phase 0: Discovery — done 2026-10-05 (reading only, no code)
- [x] Read Tutor `AiVoiceService.ts` (814 lines), `voiceEntitlement.ts`, `voiceSafety.ts`, `voiceUsage.ts`, `voiceSessionTime.ts`, the controller, and `docs/runbooks/reedy-operations.md`. Facts to port: the session is created on the server (OpenAI Realtime, model `gpt-realtime-2.1-mini` from the `voiceUsage` rate card), the browser connects over WebRTC with an SDP exchange through the server, a sideband `OpenAIRealtimeWS` watches the transcript, strict guard moderation runs `omni-moderation-latest` plus the local word list of `voiceSafety.ts`, `consumedVoiceSeconds` is the metered unit, a pending lease of 45 s holds the one-active-session lock until the client connects, and the tables are `ai_voice_sessions` and `active_ai_voice_sessions` (Prisma). The Primary port keeps the shape and replaces the class-package entitlement with the monthly budget (FR-1 to FR-3).
- [x] Read `advantage-forge/docs/avatar-system.md` and the assets at Forge commit `3294ae5`. Render: the 2D portrait composer (`src/apk3d/avatar/portrait.ts`: `portraitPlan`, `recolorLayer`, `stackLayers`, `portraitLayers`), not a sprite pass and not WebGL. The pack `out/packs/avatar/1.0.0/` holds `portraits.json` (version, size 512, camera, a 13-slot `order`, 223 layers of `{color, mask}` WebP pairs, 84 of them the hair styles at 6 colors) and `portraits/` (446 files, 1.9 MB). The color table lives in `assets/avatar-base.ts` (skin 5, hair 6, eyes 5, cloth 5; four presets). The 15 starter sets are in `src/apk3d/avatar/starters.ts`; the Forge tests are `tests/apk3d/avatar-portrait.test.ts` and `avatar-starters.test.ts`. The pure helpers `tint.ts` (`tintScales`, `hairTint`) and `hair.ts` (`strongestHairForm`) come with the port.
- [x] Package placement: contracts in `packages/game-contracts/src/avatar.ts` (class id, tints, catalog version, strict zod); the portrait composer, the starter sets, and the color table in a new `packages/avatar-kit` (pure, no React, with the Forge tests); use-cases in `packages/domain/src/primary-avatar` and `packages/domain/src/primary-voice` (budget, lock, session records; tenant-scoped); the OpenAI Realtime adapter in `packages/ai/src/voice` behind an interface with a mock provider (the `openai` SDK 6.44.0 is already a dependency of `apps/primary-advantage` and ships `openai/realtime`; `ws` 8.21.0 is installed and Node 22 has a global `WebSocket`); thin route handlers in `apps/primary-advantage/app/api/voice`; the picker and the Reedy component in `apps/primary-advantage/components/avatar` and `components/reedy`. `authStrength` is already in `packages/auth/src/session.ts` (`SessionAuthStrength`) and `users.authStrength`, so the FR-5 gate has its contract.
- Branch: `primary/lane-f-reedy-preview` from `primary-parity-integration` 3e4543100 plus the Lane D+E branch (`e7ad54369`), so the Lane C shell, the student home with the Reedy meter slot (`components/student/reedy-meter-slot.tsx`), and the class books are present. Next migration number: 0066.

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
