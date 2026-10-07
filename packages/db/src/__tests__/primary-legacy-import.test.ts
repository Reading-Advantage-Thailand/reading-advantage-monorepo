import { describe, expect, it } from "vitest";
import {
  DROPPED_TABLES,
  JsonCell,
  MAP_TABLES,
  MCQ_ANSWER_FIXES,
  cardTextOf,
  correctAnswerIndex,
  keepLatest,
  lessonStatusOf,
  mapArticle,
  mapAssignmentStatus,
  mapRole,
  parseGrade,
  renderReport,
  reviewCountsOf,
  usernamesOf,
  type LegacyArticle,
} from "../migrations-data/primary-legacy-import.js";

describe("primary legacy import transforms", () => {
  it("maps the four known roles and leaves 'user' to the owner (D9)", () => {
    expect(mapRole("student", undefined, "u1")).toBe("STUDENT");
    expect(mapRole("Teacher", undefined, "u1")).toBe("TEACHER");
    expect(mapRole("admin", undefined, "u1")).toBe("ADMIN");
    expect(mapRole("system", undefined, "u1")).toBe("SYSTEM");
    expect(mapRole("user", undefined, "u1")).toBeNull();
    expect(mapRole("user", { u1: "TEACHER" }, "u1")).toBe("TEACHER");
    expect(mapRole(null, undefined, "u1")).toBeNull();
  });

  it("derives the username from the lowered email (D6)", () => {
    expect(usernamesOf(" Kru.Nok@School.ac.th ")).toEqual({ username: "kru.nok@school.ac.th", displayUsername: "Kru.Nok@School.ac.th" });
  });

  it("parses the classroom grade text", () => {
    expect(parseGrade("3")).toBe(3);
    expect(parseGrade("P.5")).toBe(5);
    expect(parseGrade("Grade 12")).toBe(12);
    expect(parseGrade("mixed")).toBeNull();
    expect(parseGrade(null)).toBeNull();
  });

  it("finds the MCQ answer among the options, else -1", () => {
    expect(correctAnswerIndex(["a", "b", "c"], "b")).toBe(1);
    expect(correctAnswerIndex(["A dog.", "A cat."], "a cat. ")).toBe(1);
    expect(correctAnswerIndex(["a", "b"], "z")).toBe(-1);
    expect(correctAnswerIndex(["a", "b"], null)).toBe(-1);
  });

  it("fixes each owner-approved MCQ answer to one of its options", () => {
    const options: Record<string, string[]> = {
      cmgqtfb1400jot79b2b8vt3wx: ["It was too big to play with.", "It was broken.", "It rolled under her bed.", "She didn't like it."],
      cmorc24e10021s6012hxz5jhi: ["It was better and lighter", "It was harder and heavier", "It was blue and green", "It was fast and loud"],
      cmou6yrgv0049s601qg1b3hx5: ["When water covers dry land", "When it stops raining", "When the sun is hot", "When a river is dry"],
      cmqqrw1h1000us6011cslsbeh: ["They sleep.", "They run.", "They talk.", "They sing."],
    };
    expect(Object.keys(MCQ_ANSWER_FIXES).sort()).toEqual(Object.keys(options).sort());
    expect(Object.entries(MCQ_ANSWER_FIXES).map(([id, answer]) => correctAnswerIndex(options[id]!, answer))).toEqual([2, 0, 0, 2]);
  });

  it("keeps the latest row per key", () => {
    const rows = [
      { id: "1", k: "x", t: "2026-01-01" },
      { id: "2", k: "x", t: "2026-03-01" },
      { id: "3", k: "y", t: null },
      { id: "4", k: "x", t: "2026-02-01" },
    ];
    const { kept, dropped } = keepLatest(rows, (r) => r.k, (r) => r.t);
    expect(kept.map((r) => r.id).sort()).toEqual(["2", "3"]);
    expect(dropped.map((r) => r.id).sort()).toEqual(["1", "4"]);
  });

  it("maps an article with the legacy id as the picture key (D10)", () => {
    const legacy: LegacyArticle = {
      id: "clx123", type: "fiction", genre: "Adventure", sub_genre: "Quest", title: "The Cave", summary: "s", passage: "p", image_description: null,
      cefr_level: "A1", ra_level: 3, rating: 4.5, audio_url: null, audio_word_url: null, sentences: [{ i: 0 }], words: null, author_id: "u9",
      created_at: new Date("2025-01-01"), updated_at: new Date("2025-02-01"), translated_passage: { th: ["x"] }, translated_summary: null,
      brainstorming: null, is_approved: true, is_draft: false, is_published: true, planning: null, topic: "caves",
    };
    const row = mapArticle(legacy, "11111111-1111-4111-8111-111111111111", false);
    expect(row.id).toBe("11111111-1111-4111-8111-111111111111");
    expect(row.image).toBe("clx123");
    expect(row.content).toBe("p");
    expect(row.level).toBe(3);
    expect(row.published).toBe(true);
    expect(row.is_published).toBe(true);
    expect(row.author_id).toBeNull();
    // jsonb columns go through sql.json: an array must not become a Postgres array or a JSON string.
    expect(row.sentences).toBeInstanceOf(JsonCell);
    expect((row.sentences as JsonCell).value).toEqual([{ i: 0 }]);
    expect((row.translated_passage as JsonCell).value).toEqual({ th: ["x"] });
    expect(row.words).toBeNull();
    expect(mapArticle({ ...legacy, passage: null, is_published: null }, "x", true)).toMatchObject({ content: "", published: false, author_id: "u9" });
  });

  it("maps assignment and lesson statuses", () => {
    expect(mapAssignmentStatus("COMPLETED")).toEqual({ status: "COMPLETED", completed: true });
    expect(mapAssignmentStatus("IN_PROGRESS")).toEqual({ status: "IN_PROGRESS", completed: false });
    expect(mapAssignmentStatus(null)).toEqual({ status: "NOT_STARTED", completed: false });
    expect(lessonStatusOf(true, 0)).toBe("completed");
    expect(lessonStatusOf(false, 40)).toBe("in_progress");
    expect(lessonStatusOf(null, null)).toBe("not_started");
  });

  it("takes the card text the Primary reader writes: the word of a vocabulary card, the sentence of a sentence card", () => {
    expect(cardTextOf({ type: "VOCABULARY", word: "puppy", sentence: null })).toBe("puppy");
    expect(cardTextOf({ type: "SENTENCE", word: null, sentence: "Pip is a puppy." })).toBe("Pip is a puppy.");
    expect(cardTextOf({ type: "VOCABULARY", word: "  ", sentence: "Pip is a puppy." })).toBeNull();
    expect(cardTextOf({ type: "SENTENCE", word: "puppy", sentence: null })).toBeNull();
  });

  it("counts Good and Easy reviews as correct, Again and Hard as incorrect", () => {
    expect(reviewCountsOf([1, 2, 3, 4, 4])).toEqual({ correct: 3, incorrect: 2 });
    expect(reviewCountsOf([])).toEqual({ correct: 0, incorrect: 0 });
  });

  it("uses the legacy table names in the id map, as the tutor_compat views join them", () => {
    expect(MAP_TABLES.article).toBe("article");
    expect(MAP_TABLES.mcq).toBe("multiple_choice_questions");
    expect(MAP_TABLES.saq).toBe("short_answer_questions");
    expect(MAP_TABLES.laq).toBe("long_answer_questions");
    expect(MAP_TABLES.flashcardCards).toBe("flashcard_cards");
  });

  it("renders the report with every table and the dropped list", () => {
    const md = renderReport({
      startedAt: "a", finishedAt: "b", dryRun: true, dropped: DROPPED_TABLES, notes: ["n1"],
      tables: { users: { read: 10, written: 8, skipped: { "role 'user' needs an owner assignment (D9)": 2 }, examples: {} } },
    });
    expect(md).toContain("| users | 10 | 8 | 2 role 'user' needs an owner assignment (D9) |");
    expect(md).toContain("(dry run, rolled back)");
    expect(md).toContain("- sessions:");
    expect(md).toContain("- n1");
    expect(renderReport({ startedAt: "a", finishedAt: "b", dryRun: false, dropped: [], notes: [], tables: { "flashcard_cards.last_review": { read: 3, written: 3, skipped: {}, examples: {} } } }))
      .toContain("| flashcard_cards.last_review → flashcard_progress | 3 | 3 | 0 |");
  });
});
