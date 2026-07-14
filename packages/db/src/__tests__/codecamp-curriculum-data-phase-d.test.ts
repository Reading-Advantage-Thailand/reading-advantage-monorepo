import { describe, it, expect } from "vitest";
import { getPhaseDCurriculumData } from "../seed/codecamp-curriculum-data.js";

describe("codecamp Phase D curriculum data", () => {
  const data = getPhaseDCurriculumData();

  it("has exactly 6 modules", () => {
    expect(data.modules).toHaveLength(6);
  });

  it("has modules in correct order with correct phases", () => {
    const expected = [
      { slug: "internationalization", phase: "D", title: "Internationalization" },
      { slug: "ai-integration", phase: "D", title: "AI Integration" },
      { slug: "measure-ai-development", phase: "D", title: "Measure-Driven AI Development" },
      { slug: "monorepo-packages", phase: "D", title: "Monorepo & Package Management" },
      { slug: "cloud-docker", phase: "D", title: "Cloud & Dockerization" },
      { slug: "real-world-practice", phase: "D", title: "Real-World Practice" },
    ];

    expected.forEach((exp, idx) => {
      const mod = data.modules[idx];
      expect(mod.slug).toBe(exp.slug);
      expect(mod.phase).toBe(exp.phase);
      expect(mod.title).toBe(exp.title);
      expect(mod.order).toBe(idx + 14); // Modules 14-19
      expect(mod.status).toBe("published");
    });
  });

  it("has 22 total lessons across all modules", () => {
    const totalLessons = data.modules.reduce(
      (sum, m) => sum + m.lessons.length,
      0
    );
    expect(totalLessons).toBe(22);
  });

  it("has correct lesson counts per module", () => {
    const expectedCounts = [3, 5, 3, 3, 4, 4];
    data.modules.forEach((mod, idx) => {
      expect(mod.lessons.length).toBe(expectedCounts[idx]);
    });
  });

  const quizModuleIndices = [0, 1, 3, 4]; // i18n, ai-integration, monorepo, cloud-docker

  it("has modules 14, 15, 17, 18 ending with a quiz lesson", () => {
    // Module 16 (measure-ai-development) and Module 19 (real-world-practice)
    // are practice-based with no formal quiz.
    quizModuleIndices.forEach((idx) => {
      const mod = data.modules[idx];
      const lastLesson = mod.lessons[mod.lessons.length - 1];
      expect(lastLesson.type).toBe("quiz");
    });
  });

  it("has module 16 (measure-ai-development) with all theory lessons", () => {
    const module16 = data.modules[2];
    expect(module16.slug).toBe("measure-ai-development");
    module16.lessons.forEach((lesson) => {
      expect(lesson.type).toBe("theory");
    });
  });

  it("has module 19 with all theory lessons", () => {
    const module19 = data.modules[5];
    expect(module19.slug).toBe("real-world-practice");
    module19.lessons.forEach((lesson) => {
      expect(lesson.type).toBe("theory");
    });
  });

  it("has at least 3 quiz questions per module that has quizzes", () => {
    quizModuleIndices.map((idx) => data.modules[idx]).forEach((mod) => {
      const quizLessons = mod.lessons.filter((l) => l.type === "quiz");
      quizLessons.forEach((quiz) => {
        expect(quiz.questions?.length ?? 0).toBeGreaterThanOrEqual(3);
      });
    });
  });

  it("has at least 1 exercise per module that has exercises", () => {
    // Module 16 (measure-ai-development) assesses via Measure track artifacts and a PR;
    // Module 19 (real-world-practice) uses GitHub Issues instead of coding exercises.
    quizModuleIndices.map((idx) => data.modules[idx]).forEach((mod) => {
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
    // M16 (measure-ai-development) excluded — assessed via Measure track artifacts + PR
    const m16Repos = data.exerciseRepos.filter(
      (r) => r.moduleSlug === "measure-ai-development"
    );
    expect(m16Repos).toHaveLength(0);
    // M17 (monorepo-packages) excluded — uses live monorepo
    const m17Repos = data.exerciseRepos.filter(
      (r) => r.moduleSlug === "monorepo-packages"
    );
    expect(m17Repos).toHaveLength(0);
    // M19 uses capstone repo, not codecamp-exercise-
    const m19Repos = data.exerciseRepos.filter(
      (r) => r.moduleSlug === "real-world-practice"
    );
    expect(m19Repos).toHaveLength(1);
    expect(m19Repos[0].repoUrl).toBe(
      "https://github.com/Reading-Advantage-Thailand/codecamp-progress-tracker"
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
