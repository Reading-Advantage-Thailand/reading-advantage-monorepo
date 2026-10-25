# S1–S28 survival report — Storytime Advantage rollback

**For:** Daniel · **Date:** 2026-10-25 · **Source:** `decisions.md` of track `storytime_advantage_program_20261021` (reading-advantage-monorepo), decisions S1 to S30 with approvals and changes through 2026-10-23. Status detail comes from `plan.md` and `design.md` in the same track. · **Review:** line-by-line opus review, 2026-10-25. · **Architecture correction:** 2026-10-25, from Daniel's words "Storytime is an APP in the MONOREPO." The correction changes the Why section, standing decision 1, S8, S23, the note on S29 and S30, and one recommendation. The rest is the reviewed text. · **Build track:** [`storytime_app_rebuild_20261025`](../spec.md).

## Why this report

Daniel rolled back the first Storytime app build on 2026-10-25. The cause was the multimedia: mostly the songs, and also some audio, came out below Daniel's quality bar. The location of the build was not a cause. The app code is void.

Daniel's correction of 2026-10-25: "Storytime is an APP in the MONOREPO." The new build stays inside reading-advantage-monorepo, as its own app with its own service and container.

This report checks each decision S1 to S28 against Daniel's standing decisions and the recorded survivors.

**Standing decisions (Daniel, 2026-10-25):**

1. The Storytime system is its own app with its own service and container, inside reading-advantage-monorepo, sharing packages with primary-advantage. The app lives at `apps/storytime`.
2. Nothing ships without Daniel's sign-off, batch by batch.
3. The internal release-1 goal of 2026-12-01 stands.
4. The first milestone is one week end to end in the new architecture: the teacher app, the at-home app, one read-along, one decodable, and one song at Daniel's quality bar.

**Recorded survivors:** the 2D/3D models; the songs, as material only; phonics graph v1 (mastery-advantage ceb728d); the phoneme bank, Daniel's 45 recordings (Workbooks 9478e1f). The old track marks other survivors in place, for example the authored Level 2 weeks 1 to 8 and their Thai checks in Workbooks.

**Verdicts:** **survive** carries as is. **Survive with a move** carries with a new home or a new plan. **Revisit** waits for Daniel's answer. **Dies** means replaced. No decision dies whole. The parts that died are the mmx tools, the app as a later track, and the shared Primary service. Each of these parts belongs to a decision whose main content survives.

## Verdicts S1 to S28

| # | Decision | Verdict | Why | Next step |
|---|---|---|---|---|
| S1 | Phonics order | survive | Content decision; graph v1 already holds this teaching order. | — |
| S2 | Level 1 letter-sound order | survive | Content decision; the rollback does not touch it. | — |
| S3 | Graph location | survive | Graph v1 is a recorded survivor in mastery-advantage (ceb728d), outside the rolled-back build. | — |
| S4 | MVP: Levels 1 and 2 print-first, the app as a second track | survive with a move | Levels 1 and 2 and the print product stay. The first milestone puts the apps first, so the "second track" part ends. | The build track plans the apps from the start. |
| S5 | Phoneme audio: mmx speech test | survive | Closed before the rollback: mmx speech failed (44 of 45 rejected). Daniel's own recordings (S22) replaced it. | — |
| S6 | One read-along library | survive | Content decision; the rollback does not touch it. | — |
| S7 | Cast: Pip world and Chibi Sprouts | survive | The cast stands, and its models are recorded survivors. | — |
| S8 | `storytime` program value and Phonics skill | survive with a move | Storytime still needs its program label and skill values in the data. The `storytime` value is already in the shared `programSchema` list on master (`packages/types`, 1e8e3f1f8). The Phonics skill value does not exist yet. | The build track keeps the program value and adds the skill values in its own commit, in the same monorepo, when the first evidence code needs them. No hand-off to another project is necessary. |
| S9 | Song production template | survive with a move | The song template stays: fixed structure, 24 gestures, one picture per lyric line. S16 and S27 replaced the mmx tools before the rollback. | Music: S16. Video: S27. Karaoke: S28. |
| S10 | Review deck in print | survive | Print content; the rollback does not touch it. | — |
| S11 | Benchmarks | survive | Assessment content; the rollback does not touch it. | — |
| S12 | Hand-off statement and the phonics rule | survive | The wording stands. The P3 catch-up module serves Primary classes, so S12 already places it in Primary. | — |
| S13 | Timing (changed 2026-10-22: start now, goal 2026-12-01) | survive | Daniel reaffirmed the internal 2026-12-01 goal on 2026-10-25. The plan restarts from the first milestone. | — |
| S14 | Thai check hours | survive | About 30 hours stands. The Thai checks of weeks 1 to 8 already passed and carry in Workbooks. | — |
| S15 | Band names Seed to Flower | survive | Names for the class sets and covers; the rollback does not touch them. | — |
| S16 | Song music source (result: Lyria 3 Pro) | survive with a move | Lyria stays the source, but the songs missed Daniel's bar. The milestone song must pass it; a fail reopens the choice. | The first milestone song, judged by Daniel. |
| S17 | Release-1 scope | revisit | S17 sized the weeks 1 to 8 scope for 28 working days, with no rebuild and no teacher app. Both facts changed on 2026-10-25. | Daniel confirms or cuts the scope after the first milestone. |
| S18 | Forge priority and cost | survive | Chibi Sprouts stay first in Forge, and the models are recorded survivors. | — |
| S19 | Book covers | survive | Workbooks makes the covers and Forge supplies the renders; the split stands. | — |
| S20 | Self-host MiniMax on a GPU (closed: not needed) | survive | The "not needed" answer stands while Lyria is the source. It reopens only if Lyria fails the milestone song. | — |
| S21 | Strip Reading A-Z citations | survive | Graph v1 (ceb728d) already has the citations stripped. | — |
| S22 | Phoneme bank | survive | Daniel's 45 recordings are a recorded survivor (Workbooks 9478e1f). | — |
| S23 | QR host storytime.reading-advantage.com | survive with a move | The printed address and its /th/st/ paths stay, so printed QR codes keep working. Only the server behind the address moves off Primary, to Storytime's own service and container (S30). | Storytime's own service, built from `apps/storytime` in reading-advantage-monorepo, answers at the same address. |
| S24 | "Your child" Thai wording | survive | Print wording; Workbooks applied it to every week (041017a). | — |
| S25 | No sung onset in the songs | survive | Daniel's songwriting rule; every new song follows it. | — |
| S26 | Cast size: all 13 or 8 | revisit | Still open. Week 1 needs only 8 characters, so a week 1 milestone can start. Weeks 2 to 7 wait for the answer. | Daniel answers after the week 1 look check; Forge needs the number. |
| S27 | Song video model: option C | survive with a move | Daniel picked full in-scene renders on 2026-10-23, after the static cut-out test video did not engage. Option C has no test cut yet; the milestone song is its first test. | The first option C cut, judged by Daniel. |
| S28 | Karaoke cut and instrumental | revisit | Still open. The K3 centre-cancel sample is the floor Daniel passed. Karaoke cuts also wait for songs that pass his bar. | Daniel decides karaoke in release 1 and whether song audio may go to a hosted service. |

## Note on S29 and S30

S29 and S30 come after S1 to S28. On 2026-10-23, S29 put week 1 live for the CEO from the shared Primary service. That night, S30 gave Storytime its own app and its own service and container, inside the monorepo. The rollback keeps S30. The new build is `apps/storytime` in reading-advantage-monorepo, with its own service and container, and it shares packages with primary-advantage. The repository `~/Desktop/storytime-advantage`, made earlier on 2026-10-25, is retired and unused. Daniel decides when to delete it.

## Recommendation for Daniel

This is a recommendation, not an order.

- Keep the recorded survivors as the starting material.
- Treat every song and song video as unapproved material until it passes your bar, batch by batch.
- Use the first milestone song to test Lyria (S16) and option C (S27). If either fails, the choice comes back to you.
- Keep storytime.reading-advantage.com and its /th/st/ paths on Storytime's own service from `apps/storytime`, so printed QR codes keep working (S23).
- Decide the release-1 scope (S17) after the first milestone shows the speed of the new build.

## Decisions that still need Daniel's answer

- **S17**: release-1 scope. Does 2026-12-01 still mean all of weeks 1 to 8 in print and by QR? Does it now include the teacher app? We suggest that you answer after the first milestone.
- **S26**: cast size, all 13 or the S18 cap of 8. The weeks 2 to 7 videos wait for it.
- **S28**: karaoke in release 1, and whether song audio may go to a hosted separation service.
- **This report**: the new build track starts after you read it and say go.
