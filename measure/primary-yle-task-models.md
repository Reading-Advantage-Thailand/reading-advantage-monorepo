# Primary YLE Task Models

Version 0.2 | Date 2026-10-07 | Status: Decisions approved | Owner: Daniel Bo | Internal (names
Cambridge YLE; never quote in student or external copy)

## 1. Purpose

This file lists the task types ("task models") of the Cambridge Pre A1 Starters, A1 Movers, and
A2 Flyers exams. It shows which models Primary can run today and which models need new work. The
goal is YLE-format practice after a story and YLE-format tests for a level.

## 2. Sources

| Source | State |
|---|---|
| `722535-cambridge-english-young-learners-sample-papers-volume-1.pdf` (cambridgeenglish.org, 100 pages, © 2024 Cambridge University Press & Assessment) | Read 2026-10-07. Kept only in the session scratchpad, not in a repository. |
| britishcouncil.hk "books, related games, exam vocabulary lists" page | Not read: two downloads and one fetch timed out on 2026-10-07. |
| YLE word lists | Already in Workbooks: `docs/content-plans/data/yle-starters-words.md`, `yle-movers-words.md`, `yle-flyers-words.md`, `a2-key-words.md`, from the vocabulary graph `cefr-vocabulary-knowledge-space.json` (3,752 nodes). |

Rights rule (approved 2026-10-07): we copy the task formats and the short rubric lines, so that children see
the same instructions as in the exam. We do not copy items, texts, pictures, or audio scripts from
the sample papers. Workbooks writes new items with the Primary characters and the level word lists.
Pictures come from advantage-forge only.

## 3. Exam shape

| Level | Listening | Reading and Writing | Speaking | Primary levels (AUTHORING.md) |
|---|---|---|---|---|
| Pre A1 Starters | 4 parts, 20 items | 5 parts, 25 items | 4 tasks | levels 1-3 (A0-, A0, A0+) |
| A1 Movers | 5 parts, 25 items | 6 parts, 35 items | 4 tasks | levels 4-6 (A1-, A1, A1+) |
| A2 Flyers | 5 parts, 25 items | 7 parts, 44 items | 4 tasks | levels 7-9 (A2-, A2, A2+) |

Every part starts with one worked example. Every written answer must have the correct spelling.
The answer keys list accepted alternatives with a slash and optional words in brackets.

## 4. Task models

The rubric lines below quote the British exam papers. App copy uses American spelling ("color"),
and answer keys accept both spellings.

One model can appear at more than one level. The "Primary today" column names the existing
evidence surface (`packages/domain/src/primary-mastery/evidence-policy.ts`) or the gap.

### 4.1 Listening

| Id | Rubric | Levels and part | Input | Response | Primary today |
|---|---|---|---|---|---|
| `L-lines` | Listen and draw lines. | S1, M1, F1 (5 each) | Scene picture, names around it, dialogue audio | Connect each name to a person | Gap: scene picture, drag line |
| `L-write` | Listen and write (a name or a number). | S2, M2, F2 (5 each) | Form or questions, dialogue audio with spelled names | One word or number | Near `saq`; gap: audio, exact key |
| `L-letter` | Listen and write a letter in each box. | M3, F3 (5 each) | Two picture sets (people or days, objects A-H) | Match by letter | Gap: picture matching with audio |
| `L-tick` | Listen and tick the box. | S3, M4, F4 (5 each) | Question, three pictures A-C, audio | Choose one picture | Near `mcq`; gap: picture options, audio |
| `L-colour` | Listen and colour (and write). | S4 (colour), M5, F5 (colour and write) | Scene picture, audio | Colour an object; write one word on an object | Gap: tap-to-colour scene |

### 4.2 Reading and Writing

| Id | Rubric | Levels and part | Input | Response | Primary today |
|---|---|---|---|---|---|
| `RW-tick-cross` | Look and read. Put a tick or a cross in the box. | S1 (5) | Picture and one sentence | True or false | Near `mcq`; gap: picture stem |
| `RW-yes-no` | Look and read. Write yes or no. | S2 (5) | One scene, five sentences | yes or no | Near `mcq`; gap: picture stem |
| `RW-spell` | Look at the pictures. Look at the letters. Write the words. | S3 (5) | Picture and mixed letters | Spell the word | Gap: letter tiles |
| `RW-box-cloze` | Read this. Choose a word from the box. | S4 (5, word box with pictures), M3 and F3 (5 and a title) | Short text, word box | Write a box word in each gap; M3 and F3 also choose the best title | Near `cloze`; title choice is `mcq` |
| `RW-picture-qa` | Look at the pictures and read the questions. Write one-word answers. | S5 (5) | Picture story of three scenes | One word | Near `saq`; gap: picture stem, exact key |
| `RW-definitions` | Look and read. Choose the correct words and write them on the lines. | M1 (5), F1 (10) | Definitions, word bank with pictures | Write the defined word | Near `matching` |
| `RW-dialogue` | Read the text and choose the best answer. | M2 (6, A-C each), F2 (5, one list A-H) | Short dialogue | Choose the reply | `mcq` (M2); gap: shared option list (F2) |
| `RW-3-option-cloze` | Read the text. Choose the right words and write them on the lines. | M4 (5), F4 (10) | Factual text, three options a gap | Choose the word (grammar) | `mcq` |
| `RW-story-complete` | Look at the pictures and read the story. Write some words. | M5 (7, 1-3 words), F5 (7, 1-4 words) | Story with pictures | Complete sentences | Near `saq`; gap: word limit, exact key |
| `RW-picture-write` | Look and read and write. | M6 (6) | One scene | Complete two sentences, answer two questions, write two sentences | Near `saq`; free sentences need a rubric |
| `RW-open-cloze` | Read the diary and write the missing words. Write one word on each line. | F6 (5) | Diary text, no word box | One word a gap | Near `saq`; gap: exact key |
| `RW-story-write` | Look at the three pictures. Write about this story. Write 20 or more words. | F7 (1 task, 5 marks) | Three pictures | Short story | `laq` (gives no evidence today) |

### 4.3 Speaking

| Id | Task | Levels |
|---|---|---|
| `SP-scene` | Point to things in a scene, put object cards on it, answer "What's this?" and "What colour?" | S1, S2 |
| `SP-cards` | Answer questions about four object cards | S3 |
| `SP-differences` | Say how two pictures are different | M1, F1 |
| `SP-info-exchange` | Answer, then ask, questions about two information cards | F2 |
| `SP-story` | Continue a picture story from its first picture | M2, F3 |
| `SP-odd-one-out` | Say which picture is different and why | M3 |
| `SP-personal` | Answer questions about self and a topic | S4, M4, F4 |

Speaking needs an examiner turn engine on top of the voice sessions (`primary_voice_sessions`).
This file does not plan it.

## 5. What each group needs

| Group | Models | New work |
|---|---|---|
| A. Text only | `RW-dialogue` (M2), `RW-3-option-cloze`, `RW-box-cloze`, `RW-open-cloze`, `RW-story-complete` | An exact answer key on short answers (accepted spellings, slash alternatives, optional words, word limit). A task model id on each item. |
| B. Picture stem | `RW-tick-cross`, `RW-yes-no`, `RW-picture-qa`, `RW-definitions`, `RW-picture-write`, `RW-spell` | Group A, plus an image on the item stem and on options, plus letter tiles for `RW-spell`. Forge pictures. |
| C. Listening | `L-*` | Group B, plus audio with two voices (adult, child), scene pictures with named hot spots, and three interactions: drag line, letter match, tap-to-colour. |
| D. Writing with a rubric | `RW-picture-write` sentences, `RW-story-write` | A rubric score (teacher or AI) before `laq` can give evidence. |
| E. Speaking | `SP-*` | Not planned. |

## 6. Fit with the mastery graph

- Each item keeps its objective tags (T1). The task model id is metadata on the item, not a new
  objective.
- Listening items set `objectiveSkill: Listening`; the existing rule skips evidence when the
  screen reports that the audio did not play.
- A level test can use the `LEVEL_TEST` activity. The owner decides if test answers give mastery
  evidence and at which confidence.

## 7. Owner decisions (2026-10-07)

1. Rights: formats only, as in section 2. No Cambridge items, pictures, or audio in the product.
2. First scope: groups A and B. Listening (C), rubric writing (D), and speaking (E) come later.
3. Placement: both. A few YLE-format items in each story package after reading, and a separate
   practice and test bank per level.
4. Test evidence: yes, at the same confidence as practice items of the same surface.
5. Level map by CEFR: Starters formats for levels 1-3, Movers for levels 4-6, Flyers for
   levels 7-9.
6. Thai: practice items show the English rubric plus a Thai line; tests show English only.
7. Pictures: scene items in a story package use that story's own Workbooks pictures;
   single-word pictures and the level bank use Forge pictures.
8. Start: the track spec is written now; Workbooks and Forge start after the deploy on
   2026-10-11.

9. Scope order: Starters (Pre-A1) models first, the five reading and writing models; Movers
   models when Quest 4 prints; Flyers later.
10. Part 5 three-picture stories for the level test forms: Workbooks makes them.
11. Secure pool: the certificate test forms are a separate, locked item set. Its items never
    appear in practice, homework, lessons, the level bank, or teacher previews. The app serves
    them only inside a test sitting, keeps the answer key on the server, and shows results per
    skill, not the items. Evidence views show the objective of a secure item, never its text.

Word rule (Workbooks, 2026-10-07; the owner can make it stricter): the words of an item follow
the word list of its Primary level, not the list of the exam whose format it uses. Level 5 uses
the Movers list, level 6 the Flyers list (Movers format), level 7 the Flyers list, and levels 8-9
the A2 Key list (Flyers format). These are the same words as the story texts of that level.

Open: Workbooks writes the items (a new section in AUTHORING.md) and Forge makes the pictures.
Both sessions confirm before the track starts.

## 8. Forge answer (2026-10-07)

- Single-object pictures: yes. Each word is a new Forge asset source and a review; most YLE words
  are not in the catalog now.
- One-scene pictures: yes, through the Forge scene composer. Present-day people (child, mother,
  teacher) are new; the avatar base is the start.
- Three-scene picture stories: possible but slow (poses, same characters in each scene). Plan last.
- Picture id: the Forge asset name (for example `kite`) plus a picture kind for scenes and stories.
  A Forge picture manifest (id, word, list level, file path, alt text) is to be agreed with Forge.
- Constraints: Chibi Quest style, rated G, one clear word a picture with no second nameable
  object on tick/cross items, readable at the stem size on a phone, reviewer bar 7 of 10.
- Input from the track: a word list with a priority per list level, and the stem sizes.
- Forge starts asset work only on the owner's word to the Forge session.
