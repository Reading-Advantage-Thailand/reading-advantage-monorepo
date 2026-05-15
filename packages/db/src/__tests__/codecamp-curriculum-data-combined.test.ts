import { describe, it, expect } from "vitest";
import {
  getPhaseACurriculumData,
  getPhaseBCurriculumData,
  getPhaseCCurriculumData,
  getPhaseDCurriculumData,
  PORTFOLIO_PROJECTS,
  MODULE_REPO_MAP,
} from "../seed/codecamp-curriculum-data.js";

describe("codecamp combined curriculum data", () => {
  const phaseA = getPhaseACurriculumData();
  const phaseB = getPhaseBCurriculumData();
  const phaseC = getPhaseCCurriculumData();
  const phaseD = getPhaseDCurriculumData();
  const allModules = [
    ...phaseA.modules,
    ...phaseB.modules,
    ...phaseC.modules,
    ...phaseD.modules,
  ];
  const allRepos = [
    ...phaseA.exerciseRepos,
    ...phaseB.exerciseRepos,
    ...phaseC.exerciseRepos,
    ...phaseD.exerciseRepos,
  ];

  it("has exactly 18 modules across all phases", () => {
    expect(allModules).toHaveLength(18);
  });

  it("has exactly 85 lessons across all phases", () => {
    const totalLessons = allModules.reduce(
      (sum, m) => sum + m.lessons.length,
      0
    );
    expect(totalLessons).toBe(85);
  });

  it("has unique slugs across all modules", () => {
    const slugs = allModules.map((m) => m.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(slugs.length);
  });

  it("has sequential orders from 1 to 18 with no gaps", () => {
    const orders = allModules.map((m) => m.order).sort((a, b) => a - b);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
  });

  it("has exactly 16 repo rows (15 exercise + 1 capstone)", () => {
    expect(allRepos).toHaveLength(16);
  });

  it("excludes M1 (dev-environment) and M16 (monorepo-packages)", () => {
    const m1Repos = allRepos.filter((r) => r.moduleSlug === "dev-environment");
    expect(m1Repos).toHaveLength(0);
    const m16Repos = allRepos.filter(
      (r) => r.moduleSlug === "monorepo-packages"
    );
    expect(m16Repos).toHaveLength(0);
  });

  it("maps each repo to its module", () => {
    allRepos.forEach((repo) => {
      const mod = allModules.find((m) => m.slug === repo.moduleSlug);
      expect(mod).toBeDefined();
      expect(repo.order).toBe(mod!.order);
    });
  });

  it("has every quiz correctAnswer present in optionsJson", () => {
    let quizCount = 0;
    allModules.forEach((mod) => {
      mod.lessons.forEach((lesson) => {
        if (lesson.type === "quiz" && lesson.questions) {
          lesson.questions.forEach((q) => {
            quizCount++;
            expect(q.optionsJson).toContain(q.correctAnswer);
          });
        }
      });
    });
    expect(quizCount).toBeGreaterThan(0);
  });

  it("has every quiz question with exactly 4 options", () => {
    allModules.forEach((mod) => {
      mod.lessons.forEach((lesson) => {
        if (lesson.type === "quiz" && lesson.questions) {
          lesson.questions.forEach((q) => {
            expect(q.optionsJson).toHaveLength(4);
          });
        }
      });
    });
  });

  it("has every exercise with non-empty instructions", () => {
    allModules.forEach((mod) => {
      mod.lessons.forEach((lesson) => {
        if (lesson.exercises) {
          lesson.exercises.forEach((ex) => {
            expect(ex.instructions.length).toBeGreaterThan(0);
          });
        }
      });
    });
  });

  it("has repo URLs following the codecamp-exercise-<slug> pattern (M18 excepted)", () => {
    allRepos.forEach((repo) => {
      if (repo.moduleSlug === "real-world-practice") {
        expect(repo.repoUrl).toBe(
          "https://github.com/reading-advantage/codecamp-progress-tracker"
        );
      } else {
        expect(repo.repoUrl).toMatch(
          /^https:\/\/github\.com\/reading-advantage\/codecamp-exercise-[a-z0-9-]+$/
        );
      }
    });
  });

  it("has no placeholder URLs in seed data", () => {
    allRepos.forEach((repo) => {
      expect(repo.repoUrl).not.toContain("placeholder");
      expect(repo.repoUrl).not.toContain("example.com");
      expect(repo.repoUrl).not.toContain("<");
      expect(repo.description).not.toContain("placeholder");
    });
  });

  it("has portfolio projects distinct from exercise repos", () => {
    const exerciseUrls = new Set(allRepos.map((r) => r.repoUrl));
    const portfolioUrls = new Set(PORTFOLIO_PROJECTS.map((p) => p.repoUrl));
    // M18 capstone and Phase C/D portfolio share the progress-tracker repo
    const overlap = [...exerciseUrls].filter((url) => portfolioUrls.has(url));
    expect(overlap).toEqual([
      "https://github.com/reading-advantage/codecamp-progress-tracker",
    ]);
    // Phase A and B portfolios are unique to portfolios
    const phaseA = PORTFOLIO_PROJECTS.find((p) => p.phase === "A");
    const phaseB = PORTFOLIO_PROJECTS.find((p) => p.phase === "B");
    expect(exerciseUrls.has(phaseA!.repoUrl)).toBe(false);
    expect(exerciseUrls.has(phaseB!.repoUrl)).toBe(false);
  });

  it("MODULE_REPO_MAP excludes dev-environment and monorepo-packages", () => {
    expect(MODULE_REPO_MAP).not.toHaveProperty("dev-environment");
    expect(MODULE_REPO_MAP).not.toHaveProperty("monorepo-packages");
  });

  it("MODULE_REPO_MAP maps real-world-practice to capstone repo", () => {
    expect(MODULE_REPO_MAP["real-world-practice"]).toBeDefined();
    expect(MODULE_REPO_MAP["real-world-practice"].repoUrl).toBe(
      "https://github.com/reading-advantage/codecamp-progress-tracker"
    );
  });
});
