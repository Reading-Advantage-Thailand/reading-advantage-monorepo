export * from "./contracts.js";
export { GRAPH_RELEASE, OBJECTIVE_KEY, objectiveKeyById, resolveObjective, parseTagsExport } from "./objective-key.js";
export {
  backfillPrimaryTags,
  createDrizzleTagBackfillPort,
  exportArticleRows,
  LEGACY_QUESTION_TABLE,
  type ArticleObjectiveRow,
  type BackfillPrimaryTagsOptions,
  type LessonBankText,
  type QuestionObjectiveRow,
  type QuestionType,
  type TagBackfillPort,
  type TagBackfillReport,
  type WordNodeRow,
} from "./backfill.js";
export { summarizeTagCoverage, tagCoverageToMarkdown, loadTagCoverageInput, type TagCoverageInput, type TagCoverageReport } from "./coverage.js";
export { getArticleObjectives, getQuestionObjectives, getArticleWordNodes, type ArticleObjective, type QuestionObjective, type ArticleWordNode } from "./queries.js";
