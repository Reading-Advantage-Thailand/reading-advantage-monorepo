# Forge art brief: Chibi Sprouts, release 1

Status: v1, 2026-10-22. Sent by the Storytime track to Forge.
Sources: `design.md` sections 2, 6.3, 6.5, 10; `decisions.md`; the Forge repo files named in section 2.

## 1. Purpose and deadline

- First release of Storytime Advantage: 2026-12-01. Art is due 2026-11-15.
- Chibi Sprouts is the kindergarten sibling of Chibi Quest. It uses the same chibi style.
- The cast is the Chibi Quest cast drawn at age 5. The colours and silhouettes stay the same.
- Chibi Sprouts has no combat and no defeat state. Draw no weapon in use, no enemy, no injury.
- Release 1 covers Level 2, weeks 1 to 8 (decision S17). Eight songs need this art.

## 2. Cast list

Cast source: the Chibi Quest hero list is in `/home/daniebo/Desktop/advantage-forge/docs/fantasy-world-asset-catalog.tsv`
(lines 304 to 354). The P0 heroes are the Chibi Quest core cast. Each hero has a file in
`/home/daniebo/Desktop/advantage-forge/assets/`. The shared skeleton and the base avatar are in
`/home/daniebo/Desktop/advantage-forge/assets/avatar-base.ts` (see `docs/avatar-system.md`, section 3).
No separate Chibi Quest cast list with story names exists in the files I read. The Sprouts names below
are working names. Storytime will confirm them.

Age-5 note for every character: keep the skeleton and bone names of the source hero. Change only the
proportions to age 5 (larger head, shorter limbs). Keep the colours and the silhouette.

| # | Sprouts name (working) | Chibi Quest origin and source path | Role in the program | First week |
|---|---|---|---|---|
| 1 | Sprout Adventurer | adventurer (P0), `advantage-forge/assets/adventurer.ts` | Host of the program. Says "Hello, I am ___". Leads every song. | 1 |
| 2 | Sprout Wizard | wizard (P0), `advantage-forge/assets/wizard.ts` | Counts numbers. Asks "Is it a ___?". | 2 |
| 3 | Sprout Druid | druid (P0), `advantage-forge/assets/druid.ts` | Keeps the class garden. Shows colours. Pet helper. | 3 |
| 4 | Sprout Knight | knight (P0), `advantage-forge/assets/knight.ts` | Family and body-and-face helper. Carries no shield. | 4 |
| 5 | Pip the puppy | No Chibi Quest origin. The mascot is named in `design.md` section 6.1 and decision S7 (the Pip world). Model base: `advantage-forge/assets/dog.ts`. | Mascot and pet. Appears from week 6. | 6 |

Release 1 uses these 5 only. The Cleric, Archer, and Rogue come with the app (post-release), so the
window holds 4 new age-5 bases plus the puppy. Weeks 5 to 7 reuse the four Sprouts.
Rules: Draw every hero without weapons or armour that look like combat gear. Use plain clothes from
the avatar base (`undershirt`, `pants`, `shoes`). Keep one colour preset per hero. Draw all faces
race-unmarked (`design.md` section 6.5).

## 3. The 24 gesture poses

`design.md` section 6.3 fixes a set of 24 named gestures. Gestures 1 to 10 come from that text; Storytime named 11 to 24 on 2026-10-22. The video shows a Sprout doing each gesture.

| # | Name | Description |
|---|---|---|
| 1 | clap | Hands meet in front of the chest. |
| 2 | stamp | One foot hits the ground. |
| 3 | point up | One arm points up. |
| 4 | point to self | One hand points to the chest. |
| 5 | wave | One hand waves at head height. |
| 6 | reach | Both arms reach forward. |
| 7 | hop | Both feet leave the ground. |
| 8 | turn | The body turns one full circle. |
| 9 | sway | The body moves left and right. |
| 10 | hands on head | Both hands rest on the head. |
| 11 | stretch up | Both arms stretch up on tiptoe. |
| 12 | crouch | Knees bend, hands on knees. |
| 13 | nod | The head nods yes twice. |
| 14 | shake head | The head shakes no twice. |
| 15 | count fingers | One hand counts on the fingers of the other. |
| 16 | point forward | One arm points forward. |
| 17 | hands out | Both palms open at the sides (where? question). |
| 18 | hug self | Both arms wrap the chest (I like, I have). |
| 19 | march | Knees lift in turn on the spot. |
| 20 | sleep | Head rests on both hands, eyes closed. |
| 21 | eat | One hand moves to the mouth. |
| 22 | look | One hand shades the eyes (I can see). |
| 23 | listen | One hand cups an ear. |
| 24 | bow | A short bow with one hand on the chest (song end). |

## 4. Scenes and props, Level 2 weeks 1 to 8

Source: `design.md` section 2, Level 2 rows for weeks 1 to 8. Section 10.1 says the map has 28
places, one for each week. It names none. The place names below are working names. Props follow
the frame and the family words. The song lyrics are not written yet. Storytime will send the lyric
sheets and may remove props. Each song has 6 props or less.

| Wk | Phonics element | Theme | Song topic | Scene (one place) | Props |
|---|---|---|---|---|---|
| 1 | RAZ 1: n | Names and greetings | 'Hello, I am ___' | Village gate | name tag, welcome sign, flower, lantern, bench |
| 2 | RAZ 2: short a | Numbers 1-10 | 'How many? One, two' | Apple orchard | apple, basket, star, acorn, ladder, bucket |
| 3 | RAZ 3: p | Colours | 'It is ___ (colour)' | Paint barn | paint pot (red, blue, yellow, green), brush, easel |
| 4 | RAZ 4: m | Family | 'This is my ___' | Cottage porch | photo frame, chair, cup, bed, hat |
| 5 | RAZ 5: s | Body and face | 'I have two ___' | Mirror pond | mirror, hat, glasses, scarf, boots |
| 6 | RAZ 6: t | Animals (pets) | 'I can see a ___' | Pet meadow | cat, rabbit, bird, fish bowl, pet bed, ball |
| 7 | RAZ 7: short o | Toys | 'Is it a ___? Yes/No' | Toy shed | toy box, ball, doll, drum, toy car, kite |
| 8 | REVIEW WEEK | Review | Review song medley | Class garden | reuse props from weeks 1 to 7; no new props |

Note for week 8: the table has no phonics element or theme. The scene is the class garden
(`design.md` section 10.1). The medley reuses the seven scenes as small insets.

## 5. Output per item

| Item | Deliverable |
|---|---|
| Cast (5 characters in release 1) | One 3D model (GLB). Transparent PNG renders: front, three-quarter, side. Each PNG is 2048 px. |
| Poses (24 gestures) | One animation clip per pose on the age-5 base skeleton. One transparent PNG of the key frame per pose. |
| Scenes (8 scenes) | One 16:9 background per scene at 1920x1080. |
| Props | One transparent render per prop. |
| Book-cover support | Transparent renders only. No layout. No text. |

Name files by item and number, for example `cast/01-adventurer/front.png`. Storytime does not set
a naming rule beyond that. Forge may keep its own pack layout (`advantage-forge/docs/pack-layout.md`).

## 6. Who renders and edits the song videos

Workbooks renders and edits the song videos. It uses the clips, scenes, and props from Forge.
This follows the 2026-10-07 rule: word, scene, and story pictures are Workbooks work. Forge
delivers assets only. Forge does not render a song video.

## 7. Order of work

1. The age-5 base (`avatar-base` at age-5 proportions) and its skeleton check.
2. The cast, in order of first use: Adventurer, Wizard, Druid, Knight, Pip.
3. The 24 gesture poses. Start with the 10 named poses.
4. The 8 scenes and their props, in week order.

Machine limit: run one textured build at a time under `heavy.lock`. Tell the monorepo session
before a heavy job.

## 8. Open points for Daniel

| Point | Question | Note |
|---|---|---|
| S18 | Forge priority and cost for this art. | On the live approval page and in `decisions.md`; open. |
| S19 | Book covers. | On the live approval page and in `decisions.md`; open. Recommendation: Workbooks does layout and text; Forge gives transparent renders. |
| S15 | Band names Seed, Sprout, Leaf, Bud, Flower. | Open. Covers use these names if Daniel agrees. |
