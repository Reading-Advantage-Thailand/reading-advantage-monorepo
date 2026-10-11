# Decisions for Daniel — Zhongwen Advantage program

**Status 2026-10-06 (night): all items approved by Daniel as recommended (relayed by the PR session). Phase 0 started.** Earlier status: Daniel rejected Z9 (defer). Zhongwen goes to primary schools in May 2027 on the May path. Science D1 and D2 are approved. Chinese text, pinyin, and tones go to contracted Chinese speakers (Daniel has several); Thai stays with Daniel. Z1 to Z7 are open; the consolidated list is in `measure/subject-programs-open-decisions.md`.

| # | Decision | Status | Recommendation | Why |
|---|---|---|---|---|
| **Z1** | **Framework.** | Open | **YCT 1 and 2 as the objective set for primary, with HSK 3.0 band labels as alignment metadata.** | HSK's lowest level is an adult syllabus. YCT is the same body's school-age test. The "HSK-aligned" wording stays true through the metadata. |
| **Z2** | **Lesson shape** (Q-WB-10a for Zhongwen). | Open | **The English 13-step shape with a script layer** (hanzi, pinyin, Thai gloss) and character writing inside Vocabulary Practice. | Zhongwen is a reading product. Reusing the shape reuses the Primary player and the teacher routine. |
| **Z3** | **Objective set in the graph** (Q-WB-10b for Zhongwen). | Open | **YCT 1 and 2 vocabulary and characters (radical prerequisite edges), grammar patterns, reading can-do nodes.** This track builds the graph. | Character prerequisites through components give a richer graph than English. |
| **Z4** | **Language of instruction.** | Open | **Thai-first instructions, Chinese text with pinyin, short English summaries.** | Thai instructions keep Daniel's check possible. **Cost to Daniel:** about 10 hours of Thai checking per book. |
| **Z5** | **Mandarin voice for tone audio.** | Open, **changed** | **One standard Mandarin voice from the speech pipeline (mmx), checked by the contracted Chinese speakers.** | Tone audio is the core scaffold. |
| **Z6** | **Grade and first title.** | Open | **P3 and P4 share one book: Zhongwen Advantage Book 1 (YCT 1), 14 texts.** | True beginners in both grades start at the same level. |
| **Z7** | **Demo and print dates.** | Open | **Demo 2027-03-29; final print order by 2027-04-09** (in hand about 2027-05-07). | The latest feasible pair. Ten days of margin. |
| **Z8** | **Chinese reviewers.** | **Answered in principle, changed.** Daniel contracts Chinese speakers. | **Dated task:** Daniel names the reviewers and signs the contract by **2026-12-18**, before the first text is authored (2027-02-01). Reviews run 2027-02-01 to 2027-03-26, about 14 hours per book for the reviewers. | Claude-made Chinese text does not go to print without a human check. |
| **Z9** | **Proceed for May 2027.** | **Decided: proceed.** The deferred path is withdrawn. | — | Daniel's decision, 2026-10-06. |

## Dependencies on other sessions

| Session | Needs from them | By when |
|---|---|---|
| Science track (this session, or a Zhongwen lane from January) | Program dimension, player shell, injector pattern, engagement wiring, evidence policy pattern | 2027-01-29 |
| workbooks | Script fields in `workbook-schema.ts`; author Book 1; print PDFs | Shape: 2027-01-15. Lesson 1: 2027-02-01. Book: 2027-03-19. |
| forge | Chinatown and temple backdrops; lantern, fan, brush icons | 2027-03-12 |
| Contracted Chinese speakers (Z8) | Review of every lesson, the pinyin, and the tone audio | Named by 2026-12-18; reviews 2027-02-01 to 2027-03-26 |
| monorepo | Merge window for Zhongwen tables (additive) | 2027-02-01 |
| PR | No public date | Ongoing |
