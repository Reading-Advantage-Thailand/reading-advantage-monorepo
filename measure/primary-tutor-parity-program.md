# Primary and Tutor Parity Program

Version: 0.1 (draft)
Date: 2026-10-03
Status: In progress. Lanes A, M (Phase 1), B, and C Phases 0-2 are merged into `primary-parity-integration`.
Owner: Daniel Bo
Gap list: `advantage-pr/12-operations/primary-tutor-parity-gap-list.md` (v0.2)

## Goal

Cut Primary Advantage over to the monorepo build on Oct 14-16 with a UX, teacher
support, and Reedy at the level of Tutor Advantage, and with Primary fully on the
shared packages where the cutover needs it. Daniel is on holiday during the cutover,
so the build must be tested and rehearsed before he leaves.

## Tracks

| Lane | Track | Depends on |
|---|---|---|
| A | [primary_cutover_blockers_20261003](./tracks/primary_cutover_blockers_20261003/) | none; merges first |
| B | [primary_student_login_20261003](./tracks/primary_student_login_20261003/) | A Phase 2 (argon2) |
| C | [primary_ux_rework_20261003](./tracks/primary_ux_rework_20261003/) | A Phase 1 (type gate) |
| D+E | [primary_teacher_books_lesson_support_20261003](./tracks/primary_teacher_books_lesson_support_20261003/) | C shell for the UI half; data half is independent |
| F | [primary_reedy_preview_20261003](./tracks/primary_reedy_preview_20261003/) | B (`authStrength`), C (meter slot) |
| M | [primary_legacy_data_migration_20261004](./tracks/primary_legacy_data_migration_20261004/) | A (migration numbering, credential helper); added 2026-10-04 |
| G | [primary_core_interaction_quality_20261005](./tracks/primary_core_interaction_quality_20261005/) | C Phases 0-2 merged (tokens, shell, shared states); added 2026-10-05. Verifies the September audio, loading, and dedup fixes in a browser, then brings the reader, audio, flashcard review, practice, lesson tasks, and catalog copy to the Lane C quality bar |

### Progress (2026-10-05, updated in the evening)

| Lane | State | Merge commit | Open items |
|---|---|---|---|
| A | Merged (step 0: local SYSTEM seed, username-only staff sign-in, SYSTEM creates school, license, admin) | 395540aaa | `/system/test` destructive page (tech debt) |
| M | Phase 1 merged; `tutor_reader` grants script | fcd3efffa | Phase 2 needs a fresh legacy backup |
| B | Merged; 3-student browser rerun passed 2026-10-05 on the production build of the merged branch (9 sign-ins through picture, QR, and password, about 1 s each; single-session and no-store confirmed; owner cut the run from 25 to 3 for this machine) | 0c26f7fb6, 8bba4a4f3 (rerun record on `primary/lane-b-student-login`) | QA timing check `[b]`; spec Known risks for owner review; `TRUST_PROXY_COUNT` for the Primary deploy; Primary `cloudbuild.yaml` now requires `0064_primary_student_session_policy` |
| C | Phases 0-4 done; gates passed 2026-10-05: browser sweep of 65 routes at 375/768/1280 (4 High, 2 Medium fixed in `ba4e3d870`; report `tracks/primary_ux_rework_20261003/gate-sweep.md`), keyboard walk-through, 45 visual baselines (`da01d8220`). Merged into lane-de (`851b37046`) and lane-f (`dae927341`) | ba4e3d870, da01d8220 | Admin screens: unnamed comboboxes and 36 px controls (owner decision); profile Me tab and sign-in look (owner items); final merge to integration with lane-f |
| G | Created 2026-10-05 (owner decision: core components change with the shell, not only the page frames). Lane C made no change inside the reader, audio, flashcards, practice, and lesson tasks by spec | — | Default order (owner to confirm): G Phase 0 (browser verification, half a day) right after C merges, then D+E, then F, then G Phases 1-4 |
| D+E | Phases 0-5 done on `primary/lane-de-teacher-books` (head 851b37046 after the Lane C merge, 2026-10-05); browser captures of every teacher book screen at three widths in the Lane C gate sweep (no defect; lesson cells 40 × 36 px noted as polish): migration 0065 (7 tables), book-to-class assignment, pacing, step progress with the workbook-first lock, class grid and CSV, 13-step guide (en, th), overlay, rehearsal, projector, answer keys, manual, QR link. App suite 1179 tests pass; guide check 182 fields, 0 mismatches | — (branch holds the Lane C merge `cbceff9f6`; merges after the Lane C gates) | Browser walk-through (memory); seven teaching-game demo ports; FR-7 writing signal and MCQ tallies have no data |
| F | Phases 0-4 done 2026-10-05 on `primary/lane-f-reedy-preview`: Forge avatar kit and picker, avatar profile, Reedy component, voice tables 0066-0067, entitlement (8 min per Bangkok month, 3 min cap, one session, password sign-in, avatar required, kill switch, per-school off), OpenAI Realtime adapter over fetch and WebSocket, routes, Reedy page with mic flow and summary, home meter, lesson entry, teacher usage view, admin cost view, runbook. Branch holds every other lane (`dae927341`) | 3f0947fa4 … 679329d7c | **Phase 5 gate: no real call to OpenAI yet** (adapter hand-written because the catalog pins `openai` 6.44.0; Tutor uses 7.x; tech-debt 2026-10-05). Calibration and the rehearsal run need `OPENAI_API_KEY`. The Oct 3-6 parallel timeline below no longer holds |

Every lane that adds a migration must also set `--required-migration` in
`apps/primary-advantage/cloudbuild.yaml` to its latest migration (the deploy-gate
contract test fails otherwise).

Lane M (added 2026-10-04) owns the unowned tasks of the
[cutover migration spec](../docs/deployment/primary-cutover-migration-spec.md): the ETL and
ID map (A6), the Tutor compatibility views (A7), old article links (A5), teacher
username-only teacher sign-in (A8; usernames are `lower(email)`), and teacher credentials with a forced password change
(A9). After cutover the only sign-in is username and password; there is no Google
sign-in. All teachers use Google today, so every teacher needs a new credential
before go-live.

## Rules for every lane

1. **Schema is additive only.** Tutor reads `article`, `multiple_choice_questions`,
   `short_answer_questions`, and `sentencs_and_words_for_flashcard`. No rename, no
   drop, no type change, no new NOT NULL column without a default. New tables use the
   `primary_` prefix. The Tutor read test (lane A, FR-5) runs in every lane's gate.
2. **No new local forks.** Business logic goes in `@reading-advantage/domain` or
   another package. New shared UI goes in `packages/ui`. App routes stay thin.
3. **Do not touch the tutor-advantage repo** or the legacy `~/Desktop/primary-advantage` repo.
4. **No deploy, Cloud Build submit, or Cloud Run change.** The team does the cutover.
5. **Tests first.** Each lane follows the Measure TDD workflow and commits per task.
6. **File ownership.** `styles/globals.css`, navigation, and `packages/ui` belong to
   lane C. Migration numbering belongs to lane A: other lanes request a number or use
   a unique timestamp prefix. If two lanes need the same file, one waits.
   The reader (`components/articles`), the audio control and hook, `components/flashcards`,
   `components/practice`, `actions/flashcard.ts`, and `components/lesson/task` belong to lane G
   from 2026-10-05 (full list in the lane G spec).
7. **Worktrees.** The monorepo has uncommitted changes from other sessions
   (play-kit files, `graph.db`). Each lane works in its own git worktree off the
   integration branch so those changes are never mixed in or lost.
8. **Reviewers are separate agents.** The agent that writes a change does not review it.
9. **Report outcomes honestly.** A failing test or an unfinished task is reported as such.

## Subagent method

- Implementation: Sonnet agents, 2-4 per lane, one task or phase each.
- Reviews and security checks: a separate agent with no shared context.
- Vision QA sweeps (screenshots at 375/768/1280): Haiku or Sonnet agents, one per screen group.
- The main session coordinates, merges, and resolves cross-lane conflicts.

## Timeline

Today is Oct 3. Rehearsal 1 is Oct 8-9, rehearsal 2 is Oct 12-13, cutover Oct 14-16, last date Oct 20.

| Date | Goal |
|---|---|
| Oct 3-4 | A Phases 0-3 done. B Phases 0-2. C Phases 0-1. D Phases 0-1. F Phases 0-1. |
| Oct 5 | A done. B done. C Phase 2 (student). D Phases 2-3. F Phase 2. |
| Oct 6 | C Phase 3-4 (teacher, quality). D Phase 4. F Phases 3-5 incl. calibration. Integration merge. |
| Oct 7 | Full QA sweep, fixes, Tutor read test on a restored production copy. |
| Oct 8-9 | Rehearsal 1. |
| Oct 10-11 | Fix list from rehearsal 1. |
| Oct 12-13 | Rehearsal 2. Go/no-go for the cutover. |
| Oct 14-16 | Cutover. |

If a lane falls behind, cut in this order: D Phase 4 extras (teaching demos, printable aids),
C teacher screens polish, G Phases 3-4 (lesson task polish, catalog copy), F teacher/admin views.
Never cut G Phase 0 (verification of the September fixes). Never cut A, B, or the Reedy limit and kill switch.
If the Oct 20 gate fails, Primary stays on the legacy build for semester 2.

## Integration branch

Open question (Daniel): which base branch. The current checkout is `apk3d-port`
(18 commits ahead of `origin/master`, not merged). Default: create
`primary-parity-integration` from the current `apk3d-port` HEAD, with one worktree
branch per lane.

## Semester 2 track: primary_avatar_shop_20261005

Created 2026-10-05: avatar Phase 2 (GP ledger, inventory, loadout, purchase, shop, avatar
page, teacher class avatars, avatar in the game launch context). Not a cutover item. Lane F
ships the first piece at cutover: the `primary_avatar_profile` table, the starter-set picker
with a color scheme, and the portrait package. See
[the track](./tracks/primary_avatar_shop_20261005/).

## Semester 2 track: primary_class_quest_20261005

Created 2026-10-05 (Guild Mode in the Forge plan, Class Quest in the UI): a weekly quest from
a fixed template list, power-ups from goals, and an 8-minute cooperative boss battle with a
polling projector dashboard. Runs after `primary_avatar_shop_20261005`. See
[the track](./tracks/primary_class_quest_20261005/).

## Semester 2 program: Chibi Quest in Primary

Created 2026-10-05: [chibi-quest-primary-program.md](./chibi-quest-primary-program.md), three
waves (reskins, the expedition loop and the world map, the guild hall). Runs after Lane G, the
avatar shop, and Class Quest as the program file states.

## Semester 2 stub: primary_package_alignment

Not part of the cutover. Items from the audit: move `server/models` and controllers
behind `@reading-advantage/domain` (L); replace the 33 local UI files with
`@reading-advantage/ui` (L, partly done by lane C); `srs-engine`, `storage`, `ai`
client, and one TTS provider (M each); share the APK host and audio hooks (L);
`@reading-advantage/types`; architecture-enforcement baseline. Create this track after cutover.

## Open questions

1. Integration base branch (above).
2. Reedy avatar: decided 2026-10-04 and 2026-10-05. The student's own avatar plays the coach. At cutover the avatar is a Forge starter set (15 classes) with a color scheme (skin 5, hair 6, eyes 5, cloth 5), chosen in a picker offered after the first sign-in and required at the Reedy entry (a home toast nudges). Rendered as the Forge portrait still plus CSS states. The shop and GP are semester 2 (`primary_avatar_shop_20261005`).
3. Reedy unlock: decided 2026-10-04. Reedy is a standard activity at the end of each lesson. Default: no rollover of unused minutes.
4. Per-session cap of 180 seconds (default).
5. Primary QR deep link: confirmed 2026-10-04 as `primary.reading-advantage.com/b/<book>/<n>` (Workbooks `content/primary/README.md`).
6. Teacher guide language: decided 2026-10-04. Thai when the UI locale is Thai, English otherwise. Source is Workbooks.
7. Scrypt verification: dropped 2026-10-04 (teachers have no passwords today).
8. Teacher temporary passwords: decided 2026-10-04. Forced change at first sign-in. The team hands out the list.
9. ID map table name: `primary_legacy_id_map` (decided 2026-10-04).
