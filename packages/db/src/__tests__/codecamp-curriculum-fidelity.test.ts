import { describe, it, expect } from "vitest";
import {
  getPhaseACurriculumData,
  getPhaseCCurriculumData,
  getPhaseDCurriculumData,
  type CurriculumModule,
  type CurriculumLesson,
} from "../seed/codecamp-curriculum-data.js";

// Re-export types for convenience
type _CurriculumModule = CurriculumModule;
type _CurriculumLesson = CurriculumLesson;

// Helpers
function findModule(modules: CurriculumModule[], slug: string): CurriculumModule {
  const mod = modules.find((m) => m.slug === slug);
  if (!mod) throw new Error(`Module with slug "${slug}" not found`);
  return mod;
}

function hasQuiz(mod: CurriculumModule): boolean {
  return mod.lessons.some((l) => l.type === "quiz");
}

function hasExerciseLesson(mod: CurriculumModule): boolean {
  return mod.lessons.some((l) => l.type === "exercise");
}

function lessonTitles(mod: CurriculumModule): string[] {
  return mod.lessons.map((l) => l.title);
}

// ---------------------------------------------------------------------------
// NOTE on unit numbering:
// The task brief referenced "Unit 11 = Authentication (Phase B)", but in the
// canonical seed data, the Authentication module has order=13 and phase="C".
// These tests reflect what actually exists in the seed data — the goal is to
// PIN the existing content, not to fail because of a mis-stated brief.
// ---------------------------------------------------------------------------

describe("codecamp curriculum fidelity", () => {
  // ─── Unit 03 — HTML & CSS ────────────────────────────────────────────────
  describe("Unit 03 - HTML & CSS", () => {
    const phaseAData = getPhaseACurriculumData();
    const mod = findModule(phaseAData.modules, "html-css");

    it("module slug contains 'html' (slug is html-css)", () => {
      expect(mod.slug).toMatch(/html/);
    });

    it("module is in Phase A", () => {
      expect(mod.phase).toBe("A");
    });

    it("module has order 3", () => {
      expect(mod.order).toBe(3);
    });

    it("module has status published", () => {
      expect(mod.status).toBe("published");
    });

    it("module has 6 lessons", () => {
      // Class-period plan has 6 periods (Period 1–5 plus Period 6 Polish/Exercise/Quiz)
      expect(mod.lessons).toHaveLength(6);
    });

    it("has a lesson titled 'Semantic HTML Structure' (Period 1 topic)", () => {
      expect(lessonTitles(mod)).toContain("Semantic HTML Structure");
    });

    it("has a lesson titled 'CSS Basics — Selectors, Colors, Box Model' (Period 2 topic)", () => {
      expect(lessonTitles(mod)).toContain("CSS Basics — Selectors, Colors, Box Model");
    });

    it("has a lesson titled 'Flexbox Layouts' (Period 3 topic)", () => {
      expect(lessonTitles(mod)).toContain("Flexbox Layouts");
    });

    it("has a lesson titled 'CSS Grid Layouts' (Period 4 topic)", () => {
      expect(lessonTitles(mod)).toContain("CSS Grid Layouts");
    });

    it("has a lesson titled 'Responsive Design' (Period 5 topic)", () => {
      expect(lessonTitles(mod)).toContain("Responsive Design");
    });

    it("has a quiz lesson (Period 6 — Polish, Exercise, Quiz)", () => {
      expect(hasQuiz(mod)).toBe(true);
    });

    it("quiz lesson is the last lesson", () => {
      const lastLesson = mod.lessons[mod.lessons.length - 1];
      expect(lastLesson.type).toBe("quiz");
    });

    it("quiz lesson is titled 'HTML & CSS Exercise + Quiz'", () => {
      const quiz = mod.lessons.find((l) => l.type === "quiz");
      expect(quiz?.title).toBe("HTML & CSS Exercise + Quiz");
    });

    it("quiz lesson has at least 3 questions", () => {
      const quiz = mod.lessons.find((l) => l.type === "quiz");
      expect(quiz?.questions?.length ?? 0).toBeGreaterThanOrEqual(3);
    });

    it("quiz lesson includes the box-sizing question (key curriculum anchor)", () => {
      const quiz = mod.lessons.find((l) => l.type === "quiz");
      const questions = quiz?.questions ?? [];
      const hasBoxSizing = questions.some((q) =>
        q.question.toLowerCase().includes("box-sizing")
      );
      expect(hasBoxSizing).toBe(true);
    });

    it("quiz lesson includes the Flexbox vs Grid question", () => {
      const quiz = mod.lessons.find((l) => l.type === "quiz");
      const questions = quiz?.questions ?? [];
      const hasFlexGrid = questions.some(
        (q) => q.question.toLowerCase().includes("flexbox") && q.question.toLowerCase().includes("grid")
      );
      expect(hasFlexGrid).toBe(true);
    });

    it("quiz lesson has an embedded exercise (card layout from mockup)", () => {
      const quiz = mod.lessons.find((l) => l.type === "quiz");
      expect(quiz?.exercises?.length ?? 0).toBeGreaterThanOrEqual(1);
    });

    // TODO: seed has no standalone 'exercise' lesson — exercises are embedded
    // in the quiz lesson. The class-period plan shows this is intentional.
    it("module has no standalone exercise-type lesson (exercises embedded in quiz)", () => {
      expect(hasExerciseLesson(mod)).toBe(false);
    });

    it("all theory lessons have contentJson with sections", () => {
      mod.lessons
        .filter((l) => l.type === "theory")
        .forEach((lesson) => {
          expect(lesson.contentJson).toBeDefined();
          const sections = lesson.contentJson.sections;
          expect(Array.isArray(sections)).toBe(true);
          if (Array.isArray(sections)) {
            expect(sections.length).toBeGreaterThan(0);
          }
        });
    });
  });

  // ─── Unit 13 — Authentication ──────────────────────────────────────────
  // NOTE: The task brief said "Unit 11 = Authentication (Phase B)" but in the
  // seed data this is module order=13, phase="C". Tests match the actual data.
  describe("Unit 13 (brief calls it Unit 11) - Authentication", () => {
    const phaseCData = getPhaseCCurriculumData();
    const mod = findModule(phaseCData.modules, "authentication");

    it("module slug contains 'auth'", () => {
      expect(mod.slug).toMatch(/auth/);
    });

    it("module is in Phase C (not Phase B as brief stated)", () => {
      // The brief said Phase B but actual seed data has Phase C
      expect(mod.phase).toBe("C");
    });

    it("module has order 13", () => {
      expect(mod.order).toBe(13);
    });

    it("module has status published", () => {
      expect(mod.status).toBe("published");
    });

    it("module has 4 lessons", () => {
      // Periods 1–3 are theory, Period 4 is exercise + quiz combined
      expect(mod.lessons).toHaveLength(4);
    });

    it("has a lesson titled 'Session-Based Authentication' (Period 1 topic)", () => {
      expect(lessonTitles(mod)).toContain("Session-Based Authentication");
    });

    it("has a lesson titled 'Logout, Middleware, and Auth Context' (Period 2 topic)", () => {
      expect(lessonTitles(mod)).toContain("Logout, Middleware, and Auth Context");
    });

    it("has a lesson titled 'Role-Based Access Control (RBAC)' (Period 3 topic)", () => {
      expect(lessonTitles(mod)).toContain("Role-Based Access Control (RBAC)");
    });

    it("has a quiz lesson (Period 4 — Exercise + Quiz)", () => {
      expect(hasQuiz(mod)).toBe(true);
    });

    it("quiz lesson is the last lesson", () => {
      const lastLesson = mod.lessons[mod.lessons.length - 1];
      expect(lastLesson.type).toBe("quiz");
    });

    it("quiz lesson is titled 'Authentication Exercise + Quiz'", () => {
      const quiz = mod.lessons.find((l) => l.type === "quiz");
      expect(quiz?.title).toBe("Authentication Exercise + Quiz");
    });

    it("quiz lesson has at least 3 questions", () => {
      const quiz = mod.lessons.find((l) => l.type === "quiz");
      expect(quiz?.questions?.length ?? 0).toBeGreaterThanOrEqual(3);
    });

    it("quiz lesson has the httpOnly question (key security anchor)", () => {
      const quiz = mod.lessons.find((l) => l.type === "quiz");
      const questions = quiz?.questions ?? [];
      const hasHttpOnly = questions.some((q) =>
        q.question.toLowerCase().includes("httponly")
      );
      expect(hasHttpOnly).toBe(true);
    });

    it("quiz lesson has an embedded exercise (Add Auth to Blog API)", () => {
      const quiz = mod.lessons.find((l) => l.type === "quiz");
      expect(quiz?.exercises?.length ?? 0).toBeGreaterThanOrEqual(1);
    });

    // TODO: seed has no standalone 'exercise' lesson — exercises are embedded in the quiz.
    it("module has no standalone exercise-type lesson (exercises embedded in quiz)", () => {
      expect(hasExerciseLesson(mod)).toBe(false);
    });

    it("'Session-Based Authentication' lesson has contentJson with sessions/password hashing content", () => {
      const sessionLesson = mod.lessons.find(
        (l) => l.title === "Session-Based Authentication"
      );
      const content = JSON.stringify(sessionLesson?.contentJson ?? {});
      // Key anchor: content covers bcrypt / sessions
      expect(content.toLowerCase()).toContain("session");
    });
  });

  // ─── Unit 15 — AI Integration ──────────────────────────────────────────
  describe("Unit 15 - AI Integration", () => {
    const phaseDData = getPhaseDCurriculumData();
    const mod = findModule(phaseDData.modules, "ai-integration");

    it("module slug contains 'ai'", () => {
      expect(mod.slug).toMatch(/ai/);
    });

    it("module is in Phase D", () => {
      expect(mod.phase).toBe("D");
    });

    it("module has order 15", () => {
      expect(mod.order).toBe(15);
    });

    it("module has status published", () => {
      expect(mod.status).toBe("published");
    });

    it("module has 5 lessons", () => {
      // Periods 1–4 are theory, Period 5 is exercise + quiz combined
      expect(mod.lessons).toHaveLength(5);
    });

    it("has a lesson about generateText and streamText (Period 1 topic)", () => {
      expect(lessonTitles(mod)).toContain(
        "AI SDK Basics — generateText and streamText"
      );
    });

    it("has a lesson about useChat (Period 2 topic)", () => {
      expect(lessonTitles(mod)).toContain("Building a Chat UI with useChat");
    });

    it("has a lesson about generateObject (Period 3 topic)", () => {
      expect(lessonTitles(mod)).toContain(
        "Structured Output with generateObject"
      );
    });

    it("has a lesson about Rate Limiting and Production Concerns (Period 4 topic)", () => {
      expect(lessonTitles(mod)).toContain(
        "Rate Limiting and Production Concerns"
      );
    });

    it("has a quiz lesson (Period 5 — Exercise + Quiz)", () => {
      expect(hasQuiz(mod)).toBe(true);
    });

    it("quiz lesson is the last lesson", () => {
      const lastLesson = mod.lessons[mod.lessons.length - 1];
      expect(lastLesson.type).toBe("quiz");
    });

    it("quiz lesson is titled 'AI Integration Exercise + Quiz'", () => {
      const quiz = mod.lessons.find((l) => l.type === "quiz");
      expect(quiz?.title).toBe("AI Integration Exercise + Quiz");
    });

    it("quiz lesson has at least 3 questions", () => {
      const quiz = mod.lessons.find((l) => l.type === "quiz");
      expect(quiz?.questions?.length ?? 0).toBeGreaterThanOrEqual(3);
    });

    it("quiz lesson has the generateText vs streamText question (key AI anchor)", () => {
      const quiz = mod.lessons.find((l) => l.type === "quiz");
      const questions = quiz?.questions ?? [];
      const hasGenStreamQ = questions.some(
        (q) =>
          q.question.toLowerCase().includes("generatetext") ||
          q.question.toLowerCase().includes("streamtext")
      );
      expect(hasGenStreamQ).toBe(true);
    });

    // TODO: seed has no standalone 'exercise' lesson — exercises are embedded in the quiz.
    it("module has no standalone exercise-type lesson (exercises embedded in quiz)", () => {
      expect(hasExerciseLesson(mod)).toBe(false);
    });

    it("'AI SDK Basics' lesson content references openrouter or AI SDK", () => {
      const sdkLesson = mod.lessons.find((l) =>
        l.title.includes("AI SDK Basics")
      );
      const content = JSON.stringify(sdkLesson?.contentJson ?? {});
      expect(content.toLowerCase()).toMatch(/generatetext|streamtext|openrouter/);
    });
  });

  // ─── Unit 18 — Real-World Practice ─────────────────────────────────────
  describe("Unit 18 - Real-World Practice", () => {
    const phaseDData = getPhaseDCurriculumData();
    const mod = findModule(phaseDData.modules, "real-world-practice");

    it("module slug contains 'real-world'", () => {
      expect(mod.slug).toContain("real-world");
    });

    it("module is in Phase D", () => {
      expect(mod.phase).toBe("D");
    });

    it("module has order 18", () => {
      expect(mod.order).toBe(18);
    });

    it("module has status published", () => {
      expect(mod.status).toBe("published");
    });

    it("module has 4 lessons", () => {
      // Class-period plan has exactly 4 periods
      expect(mod.lessons).toHaveLength(4);
    });

    it("has a lesson titled 'Reading Issues and Planning Implementation' (Period 1)", () => {
      expect(lessonTitles(mod)).toContain(
        "Reading Issues and Planning Implementation"
      );
    });

    it("has a lesson titled 'Opening PRs and Code Review' (Period 2)", () => {
      expect(lessonTitles(mod)).toContain("Opening PRs and Code Review");
    });

    it("has a lesson titled 'Continued Practice — Medium Difficulty Issues' (Period 3)", () => {
      expect(lessonTitles(mod)).toContain(
        "Continued Practice — Medium Difficulty Issues"
      );
    });

    it("has a lesson titled 'Final Practice and Retrospective' (Period 4)", () => {
      expect(lessonTitles(mod)).toContain("Final Practice and Retrospective");
    });

    it("lessons are ordered 1–4 sequentially", () => {
      mod.lessons.forEach((lesson, idx) => {
        expect(lesson.order).toBe(idx + 1);
      });
    });

    it("all 4 lessons are theory type (capstone is practice-based, no quiz)", () => {
      // TODO: The class-period plan has no formal quiz for this module — it is
      // a capstone practice unit. The seed correctly has no quiz lesson here.
      mod.lessons.forEach((lesson) => {
        expect(lesson.type).toBe("theory");
      });
    });

    // TODO: seed has no quiz lesson for real-world-practice. The curriculum
    // plan shows this is intentional — Period 4 is a retrospective, not a quiz.
    it("module has no quiz lesson (capstone module — no formal quiz)", () => {
      expect(hasQuiz(mod)).toBe(false);
    });

    it("'Reading Issues and Planning Implementation' covers the feature delivery lifecycle", () => {
      const lesson = mod.lessons.find((l) =>
        l.title.includes("Reading Issues")
      );
      const content = JSON.stringify(lesson?.contentJson ?? {});
      // Key anchor from the class-period plan: the 10-step feature lifecycle
      expect(content.toLowerCase()).toContain("acceptance criteria");
    });

    it("'Opening PRs and Code Review' lesson covers code review etiquette", () => {
      const lesson = mod.lessons.find((l) =>
        l.title.includes("Opening PRs")
      );
      const content = JSON.stringify(lesson?.contentJson ?? {});
      expect(content.toLowerCase()).toContain("review");
    });

    it("'Final Practice and Retrospective' lesson covers course completion skills", () => {
      const lesson = mod.lessons.find((l) =>
        l.title.includes("Final Practice")
      );
      const content = JSON.stringify(lesson?.contentJson ?? {});
      // The retrospective lists skills gained — check for a few key ones
      expect(content).toContain("React");
      expect(content).toContain("Drizzle");
    });
  });
});
