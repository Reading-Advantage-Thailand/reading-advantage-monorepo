# Plan review: primary_parity_lesson_games_20261011

## Phase D (design)

Phase review: the diff holds only track documents (no code, no locale key, no test). No Critical or High finding.

Medium and Low findings:
- Low: the `scroll` icon of the skin kit is wide, so it is small in the activity tiles of the mocks. Phase S3 can use a square icon.
- Low: the chips in the dark panel of the projector have low contrast at night. Phase S4 must use light chips there.
- Low: the cartridge pictures in the mocks are boss and NPC stand-ins. Request for Forge: one object render for each of the six cartridges (the arena objects).
- Low: the full-screen canvas in the mocks is a stand-in. Phase S5 checks the real 3D and 2D canvas in the browser run.

Deviations: the class book catalogue is empty on the rehearsal copy, so the lesson counts come from the Workbooks package files (read only).

Lessons: a `$VAR` in a heredoc without a value gives a wrong path with no error (the first capture run had no images). Check the first capture before the full run.

Shortcuts: none. No cartridge was loaded in a browser; the check is static (manifest minimums).

## Phase S1 review (helper, 2026-10-12)

No Critical or High finding. Checked: `assertCan`, school check, class book check, Zod at the boundary, JSDoc, logger rule, no new UI text (no locale keys in this phase).

- Medium: a student gets the input of any article of the school. Articles are global and the lesson page opens every article to every student, so the rule matches the page. A class book membership check would lock out library lessons.
- Medium: `getLessonPracticeInput` reads the snapshot sentence list only. A lesson with a short list gives fewer than 8 sentences; the caller gates with `missingFor`.
- Low: a teacher with `ADMIN` or `SYSTEM` role passes `managedClassBook` for any class of the school, as the projector page does.
- Lesson (for the shared file): in Vitest 4.1.8 a `vi.fn` that throws or rejects fails the test even when the code under test catches the error. Mock with a plain wrapper function and a variable for the failure.
- Shortcut: `buildPracticeInput` got a fifth parameter `inputId` (default "saved") to share the parse rules.

## Phase S2 review (helper, 2026-10-12)

No Critical or High finding. Checked: school and user scope of `getLessonGameResults`, `assertCan`, Zod at the boundary, JSDoc on each export, logger rule (no `console.error` in new code), key parity in five locale files, server XP only (the route schema is strict and rejects a client `xp`; `calculateGameXP` derives the XP).

Defect check: the tech-debt row "Story completions never persist" is closed in the current code. `gameTypeEnum` holds `rpg-battle-story`, `rune-match-story`, `dragon-rider-story`, `enchanted-library-story`, `castle-defense-story`, and `potion-rush-story`. Tests in `lesson-results.test.ts` and `completion.test.ts` prove it. The orchestrator can remove the row from `measure/tech-debt.md`.

Medium and Low findings:
- Medium: the lesson host passes no `ownerKey` and no avatar, so the lesson run shows no RPG reward panels and no avatar hero. The games page passes both from the server page. A later phase (S5) can add one server action that gives both.
- Medium: a locked card hides the last result of that game. A lesson that lost words after a run shows "Needs 6 words" and no result.
- Low: the game XP shows in the lesson summary only inside `totalXp`; the page has no separate game line (`gameXp` is in the data).
- Low: the step reads `LESSON_VOCABULARY_GAMES` only. Phase S3 reuses `LessonGamePicker` with `LESSON_SENTENCE_GAMES`; the picker already counts sentences for the chip.
- Low: the picker uses stand-in sprites (Forge boss and NPC strips). Request for Forge: one object render for each of the six cartridges.
- Low: the captures use a harness (real component, real CSS, demo data). No 3D cartridge loaded in a browser; Phase S5 does the browser run.
- Low: the speed bonus of `calculateGameXP` compares seconds with milliseconds (known, reported for `primary_parity_quick_fixes_20261011`).

Deviations: the step test `task-vocabulary-game.test.tsx` was written after the component, so its red run is "suite fails with the component absent". The other tests were red first.

Lessons: `vitest` in a Primary test does not type check, so a missing type (`RunContext.articleId`) passes the test; the app `tsc --noEmit` is the red for such a change. A characterization test with a hardcoded value ("20", "5/5") needs a change with the fix.

Shortcuts: `practiceLocaleOf(locale) as "th"` in the step (the request type is a locale union; the helper returns string).

## Phase S3 review (helper, 2026-10-12)

No Critical or High finding. Checked: no new server code (the step calls the S2 actions); Zod and `assertCan` stay in S1 and S2; JSDoc on the changed export; no `console.error` added; key parity in the five locale files (parity test passes).

Medium and Low findings:
- Medium: the games panel shows above the activity header, so a student sees games first as the spec says. On a slow phone the games load after the activities list; the panel appears with no placeholder (layout shift). A later phase can add a placeholder.
- Medium: a locked game hides its last result (same as S2).
- Low: the existing activity fetch still uses `console.error` (old code, not changed).
- Low: the load notice and the input notice share one slot; a second failure replaces the first.
- Low: the activity buttons have no stable test id; the test finds them by role.
- Low: stand-in Forge sprites (Golem boss and shopkeeper); request for Forge stays: one object render for each cartridge.
- Low: captures use the S2 harness (real component, real CSS, demo data); no cartridge loaded in a browser.

Extra task (orchestrator request): domain tests `games-host-proof` and `phase-3-adversarial` failed because their schema mock had no `primaryClassBooks` and `primaryBooks` (commit 628585040 made `getLessonPracticeInput` import `class-books`). Fix: commit a2a6a8dcb mocks `../primary-books/class-books.js` (`managedClassBook`) in both files. Red: 2 files failed. Green: the two files and `src/games` pass (4 files, 109 tests).

Lessons: a schema mock in a domain test breaks when a function gains an import of a module that reads more tables. Mock the new module, not the tables, when the test does not use it.

Shortcuts: none.
