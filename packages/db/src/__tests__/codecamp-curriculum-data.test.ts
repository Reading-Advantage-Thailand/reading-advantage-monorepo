import { describe, it, expect } from "vitest";
import { getPhaseACurriculumData } from "../seed/codecamp-curriculum-data.js";

describe("codecamp Phase A curriculum data", () => {
  const data = getPhaseACurriculumData();

  it("has exactly 6 modules", () => {
    expect(data.modules).toHaveLength(6);
  });

  it("has modules in correct order with correct phases", () => {
    const expected = [
      { slug: "dev-environment", phase: "A", title: "Dev Environment Setup" },
      { slug: "git-github", phase: "A", title: "Git & GitHub Fundamentals" },
      { slug: "html-css", phase: "A", title: "HTML & CSS Crash Course" },
      { slug: "javascript", phase: "A", title: "JavaScript Fundamentals" },
      { slug: "typescript", phase: "A", title: "TypeScript" },
      { slug: "vitest", phase: "A", title: "Testing with Vitest" },
    ];

    expected.forEach((exp, idx) => {
      const mod = data.modules[idx];
      expect(mod.slug).toBe(exp.slug);
      expect(mod.phase).toBe(exp.phase);
      expect(mod.title).toBe(exp.title);
      expect(mod.order).toBe(idx + 1);
      expect(mod.status).toBe("published");
    });
  });

  it("has 29 total lessons across all modules", () => {
    const totalLessons = data.modules.reduce(
      (sum, m) => sum + m.lessons.length,
      0
    );
    expect(totalLessons).toBe(29);
  });

  it("has correct lesson counts per module", () => {
    const expectedCounts = [2, 4, 6, 8, 5, 4];
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
    // Modules 1 has no exercise, modules 2-6 have at least 1
    const modulesWithExercises = ["git-github", "html-css", "javascript", "typescript", "vitest"];
    data.modules.forEach((mod) => {
      if (modulesWithExercises.includes(mod.slug)) {
        const exerciseLessons = mod.lessons.filter(
          (l) => l.exercises && l.exercises.length > 0
        );
        expect(exerciseLessons.length).toBeGreaterThanOrEqual(1);
      }
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

  it("has exercise repo entries for mapped modules only", () => {
    expect(data.exerciseRepos).toHaveLength(5);
    // M1 (dev-environment) excluded — no exercise repo
    const m1Repos = data.exerciseRepos.filter(
      (r) => r.moduleSlug === "dev-environment"
    );
    expect(m1Repos).toHaveLength(0);
    // All other Phase A modules have repos
    ["git-github", "html-css", "javascript", "typescript", "vitest"].forEach(
      (slug) => {
        const repos = data.exerciseRepos.filter(
          (r) => r.moduleSlug === slug
        );
        expect(repos.length).toBe(1);
      }
    );
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
    expect(allContent).toContain("Node.js 20");
    expect(allContent).toContain("pnpm 8.15.8");
    expect(allContent).toContain("TypeScript 5.9.3");
    expect(allContent).toContain("Vitest 4.1.5");
  });
});
