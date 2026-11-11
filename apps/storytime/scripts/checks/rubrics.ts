#!/usr/bin/env tsx
/**
 * The stage 2 rubric set of the Storytime media kinds (plan task 5.4, rule 6.7b, AC-11.2).
 *
 * The set holds one rubric for each of the six kinds of the media list: `word cut`, `phoneme`,
 * `song`, `video`, `picture`, and `book audio`. Each rubric holds the known faults of rule 6.7b
 * for its kind, the known bad files of that kind, and the files of that kind that Daniel passed.
 * Each entry of a rubric is one point that must hold for a pass. This script states that one
 * semantics for the points, and it holds no other.
 *
 * A rubric counts only after the live calibration fails its known bad files and passes a file that
 * Daniel passed (rule 6.7d). This script holds the shape of the set and the file paths. The live
 * calibration of task 5.4 is a model run with ledger lines; it is not a test (P5.9).
 *
 * The known bad files of AC-11.2: the cut-off "Hello" of BA1, the hissy `04-n.mp3`, the week 2
 * cut 1 of C1W2, and the gesture thumbnail for "One sun". The BA1 and C1W2 files sit in no
 * hand-off package yet, so the PM is asked where they live and their paths stay empty. The song
 * and the video have no received bad take yet, so their entries say so and hold an empty path.
 *
 * A path is relative to a hand-off package root, for example
 * `~/Desktop/handoff/w01-storytime-app-package-r4` or
 * `~/Desktop/handoff/w02-storytime-app-package-r3`.
 */

/** The six kinds of the media list, in the order of the stage 2 rubric column. */
export const RUBRIC_KINDS = [
  "word cut",
  "phoneme",
  "song",
  "video",
  "picture",
  "book audio",
] as const;

/** The kind of one stage 2 rubric. */
export type RubricKind = (typeof RUBRIC_KINDS)[number];

/** One known bad file of one kind. */
export interface KnownBadFile {
  /** The name of the file for the owner, for example the cut-off "Hello" of BA1. */
  label: string;
  /** The path of the file inside a hand-off package; empty when no package holds the file. */
  path: string;
}

/** One stage 2 rubric of one kind. */
export interface Rubric {
  /** The kind of the rubric. */
  kind: RubricKind;
  /** The points of rule 6.7b for the kind. Each entry is a point that must hold for a pass. */
  knownFaults: string[];
  /** The known bad files of the kind, for the calibration of rule 6.7d. */
  knownBadFiles: KnownBadFile[];
  /** The paths of the files of the kind that Daniel passed. */
  passedFiles: string[];
}

/** The rubric set of task 5.4. */
export const RUBRICS: Rubric[] = [
  {
    kind: "word cut",
    knownFaults: [
      "the cut holds the whole word and takes no part of the next word",
      "the cut holds no clipped start",
    ],
    knownBadFiles: [{ label: "the week 2 cut 1 of C1W2", path: "" }],
    passedFiles: ["l2/media/w01/words/wa-net.mp3"],
  },
  {
    kind: "phoneme",
    knownFaults: [
      "the take gives the right sound",
      "the take holds no hiss, hum, or clipping",
      "the take holds no extra sound",
    ],
    knownBadFiles: [{ label: "the hissy 04-n.mp3", path: "phonemes/daniel/04-n.mp3" }],
    passedFiles: ["phonemes/daniel/01-s.mp3"],
  },
  {
    kind: "song",
    knownFaults: [
      "the lyric is sung as written",
      "the take has no long instrumental intro",
      "the take holds no artefact",
      "the diction is clear",
    ],
    knownBadFiles: [
      {
        label: "no known bad song take yet: the PM is asked for the first rejected Lyria take",
        path: "",
      },
    ],
    // Daniel passed the w01 package on 2026-11-07; the song is his recorded deviation (2026-11-11).
    passedFiles: ["l2/media/w01/song.mp3"],
  },
  {
    kind: "video",
    knownFaults: [
      "the cuts land on the beat",
      "the named object is visible after the question",
      "the scene reads as its place",
      "the motion in time with the music",
      "no frozen or hidden figure",
    ],
    knownBadFiles: [
      {
        label: "no known bad video take yet: the PM is asked for the first rejected option C render",
        path: "",
      },
    ],
    passedFiles: ["l2/media/w01/song.mp4"],
  },
  {
    kind: "picture",
    knownFaults: [
      "the picture shows the named object in the stated count",
      "a gesture thumbnail is never a line picture",
      "a figure holds no deformed or extra hands",
      "a figure holds no deformed or extra faces; pictures, toys, and decorations in the scene do not count",
      "the picture holds no wrong text",
    ],
    knownBadFiles: [
      { label: 'the "One sun" gesture thumbnail', path: "l2/media/w02/song-lines/point-up.jpg" },
    ],
    passedFiles: ["l2/media/w01/books/1-hello/p01.jpg"],
  },
  {
    kind: "book audio",
    knownFaults: [
      "the page is read as written",
      "the reading is at child speed",
      "the reading asks a natural question and answers it",
    ],
    knownBadFiles: [{ label: 'BA1 "Hello", the cut-off take', path: "" }],
    passedFiles: ["l2/media/w01/books/1-hello.mp3"],
  },
];

/**
 * Gives the rubric of one kind.
 * @param kind The kind of the media list.
 * @returns The rubric of the kind, or undefined when the kind is unknown.
 */
export function rubricFor(kind: string): Rubric | undefined {
  return RUBRICS.find((rubric) => rubric.kind === kind);
}
