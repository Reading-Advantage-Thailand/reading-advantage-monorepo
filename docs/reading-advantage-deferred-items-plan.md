# Reading Advantage — Deferred Items Plan

Date: 2026-09-12
Source tracks: `structural_ux_alignment_20260911`, `component_deduplication_20260911`, `loading_state_correctness_20260911`, `broken_ux_fixes_20260911`, `audio_highlight_correctness_20260911`.
Source reviews: plan-review.md / review-b.md per track; Reviews C and D on the structural track.

This document plans every item deferred out of the five-track UX/security program. Each item has an owner, a reason for deferral, and a proposed follow-up track.

## 1. Client-derived XP trust surface (Critical)

Review D findings F-D2, F-D3, F-D4. Review C finding F-C6.

Problem: many result-saving endpoints accept XP values from the client:

- 9 game controllers: `magic-defense`, `rpg-battle`, `castle-defense`, `dragon-flight`, `wizard-zombie`, `rune-match`, `enchanted-library`, `potion-rush`, `dragon-rider`. They trust `xp`, `totalScore`, or `correctAnswers`.
- Flashcard result savers in `flashcard-controller.ts` (cloze, sentence, word ordering).
- Question and story LAQ rating endpoints trust client `rating` for XP.

These predate the track. They span dozens of controllers. Drive-by fixes would explode the program scope.

Proposed follow-up track: `server_owned_xp_2026MMDD`.

Approach:

1. Apply the F-B1 pattern. Server derives XP via `xpForActivityType`. Client never sends an XP amount.
2. For game scores, send raw evidence (answers, timings) and validate server-side.
3. TDD: authority tests per controller family before fixes.
4. Estimated effort: one to two weeks. Risk: legitimate game clients must keep working.

## 2. Activity-log fake-target farming (High)

Review D finding F-D5.

Problem: `postActivityLog` and `putActivityLog` ignore client XP amounts after the F-B1 repair, but they still accept arbitrary `targetId` values and completion flags. Repeated fake targets farm fixed XP.

Proposed fix: verify target existence server-side before crediting XP. Reject unknown targets. Add rate limiting per user per activity type.

Include this in the `server_owned_xp_2026MMDD` track.

## 3. License and user-list scope gaps (High)

Review C finding F-C5. Review D finding F-D7.

Problem: `activateLicense`, `deactivateLicense`, and `updateUserLicense` allow any ADMIN or TEACHER to target any user across tenants. `getAllUsers` exposes every user to any authenticated caller.

Owner: `reading_license_control_plane_migration_20260722`. Fix there, not here.

## 4. parseActivityType enum drift (Medium)

Review B finding F-B8.

Problem: `parseActivityType` returns `LESSON_READ` and `LESSON_RATING`. These are absent from `lib/enums`. The test at `parse-activity-type.test.ts:42-51` uses a circular assertion (`canonicalValues.has(expected)`).

Proposed fix: align `lib/enums` with `user-activity-log-model.ts`. Remove the circular assertion. Small chore track.

## 5. change-role dev-settings UI now 403s (Low)

Side effect of the F-C1 repair. Self role changes are intentionally blocked.

Decision needed: remove the dev-only role picker, or add a development-environment bypass. Owner decision required.

## 6. FSRS manage-table merge (Medium)

Deferred at track planning. `vocabulary/tab-manage.tsx` and `manage-tab.tsx` duplicate ~400 lines.

Proposed fix: extract a shared table component in the `component_deduplication` follow-up phase. Needs design review because the two tables have diverged behaviorally.

## 7. Games-catalog card Link a11y wrap

Deferred behind APK track files. `StudentCartridgeHost.tsx` has a pending 3-line paused-clause diff that conflicts with the APK RPG-baseline test. The APK track owns this file.

Action: hand the paused-clause question to the APK track owner. Then wrap game cards in `Link` for keyboard accessibility.

## 8. Middleware session-fetch latency

Deferred from `loading_state_correctness_20260911`. The middleware fetches the session per request.

Proposed fix: cache the session lookup or move to a lighter JWT check at the edge. Needs a performance baseline first.

## 9. Mislabeled commit `6e890c307`

The commit message describes measure work but includes ~654 pre-staged APK files. The other session's sync commit was restored as `3dd0d39d6`.

Action: do not rewrite history while another session is active. Revisit after the APK track settles.

## 10. By-design Red test ownership

`post-activity-log-idempotency.test.ts` fails by design. It belongs to `wave1_high_risk_product_failures`. Do not fix inside the UX program.

## 11. Manual verification checkpoints

All five tracks need Phase 3 user verification per the Measure workflow. The registry rows stay at `[~]` until the user verifies in a browser.

## Sequencing

1. Track `server_owned_xp_2026MMDD` (items 1, 2) — highest risk.
2. License control-plane scope (item 3) — already has an owner.
3. Small chores (items 4, 5, 7, 10) — bundle into one housekeeping track.
4. FSRS merge (item 6) — next dedup phase.
5. Middleware latency (item 8) — after a performance baseline exists.
