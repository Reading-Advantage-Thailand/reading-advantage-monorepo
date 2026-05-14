import { describe, it, expect } from "vitest";
import { getPhaseCCurriculumData } from "../seed/codecamp-curriculum-data.js";

describe("codecamp Phase C curriculum data", () => {
  const data = getPhaseCCurriculumData();

  it("has exactly 3 modules", () => {
    expect(data.modules).toHaveLength(3);
  });

  it("has modules in correct order with correct phases", () => {
    const expected = [
      { slug: "databases-orms", phase: "C", title: "Databases & ORMs" },
      { slug: "trpc-server-actions", phase: "C", title: "tRPC & Server Actions" },
      { slug: "authentication", phase: "C", title: "Authentication" },
    ];

    expected.forEach((exp, idx) => {
      const mod = data.modules[idx];
      expect(mod.slug).toBe(exp.slug);
      expect(mod.phase).toBe(exp.phase);
      expect(mod.title).toBe(exp.title);
      expect(mod.order).toBe(idx + 11); // Modules 11-13
      expect(mod.status).toBe("published");
    });
  });

  it("has 14 total lessons across all modules", () => {
    const totalLessons = data.modules.reduce(
      (sum, m) => sum + m.lessons.length,
      0
    );
    expect(totalLessons).toBe(14);
  });

  it("has correct lesson counts per module", () => {
    const expectedCounts = [5, 5, 4];
    data.modules.forEach((mod, idx) => {
      expect(mod.lessons.length).toBe(expectedCounts[idx]);
    });
  });

  it("has every module ending with a quiz lesson", () => {
    data.modules.forEach((mod) => {
      const lastLesson = mod.lessons[mod.lessons.length - 1];
      expect(lastLesson.type).toBe("quiz");
    });
  });

  it("has at least 3 quiz questions per module", () => {
    data.modules.forEach((mod) => {
      const quizLessons = mod.lessons.filter((l) => l.type === "quiz");
      quizLessons.forEach((quiz) => {
        expect(quiz.questions?.length ?? 0).toBeGreaterThanOrEqual(3);
      });
    });
  });

  it("has at least 1 exercise per module", () => {
    data.modules.forEach((mod) => {
      const exerciseLessons = mod.lessons.filter(
        (l) => l.exercises && l.exercises.length > 0
      );
      expect(exerciseLessons.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("has contentJson for every theory lesson", () => {
    data.modules.forEach((mod) => {
      mod.lessons.forEach((lesson) => {
        if (lesson.type === "theory") {
          expect(lesson.contentJson).toBeDefined();
          const sections = lesson.contentJson.sections;
          expect(sections).toBeDefined();
          expect((sections as unknown[]).length).toBeGreaterThan(0);
        }
      });
    });
  });

  it("has exercise repo placeholder entries for all modules", () => {
    expect(data.exerciseRepos).toHaveLength(3);
    data.modules.forEach((mod) => {
      const repos = data.exerciseRepos.filter((r) => r.moduleSlug === mod.slug);
      expect(repos.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("has lesson order starting at 1 within each module", () => {
    data.modules.forEach((mod) => {
      mod.lessons.forEach((lesson, idx) => {
        expect(lesson.order).toBe(idx + 1);
      });
    });
  });

  it("has technology versions matching the monorepo", () => {
    const allContent = JSON.stringify(data.modules);
    expect(allContent).toContain("PostgreSQL 16");
    expect(allContent).toContain("Drizzle ORM 0.44.7");
    expect(allContent).toContain("tRPC 11.17.0");
    expect(allContent).toContain("Zod 3.25.76");
  });

  it("has portfolio project context for Phase C", () => {
    const allContent = JSON.stringify(data.modules);
    expect(allContent).toContain("Student Progress Tracker");
  });
});
