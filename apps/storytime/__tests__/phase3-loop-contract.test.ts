// @vitest-environment node
// AC-13.1, AC-13.2, and AC-13.3 of the Phase 3 test strategy (plan task 3.8).
// The tests read the shipped week files and clone them. A broken copy is a deep clone of a
// shipped week with one change class. No week file exists under __tests__.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import * as contract from "../lib/contracts/week";

const app = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const weekDirectory = resolve(app, "content", "l2");
const WEEK_FILES = [
  "w01.json",
  "w02.json",
  "w03.json",
  "w04.json",
  "w05.json",
  "w06.json",
  "w07.json",
  "w08.json",
];

/** The pin that the content held before the take of task 3.8. */
const PREVIOUS_PIN = "cf30bb2eee55806bf8830b3a3e69e4f6044847e6";

/** The A-42 draft pin that task 3.8 received. */
const A_42_PIN = "cad0307cad31a3131dc3a06e9e773537a1a6219b";

/** The pin of the w01 approval take of 2026-11-04. */
const TAKE_PIN = "67be5603e0410f21491a006b8e9d12f3f9dd1bfc";

/** A week as plain JSON, for a broken copy. */
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Reads an export of the week contract.
 *
 * The test reads the export by name, so a missing export fails with a clear message and not
 * with a load error.
 * @param name The name of the export.
 * @returns The export.
 */
function exportOf<T>(name: string): T {
  const value = (contract as unknown as Record<string, unknown>)[name];
  expect(value, `The week contract has no export ${name}`).toBeDefined();
  return value as T;
}

/**
 * The name of the loops approval part. The test for the exports names the constant of the
 * contract.
 */
const LOOPS_PART = "loops";

/**
 * Reads a shipped week file.
 * @param file The file name inside apps/storytime/content/l2.
 * @returns The parsed week.
 */
function readWeek(file: string): Json {
  return JSON.parse(readFileSync(resolve(weekDirectory, file), "utf8")) as Json;
}

/**
 * Gives English text with its Thai.
 * @param en The English line.
 * @param th The Thai line.
 * @returns The pair.
 */
function biText(en: string, th: string): Json {
  return { en, th };
}

/**
 * Gives one word of a blend drill.
 * @param word The word.
 * @param sounds The sound labels of the word.
 * @param clips The recordings of the sounds, in the order of the sounds.
 * @returns The drill word.
 */
function drillWord(word: string, sounds: string[], clips: string[]): Json {
  return { word, sounds, audio: clips };
}

/**
 * Gives the default drill words of the fixture.
 * @returns Three drill words with their recordings.
 */
function drillWords(): Json[] {
  return [
    drillWord(
      "net",
      ["/n/", "/e/", "/t/"],
      ["phonemes/daniel/04-n.mp3", "phonemes/daniel/27-e-short.mp3", "phonemes/daniel/02-t.mp3"],
    ),
    drillWord(
      "nut",
      ["/n/", "/u/", "/t/"],
      ["phonemes/daniel/04-n.mp3", "phonemes/daniel/30-u-short.mp3", "phonemes/daniel/02-t.mp3"],
    ),
    drillWord(
      "pen",
      ["/p/", "/e/", "/n/"],
      ["phonemes/daniel/03-p.mp3", "phonemes/daniel/27-e-short.mp3", "phonemes/daniel/04-n.mp3"],
    ),
  ];
}

/**
 * Gives the last word of a page text.
 * @param text The text of the page.
 * @returns The last word, without its punctuation.
 */
function lastWord(text: string): string {
  const words = text.split(/[^A-Za-z']+/).filter((word) => word.length > 0);
  return words[words.length - 1] ?? "";
}

/**
 * Gives a clone of the published week that holds the seven A-42 fields.
 *
 * The shipped week holds them after the A-42 draft pin. The fixture sets them in both states,
 * so a broken copy tests the same rule before and after the receipt.
 * @returns The clone.
 */
function loopWeek(): Json {
  const week = structuredClone(readWeek("w01.json")) as Json;
  const book = week.books[0];
  const pages = book.pages as Json[];
  book.questions = [
    { kind: "who", ask: biText("Who is it?", "ใครคือใคร?"), answer: { page: 1, word: lastWord(pages[0].text) } },
    {
      kind: "what",
      ask: biText("What is it?", "นี่คืออะไร?"),
      answer: { page: 2, word: lastWord(pages[1].text) },
    },
    {
      kind: "where",
      ask: biText("Where is it?", "อยู่ที่ไหน?"),
      answer: { page: 3, word: lastWord(pages[2].text) },
    },
  ];
  const script = week.scripts[0];
  const step = script.steps[0];
  step.soundLoop = {
    correct: biText("Look and listen.", "ดูและฟัง"),
    practise: biText("Say it with me.", "พูดพร้อมครู"),
    retest: biText("Show me the sound.", "ชี้เสียงให้ครูดู"),
  };
  step.blendDrill = {
    words: drillWords(),
    model: biText("Listen. I say the sounds, then the word.", "ฟัง ครูพูดเสียงแล้วพูดเป็นคำ"),
    lead: biText("Say it with me.", "พูดพร้อมครู"),
    test: biText("Your turn.", "ตาเด็กพูด"),
    repeats: 3,
    correction: biText("Stop. Listen again.", "หยุดก่อน ฟังอีกครั้ง"),
  };
  step.sightWords = {
    words: ["a", "and"],
    slide: biText("Slide a finger under the word.", "ลากนิ้วใต้คำ"),
    check: biText("Read it the fast way.", "อ่านแบบเร็ว"),
    seconds: 3,
  };
  step.loopMinutes = 5;
  script.recall = {
    items: [
      { kind: "sound", text: "n", week: 1, audio: "phonemes/daniel/04-n.mp3" },
      { kind: "tricky", text: "a", week: 2 },
      { kind: "frame", text: "I see a", week: 1 },
      { kind: "word", text: "net", week: 1 },
      { kind: "sound", text: "t", week: 3, audio: "phonemes/daniel/02-t.mp3" },
    ],
    ask: biText("Show the five cards.", "ชูบัตรห้าใบ"),
  };
  week.approval = { ...(week.approval ?? {}), [LOOPS_PART]: { status: "draft" } };
  return week;
}

/**
 * Gives a clone of the fixture with an approved loops part.
 * @returns The clone.
 */
function approvedWeek(): Json {
  const week = loopWeek();
  week.approval[LOOPS_PART] = {
    status: "approved",
    date: "2026-11-04",
    words: "Both ok",
  };
  return week;
}

/**
 * Fails when a parse accepted a broken copy, and gives the field paths of the failure.
 * @param week The broken copy.
 * @param label The name of the broken copy.
 * @returns The joined field paths of the failure.
 */
function expectRejected(week: Json, label: string): string {
  const parsed = contract.weekSchema.safeParse(week);
  expect(parsed.success, `The contract accepts ${label}`).toBe(false);
  const issues = parsed.success ? [] : parsed.error.issues;
  const paths = issues.map((issue) => issue.path.join("."));
  expect(paths.length, `The failure of ${label} has no field path (rule 11.1)`).toBeGreaterThan(0);
  expect(
    paths.every((path) => path.length > 0),
    `The failure of ${label} has an empty field path: ${paths.join(" | ")}`,
  ).toBe(true);
  return paths.join(" | ");
}

/**
 * Tells whether a week holds one of the seven A-42 fields.
 * @param week The week.
 * @returns Whether the week holds a loop field.
 */
function holdsLoopField(week: Json): boolean {
  const books = (week.books ?? []).some((book: Json) => (book.questions ?? []).length > 0);
  const scripts = (week.scripts ?? []).some(
    (script: Json) =>
      script.recall !== undefined ||
      (script.steps ?? []).some(
        (step: Json) =>
          step.blendDrill !== undefined ||
          step.soundLoop !== undefined ||
          step.sightWords !== undefined ||
          step.loopMinutes !== undefined,
      ),
  );
  const approval = (week.approval ?? {})[LOOPS_PART] !== undefined;
  return books || scripts || approval;
}

describe("AC-13.1 the typed schemas read the shipped weeks at the A-42 pin", () => {
  it("parses every shipped week and counts eight", () => {
    const weeks = WEEK_FILES.map((file) => readWeek(file));
    expect(weeks.length, "The test must read eight shipped weeks (A4)").toBe(8);
    let weeksParsed = 0;
    for (const week of weeks) {
      const parsed = contract.weekSchema.safeParse(week);
      expect(
        parsed.success,
        `The contract rejects a shipped week: ${parsed.success ? "" : parsed.error.issues.map((issue) => issue.path.join(".")).join("; ")}`,
      ).toBe(true);
      if (parsed.success) weeksParsed += 1;
    }
    expect(weeksParsed, "weeks_parsed must be 8 (A3)").toBe(8);
  });

  it("reads at least one loop field in a shipped week", () => {
    const holders = WEEK_FILES.filter((file) => holdsLoopField(readWeek(file)));
    expect(
      holders.length,
      "Missing A-42 pin: no shipped week holds a loop field (task 3.8 part 2)",
    ).toBeGreaterThan(0);
  });

  it("records the w01 approval take pin and not an older pin", () => {
    const record = JSON.parse(
      readFileSync(resolve(app, "content", "source.json"), "utf8"),
    ) as { commit?: string };
    expect(record.commit, "The source record must hold a commit (A15)").toMatch(/^[0-9a-f]{40}$/);
    expect(record.commit, "The source record names another pin").toBe(TAKE_PIN);
    expect(record.commit, "The source record still names the A-42 draft pin").not.toBe(A_42_PIN);
    expect(record.commit, "The source record still names the pin before the take").not.toBe(
      PREVIOUS_PIN,
    );
  });

  it("keeps the loops part out of the six approval parts", () => {
    const parts = exportOf<readonly string[]>("STORYTIME_APPROVAL_PARTS");
    expect(parts.length, "A week has six approval parts").toBe(6);
    expect(parts, "The loops part is one of the six approval parts").not.toContain(LOOPS_PART);
    expect(exportOf<string>("STORYTIME_LOOPS_PART"), "The loops part has its own name").toBe("loops");
  });
});

describe("AC-13.2 every broken copy fails with its field path", () => {
  const states: Array<[string, () => Json]> = [
    ["draft", loopWeek],
    ["approved", approvedWeek],
  ];

  for (const [state, build] of states) {
    it(`rejects a book with two questions in the ${state} state`, () => {
      const week = build();
      week.books[0].questions = week.books[0].questions.slice(0, 2);
      const paths = expectRejected(week, `a book with two questions (${state})`);
      expect(paths, `The failure names no question field: ${paths}`).toContain("questions");
    });

    it(`rejects a book with a repeated question kind in the ${state} state`, () => {
      const week = build();
      week.books[0].questions[1].kind = "who";
      const paths = expectRejected(week, `a repeated question kind (${state})`);
      expect(paths, `The failure names no question field: ${paths}`).toContain("questions");
    });

    it(`rejects a blend drill of two words in the ${state} state`, () => {
      const week = build();
      week.scripts[0].steps[0].blendDrill.words = drillWords().slice(0, 2);
      const paths = expectRejected(week, `a blend drill of two words (${state})`);
      expect(paths, `The failure names no drill field: ${paths}`).toContain("blendDrill.words");
    });

    it(`rejects a blend drill of six words in the ${state} state`, () => {
      const week = build();
      const words = drillWords();
      week.scripts[0].steps[0].blendDrill.words = [...words, ...words].slice(0, 6);
      const paths = expectRejected(week, `a blend drill of six words (${state})`);
      expect(paths, `The failure names no drill field: ${paths}`).toContain("blendDrill.words");
    });

    it(`rejects a drill word with one sound in the ${state} state`, () => {
      const week = build();
      week.scripts[0].steps[0].blendDrill.words[0].sounds = ["/n/"];
      const paths = expectRejected(week, `a drill word with one sound (${state})`);
      expect(paths, `The failure names no sound field: ${paths}`).toContain("sounds");
    });

    it(`rejects a drill word with five sounds in the ${state} state`, () => {
      const week = build();
      week.scripts[0].steps[0].blendDrill.words[0].sounds = ["/n/", "/e/", "/t/", "/a/", "/u/"];
      const paths = expectRejected(week, `a drill word with five sounds (${state})`);
      expect(paths, `The failure names no sound field: ${paths}`).toContain("sounds");
    });

    it(`rejects a drill with a clip list of another length than its sounds in the ${state} state`, () => {
      const week = build();
      week.scripts[0].steps[0].blendDrill.words[0].audio = ["phonemes/daniel/04-n.mp3"];
      const paths = expectRejected(week, `a clip list of another length (${state})`);
      expect(paths, `The failure names no clip field: ${paths}`).toContain("audio");
    });

    it(`rejects a blend drill of six repeats in the ${state} state`, () => {
      const week = build();
      week.scripts[0].steps[0].blendDrill.repeats = 6;
      const paths = expectRejected(week, `a blend drill of six repeats (${state})`);
      expect(paths, `The failure names no repeat field: ${paths}`).toContain("repeats");
    });

    it(`rejects a blend drill of one repeat in the ${state} state`, () => {
      const week = build();
      week.scripts[0].steps[0].blendDrill.repeats = 1;
      const paths = expectRejected(week, `a blend drill of one repeat (${state})`);
      expect(paths, `The failure names no repeat field: ${paths}`).toContain("repeats");
    });

    it(`rejects a step of twenty-one loop minutes in the ${state} state`, () => {
      const week = build();
      week.scripts[0].steps[0].loopMinutes = 21;
      const paths = expectRejected(week, `a step of twenty-one loop minutes (${state})`);
      expect(paths, `The failure names no minute field: ${paths}`).toContain("loopMinutes");
    });

    it(`rejects a step of minus one loop minute in the ${state} state`, () => {
      const week = build();
      week.scripts[0].steps[0].loopMinutes = -1;
      const paths = expectRejected(week, `a step of minus one loop minute (${state})`);
      expect(paths, `The failure names no minute field: ${paths}`).toContain("loopMinutes");
    });

    it(`rejects a sound loop without a retest line in the ${state} state`, () => {
      const week = build();
      delete week.scripts[0].steps[0].soundLoop.retest;
      const paths = expectRejected(week, `a sound loop without a retest line (${state})`);
      expect(paths, `The failure names no loop field: ${paths}`).toContain("soundLoop");
    });

    it(`rejects a sight word card of four words in the ${state} state`, () => {
      const week = build();
      week.scripts[0].steps[0].sightWords.words = ["a", "and", "can", "in"];
      const paths = expectRejected(week, `a sight word card of four words (${state})`);
      expect(paths, `The failure names no sight word field: ${paths}`).toContain("sightWords.words");
    });

    it(`rejects a sight word card of six seconds in the ${state} state`, () => {
      const week = build();
      week.scripts[0].steps[0].sightWords.seconds = 6;
      const paths = expectRejected(week, `a sight word card of six seconds (${state})`);
      expect(paths, `The failure names no second field: ${paths}`).toContain("sightWords.seconds");
    });

    it(`rejects a drill clip outside the phoneme bank in the ${state} state`, () => {
      const week = build();
      week.scripts[0].steps[0].blendDrill.words[0].audio[0] = "l2/media/w01/other.mp3";
      const paths = expectRejected(week, `a drill clip outside the phoneme bank (${state})`);
      expect(paths, `The failure names no clip field: ${paths}`).toContain("audio");
    });
  }

  it("rejects a recall of four cards when the loops are approved", () => {
    const week = approvedWeek();
    week.scripts[0].recall.items = week.scripts[0].recall.items.slice(0, 4);
    const paths = expectRejected(week, "a recall of four cards with approved loops");
    expect(paths, `The failure names no recall field: ${paths}`).toContain("recall");
  });

  it("rejects a recall of six cards when the loops are approved", () => {
    const week = approvedWeek();
    const items = week.scripts[0].recall.items;
    week.scripts[0].recall.items = [...items, items[0]];
    const paths = expectRejected(week, "a recall of six cards with approved loops");
    expect(paths, `The failure names no recall field: ${paths}`).toContain("recall");
  });

  it("rejects an approval status other than draft or approved", () => {
    const week = loopWeek();
    week.approval[LOOPS_PART].status = "pending";
    const paths = expectRejected(week, "an approval status other than draft or approved");
    expect(paths, `The failure names no status field: ${paths}`).toContain("status");
  });

  it("rejects an approved loops part without a date", () => {
    const week = approvedWeek();
    delete week.approval[LOOPS_PART].date;
    const paths = expectRejected(week, "an approved loops part without a date");
    expect(paths, `The failure names no date field: ${paths}`).toContain("date");
  });

  it("rejects an approved loops part without words", () => {
    const week = approvedWeek();
    delete week.approval[LOOPS_PART].words;
    const paths = expectRejected(week, "an approved loops part without words");
    expect(paths, `The failure names no words field: ${paths}`).toContain("words");
  });

  it("rejects an approved loops part with blank words", () => {
    const week = approvedWeek();
    week.approval[LOOPS_PART].words = "   ";
    const paths = expectRejected(week, "an approved loops part with blank words");
    expect(paths, `The failure names no words field: ${paths}`).toContain("words");
  });

  it("accepts the fixture in the draft state and in the approved state", () => {
    for (const [state, build] of [
      ["draft", loopWeek],
      ["approved", approvedWeek],
    ] as Array<[string, () => Json]>) {
      const parsed = contract.weekSchema.safeParse(build());
      expect(
        parsed.success,
        `The contract rejects the ${state} fixture: ${parsed.success ? "" : parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
      ).toBe(true);
    }
  });
});

describe("AC-13.2 a draft week keeps its shape errors out of the receipt", () => {
  it("accepts a draft week with a recall of four cards", () => {
    const week = loopWeek();
    week.scripts[0].recall.items = week.scripts[0].recall.items.slice(0, 4);
    const parsed = contract.weekSchema.safeParse(week);
    expect(
      parsed.success,
      `The contract rejects a draft week with a recall of four cards: ${parsed.success ? "" : parsed.error.issues.map((issue) => issue.path.join(".")).join("; ")}`,
    ).toBe(true);
  });

  it("accepts a draft week with a question page beyond the book", () => {
    const week = loopWeek();
    week.books[0].questions[0].answer.page = 99;
    const parsed = contract.weekSchema.safeParse(week);
    expect(
      parsed.success,
      `The contract rejects a draft week with a question page beyond the book: ${parsed.success ? "" : parsed.error.issues.map((issue) => issue.path.join(".")).join("; ")}`,
    ).toBe(true);
  });

  it("accepts a draft week with a question word that the page does not hold", () => {
    const week = loopWeek();
    week.books[0].questions[0].answer.word = "aardvark";
    const parsed = contract.weekSchema.safeParse(week);
    expect(
      parsed.success,
      `The contract rejects a draft week with a question word that the page does not hold: ${parsed.success ? "" : parsed.error.issues.map((issue) => issue.path.join(".")).join("; ")}`,
    ).toBe(true);
  });

  it("rejects a draft week with a shape error", () => {
    const week = loopWeek();
    week.scripts[0].steps[0].blendDrill.repeats = 9;
    const paths = expectRejected(week, "a draft week with a shape error");
    expect(paths, `The failure names no repeat field: ${paths}`).toContain("repeats");
  });
});

describe("AC-13.3 the question page and word check", () => {
  it("rejects an approved question whose page is beyond the book", () => {
    const week = approvedWeek();
    week.books[0].questions[0].answer.page = 99;
    const paths = expectRejected(week, "an approved question whose page is beyond the book");
    expect(paths, `The failure names no page field: ${paths}`).toContain("answer.page");
  });

  it("rejects an approved question whose word the page does not hold", () => {
    const week = approvedWeek();
    week.books[0].questions[0].answer.word = "aardvark";
    const paths = expectRejected(week, "an approved question whose word the page does not hold");
    expect(paths, `The failure names no word field: ${paths}`).toContain("answer.word");
  });

  it("accepts an approved question whose page and word the book holds", () => {
    const week = approvedWeek();
    const parsed = contract.weekSchema.safeParse(week);
    expect(
      parsed.success,
      `The contract rejects an approved question that the book holds: ${parsed.success ? "" : parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
    ).toBe(true);
  });
});

describe("the hand-off limits are exact", () => {
  it("accepts a blend drill of three and of five words", () => {
    for (const count of [3, 5]) {
      const week = loopWeek();
      const words = drillWords();
      week.scripts[0].steps[0].blendDrill.words = Array.from({ length: count }, (_, index) =>
        structuredClone(words[index % words.length]),
      );
      const parsed = contract.weekSchema.safeParse(week);
      expect(
        parsed.success,
        `The contract rejects a blend drill of ${count} words: ${parsed.success ? "" : parsed.error.issues.map((issue) => issue.path.join(".")).join("; ")}`,
      ).toBe(true);
    }
  });

  it("accepts a drill word of two and of four sounds", () => {
    for (const count of [2, 4]) {
      const week = loopWeek();
      const sounds = ["/n/", "/e/", "/t/", "/a/"].slice(0, count);
      const clips = [
        "phonemes/daniel/04-n.mp3",
        "phonemes/daniel/27-e-short.mp3",
        "phonemes/daniel/02-t.mp3",
        "phonemes/daniel/26-a-short.mp3",
      ].slice(0, count);
      week.scripts[0].steps[0].blendDrill.words[0].sounds = sounds;
      week.scripts[0].steps[0].blendDrill.words[0].audio = clips;
      const parsed = contract.weekSchema.safeParse(week);
      expect(
        parsed.success,
        `The contract rejects a drill word of ${count} sounds: ${parsed.success ? "" : parsed.error.issues.map((issue) => issue.path.join(".")).join("; ")}`,
      ).toBe(true);
    }
  });

  it("accepts a blend drill of two and of five repeats", () => {
    for (const count of [2, 5]) {
      const week = loopWeek();
      week.scripts[0].steps[0].blendDrill.repeats = count;
      const parsed = contract.weekSchema.safeParse(week);
      expect(
        parsed.success,
        `The contract rejects a blend drill of ${count} repeats: ${parsed.success ? "" : parsed.error.issues.map((issue) => issue.path.join(".")).join("; ")}`,
      ).toBe(true);
    }
  });

  it("accepts a sight word card of one and of three words", () => {
    for (const count of [1, 3]) {
      const week = loopWeek();
      week.scripts[0].steps[0].sightWords.words = ["a", "and", "can"].slice(0, count);
      const parsed = contract.weekSchema.safeParse(week);
      expect(
        parsed.success,
        `The contract rejects a sight word card of ${count} words: ${parsed.success ? "" : parsed.error.issues.map((issue) => issue.path.join(".")).join("; ")}`,
      ).toBe(true);
    }
  });

  it("accepts a sight word card of two and of five seconds", () => {
    for (const count of [2, 5]) {
      const week = loopWeek();
      week.scripts[0].steps[0].sightWords.seconds = count;
      const parsed = contract.weekSchema.safeParse(week);
      expect(
        parsed.success,
        `The contract rejects a sight word card of ${count} seconds: ${parsed.success ? "" : parsed.error.issues.map((issue) => issue.path.join(".")).join("; ")}`,
      ).toBe(true);
    }
  });

  it("accepts a step of zero and of twenty loop minutes", () => {
    for (const count of [0, 20]) {
      const week = loopWeek();
      week.scripts[0].steps[0].loopMinutes = count;
      const parsed = contract.weekSchema.safeParse(week);
      expect(
        parsed.success,
        `The contract rejects a step of ${count} loop minutes: ${parsed.success ? "" : parsed.error.issues.map((issue) => issue.path.join(".")).join("; ")}`,
      ).toBe(true);
    }
  });

  it("accepts a recall of five cards", () => {
    const week = approvedWeek();
    const parsed = contract.weekSchema.safeParse(week);
    expect(
      parsed.success,
      `The contract rejects a recall of five cards: ${parsed.success ? "" : parsed.error.issues.map((issue) => issue.path.join(".")).join("; ")}`,
    ).toBe(true);
  });
});

describe("the typed read schemas keep passthrough", () => {
  it("keeps an unknown key of a loop field", () => {
    const week = loopWeek();
    week.scripts[0].steps[0].blendDrill.aNewField = "kept";
    const parsed = contract.weekSchema.safeParse(week);
    expect(parsed.success, "The contract rejects a loop field with an unknown key").toBe(true);
    if (!parsed.success) return;
    const steps = (parsed.data as Json).scripts[0].steps;
    expect(steps[0].blendDrill.aNewField, "The contract drops an unknown key").toBe("kept");
  });

  it("keeps an unknown key of the approval", () => {
    const week = loopWeek();
    week.approval.aNewPart = { status: "draft" };
    const parsed = contract.weekSchema.safeParse(week);
    expect(parsed.success, "The contract rejects an approval with an unknown part").toBe(true);
    if (!parsed.success) return;
    expect(
      (parsed.data as Json).approval.aNewPart,
      "The contract drops an unknown approval part",
    ).toEqual({ status: "draft" });
  });

  it("keeps a week with no approval at all", () => {
    const week = loopWeek();
    delete week.approval;
    const parsed = contract.weekSchema.safeParse(week);
    expect(parsed.success, "The contract rejects a week with no approval").toBe(true);
  });

  it("reads an absent loops part as a draft", () => {
    const week = loopWeek();
    delete week.approval[LOOPS_PART];
    week.scripts[0].recall.items = week.scripts[0].recall.items.slice(0, 4);
    week.books[0].questions[0].answer.page = 99;
    const parsed = contract.weekSchema.safeParse(week);
    expect(
      parsed.success,
      `The contract reads an absent loops part as an approved part: ${parsed.success ? "" : parsed.error.issues.map((issue) => issue.path.join(".")).join("; ")}`,
    ).toBe(true);
  });
});
