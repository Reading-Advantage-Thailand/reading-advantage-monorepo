import { describe, it, expect } from "vitest";
import * as schema from "../schema/index.js";

describe("schema exports", () => {
  it("exports all expected tables", () => {
    // Core
    expect(schema.users).toBeDefined();
    expect(schema.schools).toBeDefined();
    expect(schema.accounts).toBeDefined();
    expect(schema.sessions).toBeDefined();
    // Classrooms
    expect(schema.classrooms).toBeDefined();
    expect(schema.classroomStudents).toBeDefined();
    expect(schema.classroomTeachers).toBeDefined();
    // Content
    expect(schema.articles).toBeDefined();
    expect(schema.lessons).toBeDefined();
    expect(schema.assignments).toBeDefined();
    expect(schema.studentAssignments).toBeDefined();
    // Progress
    expect(schema.userActivity).toBeDefined();
    expect(schema.userWordRecords).toBeDefined();
    expect(schema.userSentenceRecords).toBeDefined();
    expect(schema.lessonProgress).toBeDefined();
    // Flashcards
    expect(schema.flashcardDecks).toBeDefined();
    expect(schema.flashcardCards).toBeDefined();
    expect(schema.flashcardProgress).toBeDefined();
    // Questions
    expect(schema.multipleChoiceQuestions).toBeDefined();
    expect(schema.shortAnswerQuestions).toBeDefined();
    expect(schema.studentAnswers).toBeDefined();
    // Analytics
    expect(schema.storyRecords).toBeDefined();
    expect(schema.chapterTrackings).toBeDefined();
    expect(schema.xpLogs).toBeDefined();
    expect(schema.gameRankings).toBeDefined();
    expect(schema.aiInsights).toBeDefined();
    expect(schema.learningGoals).toBeDefined();
  });

  it("exports roleEnum", () => {
    expect(schema.roleEnum).toBeDefined();
  });
});

describe("users table", () => {
  it("has expected columns", () => {
    const columns = schema.users;
    // Drizzle tables have a [Symbol.for('drizzle:Columns')] property
    const columnNames = Object.keys(columns).filter(
      (k) => !k.startsWith("_") && !k.startsWith("[")
    );
    expect(columnNames).toContain("id");
    expect(columnNames).toContain("username");
    expect(columnNames).toContain("displayUsername");
    expect(columnNames).toContain("email");
    expect(columnNames).toContain("name");
    expect(columnNames).toContain("role");
    expect(columnNames).toContain("schoolId");
    expect(columnNames).toContain("xp");
    expect(columnNames).toContain("level");
    expect(columnNames).toContain("cefrLevel");
  });
});

describe("classrooms table", () => {
  it("has expected columns", () => {
    const columnNames = Object.keys(schema.classrooms).filter(
      (k) => !k.startsWith("_") && !k.startsWith("[")
    );
    expect(columnNames).toContain("id");
    expect(columnNames).toContain("name");
    expect(columnNames).toContain("schoolId");
    expect(columnNames).toContain("teacherId");
    expect(columnNames).toContain("archived");
  });
});

describe("articles table", () => {
  it("has expected columns", () => {
    const columnNames = Object.keys(schema.articles).filter(
      (k) => !k.startsWith("_") && !k.startsWith("[")
    );
    expect(columnNames).toContain("id");
    expect(columnNames).toContain("title");
    expect(columnNames).toContain("content");
    expect(columnNames).toContain("level");
    expect(columnNames).toContain("cefrLevel");
    expect(columnNames).toContain("published");
  });
});

describe("assignments table", () => {
  it("has expected columns", () => {
    const columnNames = Object.keys(schema.assignments).filter(
      (k) => !k.startsWith("_") && !k.startsWith("[")
    );
    expect(columnNames).toContain("id");
    expect(columnNames).toContain("title");
    expect(columnNames).toContain("classroomId");
    expect(columnNames).toContain("teacherId");
    expect(columnNames).toContain("articleId");
    expect(columnNames).toContain("dueDate");
  });
});

describe("science M:N junction tables (0015)", () => {
  it("exports the four junction tables", () => {
    expect(schema.scienceLessonStandards).toBeDefined();
    expect(schema.scienceUnitLessons).toBeDefined();
    expect(schema.scienceClassStudents).toBeDefined();
    expect(schema.scienceQuestionStandards).toBeDefined();
  });

  it("scienceLessonStandards has (lesson_id, standard_id) columns", () => {
    const cols = Object.keys(schema.scienceLessonStandards).filter(
      (k) => !k.startsWith("_") && !k.startsWith("[")
    );
    expect(cols).toContain("lessonId");
    expect(cols).toContain("standardId");
  });

  it("scienceUnitLessons has (unit_id, lesson_id) columns", () => {
    const cols = Object.keys(schema.scienceUnitLessons).filter(
      (k) => !k.startsWith("_") && !k.startsWith("[")
    );
    expect(cols).toContain("unitId");
    expect(cols).toContain("lessonId");
  });

  it("scienceClassStudents has (class_id, student_id) columns", () => {
    const cols = Object.keys(schema.scienceClassStudents).filter(
      (k) => !k.startsWith("_") && !k.startsWith("[")
    );
    expect(cols).toContain("classId");
    expect(cols).toContain("studentId");
  });

  it("scienceQuestionStandards has (question_id, standard_id) columns", () => {
    const cols = Object.keys(schema.scienceQuestionStandards).filter(
      (k) => !k.startsWith("_") && !k.startsWith("[")
    );
    expect(cols).toContain("questionId");
    expect(cols).toContain("standardId");
  });
});
