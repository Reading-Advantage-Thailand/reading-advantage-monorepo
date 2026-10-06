# Specification: Zhongwen Advantage Program

**Track ID:** `zhongwen_advantage_program_20261006`
**Type:** feature (classic FR list)
**Status:** proposed — Z9 decided by Daniel on 2026-10-06: proceed for May 2027. Science D1 and D2 approved. Z1 to Z7 open (see `measure/subject-programs-open-decisions.md`). No code changes before approval.
**Pattern:** the second-subject pattern in `../science_advantage_relaunch_20261006/spec.md`. Depends on Science D1 and D2.
**Capacity:** see `../../subject-programs-2027-capacity.md`. Chinese text, pinyin, and tones are checked by contracted Chinese speakers (Daniel names them by 2026-12-18); Thai stays with Daniel.

## 1. Review of what exists (2026-10-06, read-only)

| Item | State | Note |
|---|---|---|
| Code | None. No app, no package, no content in any repo on this machine. | Confirmed by search of the monorepo, `mastery-advantage`, and `Workbooks`. |
| Graph | `~/Desktop/mastery-advantage/zhongwen/README.md` is a placeholder ("Status: Planning"). It proposes HSK levels 1 to 9 as the axis and lists open questions on characters, pinyin, and Thai interference. | The graphs session builds only English. This track owns the Zhongwen graph. |
| Product file | `advantage-pr/03-products/zhongwen-advantage.md` v1.2: grades 3 to 12, HSK framework, extensive reading with pinyin, tone audio, English summaries, FSRS for vocabulary and characters. | The framework needs a young-learner fit (section 2). |
| Website | `apps/www-reading-advantage/DESIGN.md` mentions Zhongwen; no product page with claims was found in the app source. | No date is public. |
| Lesson shape | None. The English shape has 13 steps and is a reading lesson. | Zhongwen is a reading product, so the English shape fits with a script layer (section 3). |
| Reviewer | Daniel has several Chinese speakers he can contract (2026-10-06). Daniel checks Thai. | The names and the contract are a dated task (Z8), not a blocker. |

## 2. Framework fit for primary grades

HSK (Hanyu Shuiping Kaoshi) is the adult and secondary proficiency test. Its lowest level needs about 150 words and reads as an adult syllabus. The young-learner counterpart from the same body is **YCT (Youth Chinese Test)**, four levels for school-age learners; YCT 1 needs about 80 words and YCT 2 about 150, with picture-based reading. Thailand's Ministry of Education also publishes a Chinese curriculum framework for basic education. (Confidence: high on the HSK and YCT roles; the exact word counts and the Thai framework title must be checked against the sources before the graph is built.)

**Recommendation:** YCT 1 and 2 as the objective set for P3 and P4, with HSK 3.0 band labels as alignment metadata so the product file's "HSK-aligned" claim stays true. The Zhongwen graph README's HSK 1 to 9 axis is kept for secondary later.

## 3. Overview

Build Zhongwen Advantage as a program of the shared K-12 platform: a Chinese reading lesson in the English 13-step shape with a script layer (characters, pinyin, tone audio, Thai gloss), one printed workbook of 14 lessons, FSRS for characters and vocabulary, and Mastery Advantage in shadow mode. Because the lesson shape is the English one, the Primary lesson player is reused with a script layer rather than rebuilt.

## 4. Functional Requirements

### FR-1 Zhongwen graph and package
- `mastery-advantage/zhongwen/zhongwen-knowledge-space.json` with vocabulary nodes (YCT 1 and 2), character nodes with radical and stroke-count metadata and `prerequisite_for` edges from components to compound characters, grammar pattern nodes, and reading can-do nodes per level. HSK 3.0 band as alignment metadata.
- `packages/zhongwen-knowledge` from the `science-knowledge` pattern.

### FR-2 Lesson shape (Q-WB-10a for Zhongwen)
- The English 13 steps (Before You Read, Key Vocabulary, Read the Article, Collect Vocabulary, Deep Reading Notes, Collect Sentences, Comprehension Check, Guided Response, Vocabulary Practice, Sentence Practice, Guided Writing, Language Questions, Lesson Reflection) with one change: Vocabulary Practice includes character writing with stroke order. Every text field gains `hanzi`, `pinyin`, and `thai` forms.

### FR-3 Content
- One book of 14 leveled texts (narrative and informational), authored graph-first in the Workbooks repo under the Primary production rules. Tone audio for every passage by the standard pipeline; a Mandarin voice is a decision (Z5).
- Contracted Chinese speakers check characters, pinyin, tones, and the tone audio before print (Z8). Daniel checks the Thai.

### FR-4 Player and FSRS
- The Primary lesson player with a script layer: character, pinyin toggle, tone audio per sentence, Thai gloss on tap.
- Character and vocabulary cards in the FSRS flashcard flow with node IDs.
- Evidence follows a `zhongwen-evidence.v1` policy as data on the Primary pattern (`evidence-policy.ts`) and a durable job `zhongwen.mastery.evidence`; no new evidence code.

### FR-5 Program, engagement, teacher views
- `program = zhongwen` from the Science program dimension; Chibi Quest skin with a Chinatown and temple scene set from forge.
- Three Play Kit cartridges with character and word lists (match, order, listen-and-pick).
- Class grid per book and step; vocabulary and character coverage per class.

### FR-6 Milestones
- Demo 2027-03-29. Final print order by 2027-04-09 (in hand by 2027-05-07, ten days before the start).

## 5. Non-Functional Requirements

Same as Science. In addition: all Chinese text passes the contracted Chinese review before it reaches a printed page.

## 6. Non-Goals

- Secondary Chinese, HSK 3 and above.
- Handwriting recognition.
- Speaking assessment (no Reedy).
- A second book in this track.

## 7. Acceptance Criteria

1. The Zhongwen graph passes the validation gate.
2. One book of 14 texts is in the canonical store with node IDs on every row, and the Chinese review is recorded per lesson.
3. A student reads a text with pinyin toggle, tone audio, and Thai gloss, and completes the 13 steps.
4. Character and vocabulary cards appear in the FSRS queue; each review commits evidence.
5. Three cartridges run with character lists.
6. The demo checklist passes on the agreed date.
