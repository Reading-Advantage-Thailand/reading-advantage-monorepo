import { describe, it, expect } from "vitest";
import { getPhaseDCurriculumData } from "../seed/codecamp-curriculum-data.js";

describe("codecamp Phase D curriculum data", () => {
  const data = getPhaseDCurriculumData();

  it("has exactly 5 modules", () => {
    expect(data.modules).toHaveLength(5);
  });

  it("has modules in correct order with correct phases", () => {
    const expected = [
      { slug: "internationalization", phase: "D", title: "Internationalization" },
      { slug: "ai-integration", phase: "D", title: "AI Integration" },
      { slug: "monorepo-packages", phase: "D", title: "Monorepo & Package Management" },
      { slug: "cloud-docker", phase: "D", title: "Cloud & Dockerization" },
      { slug: "real-world-practice", phase: "D", title: "Real-World Practice" },
    ];

    expected.forEach((exp, idx) => {
      const mod = data.modules[idx];
      expect(mod.slug).toBe(exp.slug);
      expect(mod.phase).toBe(exp.phase);
      expect(mod.title).toBe(exp.title);
      expect(mod.order).toBe(idx + 14); // Modules 14-18
      expect(mod.status).toBe("published");
    });
  });

  it("has 19 total lessons across all modules", () => {
    const totalLessons = data.modules.reduce(
      (sum, m) => sum + m.lessons.length,
      0
    );
    expect(totalLessons).toBe(19);
  });

  it("has correct lesson counts per module", () => {
    const expectedCounts = [3, 5, 3, 4, 4];
    data.modules.forEach((mod, idx) => {
      expect(mod.lessons.length).toBe(expectedCounts[idx]);
    });
  });

  it("has modules 14-17 ending with a quiz lesson", () => {
    // Modules 14-17 (indices 0-3) end with quiz; Module 18 (index 4) is all theory
    data.modules.slice(0, 4).forEach((mod) => {
      const lastLesson = mod.lessons[mod.lessons.length - 1];
      expect(lastLesson.type).toBe("quiz");
    });
  });

  it("has module 18 with all theory lessons", () => {
    const module18 = data.modules[4];
    expect(module18.slug).toBe("real-world-practice");
    module18.lessons.forEach((lesson) => {
      expect(lesson.type).toBe("theory");
    });
  });

  it("has at least 3 quiz questions per module that has quizzes", () => {
    data.modules.slice(0, 4).forEach((mod) => {
      const quizLessons = mod.lessons.filter((l) => l.type === "quiz");
      quizLessons.forEach((quiz) => {
        expect(quiz.questions?.length ?? 0).toBeGreaterThanOrEqual(3);
      });
    });
  });

  it("has at least 1 exercise per module that has exercises (modules 14-17)", () => {
    // Module 18 (real-world-practice) uses GitHub Issues instead of coding exercises
    data.modules.slice(0, 4).forEach((mod) => {
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

  it("has exercise repo entries for mapped modules only", () => {
    expect(data.exerciseRepos).toHaveLength(4);
    // M16 (monorepo-packages) excluded — uses live monorepo
    const m16Repos = data.exerciseRepos.filter(
      (r) => r.moduleSlug === "monorepo-packages"
    );
    expect(m16Repos).toHaveLength(0);
    // M18 uses capstone repo, not codecamp-exercise-
    const m18Repos = data.exerciseRepos.filter(
      (r) => r.moduleSlug === "real-world-practice"
    );
    expect(m18Repos).toHaveLength(1);
    expect(m18Repos[0].repoUrl).toBe(
      "https://github.com/reading-advantage/codecamp-progress-tracker"
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
    const allContent = JSON.stringify(data.modules);
    expect(allContent).toContain("next-intl 4.11.0");
    expect(allContent).toContain("Vercel AI SDK 4.3.19");
    expect(allContent).toContain("pnpm 8.15.8");
    expect(allContent).toContain("Turborepo 2.9.8");
    expect(allContent).toContain("Node.js 20");
    expect(allContent).toContain("React 19.2.5");
    expect(allContent).toContain("Next.js 16.0.0");
  });

  it("has portfolio project context for Phase D", () => {
    const allContent = JSON.stringify(data.modules);
    expect(allContent).toContain("Student Progress Tracker");
  });
});
