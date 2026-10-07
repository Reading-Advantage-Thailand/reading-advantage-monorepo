# Decisions for Daniel — Science Advantage relaunch

**Status 2026-10-06 (night): all items approved by Daniel as recommended (relayed by the PR session). Phase 0 started.** Earlier status: D1 and D2 **approved by Daniel**. D3 to D12 are open; the consolidated list with updated recommendations is in `measure/subject-programs-open-decisions.md`. Daniel's review budget is 10 to 20 hours per week (his words), and contracted Chinese speakers handle Chinese text; Thai stays with Daniel only. All dates are internal; no user-facing text gets a date (Q-PR-24).

| # | Decision | Status | Recommendation | Why |
|---|---|---|---|---|
| **D1** | **Platform shape.** | **Approved.** Science, Math, and Zhongwen are programs inside the shared Primary Advantage app, each under its own hostname and brand. | — | One login, one classroom list, one avatar, one quest system, one deploy. |
| **D2** | **Database.** | **Approved.** One database, the canonical content store, with a `program` dimension. | — | The strategy names the Primary Advantage database as the content store for all programs. |
| **D3** | **Science lesson shape** (Q-WB-10a). | Open | **12 steps:** 1 Before You Explore (interest, prediction), 2 Key Vocabulary, 3 Read the Article, 4 Collect Vocabulary, 5 Investigate (materials, safety, procedure), 6 Record Data (table or drawing), 7 Comprehension Check, 8 Explain (claim, evidence, reasoning frames), 9 Vocabulary Practice, 10 Apply (real-world question), 11 Language Questions, 12 Lesson Reflection. | Eight steps reuse the English shape; four add inquiry. The workbooks session confirms the final list and the schema fields. |
| **D4** | **Science objective set in the graph** (Q-WB-10b). | Open | **Thai Basic Education Core Curriculum B.E. 2551 (rev. 2560) indicators for P3 and P4**, plus science process skill nodes and bilingual science vocabulary nodes. NGSS codes as `aligned_to_standard` metadata only. **The Science track builds the graph** (lane-h owns only the English graph). | Schools buy against the Thai indicators. The current seed uses the superseded 8-strand structure. |
| **D5** | **Language of instruction.** | Open | **Bilingual, Thai-first instructions with English science vocabulary and an English article with Thai support.** A per-school switch sets English-first for English Program schools. | Serves both buyers from one book. **Cost to Daniel:** about 18 hours of Thai checking per book. Within his 10 to 20 hour weekly budget. |
| **D6** | **Grade range for May 2027.** | Open, **changed** | **P3 and P4, both books committed.** The earlier P4-only fallback is withdrawn. | With a 10 to 20 hour review budget, two books cost about 36 hours over nine weeks, about 4 hours per week. |
| **D7** | **First titles and print date.** | Open | **Science Advantage P3 Book 1 and P4 Book 1, 14 lessons each.** Sample lesson proof by 2027-02-01. Final print order by **2027-03-26** (in hand by 2027-04-23). | Two weeks before the May start. |
| **D8** | **Demo milestone.** | Open | **Demo-ready build on 2027-02-08.** | Inside the Feb to Apr procurement window with one fix cycle. |
| **D9** | **Mastery stage at launch.** | Open, **changed** | **Tag by January; shadow mode from the demo on a `science-evidence.v1` policy built on the Primary pattern (`packages/domain/src/primary-mastery/evidence-policy.ts`, `primary-evidence.v1`); FSRS vocabulary review on at launch; outer-fringe off.** | The Primary policy is data per surface with a hint step-down, skip rules, and a durable job off the request path. Science adds rows, not code. |
| **D10** | **Fate of `apps/science-advantage`.** | Open | **Salvage, then delete.** Tag `science-advantage-legacy-20261006`, port the six items in `review.md` section 9, delete after the demo. | Two apps with one name confuse agents and CI. |
| **D11** | **Deploy target.** | Settled by D1 | The shared platform container on Cloud Run. Delete `vercel.json` with the legacy app. | — |
| **D12** | **Brand and skin.** | Open | **Yes, Science uses the Chibi Quest skin**, with a science scene set and items from forge. The Science name, logo, and book cover carry the Science brand. | One avatar and one reward economy keep the quest loop whole. |

## Dependencies on other sessions

| Session | Needs from them | By when |
|---|---|---|
| workbooks | Lesson shape fields in `workbook-schema.ts` (D3); author P3 Book 1 and P4 Book 1 graph-first; print PDFs | Shape: 2026-10-31. Lesson 1 of each book: 2026-11-27. Books complete: 2027-01-29. |
| graphs | Reference only: schema and release rules, English instance, `primary-mastery` adapter and `evidence-policy.ts` pattern. One read of the Science graph v0 node IDs (agreed 2026-10-06). | Read in Phase 0. Node ID review: 2026-11-27. |
| monorepo | Primary cutover done (Oct 11, last date Oct 20); merge window after the freeze for the additive `program` migration; lane-h evidence track merged before Science Phase 5 | Migration window: 2026-11-09. Evidence merge: 2026-12-11. |
| Daniel's developer (Tutor Advantage repo) | The `program` dimension on Tutor series records, built from a spec. The PR side writes the spec (`tutor-advantage/docs/specs/2026-10-tutor-catalogue-and-platform-spec.md`). | Spec addendum: 2026-11-27. Not needed before the school launch. |
| forge | Science backdrops (lab, garden, pond, sky) and item icons | Backdrops: 2027-01-15. Icons: 2027-01-29. |
| PR | No public date; record Q-WB-10 answers | Ongoing. |
