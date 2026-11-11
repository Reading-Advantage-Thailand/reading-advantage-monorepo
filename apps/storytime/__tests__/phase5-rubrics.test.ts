// @vitest-environment node
// Phase 5 red test for plan task 5.4: the stage 2 rubrics.
//
// The rubric set lives in `apps/storytime/scripts/checks/rubrics.ts`. This file is the contract.
//
// Contract of `rubrics.ts`:
//   - It exports `RUBRICS`. The value is a list of rubric objects, one for each of the six kinds
//     of the media list: `word cut`, `phoneme`, `song`, `video`, `picture`, and `book audio`.
//   - A rubric holds `kind`, `knownFaults`, `knownBadFiles`, and `passedFiles`.
//   - The `kind` field holds one of the six kind names above. Each kind appears once.
//   - The `knownFaults` field holds the known faults of rule 6.7b for that kind. The value is a
//     list of short phrases, one per fault, or one text that holds every fault.
//   - The picture rubric names the named object of rule 6 and the gesture rule of rule 9.1: a
//     gesture thumbnail is never a line picture. Its text holds the words `gesture` and
//     `line picture`.
//   - Each entry of `knownFaults` is a point that must hold for a pass. The script states this
//     one semantics in its header, and it holds no other.
//   - The text of a rubric holds the wording of rule 6.7b for its kind. The phoneme rubric names
//     the hum, the video rubric names the scene that reads as its place, and the book audio
//     rubric asks for a natural question and answer.
//   - The `knownBadFiles` field holds the known bad files of that kind. Each entry holds a
//     `label` and a `path`. The label names the file for the owner, for example the cut-off
//     "Hello" of BA1. The path is the path of the file inside a hand-off package. The path is
//     empty when the file is not in a hand-off package yet.
//   - The `passedFiles` field holds the paths of the files of that kind that Daniel passed.
//   - The set of known bad files holds the four files of AC-11.2: the cut-off "Hello" of BA1,
//     the hissy `04-n.mp3`, the week 2 cut 1 of C1W2, and the gesture thumbnail for "One sun".
//
// A rubric counts only after it fails its known bad files and passes a file that Daniel passed
// (rule 6.7d). The model run of that calibration is not a test. This file proves the shape of the
// rubric set: one rubric for each kind, the known faults of rule 6.7b, the known bad file of
// each kind, and the file that Daniel passed.
//
// The test reads `apps/storytime` and the hand-off packages only. It reads no track path, so it
// stays valid after the track moves to `measure/archive/`.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** The rubric set of task 5.4. */
const RUBRICS_PATH = resolve(app, "scripts", "checks", "rubrics.ts");

/** The roots that hold the media of the track. A path is relative to one of them. */
const MEDIA_ROOTS = [
  resolve(homedir(), "Desktop/handoff/w01-storytime-app-package-r4"),
  resolve(homedir(), "Desktop/handoff/w02-storytime-app-package-r3"),
  resolve(homedir(), "Desktop/Workbooks/content/storytime"),
];

/** The six kinds of the media list. The stage 2 rubric column names them. */
const KINDS = ["word cut", "phoneme", "song", "video", "picture", "book audio"];

/** The known faults of rule 6.7b for each kind. Each entry holds the accepted wordings. */
const KNOWN_FAULTS: Record<string, string[][]> = {
  "word cut": [["whole word"], ["next word"], ["clipped start"]],
  phoneme: [["right sound"], ["hiss"], ["clipping"], ["extra sound"]],
  song: [["sung as written"], ["instrumental intro"], ["artefact", "artifact"], ["diction"]],
  video: [["beat"], ["named object"], ["motion in time"], ["frozen"], ["hidden figure"]],
  picture: [["named object"], ["stated count"], ["hands"], ["faces"], ["wrong text"]],
  "book audio": [["read as written"], ["child speed"], ["question"]],
};

/** The known bad files of AC-11.2. Each entry holds the words of the label. */
const KNOWN_BAD_FILES: Array<{ words: string[]; owner: string }> = [
  { words: ["ba1"], owner: "the cut-off Hello of BA1" },
  { words: ["04-n"], owner: "the hissy 04-n.mp3" },
  { words: ["c1w2"], owner: "the week 2 cut 1 of C1W2" },
  { words: ["one sun"], owner: "the gesture thumbnail for One sun" },
];

/** One known bad file of a rubric. */
interface BadFile {
  /** The name of the file for the owner. */
  label: string;
  /** The path of the file inside a media root. It is empty when the file is not in a root. */
  path: string;
}

/** One rubric of the set. */
interface Rubric {
  /** The kind of the rubric. */
  kind: string;
  /** The known faults of rule 6.7b for the kind. */
  knownFaults: string[] | string;
  /** The known bad files of the kind. */
  knownBadFiles: BadFile[];
  /** The paths of the files of the kind that Daniel passed. */
  passedFiles: string[];
}

/**
 * Reads the rubric set script.
 * @returns The exports of the rubric set script.
 */
async function loadRubrics(): Promise<Record<string, unknown>> {
  expect(existsSync(RUBRICS_PATH), `Missing ${RUBRICS_PATH}`).toBe(true);
  const module = (await import(/* @vite-ignore */ new URL(`file://${RUBRICS_PATH}`).href)) as Record<
    string,
    unknown
  >;
  return module;
}

/**
 * Reads the rubric list of the rubric set script.
 * @returns The list of the rubrics.
 */
async function readRubrics(): Promise<Rubric[]> {
  const script = await loadRubrics();
  const rubrics = script["RUBRICS"];
  expect(Array.isArray(rubrics), "the rubric script exports no list RUBRICS").toBe(true);
  return (rubrics as Rubric[]) ?? [];
}

/**
 * Tells whether one path exists in one of the media roots.
 * @param path The path of the file inside a media root.
 * @returns True when the file exists in one of the roots.
 */
function existsInMedia(path: string): boolean {
  return MEDIA_ROOTS.some((root) => existsSync(resolve(root, path)));
}

/**
 * Reads the text of the known faults of one rubric.
 * @param rubric The rubric.
 * @returns The faults as one lower-case text.
 */
function faultTextOf(rubric: Rubric): string {
  const faults = rubric.knownFaults;
  const text = Array.isArray(faults) ? faults.join(" | ") : String(faults ?? "");
  return text.toLowerCase();
}

describe("Phase 5 stage 2 rubrics (rule 6.7b and rule 6.7d)", () => {
  it("names the rubric script of task 5.4", () => {
    expect(existsSync(RUBRICS_PATH), `Missing ${RUBRICS_PATH}`).toBe(true);
  });

  it("holds one rubric for each of the six kinds", async () => {
    const rubrics = await readRubrics();
    expect(rubrics.length, "the rubric set holds no rubric").toBeGreaterThan(0);
    expect(rubrics.length, "the rubric set does not hold six rubrics").toBe(KINDS.length);
    const kinds = rubrics.map((rubric) => rubric.kind);
    expect([...kinds].sort(), "the rubric set holds a wrong kind").toEqual([...KINDS].sort());
    for (const kind of KINDS) {
      const count = kinds.filter((held) => held === kind).length;
      expect(count, `the rubric set holds ${count} rubrics for the kind ${kind}`).toBe(1);
    }
  });

  it("names the known faults of rule 6.7b for every kind", async () => {
    const rubrics = await readRubrics();
    expect(rubrics.length, "the rubric set holds no rubric").toBeGreaterThan(0);
    for (const rubric of rubrics) {
      const faults = faultTextOf(rubric);
      expect(faults, `the rubric for ${rubric.kind} names no known fault`).not.toBe("");
      for (const alternatives of KNOWN_FAULTS[rubric.kind] ?? []) {
        const found = alternatives.some((word) => faults.includes(word));
        expect(
          found,
          `the rubric for ${rubric.kind} names no fault of rule 6.7b with ${alternatives.join(" or ")}`,
        ).toBe(true);
      }
    }
  });

  it("names the gesture rule of the picture rubric (a gesture thumbnail is never a line picture)", async () => {
    const rubrics = await readRubrics();
    expect(rubrics.length, "the rubric set holds no rubric").toBeGreaterThan(0);
    const rubric = rubrics.find((entry) => entry.kind === "picture");
    expect(rubric, "the rubric set holds no rubric for the kind picture").toBeTruthy();
    const faults = faultTextOf(rubric as Rubric);
    expect(faults, "the rubric for picture names no gesture rule").toContain("gesture");
    expect(faults, "the rubric for picture names no line picture rule").toContain("line picture");
  });

  it("pins the wording of rule 6.7b for the three kinds that drifted", async () => {
    const rubrics = await readRubrics();
    expect(rubrics.length, "the rubric set holds no rubric").toBeGreaterThan(0);
    const phoneme = rubrics.find((rubric) => rubric.kind === "phoneme");
    const video = rubrics.find((rubric) => rubric.kind === "video");
    const bookAudio = rubrics.find((rubric) => rubric.kind === "book audio");
    expect(phoneme, "the rubric set holds no rubric for the kind phoneme").toBeTruthy();
    expect(video, "the rubric set holds no rubric for the kind video").toBeTruthy();
    expect(bookAudio, "the rubric set holds no rubric for the kind book audio").toBeTruthy();
    expect(faultTextOf(phoneme as Rubric), "the rubric for phoneme names no hum").toMatch(/\bhum\b/);
    expect(
      faultTextOf(video as Rubric),
      "the rubric for video names no scene that reads as its place",
    ).toContain("reads as its place");
    const bookText = faultTextOf(bookAudio as Rubric);
    expect(
      bookText,
      "the rubric for book audio asks for no natural question and answer",
    ).toContain("natural question");
    expect(bookText, "the rubric for book audio keeps the inverted point").not.toContain(
      "asks no question",
    );
  });

  it("states one semantics for the points of a rubric (each entry must hold for a pass)", async () => {
    expect(existsSync(RUBRICS_PATH), `Missing ${RUBRICS_PATH}`).toBe(true);
    const source = readFileSync(RUBRICS_PATH, "utf8").toLowerCase();
    expect(source, "the rubric script states no semantics for the points").toContain(
      "must hold for a pass",
    );
    expect(source, "the rubric script keeps the old semantics of the points").not.toContain(
      "holds none of them",
    );
  });

  it("names a known bad file for every kind", async () => {
    const rubrics = await readRubrics();
    expect(rubrics.length, "the rubric set holds no rubric").toBeGreaterThan(0);
    for (const rubric of rubrics) {
      const badFiles = rubric.knownBadFiles ?? [];
      expect(badFiles.length, `the rubric for ${rubric.kind} names no known bad file`).toBeGreaterThan(
        0,
      );
      for (const badFile of badFiles) {
        expect(badFile.label, `a known bad file of ${rubric.kind} holds no label`).not.toBe("");
        expect(typeof badFile.path, `a known bad file of ${rubric.kind} holds no path`).toBe("string");
      }
    }
  });

  it("names the four known bad files of AC-11.2", async () => {
    const rubrics = await readRubrics();
    expect(rubrics.length, "the rubric set holds no rubric").toBeGreaterThan(0);
    const labels = rubrics
      .flatMap((rubric) => rubric.knownBadFiles ?? [])
      .map((badFile) => badFile.label.toLowerCase());
    for (const known of KNOWN_BAD_FILES) {
      const found = labels.some((label) => known.words.every((word) => label.includes(word)));
      expect(found, `the rubric set names no known bad file for ${known.owner}`).toBe(true);
    }
  });

  it("points at real files for the known bad files that have a path", async () => {
    const rubrics = await readRubrics();
    expect(rubrics.length, "the rubric set holds no rubric").toBeGreaterThan(0);
    for (const rubric of rubrics) {
      for (const badFile of rubric.knownBadFiles ?? []) {
        if (badFile.path.length === 0) continue;
        expect(
          existsInMedia(badFile.path),
          `the known bad file ${badFile.path} of ${rubric.kind} is in no media root`,
        ).toBe(true);
      }
    }
  });

  it("names a file that Daniel passed for every kind", async () => {
    const rubrics = await readRubrics();
    expect(rubrics.length, "the rubric set holds no rubric").toBeGreaterThan(0);
    for (const rubric of rubrics) {
      const passedFiles = rubric.passedFiles ?? [];
      expect(passedFiles.length, `the rubric for ${rubric.kind} names no passed file`).toBeGreaterThan(
        0,
      );
      for (const passedFile of passedFiles) {
        expect(
          existsInMedia(passedFile),
          `the passed file ${passedFile} of ${rubric.kind} is in no media root`,
        ).toBe(true);
      }
    }
  });
});
