# Program decisions and feature list of the old Storytime program

Source track: `storytime_advantage_program_20261021`, closed and archived on 2026-10-26 (Daniel, check D4).
Daniel on 2026-10-26: "The app functionality was good, but was mistakenly created inside PA instead of as a separate monorepo app."
The S1 to S28 verdicts live in [s1-s28-survival.md](./s1-s28-survival.md). This file keeps the decision record and the feature list, with the reuse verdict for each item.

## Decisions S1 to S30

- **S1 phonics order** — worked: yes. Reused: yes. The Reading A-Z order stays, with the five Thai weeks and the eleven exit weeks.
- **S2 level 1 letter-sound order** — worked: yes. Reused: yes. Two listening weeks, then one sound a week.
- **S3 graph location** — worked: yes. Reused: yes. The phonics graph sits in `mastery-advantage/english/phonics/` under the `english.phonics.*` prefix.
- **S4 MVP shape** — worked: partly. Reused: partly. Levels 1 and 2 stay print-first. The app is no longer a second track; the first milestone puts the apps first.
- **S5 phoneme audio test** — worked: yes. Reused: yes. The mmx speech test failed with 44 of 45 sounds rejected, so the human bank replaced it.
- **S6 one read-along library** — worked: yes. Reused: yes. The class sets stay cut from the read-along library by band.
- **S7 cast** — worked: yes. Reused: yes. Pip and the Chibi Sprouts cast stay.
- **S8 program value and skill** — worked: partly. Reused: yes. The `storytime` program value is on master. The Phonics, Speaking, and Writing skill values still need one change in this repository.
- **S9 song production template** — worked: partly. Reused: yes. The fixed structure, the 24 gestures, and one picture per lyric line stay. The mmx tools were replaced before the rollback.
- **S10 review deck in print** — worked: yes. Reused: yes. The printed spaced review stays.
- **S11 benchmarks** — worked: yes. Reused: yes. The eight checks and their timing stay.
- **S12 hand-off statement and the phonics rule** — worked: yes. Reused: yes. The wording stands, and the catch-up module stays in Primary.
- **S13 timing** — worked: partly. Reused: yes. The internal 2026-12-01 goal stands. The plan restarts from the first milestone.
- **S14 Thai check hours** — worked: yes. Reused: yes. About 30 hours stands.
- **S15 band names** — worked: yes. Reused: yes. Seed, Sprout, Leaf, Bud, and Flower stay.
- **S16 song music source** — worked: partly. Reused: yes. Lyria 3 Pro stays the source. The milestone song must pass Daniel's bar, and a fail reopens the choice.
- **S17 release-1 scope** — worked: no. Reused: partly. The weeks 1 to 8 scope no longer fits. Daniel confirms or cuts it after the first milestone.
- **S18 Forge priority and cost** — worked: yes. Reused: yes. Chibi Sprouts stay first in Forge, and the models are recorded survivors.
- **S19 book covers** — worked: yes. Reused: yes. Workbooks makes the covers and Forge supplies the renders.
- **S20 self-hosted GPU music** — worked: yes, as a closed answer. Reused: yes. The answer stays "not needed" while Lyria is the source.
- **S21 strip Reading A-Z citations** — worked: yes. Reused: yes. The graph already carries the stripped output.
- **S22 phoneme bank** — worked: yes. Reused: yes. Daniel's 45 recordings are a recorded survivor.
- **S23 QR host** — worked: partly. Reused: yes. The printed address and its `/th/st/` paths stay. The server moves off Primary to the Storytime service and container.
- **S24 "your child" Thai wording** — worked: yes. Reused: yes. Workbooks applied the wording to every week.
- **S25 no sung onset** — worked: yes. Reused: yes. Every new song follows the rule.
- **S26 cast size for the videos** — worked: no, still open. Reused: partly. Week 1 needs 8 characters. Weeks 2 to 7 wait for Daniel's answer.
- **S27 song video model, option C** — worked: partly. Reused: yes. Full in-scene renders stay the model. The first option C cut is its test.
- **S28 karaoke cut and instrumental** — worked: no, still open. Reused: partly. The K3 centre-cancel sample is the floor. Karaoke waits for a song that passes Daniel's bar.
- **S29 live preview for the CEO** — worked: yes. Reused: no. The preview ran on the shared service and the rollback took it down.
- **S30 Storytime is its own app and its own container** — worked: yes. Reused: yes. The rebuild keeps it: `apps/storytime` with its own service and container.

## Feature list FR-1 to FR-11

- **FR-1 exit profile and backward plan** — worked: yes, as design. Reused: yes, as the scope of the rebuild.
- **FR-2 scope and sequence** — worked: partly. Reused: yes. The 128-week table and its generator are data; the order is a content decision and the generator moves to Workbooks.
- **FR-3 phonics graph and package** — worked: yes. Reused: yes. Graph v1 already holds the nodes, and the package follows the science-knowledge pattern.
- **FR-4 lesson scripts** — worked: partly. Reused: yes. The five scripts, the four headings, and the Easier, Harder, and Group lines stay.
- **FR-5 review deck** — worked: yes. Reused: yes. The expanding schedule and the dated strips stay in print.
- **FR-6 content production** — worked: partly. Reused: yes. The production rules, the package shape, the decodable gate, and the band names stay. The song and video tools changed.
- **FR-7 assessment and placement** — worked: partly. Reused: yes, as design. The eight checks, the pass marks, and the placement probe stay.
- **FR-8 teacher kit and training** — worked: partly. Reused: yes, as the kit list. The two-day training and the fidelity protocol stay.
- **FR-9 home layer** — worked: yes. Reused: yes, inside the own app. The home card, the QR page, and the parent report stay.
- **FR-10 digital twin Chibi Sprouts** — worked: partly. Reused: yes, inside the own app. The world rules, the sound cards, the cartridges, and the evidence policy stay. The app code was void because it sat inside Primary.
- **FR-11 MVP and milestones** — worked: partly. Reused: partly. The print-first shape stays. The first milestone is smaller than release 1 as it stood.

## What the rebuild changes

- The app is `apps/storytime` with its own service and container (S30).
- The app is not a second track after the print MVP (S4). The first milestone puts the apps first.
- The rollback did not touch the content decisions. The print content in Workbooks survives in place.

## Records kept with the archived track

The full design stays in [../archive/storytime_advantage_program_20261021/design.md](../archive/storytime_advantage_program_20261021/design.md), the source list in `sources.md`, and the print content in Workbooks.
