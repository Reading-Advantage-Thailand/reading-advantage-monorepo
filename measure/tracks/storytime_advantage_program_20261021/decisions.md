# Decisions for Daniel — Storytime Advantage program

**Status 2026-10-21:** Daniel fixed the program shape in discussion (four levels, 32 weeks, 5 periods, 30 and 49 minutes, five scripts, printed spaced review, weekly book and song, Chibi Sprouts approved). The items below are open. Reply with the item number and "agree" or a change. Detail for each is in [`design.md`](./design.md) §12.2.

| # | Decision | Status | Recommendation | Why |
|---|---|---|---|---|
| **S1** | **Phonics order.** | Open | The Reading A-Z 68-element order, with five Thai-specific weeks and eleven exit-profile weeks placed as in design §2. | It matches the material in the Drive folder and the decodable per element. Jolly's order shares the start. |
| **S2** | **Level 1 letter-sound order.** | Open | The same Reading A-Z order, one sound a week after two listening weeks; letter names by the alphabet song daily. | Level 2 re-meets the letters in the same order. |
| **S3** | **Graph location.** | Open | `mastery-advantage/english/phonics/`, prefix `english.phonics.*`, owned by this track; the Graph session reviews. | Graph's preference (2026-10-21); one English continuum; Primary can point weak readers at the nodes. |
| **S4** | **MVP.** | Open | Option B: Levels 1 and 2 print-first with songs and books by QR; Option A (Level 2 only) if the Level 1 stop rule fires; the app as a second track. | A school buys kindergarten first; the book channel sells print; the app is not needed to sell. |
| **S5** | **Phoneme audio.** | Open | Test mmx speech on the 44 sounds in month 2; record a human bank if fewer than 40 pass. | Pure sounds are the base of every card and item. |
| **S6** | **Read-along and leveled readers.** | Open | One library: the read-along books re-cut into class sets by band aa to C; no separate leveled series for MVP. | Halves the book count. |
| **S7** | **Cast.** | Open | The Pip world drawn young in the books, Pip the puppy as mascot from Level 2; the Chibi Sprouts cast in the app and videos. | Continuity into Origins 1; the series bible rules hold. |
| **S8** | **Program enum and Phonics skill.** | Open | Ask the Science track to add `storytime` to `programSchema` now; the Phonics, Speaking, and Writing skill values as one task in this track when the app starts. | Zero cost now; one bounded change later (Monorepo named the two files). |
| **S9** | **Song production.** | Open | The mmx music and video pipelines with the fixed structure in design §6.3; 24 named gestures; a karaoke cut per song. | Volume needs a template. |
| **S10** | **Review deck in print.** | Open | The expanding schedule 2d, 3d, 1w, 2w, 4w, 8w, printed as dated strips; the teacher adds weak items from the record sheet. | The printed program is the spaced repetition; the app personalises. |
| **S11** | **Benchmarks.** | Open | Four a level as in design §7; the speaking assessment at weeks 16 and 32; reading records four children a week. | Matches the review weeks and school reporting. |
| **S12** | **Hand-off statement and the Primary phonics rule.** | Open | "Storytime Advantage: Anuban 2 to P2. Primary Advantage from P3. A P3 class without phonics runs the Primary catch-up module." in both product files, the battle card, and the matrix. **This amends the rule of 2026-10-02** (`primary-advantage.md` line 80: Primary books teach no alphabet, phonics, or first words): the Origins books stay story books and teach no phonics; the catch-up module is a separate Storytime-made teacher booklet, card kit, and app module hosted in Primary for P3 classes that arrive without phonics. PR updates line 80 and the battle card with that wording. | PR's requirement (2026-10-21): the hand-off grade must agree everywhere, and the 2026-10-02 rule must be amended in words, not silently. |
| **S13** | **Timing.** | Open | Authoring from March 2027, after the Zhongwen book; first school in month 8 of the sequence; no public date. | Capacity (design §11.3). |
| **S14** | **Thai check hours.** | Open | About 30 hours for the MVP, under 2 hours a week. | Inside the 10 to 20 hour budget. |

## Dependencies on other sessions

| Session | Needs from them | By when |
|---|---|---|
| Graph | Review of the phonics graph v0 and the `supports` and `equivalent_to` edges to GSE nodes; the standard-node rule confirmed | Month 1 |
| Workbooks | The `storytime-week` package shape and `program` value in `schema.ts`; the manual generator template; author Level 2 week 1, then Levels 2 and 1; the print PDFs | Shape: month 1. Week 1: month 2. Level 2: month 6. Level 1: month 7. |
| Forge | The Chibi Sprouts cast at age 5, 28 places, 24 gesture poses, three cartridge art sets, the kindergarten scene set | Brief month 2; delivery month 6 |
| Monorepo | The QR page on the read-along player (MVP); `storytime` in `programSchema` through the Science Phase 1 task; later the Phonics skill change, the cartridges, the evidence job, the hosting | QR page month 3; enum when Science Phase 1 runs; the rest post-MVP |
| PR | The hand-off sentence (S12) in the product files after approval; no public date; the training day 2 and the first-school plan | After S12; month 7 |
| Daniel | Decisions S1 to S14; the Thai check; the phoneme audio rating; the print proof approval; the first school | Month 1 onward |
