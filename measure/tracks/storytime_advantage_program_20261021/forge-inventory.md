# Song video asset inventory, Level 2 weeks 1 to 7

Status: v1, 2026-10-22, from Workbooks packages w01 to w07 (week 7 provisional until its new song). Owner: Storytime track. Forge builds from this list; Workbooks composites.

## 0. What Forge delivers for the videos (decision with Daniel, 2026-10-22)

The videos are cut-out animation built by a script (Remotion at Workbooks) from the line data and the word times. Forge delivers transparent PNG renders, no animation clips:

| Asset class | Renders | Count |
|---|---|---|
| Cast | front and three-quarter, at age 5; one design per name held across all weeks | 13 characters (section 2) |
| Gesture key frames (one Sprout does the gesture in an inset) | "moving" gestures: 2 key frames (apart and together, left and right, up and down); "hold": 1; "whole body": 1 (the compositor moves the sprite) | 20 gestures used so far, about 28 renders (section 3) |
| Scenes | one 16:9 background each | section 4 |
| Props and animals | one render each, the colour and state the prompt fixes; a mouth-open second render for the animals is optional | 30 items (section 5) |

Rules: no letters, words, or numbers inside any render; the compositor adds speech bubbles and karaoke text. Items that differ between weeks (ducks yellow in W2 and white in W6; birds blue in W2 and yellow in W6; one kite and two kites) are separate renders.

Source: `/home/daniebo/Desktop/Workbooks/content/storytime/l2/w01.json` to `w07.json`. Week 7 is **provisional** (its song lines are about to be replaced).

Convention: `imageOf` in the JSON is a **0-based** index into `song.lines`. The tables below convert it to 1-based line numbers. Proof: W1 line 8 has imageOf 6 and the same text as line 7; W5 line 3 has imageOf 0 and reuses line 1.

Lines with `imageOf` have no `image` object of their own. Their Characters, Scene and Props columns show the reused line.

## 1. Per line

| Week | Line no. | Text | Gesture | Characters (image.characters) | Scene / setting | Props and animals | Reuses line (imageOf) |
|---|---|---|---|---|---|---|---|
| 1 | 1 | Hello, hello, I am Pip | point to self | Pip | not named | - | - |
| 1 | 2 | Hello, hello, I am Nan | point to self | (empty) | not named | - | - |
| 1 | 3 | Wave your hand and say it too | wave | (empty) | rug | rug | - |
| 1 | 4 | Hello, I am you | point forward | (empty) | not named | - | - |
| 1 | 5 | Hello, I am Pip (Hello, I am Pip!) | clap | Pip | not named | - | - |
| 1 | 6 | Hello, I am Nan (Hello, I am Nan!) | clap | (empty) | not named | - | - |
| 1 | 7 | Hello, who are you? (Hello, who are you?) | hands out | (empty) | not named | - | - |
| 1 | 8 | Hello, who are you? | hands out | (none; reuses line 7: empty) | as line 7 | as line 7 | line 7 |
| 1 | 9 | Point to me, I am Pip | point to self | Pip | not named | - | - |
| 1 | 10 | Point to you, you are Nan | point forward | Pip | not named | - | - |
| 1 | 11 | Nod your head and say it too | nod | (empty) | not named | - | - |
| 1 | 12 | Hello, I am you | point forward | (none; reuses line 4: empty) | as line 4 | as line 4 | line 4 |
| 1 | 13 | Hello, I am Pip (Hello, I am Pip!) | clap | (none; reuses line 5: Pip) | as line 5 | as line 5 | line 5 |
| 1 | 14 | Hello, I am Nan (Hello, I am Nan!) | clap | (none; reuses line 6: empty) | as line 6 | as line 6 | line 6 |
| 1 | 15 | Hello, who are you? (Hello, who are you?) | hands out | (none; reuses line 7: empty) | as line 7 | as line 7 | line 7 |
| 2 | 1 | How many suns? One sun! | point up | (empty) | blue sky | sun | - |
| 2 | 2 | How many kites? Two kites! | reach | (empty) | blue sky | kite | - |
| 2 | 3 | How many? How many? One, two, three! | count fingers | Pat, May, Sam | rug | rug, apple | - |
| 2 | 4 | Red, red apples! Count with me! | clap | Pip | not named | apple | - |
| 2 | 5 | How many ducks? Three ducks! | sway | (empty) | not named | duck | - |
| 2 | 6 | How many birds? Four birds! | look | (empty) | branch | bird, branch | - |
| 2 | 7 | How many? How many? One, two, three! | count fingers | (none; reuses line 3: Pat, May, Sam) | as line 3 | as line 3 | line 3 |
| 2 | 8 | Red, red apples! Count with me! | clap | (none; reuses line 4: Pip) | as line 4 | as line 4 | line 4 |
| 2 | 9 | How many balls? Five balls! | hop | (empty) | green grass | ball | - |
| 2 | 10 | How many friends? Six friends! (How many friends? Six friends!) | wave | Pat, May, Sam, Mia, Ben | not named | - | - |
| 2 | 11 | How many? How many? One, two, three! | count fingers | (none; reuses line 3: Pat, May, Sam) | as line 3 | as line 3 | line 3 |
| 2 | 12 | Red, red apples! Count with me! | clap | (none; reuses line 4: Pip) | as line 4 | as line 4 | line 4 |
| 3 | 1 | Look at the apple. It is red! | point forward | (empty) | not named | apple | - |
| 3 | 2 | Look at the sky. It is blue! | point up | (empty) | blue sky | cloud | - |
| 3 | 3 | Paint, paint, paint! What color is it? | hands out | Pat, May, Sam | not named | paintbrush | - |
| 3 | 4 | It is red! It is blue! It is yellow, too! | count fingers | (empty) | not named | paint splash | - |
| 3 | 5 | Look at the sun. It is yellow! | stretch up | (empty) | not named | sun | - |
| 3 | 6 | Look at the tree. It is green! | sway | (empty) | not named | tree | - |
| 3 | 7 | Paint, paint, paint! What color is it? | hands out | (none; reuses line 3: Pat, May, Sam) | as line 3 | as line 3 | line 3 |
| 3 | 8 | It is red! It is blue! It is yellow, too! | count fingers | (none; reuses line 4: empty) | as line 4 | as line 4 | line 4 |
| 3 | 9 | Look at the grape. It is purple! | eat | (empty) | not named | grape | - |
| 3 | 10 | Look at the flower. It is pink! | reach | (empty) | not named | flower | - |
| 3 | 11 | Paint, paint, paint! What color is it? | hands out | (none; reuses line 3: Pat, May, Sam) | as line 3 | as line 3 | line 3 |
| 3 | 12 | It is red! It is blue! It is yellow, too! | count fingers | (none; reuses line 4: empty) | as line 4 | as line 4 | line 4 |
| 4 | 1 | This is my mom. Hello, Mom! | wave | Lily, Mom | not named | - | - |
| 4 | 2 | This is my dad. Hello, Dad! | point forward | Lily, Dad | not named | - | - |
| 4 | 3 | Mom, Dad, my family! | hug self | Lily | not named | - | - |
| 4 | 4 | This is my family, my family and me! | point to self | Mom, Dad, Grandma, Grandpa, Tom, Lily | not named | - | - |
| 4 | 5 | This is my sister. Hello! | point forward | Tom, Lily | not named | - | - |
| 4 | 6 | This is my brother. Hello! | clap | Lily, Tom | not named | - | - |
| 4 | 7 | Mom, Dad, my family! | hug self | (none; reuses line 3: Lily) | as line 3 | as line 3 | line 3 |
| 4 | 8 | This is my family, my family and me! | point to self | (none; reuses line 4: Mom, Dad, Grandma, Grandpa, Tom, Lily) | as line 4 | as line 4 | line 4 |
| 4 | 9 | This is my grandma. Hello! | bow | Lily, Grandma | not named | - | - |
| 4 | 10 | This is my grandpa. Hello! | wave | Grandpa, Lily | not named | - | - |
| 4 | 11 | Mom, Dad, my family! | hug self | (none; reuses line 3: Lily) | as line 3 | as line 3 | line 3 |
| 4 | 12 | This is my family, my family and me! | point to self | (none; reuses line 4: Mom, Dad, Grandma, Grandpa, Tom, Lily) | as line 4 | as line 4 | line 4 |
| 4 | 13 | Mom, Dad, my family! | hug self | (none; reuses line 3: Lily) | as line 3 | as line 3 | line 3 |
| 4 | 14 | This is my family, my family and me! | point to self | (none; reuses line 4: Mom, Dad, Grandma, Grandpa, Tom, Lily) | as line 4 | as line 4 | line 4 |
| 5 | 1 | I have two eyes. Look, look, look! | look | Sam | not named | - | - |
| 5 | 2 | I have two ears. Listen, listen! | listen | Sam | not named | - | - |
| 5 | 3 | I have two eyes. Look, look, look! | look | (none; reuses line 1: Sam) | as line 1 | as line 1 | line 1 |
| 5 | 4 | I have two ears. Listen, listen! | listen | (none; reuses line 2: Sam) | as line 2 | as line 2 | line 2 |
| 5 | 5 | Sam, Sam, Sam! Look at me! | point to self | Sam | not named | - | - |
| 5 | 6 | I have two hands and I have two feet! | clap | Sam | not named | - | - |
| 5 | 7 | I have two hands. Clap, clap, clap! | clap | Sam | not named | - | - |
| 5 | 8 | I have two feet. Stamp, stamp, stamp! | stamp | Sam | not named | - | - |
| 5 | 9 | Sam, Sam, Sam! Look at me! | point to self | (none; reuses line 5: Sam) | as line 5 | as line 5 | line 5 |
| 5 | 10 | I have two hands and I have two feet! | clap | (none; reuses line 6: Sam) | as line 6 | as line 6 | line 6 |
| 5 | 11 | I have two arms. Reach up high! | reach | Sam | not named | - | - |
| 5 | 12 | I have two legs. Hop, hop, hop! | hop | Sam | grass | - | - |
| 5 | 13 | Sam, Sam, Sam! Look at me! | point to self | (none; reuses line 5: Sam) | as line 5 | as line 5 | line 5 |
| 5 | 14 | I have two hands and I have two feet! | clap | (none; reuses line 6: Sam) | as line 6 | as line 6 | line 6 |
| 5 | 15 | Sam, Sam, Sam! Look at me! | point to self | (none; reuses line 5: Sam) | as line 5 | as line 5 | line 5 |
| 5 | 16 | I have two hands and I have two feet! | clap | (none; reuses line 6: Sam) | as line 6 | as line 6 | line 6 |
| 6 | 1 | I can see a cat. Meow, meow! | point forward | (empty) | fence | cat, fence | - |
| 6 | 2 | I can see a dog. Woof, woof! | look | (empty) | green grass | dog | - |
| 6 | 3 | Tap, tap, tap! Look and see! | clap | Mia, Ben, May | sunny meadow (grass) | - | - |
| 6 | 4 | What can you see? I can see an animal! (What can you see? I can see an animal!) | look | Mia | sunny meadow | cat, duck, frog | - |
| 6 | 5 | I can see a bird. Tweet, tweet! | stretch up | (empty) | low tree branch | bird, tree, branch | - |
| 6 | 6 | I can see a fish. Swim, swim! | sway | (empty) | clear blue water | fish | - |
| 6 | 7 | Tap, tap, tap! Look and see! | clap | (none; reuses line 3: Mia, Ben, May) | as line 3 | as line 3 | line 3 |
| 6 | 8 | What can you see? I can see an animal! (What can you see? I can see an animal!) | look | (none; reuses line 4: Mia) | as line 4 | as line 4 | line 4 |
| 6 | 9 | I can see a frog. Hop, hop! | hop | (empty) | lily pad | frog, lily pad | - |
| 6 | 10 | I can see a duck. Quack, quack! | march | (empty) | grass by a pond | duck, pond | - |
| 6 | 11 | Tap, tap, tap! Look and see! | clap | (none; reuses line 3: Mia, Ben, May) | as line 3 | as line 3 | line 3 |
| 6 | 12 | What can you see? I can see an animal! | look | (none; reuses line 4: Mia) | as line 4 | as line 4 | line 4 |
| 7 (provisional) | 1 | Is it a ball? No, no, no! | hop | (empty) | bright playroom, wooden floor | ball, toy box | - |
| 7 | 2 | Is it a doll? No, no, no! | hug self | (empty) | bright playroom, wooden floor | doll | - |
| 7 | 3 | Sway, sway, octopus! What is in the box? | sway | May, Ben | bright playroom | octopus, toy box | - |
| 7 | 4 | Is it a toy? Yes, yes, yes! | nod | May, Ben | bright playroom | toy box, toys | - |
| 7 | 5 | Is it a car? No, no, no! | turn | (empty) | bright playroom, wooden floor | toy car | - |
| 7 | 6 | Is it a kite? No, no, no! | reach | (empty) | blue sky over green park | kite | - |
| 7 | 7 | Sway, sway, octopus! What is in the box? | sway | (none; reuses line 3: May, Ben) | as line 3 | as line 3 | line 3 |
| 7 | 8 | Is it a toy? Yes, yes, yes! | nod | (none; reuses line 4: May, Ben) | as line 4 | as line 4 | line 4 |
| 7 | 9 | Is it a drum? No, no, no! | stamp | (empty) | bright playroom, wooden floor | toy drum, drumstick | - |
| 7 | 10 | Is it a train? No, no, no! | march | (empty) | bright playroom, wooden floor | toy train, track | - |
| 7 | 11 | Sway, sway, octopus! What is in the box? | sway | (none; reuses line 3: May, Ben) | as line 3 | as line 3 | line 3 |
| 7 | 12 | Is it a toy? Yes, yes, yes! | nod | (none; reuses line 4: May, Ben) | as line 4 | as line 4 | line 4 |
| 7 | 13 | Sway, sway, octopus! What is in the box? | sway | (none; reuses line 3: May, Ben) | as line 3 | as line 3 | line 3 |
| 7 | 14 | Is it a toy? Yes, yes, yes! | nod | (none; reuses line 4: May, Ben) | as line 4 | as line 4 | line 4 |

Where Scene says "not named", the prompt names no setting. Props listed are the drawn assets named in the prompt. Pip's collar and tag, and Nan's clothes, belong to the Cast descriptions.

## 2. Cast

Line counts include reuse lines (a reuse line counts for the character of the line it copies).

| Character | Weeks and line count | Physical description in the prompts |
|---|---|---|
| Pip | W1: 5; W2: 3 (total 8) | a small puppy with golden-brown fur, a cream chest, a cream muzzle, a cream stripe on his forehead, floppy ears with darker tips, large dark-brown eyes, a black nose, a fluffy tail, and a red collar with a small round gold tag |
| Nan | W1: 5; W2: 1 (total 6) | a five-year-old girl with large dark-brown eyes, short black hair in two small bunches, an orange T-shirt with a white star, red shorts, and white sneakers |
| Pat | W2: 4; W3: 3 (total 7) | No look described; age only (about five) |
| May | W2: 4; W3: 3; W6: 3; W7: 8 (total 18) | No look described; age only (about five) |
| Sam | W2: 4; W3: 3; W5: 16 (total 23) | No look described; age only (about five) |
| Mia | W2: 1; W6: 6 (total 7) | No look described; age only (about five) |
| Ben | W2: 1; W6: 3; W7: 8 (total 12) | No look described; age only (about five) |
| Lily | W4: 14 (total 14) | No look described; age only (about five) |
| Mom | W4: 5 (total 5) | No look or age described |
| Dad | W4: 5 (total 5) | No look or age described |
| Grandma | W4: 5 (total 5) | No look or age described |
| Grandpa | W4: 5 (total 5) | No look or age described |
| Tom | W4: 6 (total 6) | No look described; age only (about eight) |

Age phrases in prompts: "(drawn young, about five years old)" for Pat, May, Sam, Mia, Ben, Lily; "(drawn young, about eight years old)" for Tom. Mom, Dad, Grandma, Grandpa: no age or look given. "A class of children (drawn young, about five years old)" appears unnamed in W1 lines 3 and 11.

## 3. Gestures

| Gesture | Lines | Weeks | Type | In the 24-list |
|---|---|---|---|---|
| clap | 16 | W1 (4), W2 (3), W4 (1), W5 (5), W6 (3) | moving | yes |
| point to self | 11 | W1 (3), W4 (4), W5 (4) | hold [my judgement, not in the given lists] | yes |
| point forward | 7 | W1 (3), W3 (1), W4 (2), W6 (1) | hold [my judgement, not in the given lists] | yes |
| sway | 7 | W2 (1), W3 (1), W6 (1), W7 (4) | whole body | yes |
| look | 7 | W2 (1), W5 (2), W6 (4) | hold [my judgement, not in the given lists] | yes |
| hands out | 6 | W1 (3), W3 (3) | hold [my judgement, not in the given lists] | yes |
| count fingers | 6 | W2 (3), W3 (3) | moving | yes |
| nod | 5 | W1 (1), W7 (4) | moving | yes |
| hug self | 5 | W4 (4), W7 (1) | hold [my judgement, not in the given lists] | yes |
| wave | 4 | W1 (1), W2 (1), W4 (2) | moving | yes |
| reach | 4 | W2 (1), W3 (1), W5 (1), W7 (1) | hold [my judgement, not in the given lists] | yes |
| hop | 4 | W2 (1), W5 (1), W6 (1), W7 (1) | whole body (hop is in both lists; spec lists hop as moving and whole body; treat as whole body, compositor bounces the sprite) | yes |
| point up | 2 | W2 (1), W3 (1) | hold [my judgement, not in the given lists] | yes |
| stretch up | 2 | W3 (1), W6 (1) | hold [my judgement, not in the given lists] | yes |
| listen | 2 | W5 (2) | hold [my judgement, not in the given lists] | yes |
| stamp | 2 | W5 (1), W7 (1) | moving | yes |
| march | 2 | W6 (1), W7 (1) | moving | yes |
| eat | 1 | W3 (1) | moving | yes |
| bow | 1 | W4 (1) | hold (judgement: single bowed pose; could be moving if Forge wants a dip) [my judgement, not in the given lists] | yes |
| turn | 1 | W7 (1) | whole body | yes |

Gestures in the 24-list that no line in W1-W7 uses: hands on head, crouch, shake head, sleep.
No gesture name outside the 24-list occurs.

Hop: your brief lists hop under both "moving" and "whole body". The table treats it as whole body.

## 4. Scenes

| Week | Distinct settings named in the prompts |
|---|---|
| 1 | rug |
| 2 | blue sky; rug; branch; green grass |
| 3 | blue sky |
| 4 | none named |
| 5 | grass |
| 6 | fence; green grass; sunny meadow (grass); sunny meadow; low tree branch; clear blue water; lily pad; grass by a pond |
| 7 (provisional) | bright playroom, wooden floor; bright playroom; blue sky over green park |

W4 and W5 (except line 12) name no setting at all.

## 5. Props and animals

Lines = lines that show the item, counting reuse lines (own-prompt lines in brackets).

| Item | Weeks | Lines | Detail the prompt fixes |
|---|---|---|---|
| apple | 2, 3 | 7 (3) | W2: one red apple held by each of three children (line 3); pile of red apples (line 4). W3: one big shiny red apple |
| ball | 2, 7 | 2 (2) | W2: five colorful balls in a row, bouncing on green grass. W7: one red-and-yellow ball bouncing |
| bird | 2, 6 | 2 (2) | W2: four small blue birds in a row on a branch. W6: small yellow bird on a branch, beak open |
| branch | 2, 6 | 2 (2) | W2: bird branch. W6: branch of a low tree |
| cat | 6 | 4 (2) | gray; W6 line 1 sits on a wooden fence, mouth wide open; line 4 in meadow |
| cloud | 3 | 1 (1) | one small white cloud |
| dog | 6 | 1 (1) | brown; runs on green grass, mouth open, tail up |
| doll | 7 | 1 (1) | small, yellow yarn hair, red dress, sits on wooden floor |
| drumstick | 7 | 1 (1) | two, with the red toy drum |
| duck | 2, 6 | 5 (3) | W2: three yellow ducks walking in a row. W6: white duck (line 4 with gray cat and green frog; line 10 on grass by a pond) |
| fence | 6 | 1 (1) | wooden |
| fish | 6 | 1 (1) | orange; swims in clear blue water |
| flower | 3 | 1 (1) | one big pink flower |
| frog | 6 | 4 (2) | green; W6 line 4 in meadow; line 9 hops from a lily pad |
| grape | 3 | 1 (1) | a bunch, purple |
| kite | 2, 7 | 2 (2) | W2: two kites, one red and one yellow, high in sky. W7: one red-and-yellow kite, flies high over green park |
| lily pad | 6 | 1 (1) | frog hops from it |
| octopus | 7 | 4 (1) | friendly, purple, sways its arms |
| paint splash | 3 | 3 (1) | three big round splashes in a row: red, blue, yellow |
| paintbrush | 3 | 3 (1) | held by children; pink and purple paint |
| pond | 6 | 1 (1) | white duck walks on grass by it |
| rug | 1, 2 | 4 (2) | W1 line 3 and W2 line 3: children sit/wave on a rug (no colour fixed) |
| sun | 2, 3 | 2 (2) | W2: one, big, bright, blue sky, happy face. W3: big, bright, yellow, happy face |
| toy box | 7 | 9 (3) | big; closed in lines 1 and 3, open and full of toys in line 4 |
| toy car | 7 | 1 (1) | small, blue, rolls on wooden floor |
| toy drum | 7 | 1 (1) | small, red |
| toy train | 7 | 1 (1) | small, green, three cars, on a round track |
| toys | 7 | 4 (1) | filling the open toy box (line 4); not itemised |
| track | 7 | 1 (1) | round, on wooden floor |
| tree | 3, 6 | 2 (2) | W3: one big green tree, round top. W6: low tree |

Scenery not counted as props: sky, grass, water, wooden floor, meadow, playroom, park.

## 6. Notes

**Structure**
- `imageOf` is 0-based. A reader who counts from 1 resolves every reference to the wrong line.
- Reuse lines (no image of their own): W1 8, 12, 13, 14, 15; W2 7, 8, 11, 12; W3 7, 8, 11, 12; W4 7, 8, 11, 12, 13, 14; W5 3, 4, 9, 10, 13, 14, 15, 16; W6 7, 8, 11, 12; W7 7, 8, 11, 12, 13, 14. No line lacks both an image and an imageOf.
- W7 has no `song.audio` key. W1 to W6 have it.
- `choreography` has only an `outro` (en, th) in every week. It adds no line-level gesture and no asset.

**Characters**
- `image.characters` is empty on W1 lines 2, 3, 4, 5, 6, 7, 11 and on all non-person lines. Nan is never in `image.characters` in any week, although she is the subject of W1 lines 2, 4, 6, 7 and appears in W1 line 10 and W2 line 10.
- Prompt names a character that is not in `image.characters`: W1 line 2 (Nan), 4 (Nan), 6 (Nan), 7 (Nan), 10 (Nan); W2 line 10 (Nan).
- W1 lines 3 and 11 draw "a class of children" with no named child.
- Pat, May, Sam, Mia, Ben, Lily, Tom, Mom, Dad, Grandma, Grandpa have no physical description in any prompt (only age for the children). Forge must invent one design for each and keep it across weeks. Pip and Nan are the only fully described characters.
- Pip and Nan descriptions are word-for-word identical every time they appear (checked). No character is described two different ways.
- Same name, different roles: Sam appears as one of three singers in W2 and W5 (alone, male "his"); May and Ben are in W7 with the octopus.
- Mom, Dad, Grandma, Grandpa, Tom appear only in W4. Tom's age (about eight) differs from the other children (about five).

**Props and species**
- Duck is yellow (three ducks in a row) in W2 and white in W6. Bird is blue (four) in W2 and yellow in W6. These are different drawings, not a conflict, but Forge should not reuse one asset.
- Kite: W2 has two kites (red, yellow); W7 has one red-and-yellow kite. Ball: W2 "colorful"; W7 "red-and-yellow". Sun: W2 colour not fixed; W3 yellow.
- W2 line 3 gives each of three children one red apple but the gesture is `count fingers`. W2 line 4 draws "a pile of red apples" beside Pip.
- W6 line 4 needs three animals in one picture: gray cat, white duck, green frog (must match lines 1, 10, 9).
- W7 line 4 needs a toy box "full of toys" with no toy listed. Forge must choose the contents; they must not duplicate the named toys in lines 1, 2, 5, 9, 10 unless wanted.
- W7 line 3 octopus is a purple octopus that appears only in the box song.
- Count check: W2 "Six friends" = Pat, May, Sam, Mia, Ben + Nan = 6, correct. "Four birds", "Three ducks", "Five balls", "Two kites" all match the prompt counts. W7 train has three cars.

**Gesture and prompt mismatches (prompt shows a different action)**
- W2 line 3: gesture `count fingers`; prompt: children each hold up an apple.
- W2 line 6: `look`; prompt: four birds on a branch (no looker).
- W3 line 5: `stretch up`; prompt: a sun only. W3 line 6: `sway`; prompt: a tree only. W3 line 9: `eat`; prompt: a bunch of grapes only. W3 line 10: `reach`; prompt: one pink flower only. W3 line 1: `point forward`; prompt: an apple only.
- W4 line 10: gesture `wave`; prompt: Grandpa "nods and smiles". Lily is in the prompt text but not drawn as waving.
- W4 line 4: `point to self`; prompt: six people stand and smile (no pointing).
- W5 line 6: gesture `clap`; prompt: Sam holds up his hands and stands on his feet (no clap).
- W6 line 1 `point forward`, line 2 `look`, line 5 `stretch up`, line 6 `sway`, line 10 `march`: prompts show animals, not a person doing the gesture.
- W7 line 2 `hug self`: prompt shows a doll. Line 5 `turn`: a toy car. Line 6 `reach`: a kite. Line 9 `stamp`: a drum. Line 10 `march`: a train. Where the image is an object or animal, the gesture must come from a child sprite or the compositor, not from the picture.
- No gesture name outside the 24-list occurs.

- W1 line 8 and line 15 both reuse line 7 (same picture as line 7).

## Totals

- Lines: 95 (own image 58, reuse via imageOf 37). W7 provisional: 14 lines.
- Distinct characters in image.characters or named in prompts: 13 (Pip, Nan, Pat, May, Sam, Mia, Ben, Lily, Mom, Dad, Grandma, Grandpa, Tom). Listed in image.characters: 12.
- Distinct gestures: 20 (all in the 24-list).
- Distinct props and animals: 30.
