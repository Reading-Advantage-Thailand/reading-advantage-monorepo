# Storytime Advantage — Program Design

**Date:** 2026-10-21. **Status:** design input for the Measure track `storytime_advantage_program_20261021`. No code, no public date.
**Product:** an English program for Anuban 2 to P2 with a reading emphasis: scripted lessons, a printed student book per level, teacher card kits, a weekly read-along book and song, a decodable book per phonics element, and a digital twin (Chibi Sprouts) inside the shared platform.
**Fixed inputs (Daniel, 2026-10-21):** four levels; 32 weeks a level (28 teaching, 4 review and check); 5 periods a week; 30-minute periods in Anuban, 49 in primary; five daily scripts printed in full; Mastery Advantage review printed into the daily deck; weekly read-along book and song with video, choreography, and karaoke; decodable per element; leveled readers in parallel; writing from tracing to frame sentences; benchmarks, reading records, scripted speaking assessment; Vocabulary in Use families and Cambridge Starters as the word axis; Chibi Sprouts theme; fun first, rigour underneath; American pronunciation; CEFR only in customer copy.

## Contents

1. Exit profile and backward plan
2. Scope and sequence, 128 weeks
3. The five daily scripts
4. The review deck
5. Phonics graph design
6. Content production spec
7. Assessment system
8. Teacher kit and training
9. Home layer
10. Digital twin: Chibi Sprouts
11. MVP definition and path
12. Risks and open decisions
13. Sources

---

## 1. Exit profile and backward plan

### 1.1 Target: day one of Primary Origins 1 (P3)

The target comes from the Origins 1 plan and lesson 1 (Workbooks, 2026-10-21). Origins 1 has no entry test. Its text gate is 95 percent Cambridge Starters words. Lesson 1 glosses 12 words and uses 63 words it does not teach. Storytime delivers those 63 words and the habits around them.

**Decoding scope at the end of P2.** The child decodes, without help, a one-syllable word of each pattern below, and a two-syllable compound of two known parts.

| Pattern | Examples | Taught in |
|---|---|---|
| CVC with short a, o, e, i, u | nap, pot, pen, pig, bug | Level 2 |
| Word families (-an -ad -ot -op -et -en -it -in -ug -un -at -ap -ut -ub -ill -ip -ob -ell) | man, hop, ten, pin, run, cap, nut, hill, bell | Level 2 |
| Initial blends s, r, l; final blends -nd -nt -nk -mp -lt -ft; three-letter blends | stop, frog, flag, sand, jump, strap | Level 3 |
| Digraphs sh, ch, ck, ng, th, wh; qu, x, z | ship, chop, duck, ring, thin, when, quit, box, zip | Level 2 and 3 |
| Magic e: a_e, o_e, i_e, u_e | cake, home, bike, cube | Level 3 |
| Open vowels; long-vowel teams ee ea ie ai ay oa oe ow igh | go, tree, rain, boat, night | Level 4 |
| oo (two sounds), ue, ew, aw, au | moon, book, blue, saw | Level 4 |
| Diphthongs oi oy ou ow | coin, toy, out, cow | Level 4 |
| r-controlled ar or er ir ur air ear | car, for, her, bird, hair | Level 4 |
| Endings -s -es -ing -ed | cats, boxes, running, jumped | Level 4 |

**Function and high-frequency words.** The list is the union of (a) the 63 words Origins 1 lesson 1 uses without teaching, (b) the Little Wandle tricky-word progression for Reception and Year 1, and (c) the Reading A-Z high-frequency words attached to elements 1 to 68 (Daniel's spreadsheet). After removal of words that are decodable by the end of Level 3, the sight list is 92 words (48 in Level 2, 36 in Level 3, 8 in Level 4, plus the Origins dialogue words taught as reading words in the exit weeks). The child reads all 92 at sight speed (under one second a word). The full list and its level split are in section 2 (the Tricky and HF column) and in appendix table 1.1a below.

Appendix table 1.1a, the 92 words by level:

| Level | Words |
|---|---|
| 2 (28) | a, and, can, I, on, in, the, get, is, this, off, saw, with, cannot, he, put, see, from, run, up, are, has, they, too, were, me, of, goes |
| 2 (cont., 20) | it, said, that, do, for, like, you, his, no, my, she, will, her, look, eat, stop, them, we, go, play |
| 3 (36) | into, went, make, one, never, seen, as, where, help, made, be, who, then, how, new, there, give, live, come, think, why, could, don't, so, by, your, every, day, our, always, find, about, people, what, (plus take, over) |
| 4 (8 sight + the Origins dialogue words) | says, comes, asks, looks, loves, am, are, yes, to, do, does, or, old, say, how, color, white, red, blue, children, school, teacher, draw, write, sit (most are decodable by Level 4 and are taught as reading words); names Lily, Tom, Mia, Pip |

Words that Origins 1 uses and that are decodable by Level 3 (him, at, yes, big, red, sad, sit, mom, end, long, park, kitchen, old, am) are taught as decodable words, not as sight words. Words that are names (Lily, Tom, Mia, Pip) are taught in the bridge weeks.

**Oral sentence frames.** The child produces each frame with one substitution, from a picture prompt:

| Frame | Origins 1 use |
|---|---|
| This is ___. ___ is a ___. | Every Origins article opens so. |
| It is ___. / It is a small brown dog. | Description |
| I have a ___. / ___ has got a ___. | Possession |
| I can see ___. / I can ___. | Ability and observation |
| Where is ___? ___ is in the ___. | Place |
| Is it a ___? Yes, it is. / No, it isn't. | Yes-no question |
| What is his/her name? His name is ___. | Names |
| Do you like ___? Yes, I do. / No, I don't. | Preference |
| ___ says, "Hello!" / ___ asks, "___?" | Dialogue frame |
| Let's ___. / Look! | Invitation |
| How is ___? ___ is happy/sad/angry. | Feelings |
| What colour is ___? It is ___. | Colour |
| How many ___? There are ___. (to 20) | Number |

**Starters vocabulary target.** The child knows by ear and picture 300 Starters words (of about 500 on the 2018 list) across the Starters topics used in section 2. 150 of these the child also reads, because they are decodable or on the sight list. The 300 are tagged to `english.vocabulary.*` nodes in the existing CEFR vocabulary graph; Storytime adds no vocabulary nodes.

**Writing and handwriting.** The child writes lower-case and capital letters with correct start points, writes their name with a capital, copies a short sentence with spaces, completes a frame sentence from a word bank, writes three to five dictated CVC and digraph words, and ends a sentence with a full stop.

**Speaking.** The child greets, says their name and age, names objects, answers the frames above, says the 44 sounds in isolation, reads aloud a decodable sentence, and sings 100 songs from memory.

**GSE Young Learner nodes the profile covers (GSE 10 to 21).** Storytime covers all 107 nodes in the Graph session's list. The nine nodes Primary marks out of scope are Storytime's core: R10.1, R10.3, R14.2, R18.1, R21.3, L10.1, L10.3, L10.5, L16.3. Storytime also covers the four sound nodes above 21 that Primary marks out of scope: R25.6, R26.4, R29.1, R32.3. The Speaking nodes (40) and Writing nodes (15) have no Primary short id. Storytime assigns short ids `S10.1`... and `W10.1`... in its own objective key, which the Primary key can adopt later.

### 1.2 Backward plan: the exit profile of each level

| Level | Grade, age | Decoding | Sight words | Frames | Vocabulary by ear | Writing | PA |
|---|---|---|---|---|---|---|---|
| 1 | Anuban 2, 4-5 | None. Names and sounds of 26 letters by song; first sound of a picture word | None | 28 greeting, naming, and action frames by song | 80 Starters words | Pre-writing strokes; traces 10 letters; writes own name by copy | Listening, rhyme, syllables, initial sound, oral blending of 2-3 sounds |
| 2 | Anuban 3, 5-6 | CVC with all five short vowels; 18 word families; reads a 20-word decodable | 48 | 28 frames incl. This is, I have, I can see, Is it, Where is | 160 | Writes all 26 lower-case letters; dictated CVC words; copies a frame sentence | Final sound, segment and blend 3 phonemes, substitute first sound |
| 3 | P1, 6-7 | Blends, digraphs, magic e; reads a 60-word decodable | 74 | 28 frames incl. There is, Do you like, He/She can, What colour | 230 | Capitals; dictated 4-phoneme words; completes a frame sentence | Segment 4-5 phonemes; blend and split clusters; Thai contrasts |
| 4 | P2, 7-8 | Full exit scope above; reads a 100-word text with dialogue at 40 words a minute | 92 | All exit frames incl. possessive 's, says/asks, Don't | 300 | Writes two frame sentences from a picture; full stop; capital for names | Swap any sound; syllables of two-syllable words |

The hand-off is P3. A P3 class that enters without phonics runs the Primary catch-up module (section 7.8) in its first semester.

---

## 2. Scope and sequence, 128 weeks

Rules that built the table:

- Review and check weeks are weeks 8, 16, 24, and 32 of every level. They repeat the four frames and books of the block, take the benchmark, and catch up reading records.
- Level 1 teaches the letter names by the alphabet song every day and one letter sound a week in the Reading A-Z order, after two listening-only weeks. Its phonemic awareness column is the Reading A-Z 32-lesson sequence (25 teaching lessons) with the Developing Sound Sense listening module in weeks 1 to 3.
- Level 2 teaches Reading A-Z elements 1 to 28, one a week.
- Level 3 teaches elements 29 to 51 and five Thai-specific weeks: T1 final consonants after element 35; T2 initial clusters and T3 final clusters with -s after element 41; T4 the th, s, f contrast after element 50; T5 the v and w, r and l contrasts after element 51.
- Level 4 teaches elements 52 to 68 and eleven exit-profile weeks: E1 -s and -es; E2 -ing and -ed; E3 two-syllable and compound words; E4 vowel length contrast; E5 long and short vowel review; E6 and E7 fluency; E8 and E9 sentence writing; E10 and E11 the bridge to Origins 1 (read an Origins 1 text; the Pip cast and frames).
- The vocabulary family cycles through 28 Starters topics once per level, so each topic returns four times at rising depth. Where a Vocabulary in Use Elementary unit matches the topic, its unit number is given; most ViU Elementary units are adult topics (hotels, credit cards) and do not fit, so Starters is the primary axis and ViU is the secondary grouping signal for word choice.
- The song carries the frame of the week. The read-along carries the frame and the family and sits above decoding level. The decodable carries the element and sits at decoding level.
- The tricky and HF column gives the words introduced that week. Level 2 and 3 follow the Reading A-Z HF order per element (Daniel's spreadsheet); Level 4 adds the Origins 1 words.

| Level | Week | Phonics element / letters | Phonemic awareness | Tricky and HF words | Sentence frame | Vocabulary family | Song concept | Read-along concept | Decodable concept | Check |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | Listening only | Listening: start-stop, name the sound (DSS A1-A3) | (none; name writing wk 20+) | Hello! Goodbye! | Names and greetings (ViU 52) | Song: 'Hello! Goodbye!' / Names and greetings | Read-along: one word or phrase per page, Names and greetings | (none in Level 1) |  |
| 1 | 2 | Listening only | Listening: first, next, last sound (DSS A4-A6) | (none; name writing wk 20+) | My name is ___. | Numbers 1-10 (Starters) | Song: 'My name is ___' / Numbers 1-10 | Read-along: one word or phrase per page, Numbers 1-10 | (none in Level 1) |  |
| 1 | 3 | Letter n name+sound (song) | Listening: sound effects, silly songs, directions (DSS A7-A9) | (none; name writing wk 20+) | It's a ___. | Colours (Starters) | Song: 'It's a ___' / Colours | Read-along: one word or phrase per page, Colours | (none in Level 1) |  |
| 1 | 4 | Letter a name+sound (song) | Word awareness | (none; name writing wk 20+) | I am ___ (age). | Family (Starters) | Song: 'I am ___ (age)' / Family | Read-along: one word or phrase per page, Family | (none in Level 1) |  |
| 1 | 5 | Letter p name+sound (song) | Syllable counting | (none; name writing wk 20+) | This is my ___. | Body and face (Starters) | Song: 'This is my ___' / Body and face | Read-along: one word or phrase per page, Body and face | (none in Level 1) |  |
| 1 | 6 | Letter m name+sound (song) | Rhyme 1 | (none; name writing wk 20+) | Point to your ___. | Animals (pets) (ViU 31) | Song: 'Point to your ___' / Animals (pets) | Read-along: one word or phrase per page, Animals (pets) | (none in Level 1) |  |
| 1 | 7 | Letter s name+sound (song) | Rhyme 2 | (none; name writing wk 20+) | I have a ___. | Toys (Starters) | Song: 'I have a ___' / Toys | Read-along: one word or phrase per page, Toys | (none in Level 1) |  |
| 1 | 8 | REVIEW WEEK | Review | (review) | Review of the four frames | Review | Review song medley | Re-read the four books | Re-read + reading records | Benchmark 1 (PA/letter-sound) |
| 1 | 9 | Letter t name+sound (song) | Rhyme 3 | (none; name writing wk 20+) | I like ___. | Food and drink (ViU 22) | Song: 'I like ___' / Food and drink | Read-along: one word or phrase per page, Food and drink | (none in Level 1) |  |
| 1 | 10 | Letter o name+sound (song) | Initial sound; alliteration | (none; name writing wk 20+) | Stand up. Sit down. | Clothes (Starters) | Song: 'Stand up' / Clothes | Read-along: one word or phrase per page, Clothes | (none in Level 1) |  |
| 1 | 11 | Letter d name+sound (song) | Initial sound; syllable blending | (none; name writing wk 20+) | It's ___ (colour). | Home (ViU 11/13) | Song: 'It's ___ (colour)' / Home | Read-along: one word or phrase per page, Home | (none in Level 1) |  |
| 1 | 12 | Letter e name+sound (song) | Syllable deletion; blend onset-rime | (none; name writing wk 20+) | A ___, please. | School (ViU 15) | Song: 'A ___, please' / School | Read-along: one word or phrase per page, School | (none in Level 1) |  |
| 1 | 13 | Letter h name+sound (song) | Segment onset-rime | (none; name writing wk 20+) | I can ___. | Actions (verbs) (ViU 47/49) | Song: 'I can ___' / Actions (verbs) | Read-along: one word or phrase per page, Actions (verbs) | (none in Level 1) |  |
| 1 | 14 | Letter f name+sound (song) | Phoneme addition | (none; name writing wk 20+) | It's ___ (weather). | Weather (ViU 28) | Song: 'It's ___ (weather)' / Weather | Read-along: one word or phrase per page, Weather | (none in Level 1) |  |
| 1 | 15 | Letter g name+sound (song) | Phoneme deletion | (none; name writing wk 20+) | Go, go, go! | Transport (ViU 32/49) | Song: 'Go, go, go!' / Transport | Read-along: one word or phrase per page, Transport | (none in Level 1) |  |
| 1 | 16 | REVIEW WEEK | Review | (review) | Review of the four frames | Review | Review song medley | Re-read the four books | Re-read + reading records | Benchmark 2 (mid-year) |
| 1 | 17 | Letter i name+sound (song) | Rhyme; phoneme substitution | (none; name writing wk 20+) | Where is ___? Here! | Places (park, shop) (ViU 29) | Song: 'Where is ___? Here!' / Places (park, shop) | Read-along: one word or phrase per page, Places (park, shop) | (none in Level 1) |  |
| 1 | 18 | Letter b name+sound (song) | Segment onset-rime; addition | (none; name writing wk 20+) | I am happy/sad. | Feelings (ViU 7) | Song: 'I am happy/sad' / Feelings | Read-along: one word or phrase per page, Feelings | (none in Level 1) |  |
| 1 | 19 | Letter c name+sound (song) | Final sound | (none; name writing wk 20+) | Let's play! | Sports and play (ViU 23) | Song: 'Let's play!' / Sports and play | Read-along: one word or phrase per page, Sports and play | (none in Level 1) |  |
| 1 | 20 | Letter r name+sound (song) | Phoneme substitution | (none; name writing wk 20+) | Today is ___. | Time and days (ViU 51) | Song: 'Today is ___' / Time and days | Read-along: one word or phrase per page, Time and days | (none in Level 1) |  |
| 1 | 21 | Letter u name+sound (song) | Final + initial; phoneme blending | (none; name writing wk 20+) | Big ___. Small ___. | Animals (farm and zoo) (ViU 31) | Song: 'Big ___' / Animals (farm and zoo) | Read-along: one word or phrase per page, Animals (farm and zoo) | (none in Level 1) |  |
| 1 | 22 | Letter l name+sound (song) | Initial, medial, final; segment and blend | (none; name writing wk 20+) | I like ___ (fruit). | Fruit (Starters) | Song: 'I like ___ (fruit)' / Fruit | Read-along: one word or phrase per page, Fruit | (none in Level 1) |  |
| 1 | 23 | Letter w name+sound (song) | Medial vowel; segmentation | (none; name writing wk 20+) | Look! A ___. | The world around us (nature) (ViU 30) | Song: 'Look! A ___' / The world around us (nature) | Read-along: one word or phrase per page, The world around us (nature) | (none in Level 1) |  |
| 1 | 24 | REVIEW WEEK | Review | (review) | Review of the four frames | Review | Review song medley | Re-read the four books | Re-read + reading records | Benchmark 3 |
| 1 | 25 | Letter j name+sound (song) | Word awareness; syllables (pass 2) | (none; name writing wk 20+) | He/She is a ___. | Jobs (ViU 14) | Song: 'He/She is a ___' / Jobs | Read-along: one word or phrase per page, Jobs | (none in Level 1) |  |
| 1 | 26 | Letter k name+sound (song) | Rhyme; syllables (pass 2) | (none; name writing wk 20+) | I'm OK. | Health (Starters) | Song: 'I'm OK' / Health | Read-along: one word or phrase per page, Health | (none in Level 1) |  |
| 1 | 27 | Letter v name+sound (song) | Rhyme; alliteration (pass 2) | (none; name writing wk 20+) | Clap! Stamp! | Music and sounds (ViU 26) | Song: 'Clap! Stamp!' / Music and sounds | Read-along: one word or phrase per page, Music and sounds | (none in Level 1) |  |
| 1 | 28 | Letter y name+sound (song) | Blend and segment onset-rime (pass 2) | (none; name writing wk 20+) | It's a circle. | Shapes and size (Starters) | Song: 'It's a circle' / Shapes and size | Read-along: one word or phrase per page, Shapes and size | (none in Level 1) |  |
| 1 | 29 | Letter q name+sound (song) | Alliteration; initial; delete, segment, blend | (none; name writing wk 20+) | Up and down. | Opposites (ViU 56) | Song: 'Up and down' / Opposites | Read-along: one word or phrase per page, Opposites | (none in Level 1) |  |
| 1 | 30 | Letter x name+sound (song) | Final sound (pass 2) | (none; name writing wk 20+) | Happy birthday! | Birthday and parties (Starters) | Song: 'Happy birthday!' / Birthday and parties | Read-along: one word or phrase per page, Birthday and parties | (none in Level 1) |  |
| 1 | 31 | Letter z name+sound (song) | Initial, medial, final; segment, blend (capstone) | (none; name writing wk 20+) | Bye-bye, ___! | Holidays (Starters) | Song: 'Bye-bye, ___!' / Holidays | Read-along: one word or phrase per page, Holidays | (none in Level 1) |  |
| 1 | 32 | REVIEW WEEK | Review | (review) | Review of the four frames | Review | Review song medley | Re-read the four books | Re-read + reading records | Benchmark 4 (end-of-level profile) |
| 2 | 1 | RAZ 1: n | Daily 2-min: sound of the week (initial/final), blend 3 sounds | a, and, can | Hello, I am ___. | Names and greetings (ViU 52) | Song: 'Hello, I am ___' / Names and greetings | Read-along: one sentence per page, frame repeats, Names and greetings | Decodable 1: n words |  |
| 2 | 2 | RAZ 2: short a | Daily 2-min: sound of the week (initial/final), blend 3 sounds | I, on, in | How many? One, two... | Numbers 1-10 (Starters) | Song: 'How many? One, two' / Numbers 1-10 | Read-along: one sentence per page, frame repeats, Numbers 1-10 | Decodable 2: short a words |  |
| 2 | 3 | RAZ 3: p | Daily 2-min: sound of the week (initial/final), blend 3 sounds | the, get | It is ___ (colour). | Colours (Starters) | Song: 'It is ___ (colour)' / Colours | Read-along: one sentence per page, frame repeats, Colours | Decodable 3: p words |  |
| 2 | 4 | RAZ 4: m | Daily 2-min: sound of the week (initial/final), blend 3 sounds | is, this | This is my ___. | Family (Starters) | Song: 'This is my ___' / Family | Read-along: one sentence per page, frame repeats, Family | Decodable 4: m words |  |
| 2 | 5 | RAZ 5: s | Daily 2-min: sound of the week (initial/final), blend 3 sounds | off, saw, with | I have two ___. | Body and face (Starters) | Song: 'I have two ___' / Body and face | Read-along: one sentence per page, frame repeats, Body and face | Decodable 5: s words |  |
| 2 | 6 | RAZ 6: t | Daily 2-min: sound of the week (initial/final), blend 3 sounds | cannot, he, put, see | I can see a ___. | Animals (pets) (ViU 31) | Song: 'I can see a ___' / Animals (pets) | Read-along: one sentence per page, frame repeats, Animals (pets) | Decodable 6: t words |  |
| 2 | 7 | RAZ 7: short o | Daily 2-min: sound of the week (initial/final), blend 3 sounds | from, run, up | Is it a ___? Yes/No. | Toys (Starters) | Song: 'Is it a ___? Yes/No' / Toys | Read-along: one sentence per page, frame repeats, Toys | Decodable 7: short o words |  |
| 2 | 8 | REVIEW WEEK | Review | (review) | Review of the four frames | Review | Review song medley | Re-read the four books | Re-read + reading records | Benchmark 1 (PA/letter-sound) |
| 2 | 9 | RAZ 8: d | Daily 2-min: sound of the week (initial/final), blend 3 sounds | are, has | I like ___. Yum! | Food and drink (ViU 22) | Song: 'I like ___' / Food and drink | Read-along: one sentence per page, frame repeats, Food and drink | Decodable 8: d words |  |
| 2 | 10 | RAZ 9: -an -ad | Daily 2-min: sound of the week (initial/final), blend 3 sounds | they, too, were | Put on your ___. | Clothes (Starters) | Song: 'Put on your ___' / Clothes | Read-along: one sentence per page, frame repeats, Clothes | Decodable 9: -an -ad words |  |
| 2 | 11 | RAZ 10: short e | Daily 2-min: sound of the week (initial/final), blend 3 sounds | me, of | Where is ___? In/On/Under. | Home (ViU 11/13) | Song: 'Where is ___? In/On/Under' / Home | Read-along: one sentence per page, frame repeats, Home | Decodable 10: short e words |  |
| 2 | 12 | RAZ 11: h | Daily 2-min: sound of the week (initial/final), blend 3 sounds | goes, it, said, that | Open your book. | School (ViU 15) | Song: 'Open your book' / School | Read-along: one sentence per page, frame repeats, School | Decodable 11: h words |  |
| 2 | 13 | RAZ 12: -ot -op | Daily 2-min: sound of the week (initial/final), blend 3 sounds | do, for, like | I can run/hop/jump. | Actions (verbs) (ViU 47/49) | Song: 'I can run/hop/jump' / Actions (verbs) | Read-along: one sentence per page, frame repeats, Actions (verbs) | Decodable 12: -ot -op words |  |
| 2 | 14 | RAZ 13: f | Daily 2-min: sound of the week (initial/final), blend 3 sounds | this, you | It is hot/cold. | Weather (ViU 28) | Song: 'It is hot/cold' / Weather | Read-along: one sentence per page, frame repeats, Weather | Decodable 13: f words |  |
| 2 | 15 | RAZ 14: g | Daily 2-min: sound of the week (initial/final), blend 3 sounds | his, no, my | Look, a ___! | Transport (ViU 32/49) | Song: 'Look, a ___!' / Transport | Read-along: one sentence per page, frame repeats, Transport | Decodable 14: g words |  |
| 2 | 16 | REVIEW WEEK | Review | (review) | Review of the four frames | Review | Review song medley | Re-read the four books | Re-read + reading records | Benchmark 2 (mid-year) |
| 2 | 17 | RAZ 15: -et -en | Daily 2-min: sound of the week (initial/final), blend 3 sounds | she, will | Let's go to the ___. | Places (park, shop) (ViU 29) | Song: 'Let's go to the ___' / Places (park, shop) | Read-along: one sentence per page, frame repeats, Places (park, shop) | Decodable 15: -et -en words |  |
| 2 | 18 | RAZ 16: short i | Daily 2-min: sound of the week (initial/final), blend 3 sounds | her, look | I am ___. Are you ___? | Feelings (ViU 7) | Song: 'I am ___' / Feelings | Read-along: one sentence per page, frame repeats, Feelings | Decodable 16: short i words |  |
| 2 | 19 | RAZ 17: b | Daily 2-min: sound of the week (initial/final), blend 3 sounds | eat | Can you ___? Yes, I can. | Sports and play (ViU 23) | Song: 'Can you ___? Yes, I can' / Sports and play | Read-along: one sentence per page, frame repeats, Sports and play | Decodable 17: b words |  |
| 2 | 20 | RAZ 18: -it -in | Daily 2-min: sound of the week (initial/final), blend 3 sounds | stop, them | What day is it? | Time and days (ViU 51) | Song: 'What day is it?' / Time and days | Read-along: one sentence per page, frame repeats, Time and days | Decodable 18: -it -in words |  |
| 2 | 21 | RAZ 19: c | Daily 2-min: sound of the week (initial/final), blend 3 sounds | jump, just | The ___ is big/small. | Animals (farm and zoo) (ViU 31) | Song: 'The ___ is big/small' / Animals (farm and zoo) | Read-along: one sentence per page, frame repeats, Animals (farm and zoo) | Decodable 19: c words |  |
| 2 | 22 | RAZ 20: r | Daily 2-min: sound of the week (initial/final), blend 3 sounds | we | I like ___. Do you? | Fruit (Starters) | Song: 'I like ___' / Fruit | Read-along: one sentence per page, frame repeats, Fruit | Decodable 20: r words |  |
| 2 | 23 | RAZ 21: short u | Daily 2-min: sound of the week (initial/final), blend 3 sounds | go, play, take | What is it? It is a ___. | The world around us (nature) (ViU 30) | Song: 'What is it? It is a ___' / The world around us (nature) | Read-along: one sentence per page, frame repeats, The world around us (nature) | Decodable 21: short u words |  |
| 2 | 24 | REVIEW WEEK | Review | (review) | Review of the four frames | Review | Review song medley | Re-read the four books | Re-read + reading records | Benchmark 3 |
| 2 | 25 | RAZ 22: -ug -un | Daily 2-min: sound of the week (initial/final), blend 3 sounds | over, want | He/She is a ___. | Jobs (ViU 14) | Song: 'He/She is a ___' / Jobs | Read-along: one sentence per page, frame repeats, Jobs | Decodable 22: -ug -un words |  |
| 2 | 26 | RAZ 23: l | Daily 2-min: sound of the week (initial/final), blend 3 sounds | would | I have a ___ (body part) ache. | Health (Starters) | Song: 'I have a ___ (body part) ache' / Health | Read-along: one sentence per page, frame repeats, Health | Decodable 23: l words |  |
| 2 | 27 | RAZ 24: w | Daily 2-min: sound of the week (initial/final), blend 3 sounds | out | I can hear a ___. | Music and sounds (ViU 26) | Song: 'I can hear a ___' / Music and sounds | Read-along: one sentence per page, frame repeats, Music and sounds | Decodable 24: w words |  |
| 2 | 28 | RAZ 25: -at -ap | Daily 2-min: sound of the week (initial/final), blend 3 sounds | does | It is a ___ (shape). | Shapes and size (Starters) | Song: 'It is a ___ (shape)' / Shapes and size | Read-along: one sentence per page, frame repeats, Shapes and size | Decodable 25: -at -ap words |  |
| 2 | 29 | RAZ 26: j | Daily 2-min: sound of the week (initial/final), blend 3 sounds | good | ___ is big. ___ is small. | Opposites (ViU 56) | Song: '___ is big' / Opposites | Read-along: one sentence per page, frame repeats, Opposites | Decodable 26: j words |  |
| 2 | 30 | RAZ 27: k | Daily 2-min: sound of the week (initial/final), blend 3 sounds | have | How old are you? I am ___. | Birthday and parties (Starters) | Song: 'How old are you? I am ___' / Birthday and parties | Read-along: one sentence per page, frame repeats, Birthday and parties | Decodable 27: k words |  |
| 2 | 31 | RAZ 28: -ut -ub | Daily 2-min: sound of the week (initial/final), blend 3 sounds | more, some | Here is a ___ for you. | Holidays (Starters) | Song: 'Here is a ___ for you' / Holidays | Read-along: one sentence per page, frame repeats, Holidays | Decodable 28: -ut -ub words |  |
| 2 | 32 | REVIEW WEEK | Review | (review) | Review of the four frames | Review | Review song medley | Re-read the four books | Re-read + reading records | Benchmark 4 (end-of-level profile) |
| 3 | 1 | RAZ 29: v | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | into, went | What's your name? I'm ___. | Names and greetings (ViU 52) | Song: 'What's your name' / Names and greetings | Read-along: two sentences per page, question and answer, Names and greetings | Decodable 29: v words |  |
| 3 | 2 | RAZ 30: y | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | make, one | How many ___ are there? There are ___. | Numbers 1-10 (Starters) | Song: 'How many ___ are there' / Numbers 1-10 | Read-along: two sentences per page, question and answer, Numbers 1-10 | Decodable 30: y words |  |
| 3 | 3 | RAZ 31: -ill -ip | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | never, seen | What colour is ___? It is ___. | Colours (Starters) | Song: 'What colour is ___' / Colours | Read-along: two sentences per page, question and answer, Colours | Decodable 31: -ill -ip words |  |
| 3 | 4 | RAZ 32: qu | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | as, where | Who is this? This is my ___. | Family (Starters) | Song: 'Who is this' / Family | Read-along: two sentences per page, question and answer, Family | Decodable 32: qu words |  |
| 3 | 5 | RAZ 33: x | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | help, made | I have ___ eyes/hands. | Body and face (Starters) | Song: 'I have ___ eyes/hands' / Body and face | Read-along: two sentences per page, question and answer, Body and face | Decodable 33: x words |  |
| 3 | 6 | RAZ 34: z | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | be, who, then | Do you like ___? Yes, I do./No, I don't. | Animals (pets) (ViU 31) | Song: 'Do you like ___' / Animals (pets) | Read-along: two sentences per page, question and answer, Animals (pets) | Decodable 34: z words |  |
| 3 | 7 | RAZ 35: -ob -ell | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | how, new, there | Is this your ___? Yes, it is. | Toys (Starters) | Song: 'Is this your ___' / Toys | Read-along: two sentences per page, question and answer, Toys | Decodable 35: -ob -ell words |  |
| 3 | 8 | REVIEW WEEK | Review | (review) | Review of the four frames | Review | Review song medley | Re-read the four books | Re-read + reading records | Benchmark 1 (PA/letter-sound) |
| 3 | 9 | Thai-specific: T1 final consonants /p t k d/ | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | (Thai week: review) | What do you want? I want ___. | Food and drink (ViU 22) | Song: 'What do you want' / Food and drink | Read-along: two sentences per page, question and answer, Food and drink | Decodable: review text for the contrast |  |
| 3 | 10 | RAZ 36: s-blends | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | give, live | He/She has a ___ (clothes). | Clothes (Starters) | Song: 'He/She has a ___ (clothes)' / Clothes | Read-along: two sentences per page, question and answer, Clothes | Decodable 36: s-blends words |  |
| 3 | 11 | RAZ 37: r-blends | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | come, think, why | There is a ___ in the ___. | Home (ViU 11/13) | Song: 'There is a ___ in the ___' / Home | Read-along: two sentences per page, question and answer, Home | Decodable 37: r-blends words |  |
| 3 | 12 | RAZ 38: l-blends | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | could, don't, so | What's this? It's a ___. | School (ViU 15) | Song: 'What's this' / School | Read-along: two sentences per page, question and answer, School | Decodable 38: l-blends words |  |
| 3 | 13 | RAZ 39: final n-blends | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | by, your | He/She can ___. He/She can't ___. | Actions (verbs) (ViU 47/49) | Song: 'He/She can ___' / Actions (verbs) | Read-along: two sentences per page, question and answer, Actions (verbs) | Decodable 39: final n-blends words |  |
| 3 | 14 | RAZ 40: final blends | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | every | What's the weather like? It's ___. | Weather (ViU 28) | Song: 'What's the weather like' / Weather | Read-along: two sentences per page, question and answer, Weather | Decodable 40: final blends words |  |
| 3 | 15 | RAZ 41: 3-letter blends | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | day, our | How do you go to school? By ___. | Transport (ViU 32/49) | Song: 'How do you go to school' / Transport | Read-along: two sentences per page, question and answer, Transport | Decodable 41: 3-letter blends words |  |
| 3 | 16 | REVIEW WEEK | Review | (review) | Review of the four frames | Review | Review song medley | Re-read the four books | Re-read + reading records | Benchmark 2 (mid-year) |
| 3 | 17 | Thai-specific: T2 initial clusters | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | (Thai week: review) | Where is the ___? Next to ___. | Places (park, shop) (ViU 29) | Song: 'Where is the ___' / Places (park, shop) | Read-along: two sentences per page, question and answer, Places (park, shop) | Decodable: review text for the contrast |  |
| 3 | 18 | Thai-specific: T3 final clusters and -s | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | (Thai week: review) | How are you? I'm ___. | Feelings (ViU 7) | Song: 'How are you' / Feelings | Read-along: two sentences per page, question and answer, Feelings | Decodable: review text for the contrast |  |
| 3 | 19 | RAZ 42: a_e | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | always, find | Let's play ___. Good idea! | Sports and play (ViU 23) | Song: 'Let's play ___' / Sports and play | Read-along: two sentences per page, question and answer, Sports and play | Decodable 42: a_e words |  |
| 3 | 20 | RAZ 43: o_e | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | about, people | What time is it? It's ___ o'clock. | Time and days (ViU 51) | Song: 'What time is it' / Time and days | Read-along: two sentences per page, question and answer, Time and days | Decodable 43: o_e words |  |
| 3 | 21 | RAZ 44: i_e | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | what | The ___ lives on a farm. | Animals (farm and zoo) (ViU 31) | Song: 'The ___ lives on a farm' / Animals (farm and zoo) | Read-along: two sentences per page, question and answer, Animals (farm and zoo) | Decodable 44: i_e words |  |
| 3 | 22 | RAZ 45: u_e | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | (review) | I like ___ but I don't like ___. | Fruit (Starters) | Song: 'I like ___ but I don't like ___' / Fruit | Read-along: two sentences per page, question and answer, Fruit | Decodable 45: u_e words |  |
| 3 | 23 | RAZ 46: sh | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | (review) | Look at the ___! It's ___. | The world around us (nature) (ViU 30) | Song: 'Look at the ___! It's ___' / The world around us (nature) | Read-along: two sentences per page, question and answer, The world around us (nature) | Decodable 46: sh words |  |
| 3 | 24 | REVIEW WEEK | Review | (review) | Review of the four frames | Review | Review song medley | Re-read the four books | Re-read + reading records | Benchmark 3 |
| 3 | 25 | RAZ 47: ch | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | (review) | What does he/she do? He/She is a ___. | Jobs (ViU 14) | Song: 'What does he/she do' / Jobs | Read-along: two sentences per page, question and answer, Jobs | Decodable 47: ch words |  |
| 3 | 26 | RAZ 48: ck | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | (review) | I have a ___. Oh no! | Health (Starters) | Song: 'I have a ___' / Health | Read-along: two sentences per page, question and answer, Health | Decodable 48: ck words |  |
| 3 | 27 | RAZ 49: ng | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | (review) | I can play the ___. | Music and sounds (ViU 26) | Song: 'I can play the ___' / Music and sounds | Read-along: two sentences per page, question and answer, Music and sounds | Decodable 49: ng words |  |
| 3 | 28 | RAZ 50: th | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | (review) | It's a big red ___. | Shapes and size (Starters) | Song: 'It's a big red ___' / Shapes and size | Read-along: two sentences per page, question and answer, Shapes and size | Decodable 50: th words |  |
| 3 | 29 | Thai-specific: T4 th s f contrast | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | (Thai week: review) | ___ is tall. ___ is short. | Opposites (ViU 56) | Song: '___ is tall' / Opposites | Read-along: two sentences per page, question and answer, Opposites | Decodable: review text for the contrast |  |
| 3 | 30 | RAZ 51: wh | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | (review) | Happy birthday! Here's a ___. | Birthday and parties (Starters) | Song: 'Happy birthday! Here's a ___' / Birthday and parties | Read-along: two sentences per page, question and answer, Birthday and parties | Decodable 51: wh words |  |
| 3 | 31 | Thai-specific: T5 v w, r l contrast | Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K) | (Thai week: review) | We go to the ___. | Holidays (Starters) | Song: 'We go to the ___' / Holidays | Read-along: two sentences per page, question and answer, Holidays | Decodable: review text for the contrast |  |
| 3 | 32 | REVIEW WEEK | Review | (review) | Review of the four frames | Review | Review song medley | Re-read the four books | Re-read + reading records | Benchmark 4 (end-of-level profile) |
| 4 | 1 | RAZ 52: open vowels | Daily 2-min: swap first/middle/last sound (DSS L); syllables | what, give | This is ___. ___ is a ___ (Origins frame). | Names and greetings (ViU 52) | Song: 'This is ___' / Names and greetings | Read-along: short story 60-100 words with dialogue, Names and greetings | Decodable 52: open vowels words |  |
| 4 | 2 | RAZ 53: ee ea ie | Daily 2-min: swap first/middle/last sound (DSS L); syllables | live, come | How many? Numbers to 20. | Numbers 1-10 (Starters) | Song: 'How many' / Numbers 1-10 | Read-along: short story 60-100 words with dialogue, Numbers 1-10 | Decodable 53: ee ea ie words |  |
| 4 | 3 | RAZ 54: short ea | Daily 2-min: swap first/middle/last sound (DSS L); syllables | think, why | What colour is his/her ___? | Colours (Starters) | Song: 'What colour is his/her ___' / Colours | Read-along: short story 60-100 words with dialogue, Colours | Decodable 54: short ea words |  |
| 4 | 4 | RAZ 55: ai ay | Daily 2-min: swap first/middle/last sound (DSS L); syllables | could, don't | ___ is ___'s brother/sister (possessive 's). | Family (Starters) | Song: '___ is ___'s brother/sister (possessive 's)' / Family | Read-along: short story 60-100 words with dialogue, Family | Decodable 55: ai ay words |  |
| 4 | 5 | RAZ 56: ea eigh ey | Daily 2-min: swap first/middle/last sound (DSS L); syllables | so, by | ___ has got ___. | Body and face (Starters) | Song: '___ has got ___' / Body and face | Read-along: short story 60-100 words with dialogue, Body and face | Decodable 56: ea eigh ey words |  |
| 4 | 6 | RAZ 57: oa oe ow | Daily 2-min: swap first/middle/last sound (DSS L); syllables | your, every | ___ likes ___. ___ loves ___. | Animals (pets) (ViU 31) | Song: '___ likes ___' / Animals (pets) | Read-along: short story 60-100 words with dialogue, Animals (pets) | Decodable 57: oa oe ow words |  |
| 4 | 7 | RAZ 58: i igh | Daily 2-min: swap first/middle/last sound (DSS L); syllables | day, our | Where is ___? ___ is in the garden. | Toys (Starters) | Song: 'Where is ___' / Toys | Read-along: short story 60-100 words with dialogue, Toys | Decodable 58: i igh words |  |
| 4 | 8 | REVIEW WEEK | Review | (review) | Review of the four frames | Review | Review song medley | Re-read the four books | Re-read + reading records | Benchmark 1 (PA/letter-sound) |
| 4 | 9 | RAZ 59: oo ue ew | Daily 2-min: swap first/middle/last sound (DSS L); syllables | always, find | ___ says, "___!" | Food and drink (ViU 22) | Song: '___ says, "___!"' / Food and drink | Read-along: short story 60-100 words with dialogue, Food and drink | Decodable 59: oo ue ew words |  |
| 4 | 10 | RAZ 60: oo oul u | Daily 2-min: swap first/middle/last sound (DSS L); syllables | about, people | What is ___ wearing? | Clothes (Starters) | Song: 'What is ___ wearing' / Clothes | Read-along: short story 60-100 words with dialogue, Clothes | Decodable 60: oo oul u words |  |
| 4 | 11 | RAZ 61: a aw | Daily 2-min: swap first/middle/last sound (DSS L); syllables | (review) | Is there a ___? Yes, there is. | Home (ViU 11/13) | Song: 'Is there a ___' / Home | Read-along: short story 60-100 words with dialogue, Home | Decodable 61: a aw words |  |
| 4 | 12 | RAZ 62: augh ough | Daily 2-min: swap first/middle/last sound (DSS L); syllables | (review) | What does Teacher ___ say? | School (ViU 15) | Song: 'What does Teacher ___ say' / School | Read-along: short story 60-100 words with dialogue, School | Decodable 62: augh ough words |  |
| 4 | 13 | RAZ 63: oi oy | Daily 2-min: swap first/middle/last sound (DSS L); syllables | (review) | ___ comes too. ___ looks at ___. | Actions (verbs) (ViU 47/49) | Song: '___ comes too' / Actions (verbs) | Read-along: short story 60-100 words with dialogue, Actions (verbs) | Decodable 63: oi oy words |  |
| 4 | 14 | RAZ 64: ou ow | Daily 2-min: swap first/middle/last sound (DSS L); syllables | (review) | It is sunny. Let's go to the ___. | Weather (ViU 28) | Song: 'It is sunny' / Weather | Read-along: short story 60-100 words with dialogue, Weather | Decodable 64: ou ow words |  |
| 4 | 15 | RAZ 65: or oar our | Daily 2-min: swap first/middle/last sound (DSS L); syllables | (review) | ___ goes by ___. | Transport (ViU 32/49) | Song: '___ goes by ___' / Transport | Read-along: short story 60-100 words with dialogue, Transport | Decodable 65: or oar our words |  |
| 4 | 16 | REVIEW WEEK | Review | (review) | Review of the four frames | Review | Review song medley | Re-read the four books | Re-read + reading records | Benchmark 2 (mid-year) |
| 4 | 17 | RAZ 66: air are ear | Daily 2-min: swap first/middle/last sound (DSS L); syllables | (review) | Who is in the park? ___ and ___. | Places (park, shop) (ViU 29) | Song: 'Who is in the park' / Places (park, shop) | Read-along: short story 60-100 words with dialogue, Places (park, shop) | Decodable 66: air are ear words |  |
| 4 | 18 | RAZ 67: ar | Daily 2-min: swap first/middle/last sound (DSS L); syllables | (review) | How is ___? ___ is happy/sad/angry. | Feelings (ViU 7) | Song: 'How is ___' / Feelings | Read-along: short story 60-100 words with dialogue, Feelings | Decodable 67: ar words |  |
| 4 | 19 | RAZ 68: er ir ur | Daily 2-min: swap first/middle/last sound (DSS L); syllables | (review) | Do you like ___? ___ asks. | Sports and play (ViU 23) | Song: 'Do you like ___' / Sports and play | Read-along: short story 60-100 words with dialogue, Sports and play | Decodable 68: er ir ur words |  |
| 4 | 20 | Exit-profile week: E1 -s -es endings | Daily 2-min: swap first/middle/last sound (DSS L); syllables | says, comes, asks | What day is it today? | Time and days (ViU 51) | Song: 'What day is it today' / Time and days | Read-along: short story 60-100 words with dialogue, Time and days | Decodable: cumulative text (all elements) |  |
| 4 | 21 | Exit-profile week: E2 -ing -ed endings | Daily 2-min: swap first/middle/last sound (DSS L); syllables | looks, loves, am, are | What does the ___ say? Woof! | Animals (farm and zoo) (ViU 31) | Song: 'What does the ___ say' / Animals (farm and zoo) | Read-along: short story 60-100 words with dialogue, Animals (farm and zoo) | Decodable: cumulative text (all elements) |  |
| 4 | 22 | Exit-profile week: E3 two-syllable and compound words | Daily 2-min: swap first/middle/last sound (DSS L); syllables | yes, to, do, does | ___ is eating a ___. | Fruit (Starters) | Song: '___ is eating a ___' / Fruit | Read-along: short story 60-100 words with dialogue, Fruit | Decodable: cumulative text (all elements) |  |
| 4 | 23 | Exit-profile week: E4 vowel length contrast (Thai) | Daily 2-min: swap first/middle/last sound (DSS L); syllables | or, old, say, how | Don't ___! Be careful! | The world around us (nature) (ViU 30) | Song: 'Don't ___! Be careful!' / The world around us (nature) | Read-along: short story 60-100 words with dialogue, The world around us (nature) | Decodable: cumulative text (all elements) |  |
| 4 | 24 | REVIEW WEEK | Review | (review) | Review of the four frames | Review | Review song medley | Re-read the four books | Re-read + reading records | Benchmark 3 |
| 4 | 25 | Exit-profile week: E5 long and short vowel review | Daily 2-min: swap first/middle/last sound (DSS L); syllables | color, white, red, blue, children | What does your mom/dad do? | Jobs (ViU 14) | Song: 'What does your mom/dad do' / Jobs | Read-along: short story 60-100 words with dialogue, Jobs | Decodable: cumulative text (all elements) |  |
| 4 | 26 | Exit-profile week: E6 fluency: timed re-read | Daily 2-min: swap first/middle/last sound (DSS L); syllables | school, teacher, draw, write, sit | ___ is sick. Poor ___! | Health (Starters) | Song: '___ is sick' / Health | Read-along: short story 60-100 words with dialogue, Health | Decodable: cumulative text (all elements) |  |
| 4 | 27 | Exit-profile week: E7 fluency: dialogue and expression | Daily 2-min: swap first/middle/last sound (DSS L); syllables | (fluency: all 92 words timed) | Listen! I can hear ___. | Music and sounds (ViU 26) | Song: 'Listen! I can hear ___' / Music and sounds | Read-along: short story 60-100 words with dialogue, Music and sounds | Decodable: cumulative text (all elements) |  |
| 4 | 28 | Exit-profile week: E8 sentence writing 1 | Daily 2-min: swap first/middle/last sound (DSS L); syllables | (fluency: dialogue) | It is big and brown. | Shapes and size (Starters) | Song: 'It is big and brown' / Shapes and size | Read-along: short story 60-100 words with dialogue, Shapes and size | Decodable: cumulative text (all elements) |  |
| 4 | 29 | Exit-profile week: E9 sentence writing 2 | Daily 2-min: swap first/middle/last sound (DSS L); syllables | (writing: frames) | ___ is old. ___ is new. | Opposites (ViU 56) | Song: '___ is old' / Opposites | Read-along: short story 60-100 words with dialogue, Opposites | Decodable: cumulative text (all elements) |  |
| 4 | 30 | Exit-profile week: E10 bridge: read an Origins 1 text | Daily 2-min: swap first/middle/last sound (DSS L); syllables | (writing: frames) | Happy birthday, ___! ___ is eight. | Birthday and parties (Starters) | Song: 'Happy birthday, ___! ___ is eight' / Birthday and parties | Read-along: short story 60-100 words with dialogue, Birthday and parties | Decodable: cumulative text (all elements) |  |
| 4 | 31 | Exit-profile week: E11 bridge: Origins 1 frames and names | Daily 2-min: swap first/middle/last sound (DSS L); syllables | Lily, Tom, Mia, Pip (names) | Goodbye, ___! See you! | Holidays (Starters) | Song: 'Goodbye, ___! See you!' / Holidays | Read-along: short story 60-100 words with dialogue, Holidays | Decodable: cumulative text (all elements) |  |
| 4 | 32 | REVIEW WEEK | Review | (review) | Review of the four frames | Review | Review song medley | Re-read the four books | Re-read + reading records | Benchmark 4 (end-of-level profile) |
Mapping summary: Level 2 weeks 1-7, 9-15, 17-23, 25-31 hold Reading A-Z elements 1-28 in order. Level 3 holds elements 29-35, T1, 36-41, T2, T3, 42-50, T4, 51, T5. Level 4 holds elements 52-68 then E1 to E11.

---

## 3. The five daily scripts

Amended 2026-10-22 after the Level 2 week 1 build (six changes, marked [W1]).

### 3.1 Format

Every script step uses the four headings of the Primary teacher manual generator (`Workbooks/dashboard/lib/teacher-manual/i18n/th.ts`): what the teacher does (สิ่งที่ครูทำ), the English the teacher says (ภาษาที่ครูใช้), what the students do (สิ่งที่นักเรียนทำ), what to watch (สิ่งที่ต้องสังเกต). The English is written in full. Daniel adds the Thai. Every step ends with three fixed lines: Easier (a confidence builder), Harder (an extension), Group (the pair or small-group form), after the Developing Sound Sense pattern. The teacher reads the lines; the teacher never chooses an activity.

Each sound has one action. The action for n is a nod: "nod your head slowly and hum nnn". A head shake is only for "no" in yes/no games. [W1]

Scripts write the sound in triple letters ("nnn") and the letter as "the letter n", never a bare letter, because a non-native teacher reads "n" as "en". [W1]

Every period opens with the same routine. Nothing in the routine changes across the year, so the routine itself is the classroom management.

**Opening routine (8 minutes in primary, 6 in Anuban)**
1. Greeting song and the class call-and-response (1 min). "Hello, Sprouts!" "Hello, Teacher ___!"
2. Sound game, 1 min, every day [W2]: days 1 to 2 the sound of the week (first-sound and last-sound identify with picture cards; week 2 the middle sound); days 3 to 5 blend three sounds by ear ("/p/ - /a/ - nnn. What is the word? Pan!"). The week package gives one teacher line per day (opening.pa[day]). In the 6-minute Anuban opening it replaces the calendar. The 8-minute primary opening keeps the calendar as item 3 (one child points; Level 4 reads the words).
3. Song of the week with the choreography, from the video (2 min). Monday the teacher models; by Wednesday the class leads.
4. Review deck (3 to 4 min). The printed cards for the day (section 4). Sound cards, word cards, then one frame card.

### 3.2 Levels 2 to 4, 49 minutes

| Day | Script | Minutes after the 8-minute opening |
|---|---|---|
| 1 | A Sound Lesson | 41 |
| 2 | B Story Lesson | 41 |
| 3 | C Spell and Read | 41 |
| 4 | D Read and Write | 41 |
| 5 | E Play and Check | 41 |

**Script A, Sound Lesson (new element)**

| Step | Min | What happens |
|---|---|---|
| A1 Hear it | 5 | Phonemic awareness for the element: the teacher says words, children show thumbs for the target sound at the start or end. Picture cards, no letters. |
| A2 See it | 5 | The sound and symbol card. The teacher says the pure sound, shows the letter, does the action (a Jolly-style action per sound, ours). Children say and do, three times. |
| A3 Form it | 6 | Letter formation: the teacher writes on the board with the start-point script ("Start at the top. Down. Round."). Children trace in the air, then in the book, three times. |
| A4 Blend it | 8 | Three new words on teacher cards. Finger under the word, sound by sound, then fast. Continuous sounds are held; stops are not. Children repeat, then read the three alone. |
| A5 Word wall | 5 | The week's word wall card (computed from the graph, section 5.6). The class reads the wall; the teacher adds the new words. |
| A6 New tricky words | 5 | One to three cards. Read, find the tricky part (marked in the book), spell by letter name, write in the air. |
| A7 Read it | 5 | The practice sheet: new words, review words, tricky words, two phrases, one sentence. |
| A8 Home card | 0 (home time) | The teacher puts the weekly home card (section 9) in the bags after class and says the one Thai line on it at pick-up. [W1] |

**Script B, Story Lesson (read-along book)**

| Step | Min | What happens |
|---|---|---|
| B1 Family words | 6 | Six to eight picture cards of the vocabulary family. Say, repeat, point, "What is it? It is a ___." |
| B2 Picture walk | 5 | Cover and every spread, no text yet. "What can you see?" Children answer in Thai or English; the teacher gives the English. |
| B3 Listen | 5 | The audio plays once. The teacher points at the pictures. |
| B4 Read with me | 8 | The teacher reads a page, the class echoes. Finger under the words. The frame of the week is pointed out on every page. |
| B5 Frame practice | 8 | The frame on the board. Each child says it with a card from B1. Pairs then do it with their own cards. |
| B6 Act it | 6 | The class acts the book: roles, actions, one line each. |
| B7 Sing it | 3 | The song again, this time with the karaoke video (words on screen). |

**Script C, Spell and Read (letter cards and the decodable)**

| Step | Min | What happens |
|---|---|---|
| C1 Sound review | 4 | Sound cards of the week and the two previous weeks, fast. |
| C2 Letter cards | 8 | Each child has the letter cards and the workmat. The teacher says a word; children push one letter per box while saying the sounds; then read it. Four words. |
| C3 Dictation | 6 | Three words and one sentence written in the book. The teacher says it, the class repeats, segments on fingers, writes. |
| C4 Decodable: read together | 10 | Cover, title, predict. Page 1 with the teacher. Then the book in pairs, partner A reads a page, partner B the next. |
| C5 Comprehension | 5 | Two questions in the frame of the week. "Where is ___?" "Can ___ ___?" |
| C6 Favourite sentence | 4 | Volunteers read one sentence each. |
| C7 Sticker | 4 | The decodable's sticker goes on the child's book map (section 10). |

**Script D, Read and Write**

| Step | Min | What happens |
|---|---|---|
| D1 Re-read | 8 | The decodable again, alone, with the finger. The teacher listens to one group. |
| D2 Tricky words | 5 | All tricky cards of the block, fast; erase-a-letter game. |
| D3 Leveled reader | 8 | The class set of the parallel leveled reader (section 6.2): shared reading, then pairs. |
| D4 Write it | 12 | The frame sentence with the family word: trace (Level 2), copy from a word bank (Level 3), write from a picture (Level 4). Capital, spaces, full stop. |
| D5 Share | 5 | Four children read their sentence aloud. |
| D6 Sing it | 3 | The song, children lead. |

**Script E, Play and Check**

| Step | Min | What happens |
|---|---|---|
| E1 Centers set-up | 3 | Four centers, the same four every week: sound cards game, word-building with letter cards, the book corner (all readers so far), the karaoke corner (tablet or printed lyrics). |
| E2 Centers, rotation 1 | 10 | Groups rotate. The teacher sits at the reading-record table with child 1 and 2. |
| E3 Centers, rotation 2 | 10 | Child 3 and 4. |
| E4 Game | 10 | One whole-class game from the week's card (Concentration with word cards, Sound Bingo, Swat the Word). |
| E5 Check | 5 | A two-minute written check: circle the picture for the sound; write two words. Collected. |
| E6 Song show | 0 (in the opening) | Merged into the day 5 opening (D6): the song with full choreography, filmed by the teacher on the class tablet if the school allows. [W1] |

In a review week, Script A becomes the benchmark (section 7), Scripts B to D re-read the block's four books, and Script E completes the reading records for the children not yet heard.

### 3.3 Level 2 at 30 minutes (Anuban 3)

The same five scripts, compressed: opening 6 minutes; each script keeps its first five steps with the minutes scaled to 24. [W1] The Friday check E5 stays on day 5 at 3 minutes; E2 and E3 are 7 minutes and E4 is 5 minutes. [W1] The check does not move to Monday: it updates the next week's strips, and 30 children cannot be checked in 1 minute. [W1] Song steps are item 3 of the opening routine ("song of the week") and add no minutes to the main steps: the day 3 opening plays the karaoke video (B7), the day 5 opening is the song show (D6), E6 is merged into D6, and no song step moves to the next week. [W1] Step A8 (home card) is a home-time task: the teacher puts the perforated card in the bags after class, and it takes no class minutes. [W1] The other last steps (A7, B6, C6, D5) move to the next day's opening as a one-minute recall, except the sticker (C7), which stays. Movement every 6 minutes: the opening song, A2 actions, B6 acting, C2 pushing cards, E4 game. The one-minute recall of the moved steps sits inside the 6-minute opening (the routine compresses by one minute on that day); the main steps stay at 24 and the lesson stays at 30; the page header reads "Opening 6 min (incl. 1 min recall)". [W2]

### 3.4 Level 1 at 30 minutes (Anuban 2)

| Day | Script | Steps (minutes) |
|---|---|---|
| 1 | L Listen | Opening 6; the phonemic awareness lesson of the week as one game with picture cards, body movement, and a puppet (12); the same game in two groups (6); alphabet song with the letter cards in the air (3); goodbye song (3) |
| 2 | M Letter | Opening 6; the letter of the week: name, sound, action, and the letter song from the video (8); find the letter in the big alphabet frieze (3); trace the letter with a finger in the book, then with a crayon (6); picture hunt for the first sound (4); goodbye (3) |
| 3 | S Story | Opening 6; six family picture cards (4); picture walk and audio (5); read with me, one phrase a page (6); act it (6); goodbye (3) |
| 4 | V Sing and Move | Opening 6; the song with choreography, three times, with a different group leading (8); rhyme or syllable game from the week's PA lesson (6); frame practice with the cards, each child once (7); goodbye (3) |
| 5 | P Play and Check | Opening 6; two centers only, 8 minutes each: picture-sound sort and the book corner; the teacher runs the listening check with four children (16); song show (5); goodbye (3) |

Four-year-olds move every 5 to 7 minutes in every script. No step is longer than 8 minutes. Nothing is written except name copying from week 20.

---

## 4. The review deck

**Schedule.** Every taught item (sound, tricky word, frame) returns on day 2 and day 3 of its week, then in week +1, +2, +4, and +8, then once more at the end-of-level review. An item that fails a check is reset to the day-2 schedule. This is a fixed expanding schedule; the app replaces it per child with the FSRS scheduler.

**Generation.** The deck for each day is computed from the sequence table and the schedule. For week w, day d, the deck is: the sounds introduced in weeks w-1, w-2, w-4, w-8 (up to 8 sound cards), the tricky words introduced in the same weeks (up to 8 word cards), one frame card from week w-1, and, from Level 3, two decodable words from the word wall of week w-4. Cap: 18 cards, 4 minutes. The cards are printed as a dated strip in the teacher book, so the teacher takes the strip and reads it.

**Evidence that feeds it.** The Friday check (E5), the reading records, and the benchmark scores mark items as weak for the class. In the printed program, a weak item marked in the teacher's record sheet goes back to the day-2 schedule for the next week (the teacher writes it on the strip; this is the only teacher-chosen act, and the sheet tells the teacher exactly which items). In the app, the class hot list (the five items most children failed) is shown to the teacher on Friday and printed as a one-line addition to the next week's strips.

**App personalisation.** Each child's app items (section 10) write evidence per node; FSRS schedules the child's own deck in the app. The class deck stays the printed one. The teacher never has two different decks to run.

---

## 5. Phonics graph design

### 5.1 Location and ids

A separate graph file in the English domain, as the Graph session prefers: `mastery-advantage/english/phonics/phonics-knowledge-space.json`, prefix `english.phonics.*`, domain `english.phonics`. `mastery-advantage/storytime/README.md` documents the app and holds the level map CSV. The Storytime track builds and owns the file. Daniel confirms the location (S3).

Id patterns (SPECIFICATION.md §3.6: `^[a-z][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+$`):

| Kind | Pattern | Example |
|---|---|---|
| Phoneme (concept) | `english.phonics.phoneme.<ipa-slug>` | `english.phonics.phoneme.sh` |
| Grapheme-phoneme correspondence (skill) | `english.phonics.gpc.<grapheme>.<phoneme-slug>` | `english.phonics.gpc.ai.long-a` |
| Phonemic awareness skill | `english.phonics.pa.<module>.<skill>` | `english.phonics.pa.rhyme.produce` |
| Tricky word (skill) | `english.phonics.tricky.<word>` | `english.phonics.tricky.said` |
| Decodable text (content_group) | `english.phonics.text.<level>.<n>.<slug>` | `english.phonics.text.l2.03.nan-and-pap` |
| Letter knowledge (skill) | `english.phonics.letter.<letter>.<name|sound|form-lower|form-upper>` | `english.phonics.letter.s.form-lower` |
| Pattern skill (skill) | `english.phonics.pattern.<slug>` | `english.phonics.pattern.cvc-short-a` |
| Standard | `english.phonics.standard.<slug>` | `english.phonics.standard.storytime-v1` |

### 5.2 Phonemic awareness taxonomy

Modules follow Developing Sound Sense; skills are the ones the Reading A-Z sequence and the DfE criteria name. 12 modules, 41 skills.

| Module | Skills (count) |
|---|---|
| listening | environmental sound: start-stop, identify, sequence, follow directions (4) |
| rhyme | recognise, match, produce, odd-one-out (4) |
| sentence-word | count words, longer-shorter, complete a sentence (3) |
| compound | blend two words, delete a part (2) |
| syllable | count, blend, segment, delete (4) |
| onset-rime | blend, segment, word family by rime (3) |
| initial-sound | identify, match, alliteration, sort (4) |
| final-sound | identify, match, sort (3) |
| medial-vowel | identify, sort (2) |
| phoneme | blend 2-3, blend 4-5, segment 2-3, segment 4-5, add, delete, substitute-initial, substitute-final, substitute-medial (9) |
| cluster | blend a cluster, split a cluster (2) |
| thai-contrast | final stop, r-l, v-w, th-s-f, vowel length (5) — not in DSS; added for Thai phonology |

### 5.3 GPC and letter nodes by level

| Level | Nodes |
|---|---|
| 1 | 26 `letter.<x>.name`, 26 `letter.<x>.sound`, 26 `letter.<x>.form-lower` (10 traced), 44 phoneme concept nodes |
| 2 | 26 single-letter GPCs (n a p m s t o d e h f g i b c r u l w j k v y q x z, with qu as one), 5 short vowels as `pattern.cvc-short-<v>`, 18 rime patterns, `gpc.ck`, `gpc.ss ff ll zz` (floss), 26 `letter.<x>.form-upper` |
| 3 | s-, r-, l- initial blend patterns (3), final blends -nd -nt -nk -mp -lt -ft -st (as `pattern.final-blend`), 3-letter blends, `gpc.a-e.long-a`, `o-e`, `i-e`, `u-e`, `gpc.sh`, `ch`, `ng`, `th.voiceless`, `th.voiced`, `wh`, Thai contrast skills (5) |
| 4 | open-vowel `pattern.open-vowel`, `gpc.ee`, `ea.long-e`, `ie.long-e`, `ea.short-e`, `ai`, `ay`, `eigh`, `ey`, `oa`, `oe`, `ow.long-o`, `igh`, `i.long-i`, `oo.long`, `ue`, `ew`, `oo.short`, `oul`, `u.short-oo`, `aw`, `au`, `augh`, `ough`, `oi`, `oy`, `ou`, `ow.diphthong`, `or`, `oar`, `our`, `air`, `are`, `ear`, `ar`, `er`, `ir`, `ur`, endings `pattern.plural-s`, `-es`, `-ing`, `-ed`, `pattern.two-syllable`, `pattern.compound` |

Total: about 95 GPC and pattern skill nodes, 104 letter nodes, 44 phoneme nodes, 41 PA nodes, 92 tricky-word nodes, 84 decodable text nodes, 1 standard node. About 460 nodes.

### 5.4 Edges

- `prerequisite_for`: each GPC in sequence order is a prerequisite of the next element's text node, not of the next GPC (the order is pedagogical, not logical). Logical prerequisites are explicit: `letter.x.sound` → `gpc.x.*`; `pa.phoneme.blend-2-3` → `pattern.cvc-short-a`; `pa.phoneme.segment-2-3` → spelling of CVC; single-letter GPCs → digraph GPCs that contain the letter; `gpc.a.short-a` → `gpc.a-e.long-a`; `pa.cluster.blend` → blend patterns.
- `supports` from each phonics skill to the GSE Young Learner skill it serves, for example `gpc.*` → `english.gse.skill.young.reading.18.can-combine-single-letter-sounds-to-read`; `letter.*.name` → the listening.10 and speaking.10 alphabet nodes; `letter.*.form-*` → the writing.10 trace and copy nodes.
- `equivalent_to` where the skill is the same: `letter.<x>.sound` set ↔ `speaking.13.can-say-the-sounds-of-the-alphabet`; `pa.initial-sound.identify` ↔ `reading.14.can-identify-the-initial-sound` and `listening.10.can-hear-the-initial-sound`.
- `aligned_to_standard` from every skill node to `english.phonics.standard.storytime-v1` (SPECIFICATION §3.7: alignment only to a `standard` node). The standard node's `sourceRefs` cite the Thai F1.1 indicators Gr1/2, Gr2/2, Gr3/2 and the DfE core criteria, so the alignment is traceable.
- `contains` from each text node to the GPC and tricky nodes it uses.
- Every node and edge has `sourceRefs` (SPECIFICATION §4.4). Sources: the Reading A-Z element list (Daniel's folder), the GSE list, the DfE criteria, Developing Sound Sense, the Thai curriculum.

### 5.5 Validation

The shared gate (§4): no duplicate ids, no dangling edge, every skill aligned, no prerequisite cycle. Storytime adds: every text node contains at least one GPC; every GPC appears in at least one text node by the end of its level; the 92 tricky nodes each appear in at least two text nodes; the sequence table's element for week w lists only GPCs whose prerequisites are in weeks before w.

### 5.6 Word wall and decodability function

Inputs: a lexicon of 2,000 words with grapheme parses (one row per word: word, graphemes, phonemes, Starters flag, frequency rank). Built once by script from the Starters list, the Reading A-Z word lists in Daniel's spreadsheet and passage packs, and the Jolly word bank, then checked by hand. Each parse is a list of `gpc.*` node ids.

`wordWall(taughtGpcSet, taughtTrickySet, oralVocabSet)` returns the lexicon words whose every grapheme is in the taught set, split into "known by ear" (also in the oral set) and "new". The week's word-wall card prints the known-by-ear words only; the new words go to the teacher as a bank for the decodable.

`decodability(text, taughtGpcSet, taughtTrickySet)` returns the running-word count, the decodable count, the tricky count, the untaught words with the first untaught grapheme marked, and the ratio. The Workbooks gate for a decodable is ratio ≥ 0.90 with untaught words = 0 (names excepted and listed). For a read-along book the function reports the ratio for information only.

### 5.7 Level map

`storytime/storytime-levels.csv`: columns level, weekFrom, weekTo, gseFrom, gseTo, block. Level 1 → GSE 10-12; Level 2 → 12-15; Level 3 → 15-18; Level 4 → 18-21. PA level 1 = GSE 10 listening. The CSV serves the app's level badge and the hand-off to `gse-to-primary-advantage.csv` (GSE 21 = PA level 1 entry).

---

## 6. Content production spec

All content is made in the Workbooks repo under the Primary production rules: Claude writes every asset, Daniel checks the Thai, the injector writes the database, the app has no generator.

### 6.1 Decodable book

| Item | Rule |
|---|---|
| Count | 84: Level 2 28, Level 3 28 (23 elements + 5 Thai contrast texts), Level 4 28 (17 elements + 11 cumulative texts) |
| Pages | 8 story pages (4 spreads) plus cover, "Sounds in this book" page, and a back-cover word list |
| Words per page | Level 2: 2-5 words, one sentence. Level 3: 6-12 words, one or two sentences. Level 4: 12-20 words, two or three sentences, dialogue allowed |
| Word shape | Level 2: VC and CVC words only, no consonant blends; blends start at element 36 (Level 3) [W2] |
| Decodability | ≥ 90 percent of running words decodable with the elements taught to date; untaught words 0 except names; tricky words only from the taught set, at most 3 new in the book |
| Cumulative rule | Element n's book uses elements 1 to n only. The function in 5.6 gates it. |
| "Sounds in this book" page | New element, words with the new element, new tricky words (the Reading A-Z elements page) |
| Pattern | A repeated frame with substitution, one change per page; a small twist on the last page |
| Cast | The Pip world where the name is decodable at that week: Sam (week 5), Pat (6), Dan (8), Pam, Ben (17), Pip (18), Kim (27), Max (33), May (Level 4). Pip the puppy is the mascot from Level 2 week 18. Other names from the Starters name list, decodable at the week. |
| Pictures | One picture per page in the printed picture-book style, race-unmarked prompts (hair and clothes, never skin or ethnicity), through the Workbooks image pipeline |
| Audio | Whole-text read-along audio at 0.75 and 1.0 speed, word-aligned for the read-along player |

Week 1 of Level 2 teaches n with no vowel, so its decodable is a sound book (soundBook: true, 'a ___' pages with n-initial picture words and the tricky words a, and, can); the 90 percent rule applies from week 2 [W1].

### 6.2 Read-along book and leveled readers

| Level | Read-along book (weekly, 28 a level) | Pattern |
|---|---|---|
| 1 | 8 pages, one word or two-word phrase per page, one picture; the frame on the last page | "A cat. A dog. A big dog! My dog." |
| 2 | 8 pages, one sentence per page, the frame repeated with one substitution; 20-35 words | "I can see a red ball. I can see a blue ball. ... I can see Pip!" |
| 3 | 8 pages, two sentences per page, question and answer; 50-70 words | "Where is Pip? Pip is in the garden." |
| 4 | 8-12 pages, a story of 60-100 words with dialogue, two questions; opens "This is ___." in at least half the books | the Origins form |

The parallel leveled readers are the same books, re-cut into class sets by level band aa, A, B, C (Reading A-Z bands): aa = Level 1 books, A = Level 2, B = Level 3, C = Level 4. No separate leveled series is written for MVP; the read-along library is the leveled library. Decodability is reported, not gated; the text gate is the Starters list at 90 percent of running words (Origins uses 95), names and the week's family words excepted.

### 6.3 Song

| Item | Rule |
|---|---|
| Count | 112: 28 a level |
| Length | 60-90 seconds; Level 1 60 seconds |
| Sung letters | Never a sung letter name: write a repeated onset syllable, not "A-a-apples". Vowels and continuous consonants sing the sound long ("Ap, ap, apples!", "Mmm, mmm, my family!", "Sss, sss"); stops take the vowel of the week ("Pa, pa, paint!", "Ta, ta") [W2] [W4] |
| Prompt rule | The style text never says "children" or "five-year-olds" (the Lyria 3 Pro filter rejects them); write "kindergarten English classroom, young learners" [W2] |
| Source | Lyria 3 Pro through Vertex AI (global location), three candidates a song, Daniel rates on the live page; karaoke by vocal separation of the chosen take [W2] |
| Structure | Verse 1 (the frame with family word 1 and 2), chorus (the frame as a hook, 2 lines, repeated), verse 2 (family word 3 and 4), chorus, verse 3 (words 5 and 6, Level 3-4 adds a question line), chorus twice. The frame appears at least 8 times. Level 2-4 songs include the sound of the week in the chorus (Level 2 "s-s-s, Sam sees a sun"). |
| Tempo and key | 92-108 bpm Level 1-2, 100-116 Level 3-4; child vocal range C4-C5 |
| Production | Music by the `create-music-mmx` pipeline from a lyric sheet and a style brief (ukulele, hand claps, glockenspiel; no heavy drums); a vocal by the standard American mmx female voice; a child-chorus layer if the pipeline allows |
| Video | 2D animation of the Chibi Sprouts cast in the family's scene from the Forge pack, through the `create-video-mmx` pipeline or Remotion with Forge sprites; the frame text on screen for the karaoke cut |
| Choreography | A description sheet per song: one movement per line, each movement a named gesture from a fixed set of 24 (clap, stamp, point up, point to self, wave, reach, hop, turn, sway, hands on head, ...). The teacher learns 24 gestures once. The video shows a Sprout doing them. |
| Karaoke | A second cut of the video with the lyric line highlighted word by word; timing from `mmx speech --subtitles` on the vocal track or the lyric sheet timings |

The vocabulary family of the week has 6 to 8 picture words; the numbers family alone has 10 (one to ten), by exception [W2].

### 6.4 Audio: phonemes

Pure phonemes (/s/ not "suh") are the base of every sound card and app item. Text-to-speech systems add a vowel to stops and often mispronounce isolated sounds. Recommendation: record the 44 phonemes once with a human American voice (one adult female), three takes each, plus the 26 letter names; store as the phoneme sound bank; every card, app item, and video uses the bank. Test before the decision: generate the 44 sounds with mmx speech, have Daniel and one native speaker rate each as pure or not; if fewer than 40 pass, record. Words, sentences, books, and songs use mmx TTS as Primary does.

### 6.5 Pictures and the Thai layer

Pictures: the Chibi Sprouts cast and scenes from the Forge pack (section 10) for app and video; the printed-book style of Primary for the books, with Pip and the Pip-world children drawn young. All prompts race-unmarked. The Thai layer: the home card line, the script's Thai (added by Daniel from the English), the parent report strings, and the glossed family words in the student book. Daniel checks all Thai. Budget: the student book carries almost no Thai (pictures carry meaning); the teacher book carries the Thai script; estimate 20 minutes a week of lesson Thai per level, about 10 hours a level.

### 6.6 Workbooks package and injector

The lesson package (`dashboard/lib/lesson-package/schema.ts`) gains a `meta.program = "storytime"` value and a `meta.shape = "storytime-week"` value. A Storytime package is one week: element, PA skill, tricky words, frame, family, song (lyrics, audio, video, choreography sheet), read-along book (pages, pictures, audio alignment), decodable book (same), the five scripts (steps with the four headings and the three variants), the review strips for days 1-5, the check sheet, the home card, and the tags (graph node ids with the graph version). The injector key is `(program, level, week)`, idempotent as Primary's `(program, book, lesson_number)`.

### 6.7 Artefact counts

| Artefact | Per level | Four levels | MVP (Level 2 and Level 1) |
|---|---|---|---|
| Weekly packages | 28 | 112 | 56 |
| Songs with video and karaoke cut | 28 | 112 | 56 |
| Read-along books | 28 | 112 | 56 |
| Decodable books | 28 (0 in Level 1) | 84 | 28 |
| Scripts (5 a week, printed) | 140 | 560 | 280 |
| Review strips | 160 | 640 | 320 |
| Card sets (sound, picture, word, tricky, letter) | 1 kit | 4 kits | 2 kits |
| Benchmarks | 4 | 16 | 8 |
| Student book pages | about 120 | 480 | 240 |
| Teacher book pages | about 300 | 1,200 | 600 |

---

## 7. Assessment system

| Check | When | Format | Pass |
|---|---|---|---|
| Letter-sound check | Level 1 weeks 16 and 32; Level 2 week 8; placement | 26 lower-case cards, child says the sound; 26 upper-case, child says the name; 1 minute each | Level 1 end: 20 sounds, 20 names; Level 2 week 8: 26 and 26 |
| Phonemic awareness benchmark | Weeks 8, 16, 32 of Levels 1 and 2 (three a year); week 8 of Levels 3 and 4 | Form A and B, 20 items each, oral: 4 rhyme, 4 syllable, 4 initial sound, 4 final sound, 4 blend; Level 2 adds segment; picture support, no letters; 5 minutes a child, scripted | 16 of 20 |
| Nonsense-word check | Weeks 16 and 32 of Levels 2, 3, 4 | The Reading A-Z format: a 2-minute timed grid, one grid per level (Level 2: 24 CVC; Level 3: 24 with blends and digraphs; Level 4: 24 with vowel teams and magic e); the first word demonstrated | Level 2: 16; Level 3: 18; Level 4: 18, each in two minutes |
| High-frequency word check | Weeks 16 and 32 | The level's sight words on cards, one second each | 90 percent |
| Reading record | Four children a week in Script E; every child every 7 weeks; all children in review weeks | The child reads the week's decodable (Level 2-3) or 60 words of the Level 4 cumulative text; the teacher marks errors and self-corrections on a printed record; accuracy and, from Level 3, words per minute | Accuracy 90 percent; Level 4: 40 words per minute by week 32 |
| Scripted speaking assessment | Weeks 16 and 32 every level | 8 picture prompts, scripted questions in the level's frames, 3 minutes a child; scored 0-2 per prompt on a printed rubric (0 no answer, 1 word, 2 frame) | 10 of 16 |
| Friday check | Every teaching week, Script E5 | 2 minutes written: circle the picture for the sound, write two words (Level 1: circle only) | Marks items weak for the review deck |
| Placement | Any entry after week 1; P3 catch-up | The Fast Track pattern: one probe per module in order (letter-sound, PA, CVC nonsense words, blends, digraphs, sight words); pass continues, fail places the child at that module's level and week | — |

Benchmarks 1 to 4 in the sequence table are: week 8 PA plus letter-sound; week 16 PA, nonsense words, HF words, speaking; week 24 PA (Level 1-2) or reading records for all; week 32 the end-of-level profile (every check).

### 7.8 Primary catch-up module

Scope: a 16-week module for a P3 class that enters Origins 1 without decoding, run in Primary's first semester in two of the five English periods, in parallel with Origins 1. Content: Level 2 elements compressed (letters and CVC, 8 weeks: 3-4 letters a week with the decodable of the last letter), Level 3 digraphs and blends (5 weeks), magic e and the 92 sight words (3 weeks). It uses the Storytime scripts A and C only, the Storytime cards, and the decodables; the songs and read-alongs are not used. Placement by the Fast Track probe. Hosted in Primary with `program = primary`, module tag `phonics-catch-up`, evidence through the Primary pipeline once the Phonics skill exists (section 10.6). Artefacts: 16 compressed scripts and a teacher booklet; no new books.

---

## 8. Teacher kit and training

**Printed kit per level (one per classroom):** the teacher book (the 160 scripts and the review strips, generated by the Primary manual generator with a Storytime template); the big book of the 28 read-along books (A3) or a tablet for the board; the sound and symbol cards (44, A5); picture cards (about 300 Starters pictures, A6, the same set for all levels); sound picture cards (one set per element: 6 to 8 pictures of words starting with the sound, e.g. nest, net, nut for n; they are not Starters picture words) [W1]; letter cards (a class set of 26 lower and 26 upper, plus ck, sh, ch, th, ng, qu, and 10 vowel-team cards from Level 4); tricky-word cards (92, A6); word-family cards (Level 2-3); workmats (class set); the alphabet frieze (Level 1-2); the song choreography sheets (28); the record sheets (reading records, checks, speaking rubric); the four benchmark packs. Decodables and read-alongs in class sets of 8 (pairs).

**Student book per level:** one A4 book: a weekly spread with the letter formation box, the practice sheet, the frame sentence lines, the picture-sound page for the Friday check, and the book map for stickers; the home card perforated per week.

**Classroom language script:** one laminated card: greeting, calendar, 12 instructions (Look. Listen. Say it. Point. Stand up. Sit down. Hands up. Open your book. Page ___. Your turn. Good job! Line up.), the 24 gestures, and the praise lines. The same card is page 1 of the teacher book.

**Routine videos (new, 14):** the opening routine; a pure-sound demonstration of all 44 sounds; blending with the finger; segmenting on fingers; letter cards and workmat; dictation; the read-along echo read; the picture walk; acting the book; the four centers; the reading record; the speaking assessment; the Friday check; the Level 1 listening game. Each under 4 minutes, Thai voice-over, filmed with a Thai teacher and a class or the Sprout animation.

**Training and fidelity:** the 2-day training in `advantage-pr/04-services/onboarding-and-training.md` reused with a Storytime day 2 (run Scripts A to E with the trainer as the class); the fidelity protocol and the observation forms in Workbooks `Teacher guide/` reused with a Storytime checklist (the opening routine ran; the strip was read; the four headings followed; the sound was pure). The quarterly observation form adds one item: the song was sung every day.

---

## 9. Home layer

| Item | MVP | Later |
|---|---|---|
| Weekly home card (Thai), perforated from the student book: the sound, the three words, the frame, the song QR, the read-along QR, one 5-minute activity | Yes | — |
| Song and read-along on a public page by QR (no login) | Yes | — |
| Parent report: a one-page Thai PDF per child at weeks 16 and 32 from the benchmark and reading-record data, generated by the teacher app | Yes (teacher-generated) | Parent login |
| At-home app view: the child's book shelf, songs, and the sound games, by QR card login | Later (with the app) | Yes |
| Caregiver tips library in Thai | Later | Yes |

The home layer is the suite's parent-engagement claim. The MVP version needs no parent account.

---

## 10. Digital twin: Chibi Sprouts

### 10.1 World and loop

Chibi Sprouts is the home village and meadow of the Chibi Quest world. The cast are the Chibi Quest heroes as small children (Forge draws the Chibi Quest cast at age 5, same colours and silhouettes). A quest is to collect, help, or grow: collect the week's sounds, help a villager find the word, grow a plant on the class garden. There is no combat, no enemy, no defeat state. A wrong answer plays "Oops!" and the item returns later. Points: stars (effort, XP in the shared ledger) and seeds (GP, spent on avatar clothes and the pet). The pet hatches from an egg in week 1 and grows one stage every 8 weeks; it never dies. The map is a picture map of 28 places, one per week; the song characters live in them. The class garden is the Class Quest surface: every child's stars grow the shared garden on the teacher's board. At the hand-off the avatar "grows up": the Chibi Quest avatar receives the Sprouts inventory and a badge.

### 10.2 Interface rules

Sound-first: every control speaks on tap; nothing needs reading to navigate. Tap targets ≥ 64 px. No typing; writing items are trace-on-screen. QR card login (the Primary QR path). Landscape tablet first; phone later. Sessions under 10 minutes. The week's song and book are the first screen.

### 10.3 Features: MVP app vs later

| MVP app (after the print MVP) | Later |
|---|---|
| Book shelf: the read-along library in the Primary read-along player (word alignment, 0.75 and 1.0 speed) | Record-and-listen for the child's own reading |
| Song player with karaoke cut | Choreography scoring by camera (no) |
| Sound cards with the phoneme bank | Handwriting recognition (no) |
| Three item types: hear-and-tap (sound → picture), blend-and-tap (sounds → word), tap-the-tricky-word | Trace-the-letter item; segment-and-build item |
| Three cartridges (10.4) | Five more |
| Teacher: class grid per week, the Friday hot list, reading-record entry, benchmark entry, parent report PDF | Placement probe in the app |
| FSRS deck per child over sounds and tricky words | Adaptive placement across weeks |

### 10.4 Cartridges

Three new cartridges in `packages/game-cartridges` with a new input mode `grapheme` (a list of `{grapheme, phonemeAudio, picture}` items) beside `vocabulary` and `sentence`:

| Cartridge | Play | Evidence surface |
|---|---|---|
| Sound Garden | Hear a sound, tap the flower with the grapheme; flowers bloom | `sound-pick` |
| Word Builder | Drag three graphemes into a word to feed the pet | `blend-build` |
| Tricky Trail | Hop along stones; tap the tricky word you hear | `tricky-pick` |

### 10.5 Evidence policy `storytime-evidence.v1`

On the Primary row shape (`evidencePolicyRowSchema`: surface, objectiveSource, confidence, teacherLedConfidence, countsTowardMastered):

| surface | objectiveSource | confidence | teacherLedConfidence | countsTowardMastered |
|---|---|---|---|---|
| sound-pick | question | 0.6 | 0.4 | true |
| blend-build | question | 0.8 | 0.5 | true |
| tricky-pick | question | 0.7 | 0.4 | true |
| trace | question | 0.3 | 0.3 | false |
| read-along-complete | supporting | 0.2 | null | false |
| song-complete | none | null | null | false |
| reading-record | question | 0.9 | 0.9 | true (teacher-entered) |
| benchmark | question | 1.0 | 1.0 | true (teacher-entered) |

Skip rules as Primary: too-fast under 2,000 ms, blank, no-evidence. Hint step-down: a replayed sound halves confidence. The durable job `storytime.mastery.evidence` follows the Primary job pattern with the idempotency key `activity:<submissionId>`.

### 10.6 Platform contracts

- `programSchema` gains `storytime` (six values: primary, reading, science, math, zhongwen, storytime). Ask the Science track to add it in its Phase 1 contract task; Tutor T6 adds `STORYTIME`. `lesson_shape` value `storytime-week`; `graph_id` `english-phonics`.
- `objectiveSkillSchema` and `shortIdSchema` in `packages/domain/src/primary-mastery/contracts.ts` gain `Phonics` and the prefix `P` (`P<week>.<n>`), plus `Speaking` and `Writing` with `S` and `W` for the GSE nodes without Primary ids; `evidence-policy.ts` gains the same; `record-evidence.ts` `skillOf` maps `english.phonics.*` to Phonics. This is the owner's design change (Monorepo, 2026-10-21); it is one task in the track.
- Hosting: the shared platform container under a storytime hostname and brand tokens (amber), the Science deployment pattern. Tenant scoping and the tenant registry as every other table.

---

## 11. MVP definition and path

### 11.1 Options

| Option | Scope | Sellable to | Fit with 2027 capacity |
|---|---|---|---|
| A. Level 2 print-first | Anuban 3: student book, teacher book, cards, 28 decodables, 28 read-alongs with audio by QR, 28 songs with video and karaoke by QR, benchmarks; no app | A school's Anuban 3 for one year | Fits after the three subject prints (April onward); Workbooks queue from April; Forge scene set small |
| B. Levels 1 and 2 print-first | Option A plus Anuban 2 (no decodables, 28 read-alongs, 28 songs, the PA kit) | A school's Anuban 2 and 3; the full "start" of the program | Adds 56 books and songs; authoring is lighter (shorter texts) |
| C. Levels 1 to 4 with app | Everything in this document | Whole kindergarten and lower primary | Does not fit before the second half of 2027 |

**Recommendation: Option B as the MVP, with Option A as the stop-rule fallback.** Reasons: a school buys Storytime for its kindergarten first; Level 1 is the cheapest content and the strongest motivation year; the app is not needed to sell the book line, and the Tutor Advantage book channel sells print; the read-along player already exists for a web twin of the books, so a QR page is a small build. The app (10.3) follows the print MVP as a second track.

### 11.2 Sequence of milestones (relative; no calendar dates until Daniel sets them)

| Month | Milestone | Owner |
|---|---|---|
| 1 | Decisions S1-S12 taken; phonics graph v0 (letters, GPCs, PA, tricky, standard) passes the gate; lexicon of 2,000 parsed words; word-wall and decodability function with tests | Storytime track, Graph reviews |
| 2 | Week 1 of Level 2 complete in the Workbooks package format: scripts, decodable, read-along, song, strips, cards; Daniel's Thai check; the phoneme audio test decided | Workbooks, Storytime |
| 2 | Forge brief: Chibi Sprouts cast at age 5, 28 places, 24 gesture poses, the three cartridge sets | Forge |
| 3 | Level 2 weeks 1-8 authored and checked; the block-1 benchmark; the home card; the QR page for songs and books (read-along player) | Workbooks, monorepo |
| 4-6 | Level 2 weeks 9-32; Level 1 weeks 1-16; print proof of the Level 2 student and teacher books | Workbooks |
| 7 | Level 1 weeks 17-32; print order Levels 1 and 2; the training day 2; the 14 routine videos | Workbooks, PR |
| 8 | First school: Anuban 2 and 3 start; weekly fidelity visits for 8 weeks | Daniel, PR |
| 9-12 | App MVP (10.3) on the shared platform; Level 3 authoring starts | monorepo, Workbooks |
| 13-18 | Level 3 and 4; the catch-up module; app features "later" | all |

### 11.3 Capacity

- Workbooks queue: the 2027 plan holds 168 lessons to mid-March. Storytime Level 2 week packages are smaller than a Primary lesson (short texts) but five scripts each; estimate 1.5 Primary-lesson equivalents a week, 42 for Level 2, 28 for Level 1. Start after the Zhongwen book (March) unless Daniel re-orders.
- Forge: a kindergarten scene set, the cast at age 5, the gesture poses, and three cartridge art sets. Request in month 2 for delivery by month 6.
- Monorepo: the QR page and read-along reuse (small); the app MVP later; the program enum value now (zero cost in the Science task).
- Daniel's review hours: Thai in the teacher book and home cards, about 20 minutes a week of content, 10 hours a level; benchmark and song checks, 5 hours a level; total about 30 hours for the MVP across months 2-7, under 2 hours a week. This fits beside the subject reviews, which end mid-March.
- Music and video: 56 songs for the MVP. At one song and video a day through the pipelines, 3 months of a background queue. The choreography sheet is text and is cheap.

### 11.4 Stop rules

- If the phoneme audio test fails and no recording session is booked by month 2, the sound cards ship without audio and the QR page carries words and books only.
- If Level 1 is not half authored by month 6, the MVP is Option A (Level 2 only) and Level 1 follows the first school's start.
- If the Forge scene set is not delivered by month 6, the printed books use the Primary picture-book style only and the songs ship as lyric videos.

---

## 12. Risks and open decisions

### 12.1 Risks

| Risk | Effect | Mitigation |
|---|---|---|
| Pure phoneme audio from TTS is poor | Children learn "suh" for /s/; blending fails | The month-2 test and the recording fallback (6.4) |
| Decodable words the child does not know by ear | Decoding without meaning; EFL children lose interest | The word-wall function prints only known-by-ear words; every decodable's words are in the song or read-along of the same or an earlier week; Script A2-A4 teach the word by picture before the letters |
| Thai teachers skip the song or the review deck | The spaced review and the frame practice are lost | The opening routine is one block; the observation form checks it; the fidelity visits |
| Four-year-olds cannot sit 30 minutes | Level 1 fails | Movement every 5-7 minutes in the scripts; no step over 8 minutes |
| Volume of 112 songs and 196 books | Authoring never ends | Option B MVP; strict templates; the song structure fixed; shared picture bank |
| Copyright of reference programs | Reading A-Z, Jolly, DSS are references, not sources | Original words, texts, songs, and games; the graph cites the frameworks (GSE, DfE, Thai curriculum), not the vendors |
| The program enum and Phonics skill changes wait on other tracks | Evidence cannot be recorded for Storytime | The enum value is asked for now; the Phonics skill is one task with Monorepo's two files; the print MVP needs neither |
| Primary and Storytime disagree on the hand-off grade in customer copy | Claims rule failure | One sentence in both product files: Storytime Anuban 2 to P2, hand-off at P3, catch-up inside Primary |

### 12.2 Open decisions for Daniel

| # | Decision | Recommendation | Why |
|---|---|---|---|
| S1 | Phonics order | The Reading A-Z 68-element order, with the five Thai-specific weeks and eleven exit weeks placed as in section 2 | It matches the material in the Drive folder and the decodable per element; Jolly's order shares the start; schools that know Jolly see the same first letters |
| S2 | Level 1 letter-sound order | The same Reading A-Z order, one sound a week after two listening weeks; letter names by the alphabet song daily | Level 2 re-meets letters in the same order |
| S3 | Graph location | `mastery-advantage/english/phonics/`, prefix `english.phonics.*`, owned by the Storytime track; Graph reviews | Graph's preference; one English continuum; Primary can point weak readers at the nodes |
| S4 | MVP | Option B: Levels 1 and 2 print-first with songs and books by QR; Option A if the Level 1 stop rule fires; app as a second track | A school buys kindergarten first; the book channel sells print; the app is not needed to sell |
| S5 | Phoneme audio | Run the mmx test in month 2; record a human bank if fewer than 40 of 44 pass | Pure sounds are the base of everything |
| S6 | Read-along and leveled readers | One library: the read-along books re-cut into class sets by band aa to C; no separate leveled series for MVP | Halves the book count |
| S7 | Cast | The Pip world drawn young, Pip the puppy as mascot from Level 2; Chibi Sprouts cast for the app and videos only | Continuity into Origins 1; the series bible rules hold |
| S8 | Program enum and Phonics skill | Ask Science to add `storytime` now; the Phonics, Speaking, and Writing skill values as one task in the Storytime track when the app starts | Zero cost now, one bounded change later |
| S9 | Song production | mmx music and video pipelines with the fixed structure in 6.3; 24 named gestures; a karaoke cut per song | Volume needs a template |
| S10 | Review deck in print | The expanding schedule 2d, 3d, 1w, 2w, 4w, 8w, printed as dated strips; teacher adds weak items from the record sheet | The printed program is the spaced repetition; the app personalises |
| S11 | Benchmarks | Four a level as in section 7, the speaking assessment at weeks 16 and 32, reading records four children a week | Matches the review weeks and the school's reporting |
| S12 | Hand-off statement | "Storytime Advantage: Anuban 2 to P2. Primary Advantage from P3. A P3 class without phonics runs the Primary catch-up module." in both product files, the battle card, and the matrix | PR's requirement |
| S13 | Timing | Authoring from March, after the Zhongwen book; first school in month 8 of the sequence; no public date | Capacity (11.3) |
| S14 | Thai check hours | About 30 hours for the MVP, under 2 hours a week | Inside the 10-20 hour budget |

---

## 13. Sources

### External

- Reading A-Z phonics lesson 3 (Consonant Pp), decodable "Nan and Pap", lesson 46 (Sh digraph), nonsense-word assessment, Decodable Passages Packs scope and sequence: Daniel's Drive folder "Phonics and pronunciation" (id 1Mb3f8jO-hRlftFvglG73-7Zw73zzQ48H), © Learning A-Z, www.readinga-z.com (references only)
- Reading A-Z Phonological Awareness sequence (32 lessons): Daniel's Drive document "RAZ sequence" (id 18J3bzCWsS_pEv0tt7V5jgRby8B3HzIh39JD_Ug2kBjU); Learning A-Z "Teaching the Foundations" https://www.learninga-z.com/user_area/content_media/raw/teaching-the-foundations-readers.pdf
- Jolly Phonics word bank and workbooks 1-6: the same Drive folder, © Jolly Learning (reference only); groups: https://rainbowresource.com/027183.html
- Developing Sound Sense (sightwords.com): https://sightwords.com/phonemic-awareness/curriculum/ ; pacing and assessment https://sightwords.com/phonemic-awareness/pacing-assessment/ ; Fast Track https://sightwords.com/phonemic-awareness/pacing-assessment/fast-track/ ; teaching tips https://sightwords.com/phonemic-awareness/teaching-tips/
- Letters and Sounds phases: https://home.oxfordowl.co.uk/reading/what-is-letters-and-sounds/ ; https://www.twinkl.jp/teaching-wiki/order-of-phonics-teaching
- Little Wandle progression: https://www.st-norberts.lincs.sch.uk/wp-content/uploads/sites/40/2024/05/English-Whole-School-Reading-Progression-Little-Wandle.pdf ; tricky words https://www.ewanrigg.cumbria.sch.uk/curriculum/english/little-wandle/send-programme-progression.pdf
- DfE core criteria for SSP validation (2021): https://www.gov.uk/government/publications/phonics-teaching-materials-core-criteria-and-self-assessment/validation-of-systematic-synthetic-phonics-programmes-supporting-documentation
- England Phonics Screening Check: https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/368311/Phonics_screening_check-2012_technical_report.pdf
- DIBELS 8: https://dibels.uoregon.edu/sites/default/files/2026-06/dibels_benchmark_administration_timeline.pdf
- Thai Basic Education Core Curriculum B.E. 2551, Foreign Languages: https://pls.edu.iwate-u.ac.jp/wp-content/uploads/2018/10/ThaiEnglish.pdf
- Thai Early Childhood Curriculum B.E. 2560 (a school copy): https://www.abss.ac.th/pdf/cirpdf/curriKinABSS2564.pdf
- Pearson GSE Young Learners learning objectives: https://www.pearson.com/content/dam/pearson-sites/shared/gse-learning-objectives-young-learners.pdf
- Cambridge Pre A1 Starters handbook and word list: https://www.cambridgeenglish.org/Images/handbook-for-teachers-pre-a1-starters-a1-movers-and-a2-flyers.pdf ; https://www.cambridgeenglish.org/images/351849-pre-a1-starters-word-list-2018.pdf
- Thai L1 interference: https://ajaclibrary.wu.ac.th/index.php/ajac/article/view/77 ; https://so05.tci-thaijo.org/index.php/tgt/article/view/273223
- Decodable text criteria: https://pioneervalleybooks.com/blogs/news/teaching-tip-what-makes-a-good-decodable-book ; https://www.readingrockets.org/classroom/choosing-and-using-classroom-texts/using-decodable-books
- Competitors: https://readingeggs.com/pricing/ ; https://www.oup.es/en/oxfordreadingclub ; https://learninga-z.com/site/lp2/back-to-school-savings-extended ; https://help.lingokids.com/hc/en-us/articles/115005120505
- National Reading Panel report (2000): Daniel's Drive folder, report.pdf

### Internal

- `~/Desktop/Workbooks/docs/content-plans/primary-origins-1-plan.md`, `content/primary/origins-1/l01.json`, `docs/content-plans/data/a0-objective-key.json`, `docs/content-plans/primary-origins-series-bible.md`, `docs/content-plans/level-plans/coverage.md`, `dashboard/scripts/level-coverage.ts`
- `~/Desktop/Workbooks/dashboard/lib/lesson-package/schema.ts`, `dashboard/lib/inject/`, `dashboard/lib/teacher-manual/` (i18n/th.ts headings), `dashboard/lib/media/audio.ts`, `Teacher guide/` (trainers-guide, observation forms, training slides)
- `~/Desktop/mastery-advantage/SPECIFICATION.md` §3-4; `english/gse-knowledge-space.json`; `english/gse-md/young-learners/*.md`; `english/cefr-vocabulary/README.md`, `overlays/viu-unit-groups.overlay.json`, `review/enrichment/viu-layer-readme.md`; `english/gse-to-primary-advantage.csv`; `storytime/README.md`
- Monorepo (primary-parity-integration): `packages/domain/src/primary-mastery/contracts.ts`, `evidence-policy.ts`, `record-evidence.ts`; `packages/game-cartridges/src/catalog.ts`; `apps/primary-advantage/components/read-along/`; `measure/tracks/science_advantage_relaunch_20261006/spec.md` (the second-subject pattern), `zhongwen_advantage_program_20261006/` (track format); `measure/subject-programs-2027-capacity.md`
- `~/Desktop/advantage-pr/03-products/storytime-advantage.md`, `primary-advantage.md`, `08-strategy/product-strategy-2026-2027.md`, `04-services/onboarding-and-training.md`, `12-operations/primary-teacher-training-plan.md`, `05-methodology/big-4-protocol.md`, `AGENTS.md` claims rules
- Session scratchpad: `gse-yl-10-21-nodes.tsv`, `pa_sequence.txt`, `drive-dl/`, `agent1/dp.txt`, `design/gen_sequence.py` (the sequence generator)
