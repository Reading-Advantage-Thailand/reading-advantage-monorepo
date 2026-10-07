# Open detail decisions for Daniel — Science, Math, Zhongwen (2026-10-06, evening)

Decided: Science D1 and D2 (programs inside the shared app, one database), all three subjects in May 2027, the Reading book sets reduced, Daniel's review budget 10 to 20 hours per week, contracted Chinese speakers for Chinese text (Z8 in principle), Zhongwen Z9 rejected (proceed). **Update 2026-10-06 (night): Daniel approved every item below as recommended, including X1. Phase 0 started.** The items were open when this list was written. **Changed** marks a recommendation that moved because of the new budget, the Chinese reviewers, or the Primary evidence policy now in code. Reply with the item number and "agree" or a change.

## Science (details in `tracks/science_advantage_relaunch_20261006/decisions.md`)

| # | Decision | Recommendation | Changed |
|---|---|---|---|
| D3 | Science lesson shape | 12 steps: Before You Explore, Key Vocabulary, Read the Article, Collect Vocabulary, Investigate, Record Data, Comprehension Check, Explain (claim, evidence, reasoning), Vocabulary Practice, Apply, Language Questions, Lesson Reflection | — |
| D4 | Objective set | Thai B.E. 2560 science indicators for P3 and P4, process skill nodes, bilingual vocabulary nodes; NGSS as metadata; the Science track builds the graph | — |
| D5 | Language | Bilingual, Thai-first with English vocabulary and article; per-school English-first switch; about 18 hours of Daniel's Thai check per book | — |
| D6 | Grades | **P3 and P4, both books committed; the P4-only fallback is withdrawn** | **Changed** (budget) |
| D7 | Titles and print | Science Advantage P3 Book 1 and P4 Book 1; sample proof by 2027-02-01; print order by 2027-03-26 | — |
| D8 | Demo | 2027-02-08 | — |
| D9 | Mastery stage | Tag by January; shadow on a `science-evidence.v1` policy built on the Primary `evidence-policy.ts` pattern; FSRS on; outer-fringe off | **Changed** (Primary policy now in code) |
| D10 | Legacy app | Tag `science-advantage-legacy-20261006`, salvage six items, delete after the demo | — |
| D12 | Brand and skin | Science uses the Chibi Quest skin with a science scene set; the Science brand on name, logo, and cover | — |

D11 (deploy) is settled by D1: the shared platform container.

## Math (details in `tracks/math_advantage_program_20261006/decisions.md`)

| # | Decision | Recommendation | Changed |
|---|---|---|---|
| M1 | Reuse from ra-math-advantage | Only the seeded-generator pattern and the generator gate; leave the Convex apps and secondary content | — |
| M2 | Math lesson shape | 12 steps: Warm-Up, Key Words, Learn, Try Together, Practice, Read the Problem, Explain Your Thinking, Check, Play, Challenge, Language Questions, Lesson Reflection | — |
| M3 | Objective set | Thai B.E. 2560 math indicators for P3 and P4 (three strands), skill nodes, bilingual math vocabulary; Common Core as metadata; the Math track builds the graph | **Changed** (two grades) |
| M4 | Language | Thai-first with English math vocabulary; about 18 hours of Daniel's Thai check per book | — |
| M5 | Grades | **P3 and P4, both books**; stop rule 2027-02-19 moves P3 to the March break if P4 is not fully authored | **Changed** (budget) |
| M6 | Titles and print | Math Advantage P3 Book 1 and P4 Book 1; print order by 2027-04-02 | **Changed** (two titles) |
| M7 | Demo | 2027-03-08 | — |
| M8 | Mastery stage | Tag; shadow on a `math-evidence.v1` policy (practice item, check item, game, flashcard rows); FSRS for math facts on; outer-fringe off | **Changed** (policy pattern) |

## Zhongwen (details in `tracks/zhongwen_advantage_program_20261006/decisions.md`)

| # | Decision | Recommendation | Changed |
|---|---|---|---|
| Z1 | Framework | YCT 1 and 2 as the objective set; HSK 3.0 band labels as metadata | — |
| Z2 | Lesson shape | The English 13 steps with a script layer (hanzi, pinyin, Thai gloss) and character writing in Vocabulary Practice | — |
| Z3 | Objective set | YCT 1 and 2 vocabulary and characters with radical prerequisite edges, grammar patterns, reading can-do nodes; the Zhongwen track builds the graph | — |
| Z4 | Language | Thai-first instructions, Chinese with pinyin, short English summaries; about 10 hours of Daniel's Thai check per book | — |
| Z5 | Mandarin voice | One standard Mandarin voice from the speech pipeline, checked by the contracted Chinese speakers | **Changed** (reviewers) |
| Z6 | Grade and title | One book shared by P3 and P4: Zhongwen Advantage Book 1 (YCT 1), 14 texts | — |
| Z7 | Demo and print | Demo 2027-03-29; print order by 2027-04-09 (in hand about 2027-05-07) | — |
| Z8 | Chinese reviewers | **Dated task, not a blocker:** Daniel names the contracted Chinese speakers and signs by 2026-12-18; reviews 2027-02-01 to 2027-03-26 | **Changed** (answered in principle) |

## One cross-subject item

| # | Decision | Recommendation |
|---|---|---|
| X1 | Lanes from January | Split the Science session into three lane worktrees (science, math, zhongwen) on one integration branch from 2027-01-04, the Primary parity lane pattern. Without this, the three demos in February and March do not fit one lane. |
