import { pgTable, uuid, text, timestamp, integer, jsonb, boolean, unique } from "drizzle-orm/pg-core";
import { users } from "./users";
import { articles } from "./content";

// ─── Question Models ────────────────────────────────────

export const multipleChoiceQuestions = pgTable("multiple_choice_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  articleId: uuid("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  options: jsonb("options").notNull(), // string[]
  correctAnswer: integer("correct_answer").notNull(), // index into options
  explanation: text("explanation"),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const shortAnswerQuestions = pgTable("short_answer_questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  articleId: uuid("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  sampleAnswer: text("sample_answer"),
  rubric: text("rubric"),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Student Answers ────────────────────────────────────

export const studentAnswers = pgTable("student_answers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Polymorphic reference: questionId may point to multiple_choice_questions.id
  // or short_answer_questions.id. A single FK cannot reference two tables, so
  // referential integrity is enforced at the application layer. questionType
  // disambiguates which table is targeted.
  questionId: text("question_id").notNull(),
  questionType: text("question_type").notNull(), // "multiple_choice" | "short_answer"
  answer: text("answer").notNull(),
  isCorrect: boolean("is_correct"),
  score: integer("score"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  unique("student_answers_unique").on(table.userId, table.questionId, table.questionType),
]);
