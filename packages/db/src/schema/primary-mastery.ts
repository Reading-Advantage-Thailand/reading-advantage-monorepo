/**
 * Primary objective tags (track primary_objective_tags_20261006, FR-3): the join between the
 * Primary content and the Mastery Advantage graphs. An article carries its target and supporting
 * GSE objectives, a bank question carries the objectives it assesses, and an article carries the
 * vocabulary nodes of its glossary. Content catalogue, global (no school id). Additive; nothing
 * Tutor reads changes. The lesson importer and the tags backfill write these rows; a reimport
 * deletes an article's rows first, and a deleted question or article cascades.
 */
import { pgTable, uuid, text, timestamp, unique, index } from "drizzle-orm/pg-core";
import { articles } from "./content.js";

/** The GSE objectives of one article, with the role the lesson gives each one. */
export const primaryArticleObjectives = pgTable(
  "primary_article_objectives",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
    /** The Workbooks short id, for example `R17.2`. */
    shortId: text("short_id").notNull(),
    /** The GSE graph node id. */
    nodeId: text("node_id").notNull(),
    /** `target` or `supporting`. */
    role: text("role").notNull(),
    /** The GSE graph commit the tag was authored against. */
    graphRelease: text("graph_release").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("primary_article_objectives_unique").on(t.articleId, t.shortId, t.role),
    index("primary_article_objectives_node_idx").on(t.nodeId),
  ],
);

/** The GSE objectives one bank question assesses. */
export const primaryQuestionObjectives = pgTable(
  "primary_question_objectives",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
    /** The row id in the question table named by `questionType`. */
    questionId: uuid("question_id").notNull(),
    /** `mcq`, `saq`, or `laq`. */
    questionType: text("question_type").notNull(),
    shortId: text("short_id").notNull(),
    nodeId: text("node_id").notNull(),
    graphRelease: text("graph_release").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("primary_question_objectives_unique").on(t.questionId, t.questionType, t.shortId),
    index("primary_question_objectives_article_idx").on(t.articleId),
    index("primary_question_objectives_node_idx").on(t.nodeId),
  ],
);

/** The vocabulary nodes of one article's glossary; one word can carry two sense nodes. */
export const primaryArticleWordNodes = pgTable(
  "primary_article_word_nodes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    articleId: uuid("article_id").notNull().references(() => articles.id, { onDelete: "cascade" }),
    /** The node's normalized form. */
    word: text("word").notNull(),
    /** The last segment of the node id, for example `noun`. */
    pos: text("pos").notNull(),
    nodeId: text("node_id").notNull(),
    /** `glossed` or `recycled`. */
    role: text("role").notNull(),
    graphRelease: text("graph_release").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    unique("primary_article_word_nodes_unique").on(t.articleId, t.nodeId),
    index("primary_article_word_nodes_node_idx").on(t.nodeId),
  ],
);
