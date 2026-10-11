# Decisions for Daniel — Math Advantage program

**Status 2026-10-06 (night): all items approved by Daniel as recommended (relayed by the PR session). Phase 0 started.** Earlier status: Science D1 and D2 are approved, so M9 is cleared: Math proceeds for May 2027 as a program inside the shared app. M1 to M8 are open; the consolidated list is in `measure/subject-programs-open-decisions.md`. Daniel's review budget is 10 to 20 hours per week.

| # | Decision | Status | Recommendation | Why |
|---|---|---|---|---|
| **M1** | **Reuse from `ra-math-advantage`.** | Open | **Only the generator pattern and the problem-family idea.** The engine packages are already canonical in the monorepo (v3.2). The Convex apps, the JWT auth, and the secondary content stay in their repo. | Nothing in that repo targets primary grades. |
| **M2** | **Lesson shape** (Q-WB-10a for Math). | Open | **12 steps:** 1 Warm-Up (number talk), 2 Key Words (bilingual math vocabulary), 3 Learn (worked example), 4 Try Together (guided), 5 Practice (10 printed items), 6 Read the Problem (a short story problem in Thai with English key words), 7 Explain Your Thinking, 8 Check (6 items), 9 Play (game), 10 Challenge, 11 Language Questions (English math words), 12 Lesson Reflection. | Keeps the Primary routine. The digital twin adds unlimited generated practice at step 5 and a game at step 9. |
| **M3** | **Objective set in the graph** (Q-WB-10b for Math). | Open, **changed** | **Thai B.E. 2560 mathematics indicators for P3 and P4** (three strands), skill nodes under each indicator, bilingual math vocabulary nodes. Common Core as alignment metadata only. This track builds the graph. | Schools buy against Thai indicators. Prerequisite edges are hand-defined from the scope and sequence. |
| **M4** | **Language of instruction.** | Open | **Thai-first with English math vocabulary.** No English-first switch at launch. | Thai schools teach math in Thai. **Cost to Daniel:** about 18 hours of Thai checking per book. |
| **M5** | **Grade range for May 2027.** | Open, **changed** | **P3 and P4, both books.** Earlier: P4 only. | The P4-only limit came from Daniel's Thai hours. With 10 to 20 hours per week, two math books cost about 36 hours over nine weeks. The P3 generators share the P4 generator code with narrower number ranges. Stop rule: if P4 Book 1 is not fully authored by 2027-02-19, P3 Book 1 prints in the March break for semester 2. |
| **M6** | **First titles and print date.** | Open, **changed** | **Math Advantage P3 Book 1 and P4 Book 1, 14 lessons each.** Final print order by **2027-04-02** (in hand by 2027-04-30). | Later than 2027-04-02 misses the May start. |
| **M7** | **Demo date.** | Open | **2027-03-08.** | Four weeks after the Science demo. |
| **M8** | **Mastery stage at launch.** | Open, **changed** | **Tag; shadow from the demo on a `math-evidence.v1` policy built on the Primary pattern; FSRS for math facts on; outer-fringe off.** | Generated practice gives immediate feedback without adaptation. The policy pattern adds rows per surface (practice item, check item, game, flashcard), not code. |
| **M9** | **Proceed for May 2027.** | **Cleared by D1 and D2.** | Proceed. | — |

## Dependencies on other sessions

| Session | Needs from them | By when |
|---|---|---|
| Science track (this session, or a Math lane from January) | Program dimension (Science P1), lesson player shell (Science P4), injector extension (Science P3), engagement wiring (Science P6), evidence policy pattern (Science P5) | 2026-12-23 to 2027-01-29 |
| workbooks | Math fields in `workbook-schema.ts`; author P4 Book 1 then P3 Book 1 graph-first; print PDFs | Shape: 2026-11-27. P4 lesson 1: 2027-01-08. P4 book: 2027-02-19. P3 book: 2027-03-12. |
| forge | Math backdrops (market, workshop) and item icons (abacus, ruler, coins) | 2027-02-12 |
| monorepo | Merge window for the Math tables (additive); lane-h evidence track merged | 2026-12-14 |
| PR | No public date | Ongoing |
