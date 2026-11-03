import { describe, it, expect } from "vitest";
import { ArticleError, ArticleNotFoundError } from "../articles/errors.js";
import { AssignmentError, AssignmentNotFoundError, StudentNotAssignedError } from "../assignments/errors.js";
import {
  CodecampError, ModuleNotFoundError, LessonNotFoundError as CodecampLessonNotFoundError,
  ExerciseNotFoundError, ConversationNotFoundError, InternNotFoundError,
} from "../codecamp/errors.js";
import { CurriculumError, LessonNotFoundError } from "../curriculum/errors.js";
import { GameCompletionError, DuplicateCompletionError, InvalidGameCompletionError } from "../games/errors.js";
import { GamificationError, InsufficientXpError } from "../gamification/errors.js";
import { LicenseError, LicenseNotFoundError } from "../licenses/errors.js";
import { ProgressError, StudentNotFoundError } from "../progress/errors.js";
import { QuizError, AttemptNotFoundError } from "../quiz/errors.js";
import { ReportError, ClassNotFoundError } from "../reports/errors.js";

describe("domain error classes", () => {
  it.each([
    [new ArticleError("x"), ArticleError, "ArticleError", "x"],
    [new ArticleNotFoundError("a1"), ArticleError, "ArticleNotFoundError", "Article not found: a1"],
    [new AssignmentError("x"), AssignmentError, "AssignmentError", "x"],
    [new AssignmentNotFoundError("as1"), AssignmentError, "AssignmentNotFoundError", "Assignment not found: as1"],
    [new StudentNotAssignedError(), AssignmentError, "StudentNotAssignedError", "Student not assigned to this assignment"],
    [new CodecampError("x"), CodecampError, "CodecampError", "x"],
    [new ModuleNotFoundError("m"), CodecampError, "ModuleNotFoundError", "Module not found: m"],
    [new CodecampLessonNotFoundError("l"), CodecampError, "LessonNotFoundError", "Lesson not found: l"],
    [new ExerciseNotFoundError("e"), CodecampError, "ExerciseNotFoundError", "Exercise not found: e"],
    [new ConversationNotFoundError(), CodecampError, "ConversationNotFoundError", "Conversation not found"],
    [new InternNotFoundError("i"), CodecampError, "InternNotFoundError", "Intern not found: i"],
    [new CurriculumError("x"), CurriculumError, "CurriculumError", "x"],
    [new LessonNotFoundError("l"), CurriculumError, "LessonNotFoundError", "Lesson not found: l"],
    [new GameCompletionError("x"), GameCompletionError, "GameCompletionError", "x"],
    [new DuplicateCompletionError("act"), GameCompletionError, "DuplicateCompletionError", "Game completion already recorded: act"],
    [new InvalidGameCompletionError("bad"), GameCompletionError, "InvalidGameCompletionError", "bad"],
    [new GamificationError("x"), GamificationError, "GamificationError", "x"],
    [new InsufficientXpError(), GamificationError, "InsufficientXpError", "Insufficient XP for this operation"],
    [new LicenseError("x"), LicenseError, "LicenseError", "x"],
    [new LicenseNotFoundError("lic"), LicenseError, "LicenseNotFoundError", "License not found: lic"],
    [new ProgressError("x"), ProgressError, "ProgressError", "x"],
    [new StudentNotFoundError("s"), ProgressError, "StudentNotFoundError", "Student not found in your school: s"],
    [new QuizError("x"), QuizError, "QuizError", "x"],
    [new AttemptNotFoundError("at"), QuizError, "AttemptNotFoundError", "Attempt not found: at"],
    [new ReportError("x"), ReportError, "ReportError", "x"],
    [new ClassNotFoundError("c"), ReportError, "ClassNotFoundError", "Class not found: c"],
  ] as Array<[Error, new (...args: never[]) => Error, string, string]>)("%s has its name, base and message", (error, base, name, message) => {
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(base);
    expect(error.name).toBe(name);
    expect(error.message).toBe(message);
  });

  it("keeps validation issues and a custom XP message", () => {
    const issues = [{ path: ["score"] }];
    expect(new InvalidGameCompletionError("bad", issues).issues).toBe(issues);
    expect(new InsufficientXpError("need 10").message).toBe("need 10");
  });
});
