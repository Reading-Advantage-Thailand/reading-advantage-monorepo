import { describe, expect, it } from "vitest";
import {
  DROPPED_TABLES,
  MAP_TABLES,
  correctAnswerIndex,
  keepLatest,
  lessonStatusOf,
  mapArticle,
  mapAssignmentStatus,
  mapRole,
  parseGrade,
  renderReport,
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
    expect(row.sentences).toBe(JSON.stringify([{ i: 0 }]));
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

  it("uses the legacy table names in the id map, as the tutor_compat views join them", () => {
    expect(MAP_TABLES.article).toBe("article");
    expect(MAP_TABLES.mcq).toBe("multiple_choice_questions");
    expect(MAP_TABLES.saq).toBe("short_answer_questions");
    expect(MAP_TABLES.laq).toBe("long_answer_questions");
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
  });
});
