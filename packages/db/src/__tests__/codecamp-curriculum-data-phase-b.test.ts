import { describe, it, expect } from "vitest";
import { getPhaseBCurriculumData } from "../seed/codecamp-curriculum-data.js";

describe("codecamp Phase B curriculum data", () => {
  const data = getPhaseBCurriculumData();

  it("has exactly 4 modules", () => {
    expect(data.modules).toHaveLength(4);
  });

  it("has modules in correct order with correct phases", () => {
    const expected = [
      { slug: "react", phase: "B", title: "React" },
      { slug: "api-fundamentals", phase: "B", title: "API Fundamentals" },
      { slug: "nextjs-basics", phase: "B", title: "Next.js 16 — Basics" },
      { slug: "nextjs-advanced", phase: "B", title: "Next.js 16 — Advanced" },
    ];

    expected.forEach((exp, idx) => {
      const mod = data.modules[idx];
      expect(mod.slug).toBe(exp.slug);
      expect(mod.phase).toBe(exp.phase);
      expect(mod.title).toBe(exp.title);
      expect(mod.order).toBe(idx + 7); // Modules 7-10
      expect(mod.status).toBe("published");
    });
  });

  it("has 23 total lessons across all modules", () => {
    const totalLessons = data.modules.reduce(
      (sum, m) => sum + m.lessons.length,
      0
    );
    expect(totalLessons).toBe(23);
  });

  it("has correct lesson counts per module", () => {
    const expectedCounts = [7, 5, 6, 5];
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

  it("has at least 1 exercise per module that has exercises", () => {
    // All Phase B modules have exercise lessons
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
          expect(Array.isArray(sections)).toBe(true);
          if (Array.isArray(sections)) {
            expect(sections.length).toBeGreaterThan(0);
          }
        }
      });
    });
  });

  it("has exercise repo placeholder entries for all modules", () => {
    expect(data.exerciseRepos).toHaveLength(4);
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
    // Spot-check that key tech versions appear in lesson content
    const allContent = JSON.stringify(data.modules);
    expect(allContent).toContain("React 19.2.5");
    expect(allContent).toContain("Next.js 16.0.0");
    expect(allContent).toContain("TypeScript 5.9.3");
    expect(allContent).toContain("Zod 3.25.76");
  });

  it("has portfolio project context for Phase B", () => {
    const allContent = JSON.stringify(data.modules);
    expect(allContent).toContain("Learning Dashboard");
  });
});
