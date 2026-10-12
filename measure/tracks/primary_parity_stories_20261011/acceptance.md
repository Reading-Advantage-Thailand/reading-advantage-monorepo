# Acceptance: primary_parity_stories_20261011

- Date: 2026-10-12
- Legacy revision: bfea121
- New commit: 8bf4a3d6b
- Copies: primary_legacy_20261011, primary_parity_20261011
- Accounts: one SYSTEM, one ADMIN, one TEACHER, one STUDENT (`accounts.ts`); the same student in both apps

| Pair | Check | Result (pass, fail, difference on purpose) | Note |
| --- | --- | --- | --- |
| ST-A1 | ST-A1-a | pending batch capture | AC-1: same level-window stories in both apps; genre, search, empty note |
| ST-A1 | ST-A1-b | pending batch capture | Read tab sign "Articles \| Stories", four-tab toolbar |
| ST-A2 | ST-A2-a | pending batch capture | AC-2: same title, summary, chapter count (8) |
| ST-A2 | ST-A2-b | pending batch capture | Characters sign in both apps |
| ST-A3 | ST-A3-a | proven by tests, side-by-side pending | Read-along host parity 5/5 (`chapter-content.behavior.test.tsx`); audio highlight side-by-side pending |
| ST-A3 | ST-A3-b | pending batch capture | Steps pick th; translation side-by-side pending |
| ST-A3 | ST-A3-c | pending batch capture | Steps open the word list; words side-by-side pending |
| ST-A4 | ST-A4-a | proven by tests, side-by-side pending | AC-4 rule proven (`stories-questions.test.ts`: 5 of 10, server grade, 2 XP per correct; `story-question.test.ts` 11/11 XP write); steps record XP before/after |
| ST-A4 | ST-A4-b | proven by tests, side-by-side pending | Retake pays no second XP (`retakeChapterMcq` `xpAvailable`; legacy farming kept as difference on purpose) |
| ST-A4 | ST-A4-c | proven by tests, side-by-side pending | No answer reaches the client (`stories-questions.test.ts`) |
| ST-A5 | ST-A5-a | proven by tests, submit side-by-side pending | SAQ/LAQ scoring and one-submit refusal proven (`stories-questions.test.ts`, `assistant-chapter.test.ts` 4/4); steps fill valid answers and record XP (the kit has no AI key, so the batch runner confirms feedback and submit with a headed pass) |
| ST-A5 | ST-A5-b | proven by tests | LAQ minimum and try cap (`chapter-quiz.test.tsx`: "Write at least 150 characters", "0 tries left") |
| ST-A6 | ST-A6-a | pending batch capture | Last chapter nav in both apps (`chapter-page.test.tsx` 6/6 covers the links) |
| ST-A6 | ST-A6-b | pending batch capture | Chapter picture request `images/story/` recorded by the capture |
| ST-A7 | ST-A7-a | implemented, side-by-side pending | Chapter save landed (8bf4a3d6b); decks and tables checked by hand at batch time |
| ST-A7 | ST-A7-b | implemented, side-by-side pending | No duplicate card; no save before all three are done |
| ST-A8 | ST-A8-a | pending batch capture | Old chapter URL redirects through the map in the new app |
| ST-A8 | ST-A8-b | pending batch capture | First-chapter nav in both apps |
| ST-A9 | ST-A9-a | pending batch capture | Unknown story id is not found in both apps |
| AC-6 | ETL report | proven locally, rehearsal-3 rerun pending | Local run on `primary_etl_stories_s1` (`etl-run.md`): counts match, 0 "stories deferred" skips, 11 MCQ skipped by the article rule; Cloud Build rerun into a fresh rehearsal target stays with the orchestrator |
| AC-7 | look check | pending | Captures at 375 px and 1280 px, day and night (ST-A1, ST-A2, ST-A3); owner answer pending |

Owner look check: pending
