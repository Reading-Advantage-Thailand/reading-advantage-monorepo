# Capacity check: Science, Math, and Zhongwen for May 2027

**Date:** 2026-10-06 (revised the same evening after Daniel's decisions). **Window:** semester 2, 2026-11-02 to 2027-02-26 (17 weeks), the March break, and April.
**Tracks:** `tracks/science_advantage_relaunch_20261006`, `tracks/math_advantage_program_20261006`, `tracks/zhongwen_advantage_program_20261006`.
**Decided by Daniel:** all three subjects go to primary schools in May 2027 as programs inside the shared app with one database; the Reading Advantage book sets shrink to the Tutor-sellable subset (Q-WB-11); his review budget is 10 to 20 hours per week; contracted Chinese speakers check the Chinese; Thai stays with Daniel.
**Verdict:** **All three can meet May 2027** at the revised scopes (Science P3 and P4, Math P3 and P4, Zhongwen one book) **if** the engineering lane is split per subject from January and the stop rules below are kept. Daniel's Thai review no longer binds. The binding constraints are now the engineering lane in February and March, the workbooks authoring queue, and the forge asset queue.

## 1. What else the same semester holds (strategy v1.4 §8)

| Work | Owner | Size |
|---|---|---|
| Primary Advantage Quest 5, 6.1, 6.2 authored graph-first | workbooks, Daniel's Thai check | 42 lessons |
| Reading Advantage re-generation, then the Tutor-sellable subset of book sets (Q-WB-11: Reading Advantage Origins 1, 2, 3.1, and 3.2; Origins 2 is already printed, second edition open; the workbooks session's work) | workbooks, Daniel's Thai check | 56 lessons plus the prune |
| Primary cutover (Oct 11, last date Oct 20), semester 2 fixes, ETL | monorepo | through November |
| Tutor Advantage visual refresh | Daniel's developer | ongoing |
| Primary objective tags and evidence (lane-h, not merged yet) | graphs | through December |
| Game art, reward pieces, RPG skin packs, plus three subject scene sets | forge | ongoing |
| Science program (61 tasks), Math program (38 tasks), Zhongwen program (28 tasks) | Science session, split into lanes from January | 127 tasks |

## 2. Daniel's review hours

Budget: 10 to 20 hours per week. Estimates per lesson: 20 minutes for an English book with Thai translation paragraphs and glosses; 75 minutes for a Thai-first lesson; 45 minutes for a Thai-instruction reading lesson with glosses.

| Content | Lessons | Minutes each | Hours | Weeks | Hours per week |
|---|---|---|---|---|---|
| Primary Quest 5, 6.1, 6.2 | 42 | 20 | 14 | Nov to Jan | 1.1 |
| Reading book sets (4 books) | 56 | 20 | 19 | Dec to Feb | 1.5 |
| Science P3 and P4 Book 1 (Thai-first) | 28 | 75 | 35 | Dec to Jan (9 weeks) | 3.9 |
| Math P3 and P4 Book 1 (Thai-first) | 28 | 75 | 35 | Jan to mid-Mar (9 weeks) | 3.9 |
| Zhongwen Book 1 (Thai parts only) | 14 | 45 | 10 | Feb to mid-Mar (6 weeks) | 1.7 |
| **Total** | 168 | | **113** | Nov to mid-Mar (19 weeks) | **6.0 average, 9.5 peak in February** |

Add about 2 hours per week for decisions, browser captures, and demos. The peak in February is about 11.5 hours, inside the budget. Thai review does not bind. The Chinese review (about 14 hours for the book, plus the tone audio) is contracted.

## 3. Engineering, authoring, and assets

| Lane | Load | Fit | Condition |
|---|---|---|---|
| Science session, November and December | Program dimension, Science graph, content model and injector, Science player | Fits | None |
| Science session, January to March | Science P5 to P9, Math P1 to P6, Zhongwen P1 to P5 at the same time: three graphs, three players, three evidence policies, three demos (Feb 8, Mar 8, Mar 29) | Does not fit in one lane | **Split into three lane worktrees from 2027-01-04** (the Primary parity lane pattern), one per subject, merged through one integration branch. |
| workbooks | 168 lessons in 19 weeks, about 9 per week, with three new lesson shapes, labs, generated math items, and Chinese script | Fits with a steady queue | Lesson 1 of each book first (Science 2026-11-27, Math 2027-01-08, Zhongwen 2027-02-01) so the style is fixed once. |
| forge | Three scene sets and icon sets on top of Primary packs | Fits if requested in October | Science assets by 2027-01-29, Math by 2027-02-12, Zhongwen by 2027-03-12. |
| graphs | English only | No load from the subjects | One read of each subject's node ID list. |
| monorepo | Three additive migration windows (2026-11-09, 2026-12-14, 2027-02-01) and the lane-h evidence merge (2026-12-11) | Fits | Freeze respected until the cutover is accepted. |
| Print | Science by 2027-03-26, Math by 2027-04-02, Zhongwen by 2027-04-09 | Fits, with ten days of margin for Zhongwen | One print vendor booking for the three orders. |

## 4. Order and stop rules

1. **Order: Science, then Math, then Zhongwen.** Science first because its content and the program dimension are built there once. Math second. Zhongwen third because its graph and reviewers start latest.
2. **Lanes from 2027-01-04:** `science`, `math`, `zhongwen` worktrees on one integration branch; the Science session leads and merges.
3. **Stop rule Science (2027-01-15):** if P4 Book 1 is not half authored and reviewed, the Science demo keeps P4 only and P3 Book 1 follows in the March break.
4. **Stop rule Math (2027-02-19):** if P4 Book 1 is not fully authored, P3 Book 1 prints in the March break for semester 2.
5. **Stop rule Zhongwen (2026-12-18):** if the Chinese reviewers are not named and contracted, the Zhongwen print moves to the March break and the app ships in May with the digital lessons only.
6. **Reading book sets:** only the Q-WB-11 subset; any book beyond it waits for April.
