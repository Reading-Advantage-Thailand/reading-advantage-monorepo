# Storytime Advantage Program

**Date:** 2026-10-21. **Status:** proposed; planning only, no code, no public date.
**Track:** [`tracks/storytime_advantage_program_20261021/`](./tracks/storytime_advantage_program_20261021/) (spec, plan, decisions, sources, the full design).

## What it is

Storytime Advantage is the English program for Anuban 2 to P2 in Thai private schools, with a reading and phonics emphasis. It is the first tier of the English reading continuum: Storytime, then Primary Advantage from P3, then Reading Advantage. It is a printed program with scripted lessons, a card kit, a weekly read-along book and song, a decodable book per phonics element, printed spaced review, benchmarks, and a digital twin (Chibi Sprouts) inside the shared platform.

## Shape (Daniel, 2026-10-21)

| Item | Value |
|---|---|
| Levels | 1 Anuban 2, 2 Anuban 3, 3 P1, 4 P2; hand-off at P3; a catch-up module inside Primary for P3 classes without phonics |
| Year | 32 weeks a level: 28 teaching, 4 review and check |
| Periods | 5 a week; 30 minutes in Anuban, 49 in primary |
| Lessons | Five reusable daily scripts, printed in full; the same opening routine every period: greeting, calendar, song, review deck |
| Phonics | The Reading A-Z 68-element order across Levels 2 to 4, with five Thai-specific weeks and eleven exit-profile weeks; a 32-lesson phonemic awareness sequence in Level 1 |
| Graph | `mastery-advantage/english/phonics/`, prefix `english.phonics.*`, about 460 nodes, linked to the GSE Young Learner nodes at GSE 10 to 21 |
| Exit | The entry state of Primary Origins 1: decoding scope, 92 sight words, 13 frames, 300 Starters words by ear |
| Theme | Chibi Sprouts: the kindergarten sibling of Chibi Quest; no combat; the avatar grows up into Chibi Quest at hand-off |
| MVP | Levels 1 and 2 in print, songs and books by QR, benchmarks, training, one school; the app, Levels 3 and 4, and the catch-up module follow |

## Where it touches the other programs

- **Primary Advantage:** receives the exit profile at P3; hosts the catch-up module; the Primary mastery contracts gain a Phonics skill when the app starts.
- **Science, Math, Zhongwen:** the program enum gains `storytime`; the subject programs keep the engineering lane through March 2027, so Storytime authoring starts after the Zhongwen book (recommendation S13).
- **Workbooks:** authors every asset under the Primary production rules with a `storytime-week` package shape; the teacher manual generator builds the teacher book.
- **Forge:** builds the Chibi Sprouts pack.
- **PR:** carries the hand-off sentence and keeps "planned, no date".

## Open

Decisions S1 to S14 in the track's `decisions.md`. Dates are relative until Daniel sets them.
